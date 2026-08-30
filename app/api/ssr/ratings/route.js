import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function GET() {
  try {
    const ratings = await prisma.appTrainerRating.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(ratings);
  } catch (error) {
    console.error('Trainer ratings GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const trainerId = String(data.trainerId || '').trim();
    const raterId = String(data.raterId || '').trim();
    const rating = Number(data.rating);
    const comment = String(data.comment || '').trim().slice(0, 1000);

    if (!trainerId || !raterId || trainerId === raterId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      return NextResponse.json({ error: 'Choose a rating and write a review comment.' }, { status: 400 });
    }

    const saved = await prisma.appTrainerRating.upsert({
      where: { trainerId_raterId: { trainerId, raterId } },
      create: { trainerId, raterId, rating, comment },
      update: { rating, comment },
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Trainer ratings POST API Error:', error);
    return NextResponse.json({ error: 'Could not save rating' }, { status: 500 });
  }
}
