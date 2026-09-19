import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { getSessionActor } from '../session';

// GET /api/ssr/call-logs?userId=<targetUserId>
// Returns call history between the current user and the given target user.
// Falls back to calls only involving the current user if no userId is provided.
export async function GET(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    if (!prisma.appDirectCall) {
      return NextResponse.json({ logs: [], total: 0, page, limit });
    }

    // Build where clause
    const where = targetUserId
      ? {
          OR: [
            { callerId: actor.id, calleeId: targetUserId },
            { callerId: targetUserId, calleeId: actor.id },
          ],
        }
      : {
          OR: [
            { callerId: actor.id },
            { calleeId: actor.id },
          ],
        };

    const [logs, total] = await Promise.all([
      prisma.appDirectCall.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          callerId: true,
          calleeId: true,
          callerName: true,
          calleeName: true,
          type: true,
          status: true,
          createdAt: true,
          startedAt: true,
          endedAt: true,
        },
      }),
      prisma.appDirectCall.count({ where }),
    ]);

    // Compute duration in seconds for each call
    const enriched = logs.map((log) => {
      let duration = null;
      if (log.startedAt && log.endedAt) {
        duration = Math.max(0, Math.floor((new Date(log.endedAt) - new Date(log.startedAt)) / 1000));
      }
      const isOutgoing = log.callerId === actor.id;
      return { ...log, duration, isOutgoing };
    });

    return NextResponse.json({ logs: enriched, total, page, limit });
  } catch (err) {
    console.error('Call logs GET error:', err);
    return NextResponse.json({ logs: [], total: 0 });
  }
}
