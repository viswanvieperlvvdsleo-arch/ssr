import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export const dynamic = 'force-dynamic';

// Get all open availability slots
export async function GET() {
  try {
    const slots = await prisma.availability.findMany({
      where: { isBooked: false },
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
  }
}
