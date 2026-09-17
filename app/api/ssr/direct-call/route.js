import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { getSessionActor } from '../session';
import { notifyUsers } from '../notify';

const CALL_RING_TIMEOUT_MS = 45_000; // auto-miss after 45s

// ─── GET: poll for incoming call or get call state ───────────────────────────
export async function GET(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const callId = searchParams.get('callId');

    // Expire any ringing calls older than ring timeout
    await prisma.appDirectCall.updateMany({
      where: {
        status: 'ringing',
        createdAt: { lt: new Date(Date.now() - CALL_RING_TIMEOUT_MS) },
      },
      data: { status: 'missed', endedAt: new Date() },
    });

    if (callId) {
      const call = await prisma.appDirectCall.findUnique({ where: { id: callId } });
      if (!call || (call.callerId !== actor.id && call.calleeId !== actor.id)) {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }
      return NextResponse.json(call);
    }

    // Incoming ringing call for this user
    const incoming = await prisma.appDirectCall.findFirst({
      where: { calleeId: actor.id, status: 'ringing' },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ incoming: incoming || null });
  } catch (err) {
    console.error('Direct call GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── POST: initiate a new call ────────────────────────────────────────────────
export async function POST(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { calleeId, type = 'audio' } = await req.json();
    if (!calleeId) return NextResponse.json({ error: 'calleeId is required' }, { status: 400 });
    if (!['audio', 'video'].includes(type)) return NextResponse.json({ error: 'type must be audio or video' }, { status: 400 });
    if (calleeId === actor.id) return NextResponse.json({ error: 'Cannot call yourself' }, { status: 400 });

    const callee = await prisma.appUser.findUnique({ where: { id: calleeId }, select: { id: true, name: true, restricted: true } });
    if (!callee || callee.restricted) return NextResponse.json({ error: 'User not available' }, { status: 404 });

    // Cancel any existing ringing call from this caller
    await prisma.appDirectCall.updateMany({
      where: { callerId: actor.id, status: 'ringing' },
      data: { status: 'missed', endedAt: new Date() },
    });

    const peerId = randomUUID();
    const call = await prisma.appDirectCall.create({
      data: {
        callerId: actor.id,
        calleeId,
        callerName: actor.name,
        calleeName: callee.name,
        type,
        peerId,
        status: 'ringing',
      },
    });

    // Notify callee via push
    notifyUsers([calleeId], {
      title: `📞 Incoming ${type} call`,
      body: `${actor.name} is calling you`,
      url: `/ssr-app/home?callId=${call.id}`,
      data: { type: 'direct-call', callId: call.id, callerId: actor.id, callerName: actor.name, callType: type },
    }).catch(() => {});

    return NextResponse.json({ callId: call.id, peerId, status: 'ringing' }, { status: 201 });
  } catch (err) {
    console.error('Direct call POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── PATCH: update call status (accept / decline / end) ──────────────────────
export async function PATCH(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { callId, action } = await req.json();
    if (!callId || !action) return NextResponse.json({ error: 'callId and action are required' }, { status: 400 });

    const call = await prisma.appDirectCall.findUnique({ where: { id: callId } });
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    const isCaller = call.callerId === actor.id;
    const isCallee = call.calleeId === actor.id;
    if (!isCaller && !isCallee) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    if (action === 'accept') {
      if (!isCallee) return NextResponse.json({ error: 'Only the callee can accept' }, { status: 403 });
      if (call.status !== 'ringing') return NextResponse.json({ error: 'Call is no longer ringing' }, { status: 409 });

      const calleePeerId = randomUUID();
      const updated = await prisma.appDirectCall.update({
        where: { id: callId },
        data: { status: 'accepted', calleePeerId, startedAt: new Date() },
      });

      notifyUsers([call.callerId], {
        title: '✅ Call accepted',
        body: `${actor.name} accepted your call`,
        url: `/ssr-app/home?callId=${call.id}`,
        data: { type: 'direct-call-accepted', callId: call.id, calleeId: actor.id, calleePeerId },
      }).catch(() => {});

      return NextResponse.json({ ...updated, calleePeerId });
    }

    if (action === 'decline') {
      if (!isCallee) return NextResponse.json({ error: 'Only the callee can decline' }, { status: 403 });
      const updated = await prisma.appDirectCall.update({
        where: { id: callId },
        data: { status: 'declined', endedAt: new Date() },
      });
      notifyUsers([call.callerId], {
        title: '❌ Call declined',
        body: `${actor.name} declined your call`,
        url: `/ssr-app/home`,
        data: { type: 'direct-call-declined', callId: call.id },
      }).catch(() => {});
      return NextResponse.json(updated);
    }

    if (action === 'end') {
      if (!isCaller && !isCallee) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      const now = new Date();
      const duration = call.startedAt ? Math.round((now - new Date(call.startedAt)) / 1000) : null;
      const updated = await prisma.appDirectCall.update({
        where: { id: callId },
        data: { status: 'ended', endedAt: now, ...(duration !== null ? { duration } : {}) },
      });
      const otherId = isCaller ? call.calleeId : call.callerId;
      notifyUsers([otherId], {
        title: '📵 Call ended',
        body: `${actor.name} ended the call${duration ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : ''}`,
        url: `/ssr-app/home`,
        data: { type: 'direct-call-ended', callId: call.id },
      }).catch(() => {});
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action. Use: accept, decline, end' }, { status: 400 });
  } catch (err) {
    console.error('Direct call PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
