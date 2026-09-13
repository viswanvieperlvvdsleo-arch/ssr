import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

const STAFF_ROLES = ['Employee', 'Admin', 'Super Admin'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
}

async function getStaff(userId) {
  if (!isObjectId(userId)) return null;
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  return user && STAFF_ROLES.includes(user.role) && !user.restricted ? user : null;
}

function dateParts(value, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(value);
  const part = type => parts.find(item => item.type === type)?.value || '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    day: part('weekday'),
  };
}

function timeLabel(value, timezone) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(value);
}

function aggregatePerson(user, sessions, totalDays, timezone, now) {
  const daily = new Map();
  for (const session of sessions) {
    const joinedAt = new Date(session.joinedAt);
    const heartbeat = new Date(session.lastSeenAt || session.joinedAt);
    const active = !session.leftAt && now.getTime() - heartbeat.getTime() <= 35_000;
    const leftAt = session.leftAt ? new Date(session.leftAt) : active ? now : heartbeat;
    const seconds = Math.max(0, Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000));
    const key = dateParts(joinedAt, timezone);
    const existing = daily.get(key.date) || {
      date: key.date,
      day: key.day,
      firstJoin: joinedAt,
      lastLeave: leftAt,
      durationSeconds: 0,
      sessions: 0,
      active: false,
    };
    if (joinedAt < existing.firstJoin) existing.firstJoin = joinedAt;
    if (leftAt > existing.lastLeave) existing.lastLeave = leftAt;
    existing.durationSeconds += seconds;
    existing.sessions += 1;
    existing.active = existing.active || active;
    daily.set(key.date, existing);
  }

  const attendance = [...daily.values()]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map(row => ({
      ...row,
      firstJoin: row.firstJoin.toISOString(),
      lastLeave: row.lastLeave.toISOString(),
      joinTime: timeLabel(row.firstJoin, timezone),
      leaveTime: row.active ? 'In meeting' : timeLabel(row.lastLeave, timezone),
    }));
  const attendedDays = attendance.length;
  return {
    id: user?.id || '',
    name: user?.name || sessions[0]?.name || 'Unknown account',
    role: user?.role || 'Participant',
    avatar: user?.avatar || null,
    attendedDays,
    totalDays,
    percentage: totalDays ? Math.min(100, Math.round((attendedDays / totalDays) * 100)) : 0,
    totalSeconds: attendance.reduce((sum, row) => sum + row.durationSeconds, 0),
    attendance,
  };
}

async function hydrateReports(reports) {
  if (!reports.length) return [];
  const meetingIds = reports.map(report => report.meetingId);
  const [meetings, attendance] = await Promise.all([
    prisma.appMeeting.findMany({ where: { id: { in: meetingIds } } }),
    prisma.appMeetingParticipant.findMany({ where: { meetingId: { in: meetingIds } }, orderBy: { joinedAt: 'asc' } }),
  ]);
  const meetingMap = Object.fromEntries(meetings.map(meeting => [meeting.id, meeting]));
  const userIds = [...new Set(reports.flatMap(report => [report.trainerId, ...report.memberIds]).filter(Boolean))];
  const users = userIds.length ? await prisma.appUser.findMany({ where: { id: { in: userIds } } }) : [];
  const userMap = Object.fromEntries(users.map(user => [user.id, user]));
  const now = new Date();

  return reports.flatMap(report => {
    const meeting = meetingMap[report.meetingId];
    if (!meeting) return [];
    const timezone = meeting.timezone || 'Asia/Kolkata';
    const reportSessions = attendance.filter(item => item.meetingId === report.meetingId);
    const trainer = report.trainerId
      ? aggregatePerson(userMap[report.trainerId], reportSessions.filter(item => item.userId === report.trainerId), report.totalDays, timezone, now)
      : null;
    const members = report.memberIds.map(memberId => aggregatePerson(
      userMap[memberId],
      reportSessions.filter(item => item.userId === memberId),
      report.totalDays,
      timezone,
      now,
    ));
    const attendanceRows = [
      ...(trainer ? trainer.attendance.map(row => ({ ...row, userId: trainer.id, name: trainer.name, role: 'Trainer' })) : []),
      ...members.flatMap(member => member.attendance.map(row => ({
        ...row,
        userId: member.id,
        name: member.name,
        role: member.role,
      }))),
    ].sort((left, right) => right.date.localeCompare(left.date) || left.name.localeCompare(right.name));
    const completedDays = trainer
      ? trainer.attendedDays
      : new Set(attendanceRows.map(row => row.date)).size;

    return [{
      ...report,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        module: meeting.module,
        date: meeting.date,
        endDate: meeting.endDate,
        time: meeting.time,
        endTime: meeting.endTime,
        recurrence: meeting.recurrence,
        timezone,
      },
      completedDays: Math.min(report.totalDays, completedDays),
      completionPercentage: report.totalDays ? Math.min(100, Math.round((completedDays / report.totalDays) * 100)) : 0,
      trainer,
      members,
      attendanceRows,
      generatedAt: now.toISOString(),
    }];
  });
}

async function validateReportInput(body) {
  if (!isObjectId(body.meetingId)) return { error: 'Choose a valid meeting.' };
  const meeting = await prisma.appMeeting.findUnique({ where: { id: body.meetingId } });
  if (!meeting) return { error: 'Meeting not found.' };
  const totalDays = Number(body.totalDays);
  if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > 1000) return { error: 'Total days must be between 1 and 1000.' };
  const weekdays = [...new Set((Array.isArray(body.weekdays) ? body.weekdays : []).filter(day => WEEKDAYS.includes(day)))];
  if (!weekdays.length) return { error: 'Select at least one training weekday.' };
  const allowedIds = new Set([meeting.hostId, ...(meeting.participants || [])]);
  const trainerId = body.trainerId && allowedIds.has(body.trainerId) ? body.trainerId : null;
  if (body.trainerId && !trainerId) return { error: 'The trainer must be invited to this meeting.' };
  const memberIds = [...new Set((Array.isArray(body.memberIds) ? body.memberIds : []).filter(id => allowedIds.has(id) && id !== trainerId))];
  if (!memberIds.length) return { error: 'Select at least one invited attendee.' };
  const validUsers = await prisma.appUser.findMany({ where: { id: { in: [...new Set([trainerId, ...memberIds].filter(Boolean))] }, restricted: false }, select: { id: true } });
  if (validUsers.length !== new Set([trainerId, ...memberIds].filter(Boolean)).size) return { error: 'One or more selected accounts are unavailable.' };
  return { meeting, totalDays, weekdays, trainerId, memberIds };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const actor = await getStaff(searchParams.get('userId'));
    if (!actor) return NextResponse.json({ error: 'Employee or admin access is required.' }, { status: 403 });
    const meetingId = searchParams.get('meetingId');
    const reports = await prisma.appTrainingReport.findMany({
      where: meetingId ? { meetingId } : {},
      orderBy: { updatedAt: 'desc' },
    });
    const hydrated = await hydrateReports(reports);
    return NextResponse.json(meetingId ? hydrated[0] || null : hydrated);
  } catch (error) {
    console.error('Training reports GET API Error:', error);
    return NextResponse.json({ error: 'Could not load training reports.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const actor = await getStaff(body.userId);
    if (!actor) return NextResponse.json({ error: 'Employee or admin access is required.' }, { status: 403 });
    const values = await validateReportInput(body);
    if (values.error) return NextResponse.json({ error: values.error }, { status: 400 });
    const existing = await prisma.appTrainingReport.findUnique({ where: { meetingId: body.meetingId } });
    if (existing) return NextResponse.json({ error: 'This meeting is already connected to the dashboard.' }, { status: 409 });
    const report = await prisma.appTrainingReport.create({
      data: {
        meetingId: body.meetingId,
        totalDays: values.totalDays,
        weekdays: values.weekdays,
        trainerId: values.trainerId,
        memberIds: values.memberIds,
        createdById: actor.id,
      },
    });
    return NextResponse.json((await hydrateReports([report]))[0], { status: 201 });
  } catch (error) {
    console.error('Training reports POST API Error:', error);
    return NextResponse.json({ error: 'Could not connect this meeting to the dashboard.' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const actor = await getStaff(body.userId);
    if (!actor) return NextResponse.json({ error: 'Employee or admin access is required.' }, { status: 403 });
    const values = await validateReportInput(body);
    if (values.error) return NextResponse.json({ error: values.error }, { status: 400 });
    const existing = await prisma.appTrainingReport.findUnique({ where: { meetingId: body.meetingId } });
    if (!existing) return NextResponse.json({ error: 'Training report not found.' }, { status: 404 });
    const report = await prisma.appTrainingReport.update({
      where: { meetingId: body.meetingId },
      data: {
        totalDays: values.totalDays,
        weekdays: values.weekdays,
        trainerId: values.trainerId,
        memberIds: values.memberIds,
      },
    });
    return NextResponse.json((await hydrateReports([report]))[0]);
  } catch (error) {
    console.error('Training reports PATCH API Error:', error);
    return NextResponse.json({ error: 'Could not update this training report.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const actor = await getStaff(searchParams.get('userId'));
    const meetingId = searchParams.get('meetingId');
    if (!actor) return NextResponse.json({ error: 'Employee or admin access is required.' }, { status: 403 });
    if (!isObjectId(meetingId)) return NextResponse.json({ error: 'Choose a valid meeting.' }, { status: 400 });
    const existing = await prisma.appTrainingReport.findUnique({ where: { meetingId } });
    if (!existing) return NextResponse.json({ error: 'Training report not found.' }, { status: 404 });
    await prisma.appTrainingReport.delete({ where: { meetingId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Training reports DELETE API Error:', error);
    return NextResponse.json({ error: 'Could not delete this training report.' }, { status: 500 });
  }
}
