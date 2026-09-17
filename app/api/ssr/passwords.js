import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt-v1';

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, 64);
  return `${PREFIX}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || typeof password !== 'string') return false;
  if (!stored.startsWith(`${PREFIX}$`)) return stored === password;
  const parts = stored.split('$');
  if (parts.length !== 3 || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{128}$/.test(parts[2])) return false;
  const received = scryptSync(password, Buffer.from(parts[1], 'hex'), 64);
  return timingSafeEqual(received, Buffer.from(parts[2], 'hex'));
}
