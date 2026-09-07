import { prisma } from '../prisma';
import { getSupportRecipientIds, notifyUsers } from '../notify';
import { inspectSchedule } from '../schedule';

const MEETING_NOTIFICATION_GRACE_MS = 15 * 60 * 1000;
const scheduledStatusFilter = () => ({
  OR: [{ status: 'scheduled' }, { status: null }, { status: { isSet: false } }],
});

function wasAlreadyHandled(lastHandledAt, dueAt) {
  return Boolean(lastHandledAt && new Date(lastHandledAt).getTime() >= dueAt.getTime());
}

async function sendScheduledMessage(item, occurrence) {
  const chat = await prisma.appChat.findUnique({ where: { id: item.chatId } });
  if (!chat) throw new Error(`Scheduled message chat ${item.chatId} was not found`);
  const sender = await prisma.appUser.findUnique({ where: { id: item.senderId }, select: { name: true, initials: true, color: true, avatar: true } });
  const messageData = {
      chatId: item.chatId,
      senderId: item.senderId,
      senderName: sender?.name || 'Scheduled message',
      senderInitials: sender?.initials || 'U',
      senderColor: sender?.color || '#0A6ED1',
      senderAvatar: sender?.avatar || null,
      content: item.content || '',
      timestamp: occurrence.dueAt.toLocaleTimeString([], { timeZone: occurrence.timezone, hour: '2-digit', minute: '2-digit' }),
      attachment: item.attachment || null,
  };
  const unreadBy = chat.unreadBy && typeof chat.unreadBy === 'object' && !Array.isArray(chat.unreadBy) ? { ...chat.unreadBy } : {};
  const participantRecipients = (chat.participants || []).filter(id => id !== item.senderId && !(chat.mutedBy || []).includes(id));
  const recipientIds = chat.type === 'support'
    ? [...new Set([...participantRecipients, ...(await getSupportRecipientIds(item.senderId))])]
    : participantRecipients;
  recipientIds.forEach(id => { unreadBy[id] = Number(unreadBy[id] || 0) + 1; });
  const [message] = await prisma.$transaction([
    prisma.appMessage.create({ data: messageData }),
    prisma.appChat.update({ where: { id: item.chatId }, data: { updatedAt: new Date(), unreadBy } }),
  ]);
  await notifyUsers(recipientIds, {
    title: chat.type === 'group' ? (chat.name || 'New group message') : (sender?.name || 'New message'),
    body: message.content || (message.attachment ? 'Sent an attachment' : 'You have a new message'),
    url: `/ssr-app/home?chatId=${encodeURIComponent(chat.id)}&messageId=${encodeURIComponent(message.id)}`,
    data: { type: 'chat', chatId: chat.id, messageId: message.id, scheduled: 'true' },
  });
  return message;
}

async function processScheduledMessages(now) {
  const items = await prisma.appScheduledMessage.findMany({
    where: scheduledStatusFilter(),
    orderBy: { createdAt: 'asc' },
  });
  const result = { examined: items.length, sent: 0, expired: 0, invalid: 0, failures: [] };
  for (const item of items) {
    const occurrence = inspectSchedule(item, now);
    if (occurrence.state === 'expired' || occurrence.state === 'invalid') {
      await prisma.appScheduledMessage.updateMany({
        where: { id: item.id, ...scheduledStatusFilter() },
        data: { status: occurrence.state },
      });
      result[occurrence.state] += 1;
      continue;
    }
    if (occurrence.state !== 'due' || wasAlreadyHandled(item.lastSentAt, occurrence.dueAt)) continue;
    const claim = await prisma.appScheduledMessage.updateMany({
      where: {
        id: item.id,
        AND: [
          scheduledStatusFilter(),
          { OR: [{ lastSentAt: null }, { lastSentAt: { isSet: false } }, { lastSentAt: { lt: occurrence.dueAt } }] },
        ],
      },
      data: { lastSentAt: occurrence.dueAt, ...(item.recurrence === 'none' ? { status: 'sent' } : {}) },
    });
    if (!claim.count) continue;
    try {
      await sendScheduledMessage(item, occurrence);
      result.sent += 1;
    } catch (error) {
      await prisma.appScheduledMessage.updateMany({
        where: { id: item.id, lastSentAt: occurrence.dueAt },
        data: { status: 'scheduled', lastSentAt: null },
      }).catch(() => {});
      console.error('Scheduled message processing failed:', error);
      result.failures.push({ id: item.id, error: error.message || 'Unknown dispatch error' });
    }
  }
  return result;
}

async function processMeetingNotifications(now) {
  const meetings = await prisma.appMeeting.findMany({ orderBy: { createdAt: 'asc' } });
  const result = { examined: meetings.length, notified: 0, missed: 0, failures: [] };
  for (const meeting of meetings) {
    if (['cancelled', 'completed'].includes(String(meeting.status || '').toLowerCase())) continue;
    const occurrence = inspectSchedule({ ...meeting, startDate: meeting.date }, now);
    if (occurrence.state !== 'due' || wasAlreadyHandled(meeting.lastNotificationAt, occurrence.dueAt)) continue;
    if (now.getTime() - occurrence.dueAt.getTime() > MEETING_NOTIFICATION_GRACE_MS) {
      const missedClaim = await prisma.appMeeting.updateMany({
        where: { id: meeting.id, OR: [{ lastNotificationAt: null }, { lastNotificationAt: { isSet: false } }, { lastNotificationAt: { lt: occurrence.dueAt } }] },
        data: { lastNotificationAt: occurrence.dueAt, ...(meeting.recurrence === 'none' ? { status: 'completed' } : {}) },
      });
      result.missed += missedClaim.count;
      continue;
    }
    const claim = await prisma.appMeeting.updateMany({
      where: { id: meeting.id, OR: [{ lastNotificationAt: null }, { lastNotificationAt: { isSet: false } }, { lastNotificationAt: { lt: occurrence.dueAt } }] },
      data: { lastNotificationAt: occurrence.dueAt },
    });
    if (!claim.count) continue;
    let recipientIds = Array.isArray(meeting.participants) ? meeting.participants : [];
    if (meeting.chatId) {
      const chat = await prisma.appChat.findUnique({ where: { id: meeting.chatId }, select: { participants: true } });
      recipientIds = [...new Set([...recipientIds, ...(chat?.participants || [])])];
    }
    try {
      await notifyUsers(recipientIds.filter(id => id !== meeting.hostId), {
        title: 'Meeting starting now',
        body: meeting.title || 'Your scheduled meeting is starting now.',
        url: `/ssr-app/home?section=meetings&meetingId=${encodeURIComponent(meeting.id)}`,
        data: { type: 'meeting-time', meetingId: meeting.id },
      });
      result.notified += 1;
    } catch (error) {
      await prisma.appMeeting.updateMany({
        where: { id: meeting.id, lastNotificationAt: occurrence.dueAt },
        data: { lastNotificationAt: null },
      }).catch(() => {});
      console.error('Meeting notification processing failed:', error);
      result.failures.push({ id: meeting.id, error: error.message || 'Unknown notification error' });
    }
  }
  return result;
}

export async function processDueScheduledTasks(now = new Date()) {
  const [messageResult, meetingResult] = await Promise.all([
    processScheduledMessages(now),
    processMeetingNotifications(now),
  ]);
  return {
    checkedAt: now.toISOString(),
    scheduledMessages: messageResult.sent,
    meetingNotifications: meetingResult.notified,
    details: { scheduledMessages: messageResult, meetingNotifications: meetingResult },
  };
}
