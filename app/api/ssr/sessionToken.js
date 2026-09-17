import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'sj_app_session';
export const SESSION_AGE_SECONDS = 24 * 60 * 60;

function signingKey() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SERVER_CREDENTIAL_ENCRYPTION_KEY;
  if (!secret) throw new Error('An auth session secret is required');
  return createHmac('sha256', secret).update('sj-app-session-v1').digest();
}

export function createSessionValue(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    companyId: user.companyId || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS,
  })).toString('base64url');
  const signature = createHmac('sha256', signingKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSessionValue(value) {
  if (!value || typeof value !== 'string') return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', signingKey()).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.id && session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}
