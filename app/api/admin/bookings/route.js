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

export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Unbook the slot before deleting the booking
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (booking?.availabilityId) {
      await prisma.availability.update({
        where: { id: booking.availabilityId },
        data: { isBooked: false }
      });
    }

    await prisma.booking.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting admin booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const { isFollowedUp } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { isFollowedUp }
    });

    return NextResponse.json({ ok: true, data: updatedBooking });
  } catch (error) {
    console.error('Error updating admin booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
