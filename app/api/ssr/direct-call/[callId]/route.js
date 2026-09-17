import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { getSessionActor } from '../../session';

// Direct-call signalling uses a virtual "meetingId" = callId
// and reuses AppMeetingSignal for offer/answer/ice exchange.

async function authorize(req, callId) {
  const actor = await getSessionActor(req);
  if (!actor) return { error: 'Sign in required', status: 401 };
  const call = await prisma.appDirectCall.findUnique({ where: { id: callId } });
  if (!call) return { error: 'Call not found', status: 404 };
  if (call.callerId !== actor.id && call.calleeId !== actor.id) {
    return { error: 'Access denied', status: 403 };
  }
  if (!['ringing', 'accepted'].includes(call.status)) {
    return { error: 'Call has ended', status: 410 };
  }
  const isCaller = call.callerId === actor.id;
  const myPeerId = isCaller ? call.peerId : call.calleePeerId;
  return { actor, call, isCaller, myPeerId };
}

// GET: poll for signals addressed to me
export async function GET(req, { params }) {
  try {
    const { callId } = await params;
    const ctx = await authorize(req, callId);
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const since = new URL(req.url).searchParams.get('since');
    const sinceDate = since && !Number.isNaN(Date.parse(since))
      ? new Date(since)
      : new Date(Date.now() - 120_000);

    const now = new Date();
    const signals = await prisma.appMeetingSignal.findMany({
      where: {
        meetingId: callId,
        recipientPeerId: ctx.myPeerId,
        createdAt: { gte: sinceDate },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Include updated call state (status, calleePeerId) for the caller
    const call = await prisma.appDirectCall.findUnique({ where: { id: callId } });
    return NextResponse.json({ signals, call, serverTime: now.toISOString() });
  } catch (err) {
    console.error('Direct call signal GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: send a signal to the other peer
export async function POST(req, { params }) {
  try {
    const { callId } = await params;
    const ctx = await authorize(req, callId);
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const { type, payload } = await req.json();
    if (!type || !['offer', 'answer', 'ice'].includes(type)) {
      return NextResponse.json({ error: 'type must be offer, answer, or ice' }, { status: 400 });
    }
    if (JSON.stringify(payload || null).length > 100_000) {
      return NextResponse.json({ error: 'Signal payload too large' }, { status: 413 });
    }

    const isCaller = ctx.isCaller;
    const recipientPeerId = isCaller ? ctx.call.calleePeerId : ctx.call.peerId;
    if (!recipientPeerId) {
      return NextResponse.json({ error: 'Recipient not yet connected' }, { status: 409 });
    }

    await prisma.appMeetingSignal.create({
      data: {
        meetingId: callId,
        senderPeerId: ctx.myPeerId,
        recipientPeerId,
        type,
        payload,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Direct call signal POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
