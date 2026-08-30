import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function POST(req) {
  try {
    const { userId, token, platform, userAgent } = await req.json();
    if (!userId || !token) {
      return NextResponse.json({ error: 'User and notification token are required' }, { status: 400 });
    }

    const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const pushToken = await prisma.appPushToken.upsert({
      where: { token },
      update: { userId, platform: platform || null, userAgent: userAgent || null },
      create: { userId, token, platform: platform || null, userAgent: userAgent || null },
    });

    return NextResponse.json({ success: true, id: pushToken.id });
  } catch (error) {
    console.error('Push token POST API Error:', error);
    return NextResponse.json({ error: 'Could not save notification token' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Notification token is required' }, { status: 400 });
    await prisma.appPushToken.deleteMany({ where: { token } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push token DELETE API Error:', error);
    return NextResponse.json({ error: 'Could not remove notification token' }, { status: 500 });
  }
}
