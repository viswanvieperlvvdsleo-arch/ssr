import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildMeetingData } from '../defaults';

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
