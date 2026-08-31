import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const media = await prisma.appMedia.findUnique({ where: { id } });
    if (!media) return NextResponse.json({ error: 'Media was deleted from cloud storage' }, { status: 410 });
    if (!media.complete) return NextResponse.json({ error: 'Media is not ready' }, { status: 404 });
    const chunks = await prisma.appMediaChunk.findMany({ where: { mediaId: id }, orderBy: { chunkIndex: 'asc' } });
    const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data, 'base64')));
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `inline; filename="${encodeURIComponent(media.name)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Media GET API Error:', error);
    return NextResponse.json({ error: 'Could not read media' }, { status: 500 });
  }
}
