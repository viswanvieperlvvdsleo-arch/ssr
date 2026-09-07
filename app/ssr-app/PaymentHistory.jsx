'use client';

import { useCallback, useEffect, useState } from 'react';

export default function PaymentHistory({ currentUser, onNavigateToChat, showHeading = true }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  const loadPayments = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/ssr/payments/history?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load payment history');
      setPayments(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load payment history');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const finishDelivery = async payment => {
    setConfirmingOrderId(payment.razorpayOrderId);
    setError('');
    try {
      const response = await fetch('/api/ssr/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, orderId: payment.razorpayOrderId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not finish login delivery');
      await loadPayments();
      if (data.chatId) onNavigateToChat?.(data.chatId);
    } catch (deliveryError) {
      setError(deliveryError.message || 'Could not finish login delivery');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const statusDetails = {
    completed: { label: 'Paid', color: '#047857', background: '#DCFCE7' },
    processing: { label: 'Confirming', color: '#1D4ED8', background: '#DBEAFE' },
    created: { label: 'Needs confirmation', color: '#A16207', background: '#FEF3C7' },
    failed: { label: 'Failed', color: '#B91C1C', background: '#FEE2E2' },
    cancelled: { label: 'Cancelled', color: '#475569', background: '#F1F5F9' },
  };

  return (
    <div>
      {showHeading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 5px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Payment History</h3>
            <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>Server-access payments made from this account.</p>
          </div>
          <button type="button" onClick={loadPayments} disabled={loading} title="Refresh payments" aria-label="Refresh payments" style={{ width: 36, height: 36, flexShrink: 0, border: '1px solid #CBD5E1', borderRadius: 7, background: '#fff', color: '#0A6ED1', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5"/></svg>
          </button>
        </div>
      )}

      {error && <div style={{ padding: '11px 12px', marginBottom: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, color: '#B91C1C', fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: '#64748B', fontSize: 13 }}>Loading payments...</p>}
      {!loading && !error && payments.length === 0 && <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>No payments have been started yet.</div>}

      {!loading && payments.map((payment, index) => {
        const status = statusDetails[payment.status] || { label: payment.status || 'Unknown', color: '#475569', background: '#F1F5F9' };
        const date = new Date(payment.createdAt);
        const canRetry = payment.status === 'created' && Boolean(payment.razorpayPaymentId);
        return (
          <div key={payment.id} style={{ padding: '16px 0', borderTop: index === 0 ? '1px solid #E2E8F0' : 'none', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#0F172A', fontSize: 14, overflowWrap: 'anywhere' }}>{payment.course?.title || 'Server access'}</strong>
                <span style={{ display: 'block', marginTop: 4, color: '#64748B', fontSize: 12 }}>{payment.months} month{Number(payment.months) === 1 ? '' : 's'} · {date.toLocaleString('en-IN')}</span>
              </div>
              <span style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 6, background: status.background, color: status.color, fontSize: 11, fontWeight: 800 }}>{status.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 12 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: '#0F172A', fontSize: 15, fontWeight: 800 }}>₹{Number(payment.discountPrice || payment.amount / 100 || 0).toLocaleString('en-IN')}</span>
                <span style={{ display: 'block', marginTop: 3, color: '#94A3B8', fontSize: 10, overflowWrap: 'anywhere' }}>Order {payment.razorpayOrderId}</span>
                {payment.razorpayPaymentId && <span style={{ display: 'block', marginTop: 2, color: '#94A3B8', fontSize: 10, overflowWrap: 'anywhere' }}>Payment {payment.razorpayPaymentId}</span>}
              </div>
              {payment.status === 'completed' && payment.chatId && <button type="button" onClick={() => onNavigateToChat?.(payment.chatId)} style={actionButtonStyle}>Open login chat</button>}
              {canRetry && <button type="button" onClick={() => finishDelivery(payment)} disabled={confirmingOrderId === payment.razorpayOrderId} style={{ ...actionButtonStyle, background: '#0A6ED1', color: '#fff', cursor: confirmingOrderId ? 'wait' : 'pointer' }}>{confirmingOrderId === payment.razorpayOrderId ? 'Confirming...' : 'Finish delivery'}</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const actionButtonStyle = {
  border: '1px solid #0A6ED1', borderRadius: 7, padding: '7px 10px', background: '#fff', color: '#0A6ED1',
  fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
};
