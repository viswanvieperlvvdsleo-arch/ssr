import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json([]);

    const notifications = await prisma.appNotification.findMany({
      where: { userId, type: { not: 'chat' } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications GET API Error:', error);
    return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { userId, id, action } = await req.json();
    if (!userId) return NextResponse.json({ error: 'User is required' }, { status: 400 });

    if (action === 'markAllRead') {
      await prisma.appNotification.updateMany({ where: { userId, read: false }, data: { read: true } });
    } else if (id) {
      await prisma.appNotification.updateMany({ where: { id, userId }, data: { read: true } });
    } else {
      return NextResponse.json({ error: 'Notification id or action is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications PUT API Error:', error);
    return NextResponse.json({ error: 'Could not update notification' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { userId, id, action } = await req.json();
    if (!userId) return NextResponse.json({ error: 'User is required' }, { status: 400 });

    if (action === 'deleteAll') {
      await prisma.appNotification.deleteMany({ where: { userId } });
    } else if (id) {
      await prisma.appNotification.deleteMany({ where: { id, userId } });
    } else {
      return NextResponse.json({ error: 'Notification id or action is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications DELETE API Error:', error);
    return NextResponse.json({ error: 'Could not delete notification' }, { status: 500 });
  }
}
