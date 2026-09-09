import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const params = new URL(req.url).searchParams;
    const userId = params.get('userId');
    const requestedAllPayments = params.get('scope') === 'all';
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const canViewAllPayments = user.role === 'Admin' || user.role === 'Super Admin';
    if (requestedAllPayments && !canViewAllPayments) {
      return NextResponse.json({ error: 'Admin access is required' }, { status: 403 });
    }

    const payments = await prisma.appServerPayment.findMany({
      where: requestedAllPayments ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      take: requestedAllPayments ? 500 : 100,
      select: {
        id: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        userId: true,
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
    const customerIds = [...new Set(payments.map(payment => payment.userId))];
    const customers = customerIds.length
      ? await prisma.appUser.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, email: true, phone: true, role: true },
        })
      : [];
    const customerById = new Map(customers.map(customer => [customer.id, customer]));

    return NextResponse.json(payments.map(payment => ({
      ...payment,
      course: courseById.get(payment.courseId) || null,
      customer: customerById.get(payment.userId) || null,
    })));
  } catch (error) {
    console.error('Payment history API Error:', error);
    return NextResponse.json({ error: 'Could not load payment history' }, { status: 500 });
  }
}
