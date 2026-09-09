'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_DETAILS = {
  completed: { label: 'Paid', color: '#047857', background: '#DCFCE7' },
  processing: { label: 'Confirming', color: '#1D4ED8', background: '#DBEAFE' },
  created: { label: 'Needs confirmation', color: '#A16207', background: '#FEF3C7' },
  failed: { label: 'Failed', color: '#B91C1C', background: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: '#475569', background: '#F1F5F9' },
};

const actionButtonStyle = {
  border: '1px solid #0A6ED1', borderRadius: 7, padding: '7px 10px', background: '#fff', color: '#0A6ED1',
  fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
};

export default function PaymentHistory({ currentUser, onNavigateToChat, showHeading = true }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const isAdminView = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const loadPayments = useCallback(async ({ silent = false } = {}) => {
    if (!currentUser?.id) return;
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams({ userId: currentUser.id });
      if (isAdminView) query.set('scope', 'all');
      const response = await fetch(`/api/ssr/payments/history?${query}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load payment history');
      setPayments(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load payment history');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUser?.id, isAdminView]);

  useEffect(() => {
    loadPayments();
    const intervalId = window.setInterval(() => loadPayments({ silent: true }), 5000);
    return () => window.clearInterval(intervalId);
  }, [loadPayments]);

  const summary = useMemo(() => payments.reduce((result, payment) => {
    if (payment.status === 'completed') {
      result.paid += 1;
      result.revenue += Number(payment.discountPrice || payment.amount / 100 || 0);
    } else if (payment.status === 'created' || payment.status === 'processing') {
      result.pending += 1;
    } else if (payment.status === 'failed') {
      result.failed += 1;
    } else if (payment.status === 'cancelled') {
      result.cancelled += 1;
    }
    return result;
  }, { paid: 0, pending: 0, failed: 0, cancelled: 0, revenue: 0 }), [payments]);

  const visiblePayments = useMemo(() => payments.filter(payment => {
    if (filter === 'all') return true;
    if (filter === 'paid') return payment.status === 'completed';
    if (filter === 'pending') return payment.status === 'created' || payment.status === 'processing';
    return payment.status === filter;
  }), [filter, payments]);

  const finishDelivery = async payment => {
    setConfirmingOrderId(payment.razorpayOrderId);
    setError('');
    try {
      const response = await fetch('/api/ssr/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: payment.userId || currentUser.id, orderId: payment.razorpayOrderId }),
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

  const metrics = [
    { label: 'Paid', value: summary.paid, color: '#047857', background: '#ECFDF5' },
    { label: 'Pending', value: summary.pending, color: '#A16207', background: '#FFFBEB' },
    { label: 'Failed', value: summary.failed, color: '#B91C1C', background: '#FEF2F2' },
    { label: 'Cancelled', value: summary.cancelled, color: '#475569', background: '#F8FAFC' },
    { label: 'Paid total', value: `INR ${summary.revenue.toLocaleString('en-IN')}`, color: '#0F172A', background: '#EFF6FF' },
  ];

  return (
    <div>
      {showHeading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 5px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Payment History</h3>
            <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>{isAdminView ? 'Live payment activity from every account.' : 'Server-access payments made from this account.'}</p>
            {lastUpdated && <span style={{ display: 'block', marginTop: 4, color: '#94A3B8', fontSize: 11 }}>Updates automatically every 5 seconds</span>}
          </div>
          <button type="button" onClick={() => loadPayments()} disabled={loading} title="Refresh payments" aria-label="Refresh payments" style={{ width: 36, height: 36, flexShrink: 0, border: '1px solid #CBD5E1', borderRadius: 7, background: '#fff', color: '#0A6ED1', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5"/></svg>
          </button>
        </div>
      )}

      {isAdminView && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 8, marginBottom: 16 }}>
            {metrics.map(item => (
              <div key={item.label} style={{ padding: '11px 10px', border: '1px solid #E2E8F0', borderRadius: 7, background: item.background, minWidth: 0 }}>
                <span style={{ display: 'block', color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                <strong style={{ display: 'block', marginTop: 4, color: item.color, fontSize: 16, overflowWrap: 'anywhere' }}>{item.value}</strong>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
            {[
              ['all', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['cancelled', 'Cancelled'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} style={{ border: `1px solid ${filter === id ? '#0A6ED1' : '#CBD5E1'}`, borderRadius: 7, padding: '7px 10px', background: filter === id ? '#0A6ED1' : '#fff', color: filter === id ? '#fff' : '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>
            ))}
          </div>
        </>
      )}

      {error && <div style={{ padding: '11px 12px', marginBottom: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, color: '#B91C1C', fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: '#64748B', fontSize: 13 }}>Loading payments...</p>}
      {!loading && !error && payments.length === 0 && <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>No payments have been started yet.</div>}
      {!loading && !error && payments.length > 0 && visiblePayments.length === 0 && <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>No payments match this filter.</div>}

      {!loading && visiblePayments.map((payment, index) => {
        const status = STATUS_DETAILS[payment.status] || { label: payment.status || 'Unknown', color: '#475569', background: '#F1F5F9' };
        const date = new Date(payment.createdAt);
        const canRetry = payment.status === 'created' && Boolean(payment.razorpayPaymentId);
        return (
          <div key={payment.id} style={{ padding: '16px 0', borderTop: index === 0 ? '1px solid #E2E8F0' : 'none', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#0F172A', fontSize: 14, overflowWrap: 'anywhere' }}>{payment.course?.title || 'Server access'}</strong>
                {isAdminView && <span style={{ display: 'block', marginTop: 4, color: '#0F172A', fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' }}>{payment.customer?.name || 'Deleted account'}{payment.customer?.email ? ` | ${payment.customer.email}` : ''}</span>}
                {isAdminView && payment.customer?.phone && <span style={{ display: 'block', marginTop: 2, color: '#64748B', fontSize: 11 }}>{payment.customer.phone}</span>}
                <span style={{ display: 'block', marginTop: 4, color: '#64748B', fontSize: 12 }}>{payment.months} month{Number(payment.months) === 1 ? '' : 's'} | {Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN')}</span>
              </div>
              <span style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 6, background: status.background, color: status.color, fontSize: 11, fontWeight: 800 }}>{status.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 12 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: '#0F172A', fontSize: 15, fontWeight: 800 }}>INR {Number(payment.discountPrice || payment.amount / 100 || 0).toLocaleString('en-IN')}</span>
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
