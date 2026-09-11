import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildMeetingData } from '../defaults';
import { notifyUsers } from '../notify';
import { parseScheduleTime, validateScheduleFields } from '../schedule';
import { decryptCredential, encryptCredential } from '../server-credentials/credentials';
import {
  deriveEndTime,
  generateMeetingCode,
  generateMeetingPassword,
  hashMeetingPassword,
  meetingExpiry,
  sanitizeMeeting,
} from '../meeting-room/security';

function canManageMeeting(user, meeting) {
  return user && (user.id === meeting.hostId || user.role === 'Admin' || user.role === 'Super Admin');
}

function internalMeetingLink(req, meetingCode) {
  return new URL(`/ssr-app/meeting/${meetingCode}`, req.url).toString();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');
    const userId = searchParams.get('userId');

    if (id || code) {
      const meeting = id
        ? await prisma.appMeeting.findUnique({ where: { id } })
        : await prisma.appMeeting.findFirst({ where: { meetingCode: code } });
      if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
      const safeMeeting = sanitizeMeeting(meeting);

      if (searchParams.get('includeCredentials') === 'true' && userId) {
        const user = await prisma.appUser.findUnique({ where: { id: userId } });
        if (!canManageMeeting(user, meeting)) {
          return NextResponse.json({ error: 'Only the host or an administrator can view the password.' }, { status: 403 });
        }
        return NextResponse.json({
          ...safeMeeting,
          joinPassword: meeting.passwordEncrypted ? decryptCredential(meeting.passwordEncrypted) : null,
        });
      }
      return NextResponse.json(safeMeeting);
    }

    const meetings = await prisma.appMeeting.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(meetings.map(sanitizeMeeting));
  } catch (error) {
    console.error('Meetings GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.hostId || !String(data.title || '').trim()) {
      return NextResponse.json({ error: 'Host and meeting title are required.' }, { status: 400 });
    }
    const validationError = validateScheduleFields(data, 'date');
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    if (data.recurrence !== 'none' && !data.endDate) {
      return NextResponse.json({ error: 'Choose an end date for a repeating meeting.' }, { status: 400 });
    }

    const endTime = data.endTime || deriveEndTime(data.time, data.duration);
    if (!parseScheduleTime(endTime)) {
      return NextResponse.json({ error: 'Choose a valid end time.' }, { status: 400 });
    }
    if ((data.endDate || data.date) === data.date && endTime <= data.time) {
      return NextResponse.json({ error: 'End time must be after the start time.' }, { status: 400 });
    }

    const expiresAt = meetingExpiry({ ...data, endTime });
    if (!expiresAt || expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Meeting end date and time must be in the future.' }, { status: 400 });
    }

    const joinPassword = generateMeetingPassword();
    const password = hashMeetingPassword(joinPassword);
    let newMeeting = null;

    for (let attempt = 0; attempt < 5 && !newMeeting; attempt += 1) {
      const meetingCode = generateMeetingCode();
      const existing = await prisma.appMeeting.findFirst({ where: { meetingCode }, select: { id: true } });
      if (existing) continue;
      newMeeting = await prisma.appMeeting.create({
        data: buildMeetingData({
          ...data,
          endDate: data.endDate || data.date,
          endTime,
          meetingCode,
          link: internalMeetingLink(req, meetingCode),
          passwordHash: password.hash,
          passwordSalt: password.salt,
          passwordEncrypted: encryptCredential(joinPassword),
          expiresAt,
        }),
      });
    }
    if (!newMeeting) return NextResponse.json({ error: 'Could not generate a unique meeting ID.' }, { status: 503 });

    let recipientIds = Array.isArray(newMeeting.participants) ? newMeeting.participants : [];
    if (newMeeting.chatId) {
      const chat = await prisma.appChat.findUnique({ where: { id: newMeeting.chatId }, select: { participants: true } });
      recipientIds = [...new Set([...recipientIds, ...(chat?.participants || [])])];
    }
    await notifyUsers(recipientIds.filter(id => id !== newMeeting.hostId), {
      title: 'New meeting scheduled',
      body: `${newMeeting.title} - ${newMeeting.date} ${newMeeting.time}`,
      url: `/ssr-app/home?section=meetings&meetingId=${encodeURIComponent(newMeeting.id)}`,
      data: { type: 'meeting', meetingId: newMeeting.id },
    });
    return NextResponse.json({ ...sanitizeMeeting(newMeeting), joinPassword });
  } catch (error) {
    console.error('Meetings POST API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, userId, action } = await req.json();
    if (!id || !userId || action !== 'end') {
      return NextResponse.json({ error: 'Meeting, user, and a valid action are required.' }, { status: 400 });
    }
    const [meeting, user] = await Promise.all([
      prisma.appMeeting.findUnique({ where: { id } }),
      prisma.appUser.findUnique({ where: { id: userId } }),
    ]);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    if (!canManageMeeting(user, meeting)) return NextResponse.json({ error: 'Only the host can end this meeting.' }, { status: 403 });

    const endedAt = new Date();
    const updated = await prisma.$transaction(async tx => {
      const saved = await tx.appMeeting.update({ where: { id }, data: { status: 'completed', endedAt } });
      await tx.appMeetingParticipant.updateMany({
        where: { meetingId: id, OR: [{ leftAt: null }, { leftAt: { isSet: false } }] },
        data: { leftAt: endedAt },
      });
      await tx.appMeetingSignal.deleteMany({ where: { meetingId: id } });
      return saved;
    });
    return NextResponse.json(sanitizeMeeting(updated));
  } catch (error) {
    console.error('Meetings PATCH API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await prisma.$transaction([
      prisma.appMeetingSignal.deleteMany({ where: { meetingId: id } }),
      prisma.appMeetingParticipant.deleteMany({ where: { meetingId: id } }),
      prisma.appMeeting.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meetings DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
