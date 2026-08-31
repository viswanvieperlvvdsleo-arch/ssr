import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

const isAdmin = (user) => user?.role === 'Admin' || user?.role === 'Super Admin';

function getMediaId(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  if (attachment.mediaId) return attachment.mediaId;
  const match = String(attachment.url || '').match(/\/api\/ssr\/media\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function requireAdmin(adminId) {
  if (!adminId) return null;
  const admin = await prisma.appUser.findUnique({ where: { id: adminId } });
  return isAdmin(admin) ? admin : null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = await requireAdmin(searchParams.get('adminId'));
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const [media, messages, chats] = await Promise.all([
      prisma.appMedia.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.appMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
      prisma.appChat.findMany({ select: { id: true, name: true, type: true } }),
    ]);
    const chatNames = Object.fromEntries(chats.map(chat => [chat.id, chat.name || chat.type || 'Chat']));
    const mediaUsage = Object.fromEntries(media.map(item => [item.id, 0]));

    const messageRecords = messages.map(message => {
      const attachment = message.attachment && typeof message.attachment === 'object' ? message.attachment : null;
      const mediaId = getMediaId(attachment);
      if (mediaId && mediaUsage[mediaId] !== undefined) mediaUsage[mediaId] += 1;
      return {
        id: message.id,
        chatId: message.chatId,
        chatName: chatNames[message.chatId] || 'Chat',
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp,
        createdAt: message.createdAt,
        isDeletedForEveryone: message.isDeletedForEveryone,
        attachment: attachment ? {
          mediaId,
          name: attachment.name || 'Attachment',
          type: attachment.type || 'application/octet-stream',
          size: Number(attachment.size || 0),
          cloudDeleted: Boolean(attachment.cloudDeleted),
        } : null,
      };
    });

    return NextResponse.json({
      stats: {
        mediaCount: media.length,
        messageCount: messages.length,
        storageBytes: media.reduce((total, item) => total + Number(item.size || 0), 0),
      },
      media: media.map(item => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        chunkCount: item.chunkCount,
        complete: item.complete,
        createdAt: item.createdAt,
        messageCount: mediaUsage[item.id] || 0,
      })),
      messages: messageRecords,
    });
  } catch (error) {
    console.error('Data Management GET API Error:', error);
    return NextResponse.json({ error: 'Could not load data management records' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { adminId, action = 'deleteMedia', mediaId, messageId } = await req.json();
    const admin = await requireAdmin(adminId);
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    if (action === 'deleteMedia') {
      if (!mediaId) return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
      const media = await prisma.appMedia.findUnique({ where: { id: mediaId } });
      if (!media) return NextResponse.json({ error: 'Media was already deleted' }, { status: 404 });

      const linkedMessages = await prisma.appMessage.findMany();
      for (const message of linkedMessages) {
        if (getMediaId(message.attachment) !== mediaId) continue;
        const attachment = typeof message.attachment === 'object' ? message.attachment : {};
        await prisma.appMessage.update({
          where: { id: message.id },
          data: { attachment: { ...attachment, cloudDeleted: true, isDownloaded: false } },
        });
      }
      const scheduledMessages = await prisma.appScheduledMessage.findMany();
      for (const scheduled of scheduledMessages) {
        if (getMediaId(scheduled.attachment) === mediaId) {
          await prisma.appScheduledMessage.update({ where: { id: scheduled.id }, data: { attachment: null } });
        }
      }
      await prisma.appMediaChunk.deleteMany({ where: { mediaId } });
      await prisma.appMedia.delete({ where: { id: mediaId } });
      return NextResponse.json({ success: true, deletedMediaId: mediaId });
    }

    if (action === 'deleteMessage') {
      if (!messageId) return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
      const message = await prisma.appMessage.findUnique({ where: { id: messageId } });
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      const linkedMediaId = getMediaId(message.attachment);
      if (linkedMediaId) {
        const linkedMessages = await prisma.appMessage.findMany();
        const isShared = linkedMessages.some(item => item.id !== messageId && getMediaId(item.attachment) === linkedMediaId);
        if (!isShared) {
          await prisma.appMediaChunk.deleteMany({ where: { mediaId: linkedMediaId } });
          await prisma.appMedia.deleteMany({ where: { id: linkedMediaId } });
        }
      }
      await prisma.appMessage.delete({ where: { id: messageId } });
      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    return NextResponse.json({ error: 'Invalid data management action' }, { status: 400 });
  } catch (error) {
    console.error('Data Management DELETE API Error:', error);
    return NextResponse.json({ error: 'Could not delete data' }, { status: 500 });
  }
}
