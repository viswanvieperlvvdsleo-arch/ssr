import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildUserData, hasEmployeePermission } from '../defaults';

function sanitizeUserForViewer(user, viewer, canViewContact = false) {
  const canViewPrivate = viewer && (
    viewer.id === user.id ||
    hasEmployeePermission(viewer, 'view_users') ||
    hasEmployeePermission(viewer, 'request_access') ||
    canViewContact
  );
  const canViewPasswords = viewer && (viewer.role === 'Admin' || viewer.role === 'Super Admin');

  return {
    ...user,
    email: canViewPrivate ? user.email : null,
    phone: canViewPrivate ? user.phone : null,
    password: canViewPasswords ? user.password : undefined,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerId = searchParams.get('viewerId');
    const viewer = viewerId ? await prisma.appUser.findUnique({ where: { id: viewerId } }) : null;
    const sharedChatUserIds = new Set();
    if (viewerId && viewer) {
      await prisma.appUser.update({ where: { id: viewerId }, data: { online: true, lastSeen: new Date() } });
      const sharedChats = await prisma.appChat.findMany({
        where: { participants: { has: viewerId } },
        select: { participants: true },
      });
      sharedChats.forEach(chat => (chat.participants || []).forEach(id => sharedChatUserIds.add(id)));
    }
    const users = await prisma.appUser.findMany({ orderBy: { createdAt: 'asc' } });
    const onlineCutoff = Date.now() - 45 * 1000;
    // To match frontend format `{ u1: {...}, u2: {...} }`
    const usersMap = {};
    users.forEach(u => {
      const freshOnline = Boolean(u.online && u.lastSeen && new Date(u.lastSeen).getTime() >= onlineCutoff);
      usersMap[u.id] = { ...sanitizeUserForViewer(u, viewer, sharedChatUserIds.has(u.id)), online: freshOnline };
    });
    return NextResponse.json(usersMap);
  } catch (error) {
    console.error('Users GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const newUser = await prisma.appUser.create({ data: buildUserData(data) });
    return NextResponse.json(newUser);
  } catch (error) {
    console.error('Users POST API Error:', error);
    if (error?.code === 'P2002') return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    return NextResponse.json({ error: error?.message || 'Could not create account' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, ...data } = await req.json();
    if (data.lastSeen) data.lastSeen = new Date(data.lastSeen);
    const updatedUser = await prisma.appUser.update({
      where: { id },
      data
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Users PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await prisma.appUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
