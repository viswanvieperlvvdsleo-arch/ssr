import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildUserData } from '../defaults';
import { getSessionActor, publicAccount, SJ_USER_FILTER } from '../session';
import { hashPassword } from '../passwords';

const ALLOWED_PERMISSIONS = new Set(['view_chats', 'request_access', 'post_feeds', 'arrange_meetings', 'all_access']);

async function companyAdmin(request) {
  const actor = await getSessionActor(request);
  return actor?.companyId && actor.role === 'Admin' ? actor : null;
}

export async function GET(request) {
  const actor = await getSessionActor(request);
  if (!actor?.companyId) return NextResponse.json({ error: 'Company account access required' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const scope = searchParams.get('scope');
  if (scope === 'profile') {
    const id = String(searchParams.get('id') || '');
    if (!id) return NextResponse.json({ error: 'Account is required' }, { status: 400 });
    const user = await prisma.appUser.findUnique({ where: { id } });
    const isCompanyColleague = user?.companyId === actor.companyId;
    const isSjContact = user && !user.companyId && ['Super Admin', 'Admin', 'Employee'].includes(user.role);
    if (!user || user.restricted || (!isCompanyColleague && !isSjContact)) {
      return NextResponse.json({ error: 'Contact is not available in your company chat' }, { status: 404 });
    }
    return NextResponse.json({
      id: user.id, name: user.name, role: user.role, initials: user.initials, color: user.color,
      avatar: user.avatar, companyId: user.companyId || null, title: user.title, experience: user.experience,
      profession: user.profession || [], mode: user.mode, location: user.location, shortDesc: user.shortDesc,
      bio: user.bio, rating: user.rating, reviews: user.reviews, email: user.email, phone: user.phone,
    });
  }
  if (scope === 'chat') {
    const [companyUsers, sjStaff] = await Promise.all([
      prisma.appUser.findMany({ where: { companyId: actor.companyId, restricted: false }, orderBy: { createdAt: 'asc' } }),
      prisma.appUser.findMany({ where: { ...SJ_USER_FILTER, role: { in: ['Super Admin', 'Admin', 'Employee'] }, restricted: false }, orderBy: { createdAt: 'asc' } }),
    ]);
    return NextResponse.json([...companyUsers, ...sjStaff].map(user => ({
      id: user.id, name: user.name, role: user.role, initials: user.initials, color: user.color,
      avatar: user.avatar, companyId: user.companyId || null, restricted: Boolean(user.restricted),
    })));
  }
  const users = await prisma.appUser.findMany({ where: { companyId: actor.companyId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(users.map(publicAccount));
}

export async function POST(request) {
  const actor = await companyAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Company admin access required' }, { status: 403 });
  try {
    const data = await request.json();
    const name = String(data.name || '').trim().slice(0, 100);
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: 'Enter name, valid email, and a password of at least 8 characters' }, { status: 400 });
    }
    if (await prisma.appUser.findUnique({ where: { email } })) {
      return NextResponse.json({ error: 'Email already in use. Use another email address.' }, { status: 409 });
    }
    const permissions = [...new Set((Array.isArray(data.permissions) ? data.permissions : []).filter(permission => ALLOWED_PERMISSIONS.has(permission)))];
    const user = await prisma.appUser.create({ data: buildUserData({ name, email, password: hashPassword(password), role: 'Employee', companyId: actor.companyId, permissions }) });
    return NextResponse.json(publicAccount(user), { status: 201 });
  } catch (error) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Email already in use. Use another email address.' }, { status: 409 });
    console.error('Company employee creation failed:', error);
    return NextResponse.json({ error: 'Could not create employee' }, { status: 500 });
  }
}

export async function PUT(request) {
  const actor = await companyAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Company admin access required' }, { status: 403 });
  const data = await request.json();
  const target = data.id ? await prisma.appUser.findUnique({ where: { id: String(data.id) } }) : null;
  if (!target || target.companyId !== actor.companyId || target.role !== 'Employee') {
    return NextResponse.json({ error: 'Employee not found in your company' }, { status: 404 });
  }
  const updates = {};
  if (typeof data.name === 'string') {
    const name = data.name.trim().slice(0, 100);
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    updates.name = name;
  }
  if (typeof data.restricted === 'boolean') updates.restricted = data.restricted;
  if (Array.isArray(data.permissions)) updates.permissions = [...new Set(data.permissions.filter(permission => ALLOWED_PERMISSIONS.has(permission)))];
  const user = await prisma.appUser.update({ where: { id: target.id }, data: updates });
  return NextResponse.json(publicAccount(user));
}
