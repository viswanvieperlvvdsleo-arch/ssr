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
    const slots = await prisma.availability.findMany({
      orderBy: { date: 'asc' },
      include: { booking: true }
    });
    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching admin slots:', error);
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, startTime, endTime } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Date, start time, and end time are required' }, { status: 400 });
    }

    const slot = await prisma.availability.create({
      data: {
        date: new Date(date),
        startTime,
        endTime
      }
    });

    return NextResponse.json({ ok: true, slot });
  } catch (error) {
    console.error('Error creating admin slot:', error);
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
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
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
    }

    await prisma.availability.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting admin slot:', error);
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
  }
}
