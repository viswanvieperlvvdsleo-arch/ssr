import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildMessageData } from '../defaults';

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
      (chat.participants || []).filter(id => id !== data.senderId).forEach(id => {
        unreadBy[id] = Number(unreadBy[id] || 0) + 1;
      });
      await prisma.appChat.update({
        where: { id: data.chatId },
        data: { updatedAt: new Date(), unreadBy }
      });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Messages POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
export async function PUT(req) {
  try {
    const { action, msgIds, chatId, userId, content, forEveryone } = await req.json();

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
      await prisma.appMessage.update({
        where: { id: msgIds[0] },
        data: { attachment: null }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Messages PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
