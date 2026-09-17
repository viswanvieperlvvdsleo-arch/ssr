import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { getSessionActor } from '../../session';

export async function POST(req) {
  try {
    const { userId, online, observedAt } = await req.json();
    const actor = await getSessionActor(req);
    if (!actor || actor.id !== userId || actor.companyId) return NextResponse.json({ error: 'Account access denied' }, { status: 403 });
    if (!/^[a-f\d]{24}$/i.test(String(userId || ''))) {
      return NextResponse.json({ error: 'A valid user is required.' }, { status: 400 });
    }

    const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const reportedAt = new Date(observedAt || Date.now());
    const timestamp = Number.isNaN(reportedAt.getTime()) ? new Date() : reportedAt;
    const result = await prisma.appUser.updateMany({
      where: {
        id: userId,
        OR: [{ lastSeen: null }, { lastSeen: { lte: timestamp } }],
      },
      data: { online: Boolean(online), lastSeen: timestamp },
    });
    return NextResponse.json({ success: true, ignored: result.count === 0 ? 'stale-presence-event' : null });
  } catch (error) {
    console.error('Presence API Error:', error);
    return NextResponse.json({ error: 'Could not update presence.' }, { status: 500 });
  }
}
