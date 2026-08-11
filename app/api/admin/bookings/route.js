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
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { availability: true }
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
