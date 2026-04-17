import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

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
