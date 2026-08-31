import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildMeetingData } from '../defaults';
import { notifyUsers } from '../notify';

export async function GET(req) {
  try {
    const meetings = await prisma.appMeeting.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Meetings GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const newMeeting = await prisma.appMeeting.create({ data: buildMeetingData(data) });
    let recipientIds = Array.isArray(newMeeting.participants) ? newMeeting.participants : [];
    if (newMeeting.chatId) {
      const chat = await prisma.appChat.findUnique({ where: { id: newMeeting.chatId }, select: { participants: true } });
      recipientIds = [...new Set([...recipientIds, ...(chat?.participants || [])])];
    }
    await notifyUsers(recipientIds.filter(id => id !== newMeeting.hostId), {
      title: 'New meeting scheduled',
      body: `${newMeeting.title} - ${newMeeting.date} ${newMeeting.time}`,
      url: `/ssr-app/home?meetingId=${newMeeting.id}`,
      data: { type: 'meeting', meetingId: newMeeting.id },
    });
    return NextResponse.json(newMeeting);
  } catch (error) {
    console.error('Meetings POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await prisma.appMeeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meetings DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
