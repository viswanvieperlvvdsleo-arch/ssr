import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function GET(req) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'User is required' }, { status: 401 });
    const revision = await prisma.appRealtimeRevision.findUnique({ where: { id: 'global' } });
    return NextResponse.json(
      { posts: revision?.posts || 0, tasks: revision?.tasks || 0 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Realtime revision API error:', error);
    return NextResponse.json({ error: 'Could not check for updates' }, { status: 500 });
  }
}
