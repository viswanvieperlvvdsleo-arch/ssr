import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildUserData, hasEmployeePermission } from '../defaults';
import { getSessionActor, publicAccount, SJ_USER_FILTER } from '../session';
import { hashPassword } from '../passwords';

const editableProfile = ['email', 'name', 'phone', 'password', 'initials', 'color', 'avatar', 'mediaStorageMode', 'title', 'experience', 'profession', 'mode', 'location', 'shortDesc', 'bio', 'resume'];
const editableStaff = ['permissions', 'restricted', 'teamId'];
const isSjAdmin = actor => actor && !actor.companyId && ['Admin', 'Super Admin'].includes(actor.role);

function sanitizeUserForViewer(user, viewer, canViewContact = false) {
  const canViewPrivate = viewer && (
    viewer.id === user.id ||
    hasEmployeePermission(viewer, 'view_users') ||
    hasEmployeePermission(viewer, 'request_access') ||
    canViewContact
  );
  return {
    ...user,
    email: canViewPrivate ? user.email : null,
    phone: canViewPrivate ? user.phone : null,
    password: undefined,
  };
}

export async function GET(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor || actor.companyId) return NextResponse.json({ error: 'SJ account access required' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const viewerId = searchParams.get('viewerId');
    if (viewerId && viewerId !== actor.id) return NextResponse.json({ error: 'Account access denied' }, { status: 403 });
    const viewer = actor;
    const sharedChatUserIds = new Set();
    if (viewerId && viewer) {
      await prisma.appUser.update({ where: { id: viewerId }, data: { online: true, lastSeen: new Date() } });
      const sharedChats = await prisma.appChat.findMany({
        where: { participants: { has: viewerId } },
        select: { participants: true },
      });
      sharedChats.forEach(chat => (chat.participants || []).forEach(id => sharedChatUserIds.add(id)));
    }
    const users = await prisma.appUser.findMany({ where: SJ_USER_FILTER, orderBy: { createdAt: 'asc' } });
    const onlineCutoff = Date.now() - 15 * 1000;
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
    const actor = await getSessionActor(req);
    if (!isSjAdmin(actor)) return NextResponse.json({ error: 'SJ admin access required' }, { status: 403 });
    const data = await req.json();
    if (data.role !== 'Employee') return NextResponse.json({ error: 'Only employee accounts can be created here' }, { status: 403 });
    const email = String(data.email || '').trim().toLowerCase();
    if (!email || !data.name || !data.password) return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    const newUser = await prisma.appUser.create({ data: buildUserData({ ...data, email, password: hashPassword(data.password), companyId: null, role: 'Employee' }) });
    return NextResponse.json(publicAccount(newUser));
  } catch (error) {
    console.error('Users POST API Error:', error);
    if (error?.code === 'P2002') return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    return NextResponse.json({ error: error?.message || 'Could not create account' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor || actor.companyId) return NextResponse.json({ error: 'SJ account access required' }, { status: 403 });
    const { id, ...data } = await req.json();
    const target = id ? await prisma.appUser.findUnique({ where: { id } }) : null;
    if (!target || target.companyId) return NextResponse.json({ error: 'SJ account not found' }, { status: 404 });
    const ownProfile = actor.id === id;
    if (!ownProfile && (!isSjAdmin(actor) || target.role !== 'Employee')) return NextResponse.json({ error: 'Account access denied' }, { status: 403 });
    const allowed = new Set(ownProfile ? [...editableProfile, 'online', 'lastSeen'] : [...editableProfile, ...editableStaff]);
    if (Object.keys(data).some(key => !allowed.has(key))) return NextResponse.json({ error: 'This account field cannot be changed' }, { status: 403 });
    if (data.lastSeen) data.lastSeen = new Date(data.lastSeen);
    if (data.email) data.email = String(data.email).trim().toLowerCase();
    if (data.password === '') delete data.password;
    else if (data.password) data.password = hashPassword(data.password);
    const updatedUser = await prisma.appUser.update({
      where: { id },
      data
    });
    return NextResponse.json(publicAccount(updatedUser));
  } catch (error) {
    console.error('Users PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const actor = await getSessionActor(req);
    if (!isSjAdmin(actor)) return NextResponse.json({ error: 'SJ admin access required' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const target = id ? await prisma.appUser.findUnique({ where: { id } }) : null;
    if (!target || target.companyId || target.role === 'Super Admin' || target.id === actor.id) return NextResponse.json({ error: 'This account cannot be deleted here' }, { status: 403 });
    await prisma.appUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
