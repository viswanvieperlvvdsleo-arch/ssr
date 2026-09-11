import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import {
  createRoomToken,
  meetingExpiry,
  sanitizeMeeting,
  verifyMeetingPassword,
} from '../security';

function extractCode(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  const match = input.match(/\/meeting\/([^/?#]+)/i);
  return decodeURIComponent(match?.[1] || input.replace(/\s/g, ''));
}

export async function POST(req) {
  try {
    const { meetingCode: input, password, userId, displayName, cameraOn = true, micOn = true } = await req.json();
    if (!input || !userId || !String(displayName || '').trim()) {
      return NextResponse.json({ error: 'Meeting ID, user, and display name are required.' }, { status: 400 });
    }

    const meetingCode = extractCode(input);
    const meeting = /^[a-f\d]{24}$/i.test(meetingCode)
      ? await prisma.appMeeting.findFirst({ where: { OR: [{ meetingCode }, { id: meetingCode }] } })
      : await prisma.appMeeting.findFirst({ where: { meetingCode } });
    if (!meeting) return NextResponse.json({ error: 'Meeting ID or link is invalid.' }, { status: 404 });

    const user = await prisma.appUser.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Sign in to join this meeting.' }, { status: 401 });
    const expiresAt = meeting.expiresAt || meetingExpiry(meeting);
    if (meeting.endedAt || meeting.status === 'completed' || !expiresAt || expiresAt <= new Date()) {
      return NextResponse.json({ error: 'This meeting has ended. Its link and password are no longer valid.', expired: true }, { status: 410 });
    }

    const isHost = meeting.hostId === user.id;
    if (!isHost && !verifyMeetingPassword(password, meeting.passwordSalt, meeting.passwordHash)) {
      return NextResponse.json({ error: 'Incorrect meeting password.' }, { status: 403 });
    }

    const now = new Date();
    const peerId = randomUUID();
    await prisma.appMeetingParticipant.updateMany({
      where: {
        meetingId: meeting.id,
        userId: user.id,
        OR: [{ leftAt: null }, { leftAt: { isSet: false } }],
      },
      data: { leftAt: now },
    });
    const participant = await prisma.appMeetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId: user.id,
        peerId,
        name: String(displayName).trim().slice(0, 100),
        role: isHost ? 'host' : 'participant',
        avatar: user.avatar || null,
        cameraOn: Boolean(cameraOn),
        micOn: Boolean(micOn),
        lastSeenAt: now,
      },
    });
    if (isHost && !meeting.startedAt) {
      await prisma.appMeeting.update({ where: { id: meeting.id }, data: { startedAt: now } });
    }

    const activeAfter = new Date(now.getTime() - 35_000);
    const participants = await prisma.appMeetingParticipant.findMany({
      where: {
        meetingId: meeting.id,
        lastSeenAt: { gte: activeAfter },
        OR: [{ leftAt: null }, { leftAt: { isSet: false } }],
      },
      orderBy: { joinedAt: 'asc' },
    });
    const token = createRoomToken({ meetingId: meeting.id, userId: user.id, peerId, role: participant.role, expiresAt });
    return NextResponse.json({
      token,
      peerId,
      meeting: sanitizeMeeting({ ...meeting, expiresAt }),
      participant,
      participants,
    });
  } catch (error) {
    console.error('Meeting room join error:', error);
    return NextResponse.json({ error: error.message || 'Could not join the meeting.' }, { status: 500 });
  }
}
