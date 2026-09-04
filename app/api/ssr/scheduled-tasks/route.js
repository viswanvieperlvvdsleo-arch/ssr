import { NextResponse } from 'next/server';
import { processDueScheduledTasks } from './processor';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get('authorization');
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processDueScheduledTasks();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Scheduled tasks API Error:', error);
    return NextResponse.json({ error: 'Could not process scheduled tasks' }, { status: 500 });
  }
}
