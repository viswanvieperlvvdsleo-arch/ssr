import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { fulfillServerPayment } from '../../server-credentials/fulfill';
import { razorpayRequest } from '../razorpay';

export const runtime = 'nodejs';

function paymentMatchesOrder(payment, record) {
  return payment?.id
    && payment.order_id === record.razorpayOrderId
    && Number(payment.amount) === record.amount
    && payment.currency === record.currency
    && (payment.captured === true || payment.status === 'captured');
}

async function findCapturedPayment(record) {
  if (record.razorpayPaymentId) {
    return razorpayRequest(`/payments/${encodeURIComponent(record.razorpayPaymentId)}`);
  }
  const result = await razorpayRequest(`/orders/${encodeURIComponent(record.razorpayOrderId)}/payments`);
  return (result.items || []).find(payment => payment.captured === true || payment.status === 'captured') || null;
}

export async function POST(req) {
  let paymentRecord = null;
  let ownsProcessingLock = false;
  try {
    const { userId, orderId } = await req.json();
    if (!userId || !orderId) return NextResponse.json({ error: 'Payment details are required' }, { status: 400 });

    paymentRecord = await prisma.appServerPayment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!paymentRecord || paymentRecord.userId !== userId) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }
    if (paymentRecord.status === 'completed') {
      const availableCount = await prisma.appServerCredential.count({ where: { courseId: paymentRecord.courseId, status: 'available' } });
      return NextResponse.json({ success: true, bookingId: paymentRecord.bookingId, chatId: paymentRecord.chatId, availableCount });
    }
    if (paymentRecord.status !== 'created') {
      return NextResponse.json({ error: 'This payment cannot be confirmed from its current state' }, { status: 409 });
    }

    const razorpayPayment = await findCapturedPayment(paymentRecord);
    if (!paymentMatchesOrder(razorpayPayment, paymentRecord)) {
      return NextResponse.json({ error: 'Razorpay has not confirmed this payment as captured' }, { status: 409 });
    }

    const locked = await prisma.appServerPayment.updateMany({
      where: { id: paymentRecord.id, status: 'created' },
      data: { status: 'processing', razorpayPaymentId: razorpayPayment.id },
    });
    if (locked.count !== 1) return NextResponse.json({ error: 'This payment is already being confirmed' }, { status: 409 });
    ownsProcessingLock = true;
    paymentRecord = { ...paymentRecord, status: 'processing', razorpayPaymentId: razorpayPayment.id };

    const result = await fulfillServerPayment(paymentRecord);
    await prisma.appServerPayment.update({
      where: { id: paymentRecord.id },
      data: { status: 'completed', bookingId: result.bookingId, chatId: result.chatId },
    });
    ownsProcessingLock = false;
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (paymentRecord?.id && ownsProcessingLock) {
      await prisma.appServerPayment.updateMany({
        where: { id: paymentRecord.id, status: 'processing' },
        data: { status: 'created' },
      }).catch(() => null);
    }
    console.error('Payment reconciliation API Error:', error);
    return NextResponse.json({ error: 'Payment is captured, but login delivery could not be completed. Please contact support.' }, { status: 500 });
  }
}
