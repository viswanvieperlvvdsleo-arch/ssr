import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildUserData, hasEmployeePermission } from '../defaults';
import { getSessionActor, publicAccount, SJ_USER_FILTER } from '../session';
import { hashPassword } from '../passwords';
import { POST as createCompanyEmployee, PUT as updateCompanyEmployee } from '../company-users/route';

const editableProfile = ['email', 'name', 'phone', 'password', 'initials', 'color', 'avatar', 'mediaStorageMode', 'title', 'experience', 'profession', 'mode', 'location', 'shortDesc', 'bio', 'resume'];
const editableStaff = ['permissions', 'restricted', 'teamId'];
const isSjAdmin = actor => actor && !actor.companyId && ['Admin', 'Super Admin'].includes(actor.role);

function sanitizeUserForViewer(user, viewer) {
  const canViewPrivate = viewer && (viewer.id === user.id || hasEmployeePermission(viewer, 'view_users'));
  const canViewPhone = viewer && !viewer.companyId && (
    viewer.role === 'Super Admin' ||
    (viewer.role === 'Employee' && hasEmployeePermission(viewer, 'view_phone'))
  );
  return {
    ...user,
    email: canViewPrivate ? user.email : null,
    phone: viewer?.id === user.id || canViewPhone ? user.phone : null,
    password: undefined,
  };
}

export async function GET(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Account access required' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const viewerId = searchParams.get('viewerId');
    if (viewerId && viewerId !== actor.id) return NextResponse.json({ error: 'Account access denied' }, { status: 403 });
    const viewer = actor;
    if (viewerId && viewer) {
      await prisma.appUser.update({ where: { id: viewerId }, data: { online: true, lastSeen: new Date() } });
    }
    const users = await prisma.appUser.findMany({ where: actor.companyId ? {
      OR: [{ companyId: actor.companyId }, { ...SJ_USER_FILTER, role: { in: ['Super Admin', 'Admin', 'Employee'] }, restricted: false }],
    } : SJ_USER_FILTER, orderBy: { createdAt: 'asc' } });
    const onlineCutoff = Date.now() - 15 * 1000;
    // To match frontend format `{ u1: {...}, u2: {...} }`
    const usersMap = {};
    users.forEach(u => {
      const freshOnline = Boolean(u.online && u.lastSeen && new Date(u.lastSeen).getTime() >= onlineCutoff);
      const account = actor.companyId && u.companyId !== actor.companyId
        ? { id: u.id, name: u.name, role: u.role, initials: u.initials, color: u.color, avatar: u.avatar, companyId: null, title: u.title, phone: null, email: null }
        : sanitizeUserForViewer(u, viewer);
      usersMap[u.id] = { ...account, online: freshOnline };
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
    if (actor?.companyId) return createCompanyEmployee(req);
    if (!isSjAdmin(actor)) return NextResponse.json({ error: 'SJ admin access required' }, { status: 403 });
    const data = await req.json();
    const allowedRoles = actor.role === 'Super Admin' ? ['Employee', 'Admin'] : ['Employee'];
    if (!allowedRoles.includes(data.role)) return NextResponse.json({ error: 'You do not have permission to create this account type' }, { status: 403 });
    const email = String(data.email || '').trim().toLowerCase();
    if (!email || !data.name || !data.password) return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    const newUser = await prisma.appUser.create({ data: buildUserData({ ...data, email, password: hashPassword(data.password), companyId: null, role: data.role }) });
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
    if (!actor) return NextResponse.json({ error: 'Account access required' }, { status: 403 });
    if (actor.companyId) {
      const payload = await req.clone().json();
      if (payload.id !== actor.id) return updateCompanyEmployee(req);
    }
    const { id, ...data } = await req.json();
    const target = id ? await prisma.appUser.findUnique({ where: { id } }) : null;
    if (!target || (target.companyId || null) !== (actor.companyId || null)) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const ownProfile = actor.id === id;
    const editableRoles = actor.role === 'Super Admin' ? ['Employee', 'Admin'] : ['Employee'];
    if (!ownProfile && (!isSjAdmin(actor) || !editableRoles.includes(target.role))) return NextResponse.json({ error: 'Account access denied' }, { status: 403 });

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
    if (!isSjAdmin(actor) && !(actor?.companyId && actor.role === 'Admin')) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const target = id ? await prisma.appUser.findUnique({ where: { id } }) : null;
    if (!target || (target.companyId || null) !== (actor.companyId || null) || target.role === 'Super Admin' || target.id === actor.id || (actor.companyId && target.role !== 'Employee')) return NextResponse.json({ error: 'This account cannot be deleted here' }, { status: 403 });
    if (target.role === 'Admin' && actor.role !== 'Super Admin') return NextResponse.json({ error: 'Only Super Admin can delete admin accounts' }, { status: 403 });
    await prisma.appUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
