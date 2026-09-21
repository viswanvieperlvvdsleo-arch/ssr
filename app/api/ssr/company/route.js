import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildUserData } from '../defaults';
import { getSessionActor, publicAccount } from '../session';
import { hashPassword } from '../passwords';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request) {
  const actor = await getSessionActor(request);
  if (!actor) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });
  if (actor.companyId) {
    const company = await prisma.appCompany.findUnique({ where: { id: actor.companyId } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const accountCount = await prisma.appUser.count({ where: { companyId: company.id } });
    return NextResponse.json({ ...company, accountCount });
  }
  if (actor.role !== 'Super Admin') return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });

  const requestedCompanyId = new URL(request.url).searchParams.get('id');
  if (requestedCompanyId) {
    const company = await prisma.appCompany.findUnique({ where: { id: requestedCompanyId } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const accounts = await prisma.appUser.findMany({
      where: { companyId: company.id },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, name: true, email: true, phone: true, role: true, initials: true, avatar: true,
        permissions: true, restricted: true, online: true, lastSeen: true, createdAt: true,
      },
    });
    const accountIds = accounts.map(account => account.id);
    const [requirements, openRequirements, completedRequirements, posts, meetings, payments, paymentTotals] = await Promise.all([
      prisma.appRequirementTask.count({ where: { companyId: company.id } }),
      prisma.appRequirementTask.count({ where: { companyId: company.id, status: { not: 'closed' } } }),
      prisma.appRequirementTask.count({ where: { companyId: company.id, status: 'closed' } }),
      prisma.appPost.count({ where: { companyId: company.id } }),
      accountIds.length ? prisma.appMeeting.count({ where: { participants: { hasSome: accountIds } } }) : 0,
      accountIds.length ? prisma.appServerPayment.count({ where: { userId: { in: accountIds } } }) : 0,
      accountIds.length ? prisma.appServerPayment.aggregate({ where: { userId: { in: accountIds }, status: 'completed' }, _sum: { amount: true } }) : null,
    ]);
    return NextResponse.json({
      company,
      accounts,
      stats: {
        accounts: accounts.length,
        activeAccounts: accounts.filter(account => !account.restricted).length,
        requirements,
        openRequirements,
        completedRequirements,
        posts,
        meetings,
        payments,
        paidAmount: paymentTotals?._sum?.amount || 0,
      },
    });
  }

  const companies = await prisma.appCompany.findMany({ orderBy: { createdAt: 'desc' } });
  const result = await Promise.all(companies.map(async company => ({
    ...company,
    accountCount: await prisma.appUser.count({ where: { companyId: company.id } }),
  })));
  return NextResponse.json(result);
}

export async function POST(request) {
  const actor = await getSessionActor(request);
  if (!actor || actor.role !== 'Super Admin' || actor.companyId) {
    return NextResponse.json({ error: 'Only SJ Super Admin can create company admins' }, { status: 403 });
  }
  try {
    const data = await request.json();
    const name = String(data.companyName || '').trim().slice(0, 100);
    const adminName = String(data.adminName || '').trim().slice(0, 100);
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    const requirementEmail = String(data.requirementEmail || '').trim().toLowerCase();
    if (!name || !adminName || !emailPattern.test(email) || password.length < 8) {
      return NextResponse.json({ error: 'Enter company, admin name, valid email, and a password of at least 8 characters' }, { status: 400 });
    }
    if (requirementEmail && !emailPattern.test(requirementEmail)) {
      return NextResponse.json({ error: 'Enter a valid requirement inbox email' }, { status: 400 });
    }
    if (await prisma.appUser.findUnique({ where: { email } })) {
      return NextResponse.json({ error: 'Email already in use. Use another email address.' }, { status: 409 });
    }
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'}-${randomBytes(3).toString('hex')}`;
    const company = await prisma.appCompany.create({ data: { name, slug, requirementEmail: requirementEmail || null, createdById: actor.id } });
    try {
      const admin = await prisma.appUser.create({ data: buildUserData({ name: adminName, email, password: hashPassword(password), role: 'Admin', companyId: company.id }) });
      return NextResponse.json({ company, admin: publicAccount(admin), accountCount: 1 }, { status: 201 });
    } catch (error) {
      await prisma.appCompany.delete({ where: { id: company.id } });
      throw error;
    }
  } catch (error) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Email already in use. Use another email address.' }, { status: 409 });
    console.error('Company creation failed:', error);
    return NextResponse.json({ error: 'Could not create company admin' }, { status: 500 });
  }
}

export async function PUT(request) {
  const actor = await getSessionActor(request);
  if (!actor || actor.companyId || actor.role !== 'Super Admin') return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  const data = await request.json();
  const id = String(data.id || '');
  const requirementEmail = String(data.requirementEmail || '').trim().toLowerCase();
  if (!id || (requirementEmail && !emailPattern.test(requirementEmail))) return NextResponse.json({ error: 'Enter a valid requirement inbox email' }, { status: 400 });
  const company = await prisma.appCompany.update({ where: { id }, data: { requirementEmail: requirementEmail || null } });
  return NextResponse.json({ ...company, accountCount: await prisma.appUser.count({ where: { companyId: id } }) });
}
