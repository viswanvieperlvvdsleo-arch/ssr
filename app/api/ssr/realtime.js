import { prisma } from './prisma';

const CHANNELS = new Set(['posts', 'tasks']);

export async function bumpRealtimeRevision(channel) {
  if (!CHANNELS.has(channel)) return;
  try {
    await prisma.appRealtimeRevision.upsert({
      where: { id: 'global' },
      create: { id: 'global', [channel]: 1 },
      update: { [channel]: { increment: 1 } },
    });
  } catch (error) {
    // A failed revision signal must not roll back the user's completed action.
    console.error(`Could not update ${channel} realtime revision:`, error);
  }
}
