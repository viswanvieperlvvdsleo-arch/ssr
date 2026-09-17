import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { localDateTimeToUtc } from '../../schedule';

const STAFF_ROLES = ['Employee', 'Admin', 'Super Admin'];
function localDateParts(value, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
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

function isScheduledToday(meeting, date, day) {
  if (date < meeting.date || date > (meeting.endDate || meeting.date)) return false;
  const recurrence = meeting.recurrence || 'none';
  if (recurrence === 'none') return date === meeting.date;
  if (recurrence === 'daily') return true;
  if (recurrence === 'weekly') return !meeting.weekdays?.length || meeting.weekdays.includes(day);
  if (recurrence === 'monthly') {
    const dates = String(meeting.monthlyDates || '')
      .split(',')
      .map(value => Number(value.trim()))
      .filter(value => Number.isInteger(value));
    return dates.length ? dates.includes(Number(date.slice(-2))) : date.slice(-2) === meeting.date.slice(-2);
  }
  return false;
}

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
}

export async function POST(req) {
  try {
    const { meetingId, userId } = await req.json();
    if (!isObjectId(meetingId) || !isObjectId(userId)) {
      return NextResponse.json({ error: 'Meeting and account are required.' }, { status: 400 });
    }
    const [meeting, user] = await Promise.all([
      prisma.appMeeting.findUnique({ where: { id: meetingId } }),
      prisma.appUser.findUnique({ where: { id: userId } }),
    ]);
    if (!meeting || meeting.meetingType !== 'external') {
      return NextResponse.json({ error: 'External meeting not found.' }, { status: 404 });
    }
    const canJoin = user && !user.restricted && (
      (!user.companyId && STAFF_ROLES.includes(user.role)) || meeting.hostId === user.id || (meeting.participants || []).includes(user.id)
    );
    if (!canJoin) {
      return NextResponse.json({ error: 'This meeting was not shared with your account.' }, { status: 403 });
    }

    const now = new Date();
    const timezone = meeting.timezone || 'Asia/Kolkata';
    const local = localDateParts(now, timezone);
    const start = localDateTimeToUtc(local.date, meeting.time, timezone);
    const end = localDateTimeToUtc(local.date, meeting.endTime || meeting.time, timezone);
    if (!isScheduledToday(meeting, local.date, local.day) || !start || !end || now < start || now > end) {
      return NextResponse.json({ error: 'Attendance is recorded only while this meeting is scheduled to run.' }, { status: 409 });
    }
    if (meeting.endedAt || meeting.status === 'completed') {
      return NextResponse.json({ error: 'This meeting has ended.' }, { status: 410 });
    }

    const dayStart = localDateTimeToUtc(local.date, '00:00', timezone);
    const dayEnd = localDateTimeToUtc(local.date, '23:59', timezone);
    const existing = await prisma.appMeetingParticipant.findFirst({
      where: {
        meetingId: meeting.id,
        userId: user.id,
        role: 'external',
        joinedAt: { gte: dayStart, lte: dayEnd },
      },
    });
    if (!existing) {
      await prisma.appMeetingParticipant.create({
        data: {
          meetingId: meeting.id,
          userId: user.id,
          peerId: randomUUID(),
          name: user.name,
          role: 'external',
          avatar: user.avatar || null,
          micOn: false,
          cameraOn: false,
          joinedAt: now,
          lastSeenAt: now,
          leftAt: now,
        },
      });
    }
    return NextResponse.json({ success: true, link: meeting.link, recordedAt: (existing?.joinedAt || now).toISOString() });
  } catch (error) {
    console.error('External meeting attendance error:', error);
    return NextResponse.json({ error: 'Could not record external meeting attendance.' }, { status: 500 });
  }
}
