import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { getRazorpayConfig, razorpayRequest } from '../razorpay';

export const runtime = 'nodejs';

async function refreshAvailability(courseId) {
  const availableCount = await prisma.appServerCredential.count({ where: { courseId, status: 'available' } });
  await prisma.appCourse.update({ where: { id: courseId }, data: { credentialCount: availableCount } }).catch(() => null);
  return availableCount;
}

async function releaseExpiredReservations(courseId) {
  await prisma.appServerCredential.updateMany({
    where: { courseId, status: 'reserved', reservedUntil: { lte: new Date() } },
    data: { status: 'available', assignedTo: null, reservationId: null, reservedUntil: null },
  });
}

async function reserveCredential(courseId, userId, reservationId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const credential = await prisma.appServerCredential.findFirst({ where: { courseId, status: 'available' }, orderBy: { createdAt: 'asc' } });
    if (!credential) return null;
    const result = await prisma.appServerCredential.updateMany({
      where: { id: credential.id, courseId, status: 'available' },
      data: { status: 'reserved', assignedTo: userId, reservationId, reservedUntil: new Date(Date.now() + 15 * 60 * 1000) },
    });
    if (result.count === 1) return credential;
  }
  return null;
}

async function releaseReservation(credentialId, reservationId) {
  await prisma.appServerCredential.updateMany({
    where: { id: credentialId, status: 'reserved', reservationId },
    data: { status: 'available', assignedTo: null, reservationId: null, reservedUntil: null },
  });
}

export async function POST(req) {
  let reservedCredential = null;
  let reservationId = null;
  try {
    const { courseId, userId, months } = await req.json();
    if (!courseId || !userId || !Number.isInteger(Number(months))) {
      return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
    }
    const { keyId } = getRazorpayConfig();
    const [course, user] = await Promise.all([
      prisma.appCourse.findUnique({ where: { id: courseId }, select: { id: true, title: true, serviceType: true, pricePlans: true } }),
      prisma.appUser.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true } }),
    ]);
    if (!course || course.serviceType !== 'server') return NextResponse.json({ error: 'Server service not found' }, { status: 404 });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const plan = Array.isArray(course.pricePlans) ? course.pricePlans.find(item => Number(item.months) === Number(months)) : null;
    const originalPrice = Number(plan?.originalPrice);
    const discountPrice = Number(plan?.discountPrice);
    const discountPercent = Number(plan?.discountPercent || 0);
    if (!plan || !Number.isInteger(originalPrice) || !Number.isInteger(discountPrice) || discountPrice < 1) {
      return NextResponse.json({ error: 'That pricing plan is no longer available' }, { status: 409 });
    }

    await releaseExpiredReservations(courseId);
    reservationId = randomUUID();
    reservedCredential = await reserveCredential(courseId, userId, reservationId);
    if (!reservedCredential) return NextResponse.json({ error: 'This server is out of stock' }, { status: 409 });

    const amount = discountPrice * 100;
    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `server_${Date.now()}_${reservationId.slice(0, 6)}`,
        payment_capture: 1,
        notes: { courseId, userId, months: String(Number(months)) },
      }),
    });
    await prisma.appServerPayment.create({
      data: {
        razorpayOrderId: order.id,
        courseId,
        credentialId: reservedCredential.id,
        reservationId,
        userId,
        months: Number(months),
        originalPrice,
        discountPrice,
        discountPercent,
        amount,
        currency: order.currency || 'INR',
      },
    });
    const availableCount = await refreshAvailability(courseId);
    return NextResponse.json({
      success: true,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'SSR Biz',
      description: `${course.title} - ${Number(months)} month${Number(months) === 1 ? '' : 's'}`,
      prefill: { name: user.name || '', email: user.email || '', contact: user.phone || '' },
      availableCount,
    });
  } catch (error) {
    if (reservedCredential?.id && reservationId) await releaseReservation(reservedCredential.id, reservationId).catch(() => null);
    console.error('Razorpay order API Error:', error);
    const status = error.message === 'Razorpay is not configured' ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? error.message : 'Could not start the payment' }, { status });
  }
}

export async function DELETE(req) {
  try {
    const { orderId, userId } = await req.json();
    if (!orderId || !userId) return NextResponse.json({ error: 'Invalid cancellation details' }, { status: 400 });
    const payment = await prisma.appServerPayment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment || payment.userId !== userId) return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    if (payment.status !== 'created') return NextResponse.json({ success: true, availableCount: await refreshAvailability(payment.courseId) });

    const order = await razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);
    if (Number(order.amount_paid || 0) > 0 || order.status === 'paid') {
      return NextResponse.json({ error: 'Payment has already been received and must be verified' }, { status: 409 });
    }
    const cancelled = await prisma.appServerPayment.updateMany({ where: { id: payment.id, status: 'created' }, data: { status: 'cancelled' } });
    if (cancelled.count === 1) await releaseReservation(payment.credentialId, payment.reservationId);
    return NextResponse.json({ success: true, availableCount: await refreshAvailability(payment.courseId) });
  } catch (error) {
    console.error('Razorpay cancellation API Error:', error);
    return NextResponse.json({ error: 'Could not cancel the payment order' }, { status: 500 });
  }
}
