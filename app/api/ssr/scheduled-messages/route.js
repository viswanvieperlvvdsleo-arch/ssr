import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildScheduledMessageData } from '../defaults';

export async function GET(req) {
  try {
    const messages = await prisma.appScheduledMessage.findMany({ orderBy: { createdAt: 'desc' } });
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
    await prisma.appScheduledMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ScheduledMessages DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
