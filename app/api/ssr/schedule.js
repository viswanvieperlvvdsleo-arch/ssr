const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VALID_RECURRENCES = new Set(['none', 'daily', 'weekly', 'monthly']);
export const DEFAULT_SCHEDULE_TIMEZONE = 'Asia/Kolkata';

export function parseScheduleDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const result = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (date.getUTCFullYear() !== result.year || date.getUTCMonth() !== result.month - 1 || date.getUTCDate() !== result.day) return null;
  return result;
}

export function parseScheduleTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function isValidTimezone(timezone) {
  if (!timezone) return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function validateScheduleFields(data = {}, dateKey = 'startDate') {
  const startDate = data[dateKey] || data.date;
  if (!parseScheduleDate(startDate)) return 'Choose a valid start date.';
  if (!parseScheduleTime(data.time)) return 'Choose a valid time.';
  if (data.endDate && !parseScheduleDate(data.endDate)) return 'Choose a valid end date.';
  if (data.endDate && data.endDate < startDate) return 'End date cannot be before the start date.';
  if (!VALID_RECURRENCES.has(data.recurrence || 'none')) return 'Choose a valid repeat interval.';
  if (!isValidTimezone(data.timezone)) return 'The selected timezone is not valid.';

  if (data.recurrence === 'weekly' && (!Array.isArray(data.weekdays) || data.weekdays.length === 0)) {
    return 'Choose at least one weekday.';
  }
  if (Array.isArray(data.weekdays) && data.weekdays.some(day => !WEEKDAYS.includes(day))) {
    return 'One or more selected weekdays are invalid.';
  }
  if (data.recurrence === 'monthly' && data.monthlyDates) {
    const dates = String(data.monthlyDates).split(',').map(value => Number(value.trim()));
    if (dates.some(value => !Number.isInteger(value) || value < 1 || value > 31)) return 'Monthly dates must be between 1 and 31.';
  }
  return null;
}

function timezoneOffsetMinutes(date, timezone) {
  const value = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(date).find(part => part.type === 'timeZoneName')?.value || 'GMT';
  const match = value.match(/^GMT([+-])(\d{2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
  return match[1] === '+' ? minutes : -minutes;
}

export function localDateTimeToUtc(dateValue, timeValue, timezone) {
  const date = parseScheduleDate(dateValue);
  const time = parseScheduleTime(timeValue);
  if (!date || !time) return null;
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute);
  let utc = localAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    utc = localAsUtc - timezoneOffsetMinutes(new Date(utc), timezone) * 60000;
  }
  return new Date(utc);
}

function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

function dateString(date) {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function inspectSchedule(item, now = new Date(), dateKey = 'startDate') {
  const timezone = isValidTimezone(item.timezone) && item.timezone ? item.timezone : DEFAULT_SCHEDULE_TIMEZONE;
  const start = parseScheduleDate(item[dateKey] || item.date);
  const time = parseScheduleTime(item.time);
  if (!start || !time) return { state: 'invalid', reason: 'invalid-date-or-time', timezone };

  const nowParts = zonedParts(now, timezone);
  const today = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
  const startDate = dateString(start);
  if (today < startDate) return { state: 'future', timezone };
  if (item.endDate && today > item.endDate) return { state: 'expired', timezone };

  const recurrence = item.recurrence || 'none';
  if (!VALID_RECURRENCES.has(recurrence)) return { state: 'invalid', reason: 'invalid-recurrence', timezone };
  let occurrenceDate = today;
  if (recurrence === 'none') occurrenceDate = startDate;

  if (recurrence === 'weekly') {
    const weekdays = Array.isArray(item.weekdays) ? item.weekdays : [];
    const defaultWeekday = WEEKDAYS[new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay()];
    if (!(weekdays.length ? weekdays.includes(nowParts.weekday) : nowParts.weekday === defaultWeekday)) {
      return { state: 'inactive', timezone };
    }
  }

  if (recurrence === 'monthly') {
    const monthDates = String(item.monthlyDates || '').split(',').map(Number).filter(value => value >= 1 && value <= 31);
    if (!(monthDates.length ? monthDates.includes(Number(nowParts.day)) : Number(nowParts.day) === start.day)) {
      return { state: 'inactive', timezone };
    }
  }

  const dueAt = localDateTimeToUtc(occurrenceDate, item.time, timezone);
  if (!dueAt) return { state: 'invalid', reason: 'invalid-occurrence', timezone };
  if (now < dueAt) return { state: 'future', dueAt, timezone };
  return { state: 'due', dueAt, timezone };
}
