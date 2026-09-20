import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { getSessionActor, SJ_USER_FILTER } from '../session';

const ADMIN_ROLES = ['Admin', 'Super Admin'];

function callDuration(call) {
  if (Number.isFinite(call.duration)) return Math.max(0, call.duration);
  if (!call.startedAt || !call.endedAt) return 0;
  return Math.max(0, Math.floor((new Date(call.endedAt) - new Date(call.startedAt)) / 1000));
}

export async function GET(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const requestedScope = searchParams.get('scope') === 'all' ? 'all' : 'my';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    if (!prisma.appDirectCall) return NextResponse.json({ logs: [], total: 0, page, limit, summary: {} });
    if (requestedScope === 'all' && !ADMIN_ROLES.includes(actor.role)) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    let managedUserIds = [actor.id];
    let where;
    if (targetUserId) {
      where = { OR: [{ callerId: actor.id, calleeId: targetUserId }, { callerId: targetUserId, calleeId: actor.id }] };
    } else if (requestedScope === 'all') {
      if (actor.role === 'Super Admin' && !actor.companyId) {
        where = {};
        const sjUsers = await prisma.appUser.findMany({ where: SJ_USER_FILTER, select: { id: true } });
        managedUserIds = sjUsers.map(user => user.id);
      } else {
        const managedUsers = await prisma.appUser.findMany({
          where: actor.companyId ? { companyId: actor.companyId } : SJ_USER_FILTER,
          select: { id: true },
        });
        managedUserIds = managedUsers.map(user => user.id);
        where = { OR: [{ callerId: { in: managedUserIds } }, { calleeId: { in: managedUserIds } }] };
      }
    } else {
      where = { OR: [{ callerId: actor.id }, { calleeId: actor.id }] };
    }

    const select = {
      id: true, callerId: true, calleeId: true, callerName: true, calleeName: true,
      type: true, status: true, duration: true, createdAt: true, startedAt: true, endedAt: true,
    };
    const [logs, total, summaryCalls] = await Promise.all([
      prisma.appDirectCall.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, select }),
      prisma.appDirectCall.count({ where }),
      prisma.appDirectCall.findMany({ where, select }),
    ]);

    const enrich = call => ({ ...call, duration: callDuration(call), isOutgoing: call.callerId === actor.id });
    const organizationIds = new Set(managedUserIds);
    const incoming = summaryCalls.filter(call => requestedScope === 'all'
      ? organizationIds.size > 0 && organizationIds.has(call.calleeId) && !organizationIds.has(call.callerId)
      : call.calleeId === actor.id).length;
    const outgoing = summaryCalls.filter(call => requestedScope === 'all'
      ? organizationIds.has(call.callerId)
      : call.callerId === actor.id).length;
    const answered = summaryCalls.filter(call => ['accepted', 'ended'].includes(call.status) && call.startedAt).length;
    const participantIds = new Set(summaryCalls.flatMap(call => [call.callerId, call.calleeId]));
    if (requestedScope !== 'all') participantIds.delete(actor.id);

    return NextResponse.json({
      logs: logs.map(enrich), total, page, limit, scope: requestedScope,
      summary: {
        total, incoming, outgoing, answered,
        notAnswered: Math.max(0, total - answered),
        totalDuration: summaryCalls.reduce((sum, call) => sum + callDuration(call), 0),
        people: participantIds.size,
      },
    });
  } catch (error) {
    console.error('Call logs GET error:', error);
    return NextResponse.json({ error: 'Could not load call history' }, { status: 500 });
  }
}
