import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

const DEFAULT_TEAMS = [
  'Business Development Team',
  'Sourcing Team',
  'HR Team',
  'Accounting Team',
];

function slugify(value = '') {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function requireAdmin(actorId) {
  if (!actorId) return null;
  const actor = await prisma.appUser.findUnique({ where: { id: actorId } });
  return actor && ['Admin', 'Super Admin'].includes(actor.role) ? actor : null;
}

async function ensureDefaultTeams() {
  const count = await prisma.appTeam.count();
  if (count) return;
  for (const name of DEFAULT_TEAMS) {
    const slug = slugify(name);
    await prisma.appTeam.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
  }
}

export async function GET() {
  try {
    await ensureDefaultTeams();
    const teams = await prisma.appTeam.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Teams GET API Error:', error);
    return NextResponse.json({ error: 'Could not load teams' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { actorId, name } = await req.json();
    const actor = await requireAdmin(actorId);
    if (!actor) return NextResponse.json({ error: 'Admin access is required' }, { status: 403 });

    const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
    const slug = slugify(cleanName);
    if (cleanName.length < 2 || cleanName.length > 60 || !slug) {
      return NextResponse.json({ error: 'Enter a team name between 2 and 60 characters' }, { status: 400 });
    }

    const team = await prisma.appTeam.create({
      data: { name: cleanName, slug, createdById: actor.id },
    });
    return NextResponse.json(team);
  } catch (error) {
    console.error('Teams POST API Error:', error);
    if (error?.code === 'P2002') return NextResponse.json({ error: 'That team already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Could not create team' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const actor = await requireAdmin(searchParams.get('actorId'));
    if (!actor) return NextResponse.json({ error: 'Admin access is required' }, { status: 403 });
    if (!id) return NextResponse.json({ error: 'Team is required' }, { status: 400 });

    await prisma.appUser.updateMany({ where: { teamId: id }, data: { teamId: null } });
    await prisma.appTeam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Teams DELETE API Error:', error);
    return NextResponse.json({ error: 'Could not delete team' }, { status: 500 });
  }
}
