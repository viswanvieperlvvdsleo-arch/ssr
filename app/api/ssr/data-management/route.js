import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

const isAdmin = (user) => user?.role === 'Admin' || user?.role === 'Super Admin';

function getMediaId(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  if (attachment.mediaId) return attachment.mediaId;
  const match = String(attachment.url || '').match(/\/api\/ssr\/media\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getMediaIdFromUrl(url) {
  const match = String(url || '').match(/\/api\/ssr\/media\/([^/?#]+)/);
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

    const [media, messages, chats, posts] = await Promise.all([
      prisma.appMedia.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.appMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
      prisma.appChat.findMany({ select: { id: true, name: true, type: true } }),
      prisma.appPost.findMany({ select: { id: true, title: true, image: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    const chatNames = Object.fromEntries(chats.map(chat => [chat.id, chat.name || chat.type || 'Chat']));
    const mediaUsage = Object.fromEntries(media.map(item => [item.id, 0]));
    const messageUsage = Object.fromEntries(media.map(item => [item.id, 0]));
    const mediaLocations = Object.fromEntries(media.map(item => [item.id, []]));

    const messageRecords = messages.map(message => {
      const attachment = message.attachment && typeof message.attachment === 'object' ? message.attachment : null;
      const mediaId = getMediaId(attachment);
      if (mediaId && mediaUsage[mediaId] !== undefined) {
        mediaUsage[mediaId] += 1;
        messageUsage[mediaId] += 1;
        mediaLocations[mediaId].push({
          kind: 'chat',
          label: `Chat: ${chatNames[message.chatId] || 'Chat'}`,
          chatId: message.chatId,
          messageId: message.id,
        });
      }
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

    posts.forEach(post => {
      const mediaId = getMediaIdFromUrl(post.image);
      if (!mediaId || mediaUsage[mediaId] === undefined) return;
      mediaUsage[mediaId] += 1;
      mediaLocations[mediaId].push({
        kind: 'feed',
        label: `Feed: ${post.title || 'Post'}`,
        postId: post.id,
      });
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
        messageCount: messageUsage[item.id] || 0,
        feedCount: mediaLocations[item.id]?.filter(location => location.kind === 'feed').length || 0,
        url: `/api/ssr/media/${item.id}`,
        locations: mediaLocations[item.id] || [],
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
    const { adminId, action = 'deleteMedia', mediaId, mediaIds, messageId } = await req.json();
    const admin = await requireAdmin(adminId);
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    if (action === 'deleteMedia') {
      const requestedMediaIds = [...new Set((Array.isArray(mediaIds) ? mediaIds : [mediaId]).filter(Boolean))];
      if (requestedMediaIds.length === 0) return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
      const media = await prisma.appMedia.findMany({ where: { id: { in: requestedMediaIds } } });
      const existingMediaIds = media.map(item => item.id);
      if (existingMediaIds.length === 0) return NextResponse.json({ error: 'Media was already deleted' }, { status: 404 });
      const mediaIdSet = new Set(existingMediaIds);

      const linkedMessages = await prisma.appMessage.findMany();
      for (const message of linkedMessages) {
        if (!mediaIdSet.has(getMediaId(message.attachment))) continue;
        const attachment = typeof message.attachment === 'object' ? message.attachment : {};
        await prisma.appMessage.update({
          where: { id: message.id },
          data: { attachment: { ...attachment, cloudDeleted: true, isDownloaded: false } },
        });
      }
      const linkedPosts = await prisma.appPost.findMany({ select: { id: true, image: true } });
      for (const post of linkedPosts) {
        if (!mediaIdSet.has(getMediaIdFromUrl(post.image))) continue;
        await prisma.appPost.update({ where: { id: post.id }, data: { image: null } });
      }
      const scheduledMessages = await prisma.appScheduledMessage.findMany();
      for (const scheduled of scheduledMessages) {
        if (mediaIdSet.has(getMediaId(scheduled.attachment))) {
          await prisma.appScheduledMessage.update({ where: { id: scheduled.id }, data: { attachment: null } });
        }
      }
      await prisma.appMediaChunk.deleteMany({ where: { mediaId: { in: existingMediaIds } } });
      await prisma.appMedia.deleteMany({ where: { id: { in: existingMediaIds } } });
      return NextResponse.json({ success: true, deletedMediaIds: existingMediaIds });
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
