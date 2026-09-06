let checkoutScriptPromise = null;

function loadCheckoutScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Payments are available only in the browser'));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScriptPromise = null;
      reject(new Error('Could not load the secure payment window'));
    };
    document.head.appendChild(script);
  });
  return checkoutScriptPromise;
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function checkoutServerAccess({ courseId, user, plan, onAvailability }) {
  if (!courseId || !user?.id || !plan) throw new Error('Choose a valid server plan');
  await loadCheckoutScript();

  const orderResponse = await fetch('/api/ssr/payments/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, userId: user.id, months: Number(plan.months) }),
  });
  const order = await readJson(orderResponse);
  if (!orderResponse.ok || !order.success) throw new Error(order.error || 'Could not start the payment');
  onAvailability?.(Number(order.availableCount || 0));

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const cancelReservation = async () => {
      const response = await fetch('/api/ssr/payments/order', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId, userId: user.id }),
      }).catch(() => null);
      if (response) {
        const data = await readJson(response);
        if (response.ok) onAvailability?.(Number(data.availableCount || 0));
      }
    };

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: '#0A6ED1' },
      handler: async payment => {
        try {
          const verifyResponse = await fetch('/api/ssr/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, ...payment }),
          });
          const result = await readJson(verifyResponse);
          if (!verifyResponse.ok || !result.success) throw new Error(result.error || 'Could not verify the payment');
          onAvailability?.(Number(result.availableCount || 0));
          settle(resolve, result);
        } catch (error) {
          settle(reject, error);
        }
      },
      modal: {
        ondismiss: async () => {
          await cancelReservation();
          settle(reject, new Error('Payment cancelled. No server credential was assigned.'));
        },
      },
    });
    checkout.open();
  });
}
