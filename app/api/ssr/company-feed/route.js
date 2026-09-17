import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildPostData } from '../defaults';
import { getSessionActor } from '../session';
import { SJ_USER_FILTER } from '../session';
import { notifyUsers } from '../notify';

function canPost(actor) {
  return actor?.companyId && (actor.role === 'Admin' || (actor.role === 'Employee' && (actor.permissions || []).some(permission => ['post_feeds', 'all_access'].includes(permission))));
}

export async function GET(request) {
  const actor = await getSessionActor(request);
  if (!actor?.companyId) return NextResponse.json({ error: 'Company access required' }, { status: 403 });
  const scope = new URL(request.url).searchParams.get('scope');
  const where = scope === 'public'
    ? { ...SJ_USER_FILTER, NOT: { visibility: 'internal' } }
    : { companyId: actor.companyId, visibility: 'internal', isRequirement: false };
  const posts = await prisma.appPost.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json(posts);
}

export async function POST(request) {
  const actor = await getSessionActor(request);
  if (!canPost(actor)) return NextResponse.json({ error: 'Posting permission required' }, { status: 403 });
  const data = await request.json();
  const title = String(data.title || '').trim().slice(0, 160);
  const content = String(data.content || '').trim().slice(0, 5000);
  if (!title || !content) return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
  const post = await prisma.appPost.create({ data: buildPostData({ authorId: actor.id, authorName: actor.name, authorRole: actor.role, companyId: actor.companyId, visibility: 'internal', category: 'Announcements', title, content, isRequirement: false }) });
  const team = await prisma.appUser.findMany({ where: { companyId: actor.companyId, id: { not: actor.id }, restricted: false }, select: { id: true } });
  await notifyUsers(team.map(user => user.id), { title: 'New company update', body: title, url: '/ssr-app/company?section=feed', data: { type: 'company-post', postId: post.id } }).catch(error => console.error('Company feed notification failed:', error));
  return NextResponse.json(post, { status: 201 });
}
