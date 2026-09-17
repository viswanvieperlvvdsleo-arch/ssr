import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { getSessionActor } from '../../session';

export async function GET(request, { params }) {
  const actor = await getSessionActor(request);
  if (!actor?.companyId) return NextResponse.json({ error: 'Company access required' }, { status: 403 });
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
  const tasks = await prisma.appRequirementTask.findMany({ where: { companyId: actor.companyId }, select: { id: true } });
  if (!tasks.length) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  const profiles = await prisma.appTaskProfile.findMany({ where: { taskId: { in: tasks.map(task => task.id) } }, select: { attachment: true }, take: 5000 });
  if (!profiles.some(profile => profile.attachment?.mediaId === id)) return NextResponse.json({ error: 'Attachment not found in your company' }, { status: 404 });
  const media = await prisma.appMedia.findUnique({ where: { id } });
  if (!media?.complete) return NextResponse.json({ error: 'Attachment is not ready' }, { status: 404 });
  const chunks = await prisma.appMediaChunk.findMany({ where: { mediaId: id }, orderBy: { chunkIndex: 'asc' } });
  const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data, 'base64')));
  return new NextResponse(bytes, { headers: { 'Content-Type': media.mimeType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(media.name)}"`, 'Cache-Control': 'private, no-store' } });
}
