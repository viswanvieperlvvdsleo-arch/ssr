import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const record = await prisma.cMSContent.findUnique({
      where: { key: 'global' }
    });
    if (!record) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ success: true, data: record.data });
  } catch (error) {
    console.error('Error fetching CMS content:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ success: false, error: 'Data is required' }, { status: 400 });
    }

    const updated = await prisma.cMSContent.upsert({
      where: { key: 'global' },
      update: { data },
      create: { key: 'global', data }
    });

    return NextResponse.json({ success: true, data: updated.data });
  } catch (error) {
    console.error('Error updating CMS content:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
