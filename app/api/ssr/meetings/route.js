import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildChatData, buildMeetingData, buildMessageData, hasEmployeePermission } from '../defaults';
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
  return user && (user.id === meeting.hostId || canPlanMeeting(user));
}

function canPlanMeeting(user) {
  return user && !user.restricted && (
    user.role === 'Admin' ||
    user.role === 'Super Admin' ||
    hasEmployeePermission(user, 'arrange_meetings')
  );
}

function canViewMeeting(user, meeting) {
  if (!user || user.restricted) return false;
  if (['Employee', 'Admin', 'Super Admin'].includes(user.role)) return true;
  return user.id === meeting.hostId || (meeting.participants || []).includes(user.id);
}

function internalMeetingLink(req, meetingCode) {
  return new URL(`/ssr-app/meeting/${meetingCode}`, req.url).toString();
}

function invitationText(meeting, joinPassword) {
  const recurrence = meeting.recurrence && meeting.recurrence !== 'none' ? ` (${meeting.recurrence})` : '';
  return [
    `**Meeting Scheduled: ${meeting.title}**${recurrence}`,
    `${meeting.date} ${meeting.time}-${meeting.endTime || ''}`,
    `[Join SJ Meeting](${meeting.link})`,
    `Meeting ID: ${meeting.meetingCode}`,
    `Password: ${joinPassword}`,
  ].filter(Boolean).join('\n');
}

async function addInvitationMessage(chat, meeting, host, joinPassword) {
  const recipients = (chat.participants || []).filter(id => id !== host.id);
  const unreadBy = chat.unreadBy && typeof chat.unreadBy === 'object' && !Array.isArray(chat.unreadBy)
    ? { ...chat.unreadBy }
    : {};
  recipients.forEach(id => { unreadBy[id] = Number(unreadBy[id] || 0) + 1; });
  await prisma.$transaction([
    prisma.appMessage.create({
      data: buildMessageData({
        chatId: chat.id,
        senderId: host.id,
        senderName: host.name,
        senderInitials: host.initials,
        senderColor: host.color,
        senderAvatar: host.avatar,
        content: invitationText(meeting, joinPassword),
        isSystem: true,
      }),
    }),
    prisma.appChat.update({ where: { id: chat.id }, data: { unreadBy, updatedAt: new Date() } }),
  ]);
}

async function findOrCreateDirectChat(hostId, recipientId) {
  const candidates = await prisma.appChat.findMany({
    where: { type: 'direct', participants: { hasEvery: [hostId, recipientId] } },
  });
  const existing = candidates.find(chat => chat.participants.length === 2);
  if (existing) return existing;
  return prisma.appChat.create({
    data: buildChatData({ type: 'direct', participants: [hostId, recipientId], createdBy: hostId }),
  });
}

async function sendMeetingInvitations({ meeting, host, joinPassword, groupChat = null, directRecipientIds = [] }) {
  if (groupChat) await addInvitationMessage(groupChat, meeting, host, joinPassword);
  for (const recipientId of directRecipientIds) {
    const chat = await findOrCreateDirectChat(host.id, recipientId);
    await addInvitationMessage(chat, meeting, host, joinPassword);
  }
}

async function validInvitees(ids, hostId) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map(value => String(value || '').trim()).filter(id => id && id !== hostId))];
  if (!uniqueIds.length) return [];
  const users = await prisma.appUser.findMany({
    where: { id: { in: uniqueIds }, restricted: false },
    select: { id: true },
  });
  return users.map(user => user.id);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');
    const userId = searchParams.get('userId');
    const viewer = userId ? await prisma.appUser.findUnique({ where: { id: userId } }) : null;

    if (id || code) {
      const meeting = id
        ? await prisma.appMeeting.findUnique({ where: { id } })
        : await prisma.appMeeting.findFirst({ where: { meetingCode: code } });
      if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
      if (!canViewMeeting(viewer, meeting)) {
        return NextResponse.json({ error: 'This meeting was not shared with your account.' }, { status: 403 });
      }
      const safeMeeting = sanitizeMeeting(meeting);

      if (searchParams.get('includeCredentials') === 'true' && userId) {
        if (!canManageMeeting(viewer, meeting)) {
          return NextResponse.json({ error: 'Only the host or authorized staff can view the password.' }, { status: 403 });
        }
        return NextResponse.json({
          ...safeMeeting,
          joinPassword: meeting.passwordEncrypted ? decryptCredential(meeting.passwordEncrypted) : null,
        });
      }
      return NextResponse.json(safeMeeting);
    }

    if (!viewer || viewer.restricted) return NextResponse.json([]);
    const meetings = await prisma.appMeeting.findMany({
      where: ['Employee', 'Admin', 'Super Admin'].includes(viewer.role)
        ? {}
        : { OR: [{ hostId: viewer.id }, { participants: { has: viewer.id } }] },
      orderBy: { createdAt: 'desc' },
    });
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
    const host = await prisma.appUser.findUnique({ where: { id: data.hostId } });
    if (!canPlanMeeting(host)) {
      return NextResponse.json({ error: 'You do not have permission to schedule meetings.' }, { status: 403 });
    }

    let groupChat = null;
    let participantIds = [];
    if (data.chatId) {
      groupChat = await prisma.appChat.findUnique({ where: { id: data.chatId } });
      if (!groupChat || groupChat.type !== 'group') {
        return NextResponse.json({ error: 'Choose a valid group.' }, { status: 400 });
      }
      const canUseGroup = ['Admin', 'Super Admin'].includes(host.role) || groupChat.participants.includes(host.id);
      if (!canUseGroup) return NextResponse.json({ error: 'You are not a member of this group.' }, { status: 403 });
      participantIds = await validInvitees(groupChat.participants, host.id);
    } else {
      participantIds = await validInvitees(data.participants, host.id);
      if (!participantIds.length) {
        return NextResponse.json({ error: 'Select at least one person for the meeting.' }, { status: 400 });
      }
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
          module: groupChat?.name || data.module || 'General',
          chatId: groupChat?.id || null,
          participants: participantIds,
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

    try {
      await sendMeetingInvitations({
        meeting: newMeeting,
        host,
        joinPassword,
        groupChat,
        directRecipientIds: groupChat ? [] : participantIds,
      });
      await notifyUsers(participantIds, {
        title: 'New meeting scheduled',
        body: `${newMeeting.title} - ${newMeeting.date} ${newMeeting.time}`,
        url: `/ssr-app/home?section=meetings&meetingId=${encodeURIComponent(newMeeting.id)}`,
        data: { type: 'meeting', meetingId: newMeeting.id },
      });
    } catch (deliveryError) {
      await prisma.appMeeting.delete({ where: { id: newMeeting.id } }).catch(() => {});
      throw deliveryError;
    }
    return NextResponse.json({ ...sanitizeMeeting(newMeeting), joinPassword });
  } catch (error) {
    console.error('Meetings POST API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, userId, action, participantIds = [] } = await req.json();
    if (!id || !userId || !['end', 'addParticipants'].includes(action)) {
      return NextResponse.json({ error: 'Meeting, user, and a valid action are required.' }, { status: 400 });
    }
    const [meeting, user] = await Promise.all([
      prisma.appMeeting.findUnique({ where: { id } }),
      prisma.appUser.findUnique({ where: { id: userId } }),
    ]);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    if (!canManageMeeting(user, meeting)) return NextResponse.json({ error: 'Only the host or authorized staff can manage this meeting.' }, { status: 403 });

    if (action === 'addParticipants') {
      if (meeting.status === 'completed' || meeting.endedAt || (meeting.expiresAt && meeting.expiresAt <= new Date())) {
        return NextResponse.json({ error: 'People cannot be added after the meeting has ended.' }, { status: 409 });
      }
      const requestedIds = await validInvitees(participantIds, meeting.hostId);
      const newIds = requestedIds.filter(participantId => !meeting.participants.includes(participantId));
      if (!newIds.length) return NextResponse.json({ error: 'Select at least one person who is not already invited.' }, { status: 400 });
      const previousParticipants = meeting.participants || [];
      const updated = await prisma.appMeeting.update({
        where: { id },
        data: { participants: [...new Set([...previousParticipants, ...newIds])] },
      });
      const host = await prisma.appUser.findUnique({ where: { id: meeting.hostId } });
      const joinPassword = meeting.passwordEncrypted ? decryptCredential(meeting.passwordEncrypted) : '';
      try {
        if (host) await sendMeetingInvitations({ meeting: updated, host, joinPassword, directRecipientIds: newIds });
        await notifyUsers(newIds, {
          title: 'Added to a meeting',
          body: `${updated.title} - ${updated.date} ${updated.time}`,
          url: `/ssr-app/home?section=meetings&meetingId=${encodeURIComponent(updated.id)}`,
          data: { type: 'meeting', meetingId: updated.id },
        });
      } catch (deliveryError) {
        await prisma.appMeeting.update({ where: { id }, data: { participants: previousParticipants } }).catch(() => {});
        throw deliveryError;
      }
      return NextResponse.json(sanitizeMeeting(updated));
    }

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
    const userId = searchParams.get('userId');
    if (!id || !userId) return NextResponse.json({ error: 'Meeting and user are required.' }, { status: 400 });
    const [meeting, user] = await Promise.all([
      prisma.appMeeting.findUnique({ where: { id } }),
      prisma.appUser.findUnique({ where: { id: userId } }),
    ]);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    if (!canManageMeeting(user, meeting)) {
      return NextResponse.json({ error: 'Only the host or authorized staff can delete this meeting.' }, { status: 403 });
    }
    await prisma.$transaction([
      prisma.appMeetingSignal.deleteMany({ where: { meetingId: id } }),
      prisma.appMeetingParticipant.deleteMany({ where: { meetingId: id } }),
      prisma.appTrainingReport.deleteMany({ where: { meetingId: id } }),
      prisma.appMeeting.delete({ where: { id } }),
    ]);
    await notifyUsers((meeting.participants || []).filter(participantId => participantId !== userId), {
      title: 'Meeting cancelled',
      body: `${meeting.title} has been cancelled.`,
      url: '/ssr-app/home?section=meetings',
      data: { type: 'meeting-cancelled', meetingId: meeting.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meetings DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
