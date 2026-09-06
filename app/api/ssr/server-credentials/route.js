import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { hasEmployeePermission } from '../defaults';
import { encryptCredential, splitCredentials } from './credentials';

async function findManager(userId) {
  if (!userId) return null;
  return prisma.appUser.findUnique({
    where: { id: userId },
    select: { id: true, name: true, initials: true, color: true, role: true, permissions: true },
  });
}

export async function GET(req) {
  try {
    const params = new URL(req.url).searchParams;
    const courseId = params.get('courseId');
    const userId = params.get('userId');
    if (userId) {
      const bookings = await prisma.appServerBooking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, courseId: true, userId: true, months: true, originalPrice: true, discountPrice: true, discountPercent: true, paymentStatus: true, status: true, chatId: true, createdAt: true, updatedAt: true },
      });
      return NextResponse.json(bookings);
    }
    if (!courseId) return NextResponse.json({ error: 'courseId or userId is required' }, { status: 400 });
    await prisma.appServerCredential.updateMany({
      where: { courseId, status: 'reserved', reservedUntil: { lte: new Date() } },
      data: { status: 'available', assignedTo: null, reservationId: null, reservedUntil: null },
    });
    const availableCount = await prisma.appServerCredential.count({ where: { courseId, status: 'available' } });
    await prisma.appCourse.update({ where: { id: courseId }, data: { credentialCount: availableCount } }).catch(() => null);
    return NextResponse.json({ availableCount });
  } catch (error) {
    console.error('Server credentials GET API Error:', error);
    return NextResponse.json({ error: 'Could not load server availability' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { courseId, userId, credentials } = await req.json();
    if (!process.env.SERVER_CREDENTIAL_ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Server credential encryption is not configured' }, { status: 503 });
    }
    const manager = await findManager(userId);
    if (!manager || !hasEmployeePermission(manager, 'post_services') || !['Admin', 'Super Admin'].includes(manager.role)) {
      return NextResponse.json({ error: 'Only an administrator can add server credentials' }, { status: 403 });
    }
    const course = courseId ? await prisma.appCourse.findUnique({ where: { id: courseId }, select: { id: true, serviceType: true } }) : null;
    if (!course || course.serviceType !== 'server') return NextResponse.json({ error: 'Server service not found' }, { status: 404 });
    const items = splitCredentials(credentials);
    if (!items.length) return NextResponse.json({ error: 'Add at least one credential block' }, { status: 400 });
    await prisma.$transaction(items.map(credential => prisma.appServerCredential.create({
      data: { courseId, credential: encryptCredential(credential) },
    })));
    const availableCount = await prisma.appServerCredential.count({ where: { courseId, status: 'available' } });
    await prisma.appCourse.update({ where: { id: courseId }, data: { credentialCount: availableCount } });
    return NextResponse.json({ success: true, added: items.length, availableCount });
  } catch (error) {
    console.error('Server credentials POST API Error:', error);
    return NextResponse.json({ error: 'Could not add server credentials' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Payment verification is required before server access can be assigned' }, { status: 402 });
}
