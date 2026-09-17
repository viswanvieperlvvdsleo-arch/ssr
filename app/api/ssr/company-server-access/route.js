import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { getSessionActor } from '../session';
import { decryptCredential } from '../server-credentials/credentials';

export const runtime = 'nodejs';

export async function GET(request) {
  const actor = await getSessionActor(request);
  if (!actor?.companyId) return NextResponse.json({ error: 'Company access required' }, { status: 403 });
  const bookingId = new URL(request.url).searchParams.get('bookingId');
  if (!bookingId) return NextResponse.json({ error: 'Booking is required' }, { status: 400 });
  const booking = await prisma.appServerBooking.findFirst({
    where: { id: bookingId, userId: actor.id, paymentStatus: 'paid' },
    select: { id: true, courseId: true, credentialId: true },
  });
  if (!booking) return NextResponse.json({ error: 'Paid booking not found for this account' }, { status: 404 });
  const credential = await prisma.appServerCredential.findUnique({ where: { id: booking.credentialId }, select: { credential: true, assignedTo: true } });
  if (!credential || credential.assignedTo !== actor.id) return NextResponse.json({ error: 'Server access is not ready' }, { status: 409 });
  const course = await prisma.appCourse.findUnique({ where: { id: booking.courseId }, select: { title: true } });
  return NextResponse.json({ title: course?.title || 'Server access', credential: decryptCredential(credential.credential) }, { headers: { 'Cache-Control': 'no-store' } });
}
