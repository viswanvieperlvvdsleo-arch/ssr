import { NextResponse } from 'next/server';
import { sendPushToUser, broadcastPush, sendPushToTokens } from '../firebaseAdmin';
import { prisma } from '../prisma';

/**
 * POST /api/ssr/send-notification
 *
 * Body options:
 *   { type: 'user',      userId,   title, body, data }  → send to one user's devices
 *   { type: 'users',     userIds,  title, body, data }  → send to multiple users
 *   { type: 'broadcast',           title, body, data }  → send to ALL users
 *   { type: 'token',     token,    title, body, data }  → send to one raw FCM token (testing)
 */
export async function POST(req) {
  try {
    const { type, userId, userIds, token, title, body, data = {} } = await req.json();

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    let result;
    if (type === 'user') {
      if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      result = await sendPushToUser(userId, { title, body }, data);
    } else if (type === 'users') {
      if (!Array.isArray(userIds) || !userIds.length) return NextResponse.json({ error: 'userIds array is required' }, { status: 400 });
      result = await broadcastPush({ title, body }, data, userIds);
    } else if (type === 'broadcast') {
      result = await broadcastPush({ title, body }, data);
    } else if (type === 'token') {
      if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
      result = await sendPushToTokens([token], { title, body }, data);
    } else {
      return NextResponse.json({ error: 'type must be one of: user, users, broadcast, token' }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
