import { createHmac, timingSafeEqual } from 'node:crypto';

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured');
  return {
    keyId,
    keySecret,
    authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
  };
}

export async function razorpayRequest(path, options = {}) {
  const { authorization } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error?.description || 'Razorpay request failed');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function isValidPaymentSignature(orderId, paymentId, signature) {
  const { keySecret } = getRazorpayConfig();
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(String(signature || ''), 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isValidWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('Razorpay webhook is not configured');

  const received = String(signature || '');
  if (!/^[a-f\d]{64}$/i.test(received)) return false;

  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
