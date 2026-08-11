import { NextResponse } from 'next/server';
import prisma from '../../../../lib/db';

export const dynamic = 'force-dynamic';

function checkAuth(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes('admin_session=authenticated')) {
    return true;
  }
  const password = request.headers.get('x-admin-password');
  const adminPasscode = process.env.ADMIN_PASSWORD || 'Ssrbs';
  return password === adminPasscode;
}

export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    await prisma.contactMessage.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting admin message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
