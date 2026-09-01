import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildMessageData } from '../defaults';
import { getSupportRecipientIds, notifyUsers } from '../notify';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    
    let messages;
    if (chatId) {
      messages = await prisma.appMessage.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' } });
    } else {
      messages = await prisma.appMessage.findMany({ orderBy: { createdAt: 'asc' } });
    }
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const newMessage = await prisma.appMessage.create({ data: buildMessageData(data) });
    
    // Update the chat's updatedAt so it bubbles up to the top
    const chat = await prisma.appChat.findUnique({ where: { id: data.chatId } });
    if (chat) {
      const unreadBy = chat.unreadBy && typeof chat.unreadBy === 'object' && !Array.isArray(chat.unreadBy) ? { ...chat.unreadBy } : {};
      const participantRecipients = (chat.participants || [])
        .filter(id => id !== data.senderId && !(chat.mutedBy || []).includes(id));
      const recipientIds = chat.type === 'support'
        ? [...new Set([...participantRecipients, ...(await getSupportRecipientIds(data.senderId))])]
        : participantRecipients;
      recipientIds.forEach(id => {
        unreadBy[id] = Number(unreadBy[id] || 0) + 1;
      });
      await prisma.appChat.update({
        where: { id: data.chatId },
        data: { updatedAt: new Date(), unreadBy }
      });

      notifyUsers(recipientIds, {
        title: chat.type === 'group' ? (chat.name || 'New group message') : (newMessage.senderName || 'New message'),
        body: newMessage.content || (newMessage.attachment ? 'Sent an attachment' : 'You have a new message'),
        url: `/ssr-app/home?chatId=${encodeURIComponent(chat.id)}&messageId=${encodeURIComponent(newMessage.id)}`,
        data: { type: 'chat', chatId: chat.id, messageId: newMessage.id },
      }).catch(err => console.error('Push notification background error:', err));
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Messages POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
export async function PUT(req) {
  try {
    const { action, msgIds, chatId, userId, content, forEveryone, deleteFromCloud } = await req.json();

    if (action === 'edit') {
      const msg = await prisma.appMessage.update({
        where: { id: msgIds[0] },
        data: { content, edited: true }
      });
      return NextResponse.json({ success: true, message: msg });
    }

    if (action === 'delete') {
      if (forEveryone) {
        await prisma.appMessage.updateMany({
          where: { id: { in: msgIds } },
          data: { isDeletedForEveryone: true, content: 'This message was deleted', attachment: null }
        });
      } else {
        // Find all messages, append userId to deletedFor
        const msgs = await prisma.appMessage.findMany({ where: { id: { in: msgIds } } });
        for (const msg of msgs) {
          const currentDeletedFor = msg.deletedFor || [];
          if (!currentDeletedFor.includes(userId)) {
            await prisma.appMessage.update({
              where: { id: msg.id },
              data: { deletedFor: { push: userId } }
            });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'deleteMedia') {
      const message = await prisma.appMessage.findUnique({ where: { id: msgIds[0] } });
      if (!message?.attachment || !userId) {
        return NextResponse.json({ error: 'Media message not found' }, { status: 404 });
      }
      const attachment = typeof message.attachment === 'object' ? message.attachment : {};
      const deletedFor = Array.isArray(attachment.deletedFor) ? attachment.deletedFor : [];
      const updatedAttachment = {
        ...attachment,
        deletedFor: deletedFor.includes(userId) ? deletedFor : [...deletedFor, userId],
        isDownloaded: false,
        ...(deleteFromCloud ? { cloudDeleted: true } : {}),
      };
      const updated = await prisma.appMessage.update({ where: { id: message.id }, data: { attachment: updatedAttachment } });

      if (deleteFromCloud) {
        const mediaId = attachment.mediaId || String(attachment.url || '').match(/\/api\/ssr\/media\/([^/?#]+)/)?.[1];
        if (mediaId) {
          const linkedMessages = await prisma.appMessage.findMany();
          for (const linkedMessage of linkedMessages) {
            const linkedAttachment = linkedMessage.attachment && typeof linkedMessage.attachment === 'object' ? linkedMessage.attachment : null;
            const linkedMediaId = linkedAttachment?.mediaId || String(linkedAttachment?.url || '').match(/\/api\/ssr\/media\/([^/?#]+)/)?.[1];
            if (linkedMediaId === mediaId) {
              await prisma.appMessage.update({
                where: { id: linkedMessage.id },
                data: { attachment: { ...linkedAttachment, cloudDeleted: true, isDownloaded: false } },
              });
            }
          }
          await prisma.appMediaChunk.deleteMany({ where: { mediaId } });
          await prisma.appMedia.deleteMany({ where: { id: mediaId } });
        }
      }
      return NextResponse.json({ success: true, message: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Messages PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
