import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { fulfillServerPayment } from '../../server-credentials/fulfill';
import { isValidPaymentSignature, razorpayRequest } from '../razorpay';

export const runtime = 'nodejs';

export async function POST(req) {
  let paymentRecord = null;
  try {
    const { userId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await req.json();
    if (!userId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Incomplete payment verification details' }, { status: 400 });
    }
    paymentRecord = await prisma.appServerPayment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!paymentRecord || paymentRecord.userId !== userId) return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    if (paymentRecord.status === 'completed') {
      const availableCount = await prisma.appServerCredential.count({ where: { courseId: paymentRecord.courseId, status: 'available' } });
      return NextResponse.json({ success: true, bookingId: paymentRecord.bookingId, chatId: paymentRecord.chatId, availableCount });
    }
    if (paymentRecord.status !== 'created') return NextResponse.json({ error: 'This payment is already being processed' }, { status: 409 });
    if (!isValidPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 401 });
    }

    const razorpayPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    const validPayment = razorpayPayment.order_id === orderId
      && Number(razorpayPayment.amount) === paymentRecord.amount
      && razorpayPayment.currency === paymentRecord.currency
      && (razorpayPayment.captured === true || razorpayPayment.status === 'captured');
    if (!validPayment) return NextResponse.json({ error: 'Payment is not captured or does not match this order' }, { status: 409 });

    const locked = await prisma.appServerPayment.updateMany({
      where: { id: paymentRecord.id, status: 'created' },
      data: { status: 'processing', razorpayPaymentId: paymentId },
    });
    if (locked.count !== 1) return NextResponse.json({ error: 'This payment is already being processed' }, { status: 409 });
    paymentRecord = { ...paymentRecord, status: 'processing', razorpayPaymentId: paymentId };

    const result = await fulfillServerPayment(paymentRecord);
    await prisma.appServerPayment.update({
      where: { id: paymentRecord.id },
      data: { status: 'completed', bookingId: result.bookingId, chatId: result.chatId },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (paymentRecord?.id && paymentRecord.status === 'processing') {
      await prisma.appServerPayment.updateMany({ where: { id: paymentRecord.id, status: 'processing' }, data: { status: 'created' } }).catch(() => null);
    }
    console.error('Razorpay verification API Error:', error);
    return NextResponse.json({ error: 'Payment was received but server access could not be delivered. Please contact support.' }, { status: 500 });
  }
}
