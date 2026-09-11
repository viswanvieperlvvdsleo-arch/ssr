import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { readRoomToken } from '../security';

function bearerToken(req) {
  const value = req.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

async function authorize(req) {
  const access = readRoomToken(bearerToken(req));
  if (!access) return { error: 'Meeting access expired or invalid.', status: 401 };
  const [meeting, participant] = await Promise.all([
    prisma.appMeeting.findUnique({ where: { id: access.meetingId } }),
    prisma.appMeetingParticipant.findUnique({ where: { peerId: access.peerId } }),
  ]);
  if (!meeting || meeting.endedAt || meeting.status === 'completed' || meeting.expiresAt <= new Date()) {
    return { error: 'This meeting has ended.', status: 410 };
  }
  if (!participant || participant.leftAt || participant.meetingId !== meeting.id || participant.userId !== access.userId) {
    return { error: 'This meeting session is no longer active.', status: 401 };
  }
  return { access, meeting, participant };
}

export async function GET(req) {
  try {
    const context = await authorize(req);
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status });

    const now = new Date();
    const activeAfter = new Date(now.getTime() - 35_000);
    const sinceValue = new URL(req.url).searchParams.get('since');
    const since = sinceValue && !Number.isNaN(Date.parse(sinceValue)) ? new Date(sinceValue) : new Date(now.getTime() - 120_000);

    const cleanup = Math.random() < 0.03
      ? prisma.appMeetingSignal.deleteMany({ where: { expiresAt: { lte: now } } })
      : Promise.resolve(null);
    const [, participants, signals] = await Promise.all([
      prisma.appMeetingParticipant.update({ where: { peerId: context.access.peerId }, data: { lastSeenAt: now } }),
      prisma.appMeetingParticipant.findMany({
        where: {
          meetingId: context.meeting.id,
          lastSeenAt: { gte: activeAfter },
          OR: [{ leftAt: null }, { leftAt: { isSet: false } }],
        },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.appMeetingSignal.findMany({
        where: {
          meetingId: context.meeting.id,
          recipientPeerId: context.access.peerId,
          createdAt: { gte: since },
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
      cleanup,
    ]);
    return NextResponse.json({ participants, signals, serverTime: now.toISOString() });
  } catch (error) {
    console.error('Meeting signal poll error:', error);
    return NextResponse.json({ error: 'Could not update the meeting.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const context = await authorize(req);
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status });
    const { recipientPeerId, type, payload } = await req.json();
    if (!recipientPeerId || !['offer', 'answer', 'ice'].includes(type)) {
      return NextResponse.json({ error: 'Invalid meeting signal.' }, { status: 400 });
    }
    if (JSON.stringify(payload || null).length > 100_000) {
      return NextResponse.json({ error: 'Meeting signal is too large.' }, { status: 413 });
    }
    const recipient = await prisma.appMeetingParticipant.findUnique({ where: { peerId: recipientPeerId } });
    if (!recipient || recipient.meetingId !== context.meeting.id || recipient.leftAt) {
      return NextResponse.json({ error: 'Participant is no longer in this meeting.' }, { status: 404 });
    }
    await prisma.appMeetingSignal.create({
      data: {
        meetingId: context.meeting.id,
        senderPeerId: context.access.peerId,
        recipientPeerId,
        type,
        payload,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meeting signal send error:', error);
    return NextResponse.json({ error: 'Could not send the meeting signal.' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const context = await authorize(req);
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status });
    const data = await req.json();
    const update = { lastSeenAt: new Date() };
    if (typeof data.micOn === 'boolean') update.micOn = data.micOn;
    if (typeof data.cameraOn === 'boolean') update.cameraOn = data.cameraOn;
    if (typeof data.screenSharing === 'boolean') update.screenSharing = data.screenSharing;
    const participant = await prisma.appMeetingParticipant.update({ where: { peerId: context.access.peerId }, data: update });
    return NextResponse.json(participant);
  } catch (error) {
    console.error('Meeting presence update error:', error);
    return NextResponse.json({ error: 'Could not update participant status.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const context = await authorize(req);
    if (context.error) return NextResponse.json({ success: true });
    await Promise.all([
      prisma.appMeetingParticipant.update({ where: { peerId: context.access.peerId }, data: { leftAt: new Date() } }),
      prisma.appMeetingSignal.deleteMany({
        where: {
          meetingId: context.meeting.id,
          OR: [{ senderPeerId: context.access.peerId }, { recipientPeerId: context.access.peerId }],
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meeting leave error:', error);
    return NextResponse.json({ success: true });
  }
}
