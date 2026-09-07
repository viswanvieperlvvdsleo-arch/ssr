import { NextResponse } from 'next/server';
import { processDueScheduledTasks } from './processor';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get('authorization');
  const isLocalDevelopment = process.env.NODE_ENV !== 'production';
  if (!isLocalDevelopment && (!secret || authorization !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processDueScheduledTasks();
    const failureCount = result.details.scheduledMessages.failures.length + result.details.meetingNotifications.failures.length;
    return NextResponse.json(
      { success: failureCount === 0, ...result },
      { status: failureCount === 0 ? 200 : 500, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Scheduled tasks API Error:', error);
    return NextResponse.json({ error: 'Could not process scheduled tasks' }, { status: 500 });
  }
}
