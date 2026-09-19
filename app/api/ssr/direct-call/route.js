import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { getSessionActor } from '../session';
import { notifyUsers } from '../notify';

const CALL_RING_TIMEOUT_MS = 45_000; // auto-miss after 45s

// In-memory fallback in case Prisma client hasn't regenerated AppDirectCall model yet
const memoryCalls = new Map();

// ─── GET: poll for incoming call or get call state ───────────────────────────
export async function GET(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const callId = searchParams.get('callId');

    if (!prisma.appDirectCall) {
      if (callId) {
        const call = memoryCalls.get(callId);
        if (!call || (call.callerId !== actor.id && call.calleeId !== actor.id)) {
          return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }
        return NextResponse.json(call);
      }
      const incoming = Array.from(memoryCalls.values()).find(
        c => c.calleeId === actor.id && c.status === 'ringing'
      );
      return NextResponse.json({ incoming: incoming || null });
    }

    // Expire any ringing calls older than ring timeout
    await prisma.appDirectCall.updateMany({
      where: {
        status: 'ringing',
        createdAt: { lt: new Date(Date.now() - CALL_RING_TIMEOUT_MS) },
      },
      data: { status: 'missed', endedAt: new Date() },
    }).catch(() => {});

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
    return NextResponse.json({ incoming: null });
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

    const callee = await prisma.appUser.findUnique({
      where: { id: calleeId },
      select: { id: true, name: true, restricted: true, companyId: true, role: true },
    });
    if (!callee || callee.restricted) return NextResponse.json({ error: 'User not available' }, { status: 404 });

    // Enforce message/call communication restrictions
    if (actor.companyId && callee.companyId && actor.companyId !== callee.companyId) {
      return NextResponse.json({ error: 'Cross-company communication is not allowed.' }, { status: 403 });
    }

    const isTargetStaff = !callee.companyId && ['Super Admin', 'Admin', 'Employee'].includes(callee.role);
    const isActorStaff = !actor.companyId && ['Super Admin', 'Admin', 'Employee'].includes(actor.role);
    const intraCompany = Boolean(actor.companyId && callee.companyId === actor.companyId);
    const companyStaffExchange = (actor.companyId && isTargetStaff) || (isActorStaff && Boolean(callee.companyId));
    const internalStaffExchange = isActorStaff && isTargetStaff;
    const staffPrivileged = isActorStaff;

    let sharedAllowed = false;
    try {
      const sharedGroups = await prisma.appChat.findMany({
        where: { type: 'group', participants: { hasEvery: [actor.id, callee.id] } },
        select: { privateChatEnabled: true, createdBy: true },
      });
      sharedAllowed = sharedGroups.some(g => g.privateChatEnabled !== false || g.createdBy === actor.id);
    } catch {}

    let requestApproved = false;
    try {
      if (prisma.appChatRequest) {
        const reqItem = await prisma.appChatRequest.findFirst({
          where: {
            OR: [
              { requesterId: actor.id, targetId: callee.id, status: 'approved' },
              { requesterId: callee.id, targetId: actor.id, status: 'approved' },
            ],
          },
        });
        requestApproved = Boolean(reqItem);
      }
    } catch {}

    const canCall = intraCompany || companyStaffExchange || internalStaffExchange || staffPrivileged || sharedAllowed || requestApproved;
    if (!canCall) {
      return NextResponse.json({ error: 'Call access restricted. Please send a request to Admin Service.' }, { status: 403 });
    }

    if (!prisma.appDirectCall) {
      for (const [id, c] of memoryCalls.entries()) {
        if (c.callerId === actor.id && c.status === 'ringing') {
          memoryCalls.set(id, { ...c, status: 'missed', endedAt: new Date().toISOString() });
        }
      }
      const callId = randomUUID();
      const peerId = randomUUID();
      const call = {
        id: callId,
        callerId: actor.id,
        calleeId,
        callerName: actor.name,
        calleeName: callee.name,
        type,
        peerId,
        status: 'ringing',
        createdAt: new Date().toISOString(),
      };
      memoryCalls.set(callId, call);

      notifyUsers([calleeId], {
        title: `📞 Incoming ${type} call`,
        body: `${actor.name} is calling you`,
        url: `/ssr-app/home?callId=${call.id}`,
        data: { type: 'direct-call', callId: call.id, callerId: actor.id, callerName: actor.name, callType: type },
      }).catch(() => {});

      return NextResponse.json({ callId: call.id, peerId, status: 'ringing' }, { status: 201 });
    }

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

    let call;
    if (!prisma.appDirectCall) {
      call = memoryCalls.get(callId);
    } else {
      call = await prisma.appDirectCall.findUnique({ where: { id: callId } });
    }
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    const isCaller = call.callerId === actor.id;
    const isCallee = call.calleeId === actor.id;
    if (!isCaller && !isCallee) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    if (action === 'accept') {
      if (!isCallee) return NextResponse.json({ error: 'Only the callee can accept' }, { status: 403 });
      if (call.status !== 'ringing') return NextResponse.json({ error: 'Call is no longer ringing' }, { status: 409 });

      const calleePeerId = randomUUID();
      let updated;
      if (!prisma.appDirectCall) {
        updated = { ...call, status: 'accepted', calleePeerId, startedAt: new Date().toISOString() };
        memoryCalls.set(callId, updated);
      } else {
        updated = await prisma.appDirectCall.update({
          where: { id: callId },
          data: { status: 'accepted', calleePeerId, startedAt: new Date() },
        });
      }

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
      let updated;
      if (!prisma.appDirectCall) {
        updated = { ...call, status: 'declined', endedAt: new Date().toISOString() };
        memoryCalls.set(callId, updated);
      } else {
        updated = await prisma.appDirectCall.update({
          where: { id: callId },
          data: { status: 'declined', endedAt: new Date() },
        });
      }
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
      let updated;
      if (!prisma.appDirectCall) {
        updated = { ...call, status: 'ended', endedAt: now.toISOString(), ...(duration !== null ? { duration } : {}) };
        memoryCalls.set(callId, updated);
      } else {
        updated = await prisma.appDirectCall.update({
          where: { id: callId },
          data: { status: 'ended', endedAt: now, ...(duration !== null ? { duration } : {}) },
        });
      }
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
