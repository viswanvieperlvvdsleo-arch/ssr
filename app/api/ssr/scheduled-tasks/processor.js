import { prisma } from '../prisma';
import { getSupportRecipientIds, notifyUsers } from '../notify';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || DEFAULT_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

function timezoneOffsetMinutes(date, timezone) {
  const value = new Intl.DateTimeFormat('en-US', { timeZone: timezone || DEFAULT_TIMEZONE, timeZoneName: 'longOffset' })
    .formatToParts(date).find(part => part.type === 'timeZoneName')?.value || 'GMT';
  const match = value.match(/^GMT([+-])(\d{2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
  return match[1] === '+' ? minutes : -minutes;
}

function localDateTimeToUtc(dateValue, timeValue, timezone) {
  const date = parseDate(dateValue);
  const time = parseTime(timeValue);
  if (!date || !time) return null;
  let utc = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    utc = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute) - timezoneOffsetMinutes(new Date(utc), timezone) * 60000;
  }
  return new Date(utc);
}

function localDateString(parts) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isWithinDateRange(date, startDate, endDate) {
  if (!startDate || date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function getOccurrence(item, now, dateKey = 'startDate') {
  const timezone = item.timezone || DEFAULT_TIMEZONE;
  const start = parseDate(item[dateKey] || item.date);
  const nowParts = zonedParts(now, timezone);
  const today = localDateString(nowParts);
  const endDate = item.endDate || null;
  if (!start || !parseTime(item.time) || !isWithinDateRange(today, `${String(start.year).padStart(4, '0')}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`, endDate)) return null;

  const recurrence = item.recurrence || 'none';
  let occurrenceDate = today;
  if (recurrence === 'none') occurrenceDate = `${String(start.year).padStart(4, '0')}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`;
  if (recurrence === 'weekly') {
    const weekdays = Array.isArray(item.weekdays) ? item.weekdays : [];
    if (weekdays.length ? !weekdays.includes(nowParts.weekday) : nowParts.weekday !== WEEKDAYS[new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay()]) return null;
  }
  if (recurrence === 'monthly') {
    const monthDates = String(item.monthlyDates || '').split(',').map(Number).filter(Boolean);
    if (monthDates.length ? !monthDates.includes(Number(nowParts.day)) : Number(nowParts.day) !== start.day) return null;
  }

  const dueAt = localDateTimeToUtc(occurrenceDate, item.time, timezone);
  if (!dueAt || now < dueAt) return null;
  return { dueAt, timezone, nowParts };
}

function wasAlreadyHandled(lastHandledAt, dueAt) {
  return Boolean(lastHandledAt && new Date(lastHandledAt).getTime() >= dueAt.getTime());
}

async function sendScheduledMessage(item, occurrence) {
  const chat = await prisma.appChat.findUnique({ where: { id: item.chatId } });
  if (!chat) throw new Error(`Scheduled message chat ${item.chatId} was not found`);
  const sender = await prisma.appUser.findUnique({ where: { id: item.senderId }, select: { name: true, initials: true, color: true, avatar: true } });
  const message = await prisma.appMessage.create({
    data: {
      chatId: item.chatId,
      senderId: item.senderId,
      senderName: sender?.name || 'Scheduled message',
      senderInitials: sender?.initials || 'U',
      senderColor: sender?.color || '#0A6ED1',
      senderAvatar: sender?.avatar || null,
      content: item.content || '',
      timestamp: occurrence.dueAt.toLocaleTimeString([], { timeZone: occurrence.timezone, hour: '2-digit', minute: '2-digit' }),
      attachment: item.attachment || null,
    },
  });
  const unreadBy = chat.unreadBy && typeof chat.unreadBy === 'object' && !Array.isArray(chat.unreadBy) ? { ...chat.unreadBy } : {};
  const participantRecipients = (chat.participants || []).filter(id => id !== item.senderId && !(chat.mutedBy || []).includes(id));
  const recipientIds = chat.type === 'support'
    ? [...new Set([...participantRecipients, ...(await getSupportRecipientIds(item.senderId))])]
    : participantRecipients;
  recipientIds.forEach(id => { unreadBy[id] = Number(unreadBy[id] || 0) + 1; });
  await prisma.appChat.update({ where: { id: item.chatId }, data: { updatedAt: new Date(), unreadBy } });
  await notifyUsers(recipientIds, {
    title: chat.type === 'group' ? (chat.name || 'New group message') : (sender?.name || 'New message'),
    body: message.content || (message.attachment ? 'Sent an attachment' : 'You have a new message'),
    url: `/ssr-app/home?chatId=${encodeURIComponent(chat.id)}&messageId=${encodeURIComponent(message.id)}`,
    data: { type: 'chat', chatId: chat.id, messageId: message.id, scheduled: 'true' },
  });
  return message;
}

async function processScheduledMessages(now) {
  const items = await prisma.appScheduledMessage.findMany({ orderBy: { createdAt: 'asc' } });
  let sent = 0;
  for (const item of items) {
    if ((item.status || 'scheduled') !== 'scheduled') continue;
    const occurrence = getOccurrence(item, now);
    if (!occurrence || wasAlreadyHandled(item.lastSentAt, occurrence.dueAt)) continue;
    const claim = await prisma.appScheduledMessage.updateMany({
      // The idempotency check also supports records created before status was added.
      where: { id: item.id, OR: [{ lastSentAt: null }, { lastSentAt: { lt: occurrence.dueAt } }] },
      data: { lastSentAt: occurrence.dueAt, ...(item.recurrence === 'none' ? { status: 'sent' } : {}) },
    });
    if (!claim.count) continue;
    try {
      await sendScheduledMessage(item, occurrence);
      sent += 1;
    } catch (error) {
      await prisma.appScheduledMessage.update({ where: { id: item.id }, data: { status: 'scheduled', lastSentAt: null } }).catch(() => {});
      console.error('Scheduled message processing failed:', error);
    }
  }
  return sent;
}

async function processMeetingNotifications(now) {
  const meetings = await prisma.appMeeting.findMany({ orderBy: { createdAt: 'asc' } });
  let notified = 0;
  for (const meeting of meetings) {
    if (['cancelled', 'completed'].includes(String(meeting.status || '').toLowerCase())) continue;
    const occurrence = getOccurrence({ ...meeting, startDate: meeting.date }, now, 'startDate');
    if (!occurrence || wasAlreadyHandled(meeting.lastNotificationAt, occurrence.dueAt)) continue;
    const claim = await prisma.appMeeting.updateMany({
      where: { id: meeting.id, OR: [{ lastNotificationAt: null }, { lastNotificationAt: { lt: occurrence.dueAt } }] },
      data: { lastNotificationAt: occurrence.dueAt },
    });
    if (!claim.count) continue;
    let recipientIds = Array.isArray(meeting.participants) ? meeting.participants : [];
    if (meeting.chatId) {
      const chat = await prisma.appChat.findUnique({ where: { id: meeting.chatId }, select: { participants: true } });
      recipientIds = [...new Set([...recipientIds, ...(chat?.participants || [])])];
    }
    await notifyUsers(recipientIds.filter(id => id !== meeting.hostId), {
      title: 'Meeting starting now',
      body: meeting.title || 'Your scheduled meeting is starting now.',
      url: `/ssr-app/home?section=meetings&meetingId=${encodeURIComponent(meeting.id)}`,
      data: { type: 'meeting-time', meetingId: meeting.id },
    });
    notified += 1;
  }
  return notified;
}

export async function processDueScheduledTasks(now = new Date()) {
  const [scheduledMessages, meetingNotifications] = await Promise.all([
    processScheduledMessages(now),
    processMeetingNotifications(now),
  ]);
  return { scheduledMessages, meetingNotifications };
}
