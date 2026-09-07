import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const payments = await prisma.appServerPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        courseId: true,
        months: true,
        originalPrice: true,
        discountPrice: true,
        discountPercent: true,
        amount: true,
        currency: true,
        status: true,
        bookingId: true,
        chatId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const courseIds = [...new Set(payments.map(payment => payment.courseId))];
    const courses = courseIds.length
      ? await prisma.appCourse.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, image: true, module: true },
        })
      : [];
    const courseById = new Map(courses.map(course => [course.id, course]));

    return NextResponse.json(payments.map(payment => ({
      ...payment,
      course: courseById.get(payment.courseId) || null,
    })));
  } catch (error) {
    console.error('Payment history API Error:', error);
    return NextResponse.json({ error: 'Could not load payment history' }, { status: 500 });
  }
}
