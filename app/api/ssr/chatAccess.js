import { prisma } from './prisma';
import { getSessionActor, SJ_USER_FILTER } from './session';

export async function accessibleChats(request) {
  const actor = await getSessionActor(request);
  if (!actor) return { actor: null, chats: [] };

  if (actor.companyId) {
    const [companyUsers, sjStaff, chats] = await Promise.all([
      prisma.appUser.findMany({ where: { companyId: actor.companyId }, select: { id: true } }),
      prisma.appUser.findMany({ where: { ...SJ_USER_FILTER, role: { in: ['Super Admin', 'Admin', 'Employee'] }, restricted: false }, select: { id: true } }),
      prisma.appChat.findMany({ orderBy: { updatedAt: 'desc' } }),
    ]);
    const permittedIds = new Set([...companyUsers, ...sjStaff].map(user => user.id));
    return {
      actor,
      chats: chats.filter(chat =>
        (chat.participants || []).includes(actor.id)
        && (chat.participants || []).every(userId => permittedIds.has(userId))
      ),
    };
  }

  const [chats, companyUsers] = await Promise.all([
    prisma.appChat.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.appUser.findMany({
      where: { companyId: { not: null } },
      select: { id: true },
    }),
  ]);
  const companyIds = new Set(companyUsers.map(user => user.id));
  const staffAccess = ['Admin', 'Super Admin'].includes(actor.role)
    || (actor.role === 'Employee' && (actor.permissions || []).some(permission => ['view_chats', 'all_access'].includes(permission)));
  const visible = chats.filter(chat => {
    if ((chat.participants || []).includes(actor.id)) return true;
    if (chat.type === 'support' && staffAccess) return true;
    if ((chat.participants || []).some(id => companyIds.has(id))) return false;
    return staffAccess;
  });
  return { actor, chats: visible };
}
