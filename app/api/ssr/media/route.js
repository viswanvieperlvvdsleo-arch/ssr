import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function POST(req) {
  try {
    const { name, mimeType, size, chunkCount } = await req.json();
    if (!name || !Number.isInteger(size) || size < 1 || size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Files must be between 1 byte and 15MB' }, { status: 400 });
    }
    const media = await prisma.appMedia.create({
      data: { name, mimeType: mimeType || 'application/octet-stream', size, chunkCount: Number(chunkCount) || 0 }
    });
    return NextResponse.json({ id: media.id });
  } catch (error) {
    console.error('Media POST API Error:', error);
    return NextResponse.json({ error: 'Could not prepare media upload' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, chunkIndex, data } = await req.json();
    if (!id || !Number.isInteger(chunkIndex) || typeof data !== 'string' || !data) {
      return NextResponse.json({ error: 'Invalid media chunk' }, { status: 400 });
    }
    const media = await prisma.appMedia.findUnique({ where: { id } });
    if (!media) return NextResponse.json({ error: 'Media upload not found' }, { status: 404 });

    await prisma.appMediaChunk.upsert({
      where: { mediaId_chunkIndex: { mediaId: id, chunkIndex } },
      create: { mediaId: id, chunkIndex, data },
      update: { data },
    });
    const received = await prisma.appMediaChunk.count({ where: { mediaId: id } });
    const complete = received >= media.chunkCount;
    if (complete) await prisma.appMedia.update({ where: { id }, data: { complete: true } });
    return NextResponse.json({ success: true, complete });
  } catch (error) {
    console.error('Media PUT API Error:', error);
    return NextResponse.json({ error: 'Could not upload media chunk' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    await prisma.appMediaChunk.deleteMany({ where: { mediaId: id } });
    await prisma.appMedia.deleteMany({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Media DELETE API Error:', error);
    return NextResponse.json({ error: 'Could not cancel media upload' }, { status: 500 });
  }
}
