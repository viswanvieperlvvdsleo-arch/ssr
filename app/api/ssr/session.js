import { prisma } from './prisma';
import { createSessionValue, readSessionValue, SESSION_COOKIE, SESSION_AGE_SECONDS } from './sessionToken';
export { SESSION_COOKIE } from './sessionToken';
export const SJ_USER_FILTER = { OR: [{ companyId: null }, { companyId: { isSet: false } }] };

export function attachSession(response, user) {
  response.cookies.set(SESSION_COOKIE, createSessionValue(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_AGE_SECONDS,
  });
  return response;
}

export async function getSessionActor(request) {
  const session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const actor = await prisma.appUser.findUnique({ where: { id: session.id } });
  if (!actor || actor.restricted || (actor.companyId || null) !== session.companyId) return null;
  return actor;
}

export function isSjStaff(user) {
  return Boolean(user && !user.companyId && ['Super Admin', 'Admin', 'Employee'].includes(user.role));
}

export function publicAccount(user) {
  if (!user) return null;
  const { password: _password, ...account } = user;
  return account;
}
