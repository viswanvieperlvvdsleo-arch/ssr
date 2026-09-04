import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildScheduledMessageData } from '../defaults';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const senderId = searchParams.get('senderId');
    const messages = await prisma.appScheduledMessage.findMany({
      ...(senderId ? { where: { senderId } } : {}),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('ScheduledMessages GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const newScheduledMessage = await prisma.appScheduledMessage.create({ data: buildScheduledMessageData(data) });
    return NextResponse.json(newScheduledMessage);
  } catch (error) {
    console.error('ScheduledMessages POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const senderId = searchParams.get('senderId');
    if (!id) return NextResponse.json({ error: 'Scheduled message ID is required' }, { status: 400 });
    const scheduled = await prisma.appScheduledMessage.findUnique({ where: { id } });
    if (!scheduled) return NextResponse.json({ error: 'Scheduled message not found' }, { status: 404 });
    if (senderId && scheduled.senderId !== senderId) {
      return NextResponse.json({ error: 'You cannot cancel this scheduled message' }, { status: 403 });
    }
    await prisma.appScheduledMessage.update({ where: { id }, data: { status: 'cancelled' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ScheduledMessages DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
