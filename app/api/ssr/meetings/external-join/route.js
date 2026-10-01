import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { getSessionActor } from '../../session';
import { bumpRealtimeRevision } from '../../realtime';
import { localDateTimeToUtc } from '../../schedule';

const STAFF_ROLES = ['Employee', 'Admin', 'Super Admin'];
function localDate(value, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = type => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
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
      getSessionActor(req),
    ]);
    if (!meeting || meeting.meetingType !== 'external') {
      return NextResponse.json({ error: 'External meeting not found.' }, { status: 404 });
    }
    const canJoin = user?.id === userId && !user.restricted && (
      (!user.companyId && STAFF_ROLES.includes(user.role)) || meeting.hostId === user.id || (meeting.participants || []).includes(user.id)
    );
    if (!canJoin) {
      return NextResponse.json({ error: 'This meeting was not shared with your account.' }, { status: 403 });
    }

    const now = new Date();
    if (meeting.endedAt || meeting.status === 'completed') {
      return NextResponse.json({ error: 'This meeting has ended.' }, { status: 410 });
    }

    const timezone = meeting.timezone || 'Asia/Kolkata';
    const attendanceDate = localDate(now, timezone);
    const dayStart = localDateTimeToUtc(attendanceDate, '00:00', timezone);
    const dayEnd = new Date(localDateTimeToUtc(attendanceDate, '23:59', timezone).getTime() + 59_999);
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
    const report = await prisma.appTrainingReport.findUnique({ where: { meetingId: meeting.id } });
    if (report && report.trainerId !== user.id && !(report.memberIds || []).includes(user.id)) {
      await prisma.appTrainingReport.update({
        where: { meetingId: meeting.id },
        data: { memberIds: [...(report.memberIds || []), user.id] },
      });
    }
    await bumpRealtimeRevision('meetings');
    return NextResponse.json({ success: true, link: meeting.link, recordedAt: (existing?.joinedAt || now).toISOString() });
  } catch (error) {
    console.error('External meeting attendance error:', error);
    return NextResponse.json({ error: 'Could not record external meeting attendance.' }, { status: 500 });
  }
}
