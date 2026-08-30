import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildChatData, hasEmployeePermission } from '../defaults';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;
    if (userId) {
      where.OR = [
        { requesterId: userId },
        { targetId: userId },
      ];
    }

    const requests = await prisma.appChatRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('ChatRequests GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { requesterId, targetId, note } = await req.json();

    if (!requesterId || !targetId || requesterId === targetId) {
      return NextResponse.json({ error: 'Invalid request participants' }, { status: 400 });
    }

    const existingChat = await prisma.appChat.findFirst({
      where: {
        type: 'direct',
        participants: { hasEvery: [requesterId, targetId] },
      },
    });

    if (existingChat) {
      return NextResponse.json({ error: 'Chat access already exists', chat: existingChat }, { status: 409 });
    }

    const existingPending = await prisma.appChatRequest.findFirst({
      where: { requesterId, targetId, status: 'pending' },
    });

    if (existingPending) return NextResponse.json(existingPending);

    const request = await prisma.appChatRequest.create({
      data: {
        requesterId,
        targetId,
        note: note || null,
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error('ChatRequests POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, action, decidedById } = await req.json();
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;

    if (!id || !status || !decidedById) {
      return NextResponse.json({ error: 'Invalid request decision' }, { status: 400 });
    }

    const decider = await prisma.appUser.findUnique({ where: { id: decidedById } });
    if (!hasEmployeePermission(decider, 'request_access')) {
      return NextResponse.json({ error: 'Not allowed to decide chat requests' }, { status: 403 });
    }

    const request = await prisma.appChatRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    let chat = null;
    if (status === 'approved') {
      chat = await prisma.appChat.findFirst({
        where: {
          type: 'direct',
          participants: { hasEvery: [request.requesterId, request.targetId] },
        },
      });

      if (!chat) {
        chat = await prisma.appChat.create({
          data: buildChatData({
            type: 'direct',
            participants: [request.requesterId, request.targetId],
          }),
        });
      }
    }

    const updatedRequest = await prisma.appChatRequest.update({
      where: { id },
      data: {
        status,
        decidedById,
        chatId: chat?.id || request.chatId || null,
      },
    });

    return NextResponse.json({ request: updatedRequest, chat });
  } catch (error) {
    console.error('ChatRequests PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
