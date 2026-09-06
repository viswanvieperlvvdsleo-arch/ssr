import { NextResponse } from 'next/server';
import { prisma } from '../../prisma';
import { fulfillServerPayment } from '../../server-credentials/fulfill';
import { isValidWebhookSignature } from '../razorpay';

export const runtime = 'nodejs';

function paymentMatchesOrder(payment, record) {
  return payment?.id
    && payment.order_id === record.razorpayOrderId
    && Number(payment.amount) === record.amount
    && payment.currency === record.currency
    && (payment.captured === true || payment.status === 'captured');
}

export async function POST(req) {
  let paymentRecord = null;
  let ownsProcessingLock = false;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    if (!isValidWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event?.event !== 'payment.captured') {
      return NextResponse.json({ received: true, ignored: true });
    }

    const payment = event?.payload?.payment?.entity;
    if (!payment?.order_id) {
      return NextResponse.json({ error: 'Payment order is missing' }, { status: 400 });
    }

    paymentRecord = await prisma.appServerPayment.findUnique({
      where: { razorpayOrderId: payment.order_id },
    });
    if (!paymentRecord) {
      return NextResponse.json({ received: true, ignored: true });
    }
    if (!paymentMatchesOrder(payment, paymentRecord)) {
      return NextResponse.json({ error: 'Captured payment does not match the server order' }, { status: 409 });
    }
    if (paymentRecord.status === 'completed') {
      return NextResponse.json({ received: true, completed: true });
    }
    if (paymentRecord.status === 'processing') {
      return NextResponse.json({ error: 'Payment is still being processed' }, { status: 409 });
    }
    if (paymentRecord.status !== 'created') {
      return NextResponse.json({ error: 'Payment order cannot be fulfilled' }, { status: 409 });
    }

    const locked = await prisma.appServerPayment.updateMany({
      where: { id: paymentRecord.id, status: 'created' },
      data: { status: 'processing', razorpayPaymentId: payment.id },
    });
    if (locked.count !== 1) {
      return NextResponse.json({ error: 'Payment is already being processed' }, { status: 409 });
    }
    ownsProcessingLock = true;
    paymentRecord = { ...paymentRecord, status: 'processing', razorpayPaymentId: payment.id };

    const result = await fulfillServerPayment(paymentRecord);
    await prisma.appServerPayment.update({
      where: { id: paymentRecord.id },
      data: { status: 'completed', bookingId: result.bookingId, chatId: result.chatId },
    });
    ownsProcessingLock = false;

    return NextResponse.json({ received: true, completed: true });
  } catch (error) {
    if (paymentRecord?.id && ownsProcessingLock) {
      await prisma.appServerPayment.updateMany({
        where: { id: paymentRecord.id, status: 'processing' },
        data: { status: 'created' },
      }).catch(() => null);
    }
    console.error('Razorpay webhook API Error:', error);
    const status = error.message === 'Razorpay webhook is not configured' ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? error.message : 'Webhook processing failed' }, { status });
  }
}
