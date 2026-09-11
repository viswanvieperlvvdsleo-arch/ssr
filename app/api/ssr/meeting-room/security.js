import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { localDateTimeToUtc } from '../schedule';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function accessSecret() {
  const value = process.env.SERVER_CREDENTIAL_ENCRYPTION_KEY;
  if (!value) throw new Error('SERVER_CREDENTIAL_ENCRYPTION_KEY is not configured');
  return createHash('sha256').update(`meeting-room:${value}`).digest();
}

export function generateMeetingCode() {
  return String(randomInt(1_000_000_000, 10_000_000_000));
}

export function generateMeetingPassword(length = 6) {
  return Array.from({ length }, () => PASSWORD_CHARS[randomInt(0, PASSWORD_CHARS.length)]).join('');
}

export function hashMeetingPassword(password, salt = randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: scryptSync(String(password), salt, 32).toString('hex'),
  };
}

export function verifyMeetingPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) return false;
  const received = scryptSync(String(password), salt, 32);
  const expected = Buffer.from(expectedHash, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function durationMinutes(duration) {
  const match = String(duration || '').match(/([\d.]+)\s*(hour|hr|minute|min)/i);
  if (!match) return 60;
  return Math.max(1, Math.round(Number(match[1]) * (match[2].toLowerCase().startsWith('h') ? 60 : 1)));
}

export function deriveEndTime(startTime, duration) {
  const [hour, minute] = String(startTime || '00:00').split(':').map(Number);
  const total = hour * 60 + minute + durationMinutes(duration);
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function meetingExpiry(data) {
  const date = data.endDate || data.date;
  const endTime = data.endTime || deriveEndTime(data.time, data.duration);
  return localDateTimeToUtc(date, endTime, data.timezone || 'Asia/Kolkata');
}

export function sanitizeMeeting(meeting) {
  if (!meeting) return meeting;
  const { passwordHash, passwordSalt, passwordEncrypted, ...safeMeeting } = meeting;
  return safeMeeting;
}

export function createRoomToken({ meetingId, userId, peerId, role, expiresAt }) {
  const payload = Buffer.from(JSON.stringify({ meetingId, userId, peerId, role, exp: expiresAt.getTime() })).toString('base64url');
  const signature = createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readRoomToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!value.meetingId || !value.userId || !value.peerId || Number(value.exp) <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}
