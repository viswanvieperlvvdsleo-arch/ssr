import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { accessibleChats } from '../../chatAccess';

function attachmentMediaId(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  if (attachment.mediaId) return String(attachment.mediaId);
  return String(attachment.url || '').match(/\/api\/ssr\/media\/([^/?#]+)/)?.[1] || null;
}

export async function GET(request, { params }) {
  const { actor, chats } = await accessibleChats(request);
  if (!actor?.companyId) return NextResponse.json({ error: 'Company access required' }, { status: 403 });

  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
  const chatIds = chats.map(chat => chat.id);
  if (!chatIds.length) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

  const messages = await prisma.appMessage.findMany({ where: { chatId: { in: chatIds } }, select: { attachment: true }, take: 5000 });
  if (!messages.some(message => attachmentMediaId(message.attachment) === id)) {
    return NextResponse.json({ error: 'Attachment not found in your chats' }, { status: 404 });
  }

  const media = await prisma.appMedia.findUnique({ where: { id } });
  if (!media?.complete) return NextResponse.json({ error: 'Attachment is not ready' }, { status: 404 });
  const chunks = await prisma.appMediaChunk.findMany({ where: { mediaId: id }, orderBy: { chunkIndex: 'asc' } });
  const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data, 'base64')));
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': media.mimeType,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `inline; filename="${encodeURIComponent(media.name)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
