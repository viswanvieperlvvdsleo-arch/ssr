'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../AppShell';
import { useApp } from '../AppContext';
import { checkoutServerAccess } from '../razorpayCheckout';

const money = value => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function BookingsPage() {
  const { currentUser, courses, updateCourseAvailability, setTargetChat } = useApp();
  const servers = useMemo(() => courses.filter(course => course.serviceType === 'server' && course.publishToWebsite !== false), [courses]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    setLoadingBookings(true);
    fetch(`/api/ssr/server-credentials?userId=${encodeURIComponent(currentUser.id)}`)
      .then(response => response.json())
      .then(data => { if (!cancelled && Array.isArray(data)) setBookings(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingBookings(false); });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const openServer = server => {
    setSelectedServer(server);
    setSelectedPlan(Array.isArray(server.pricePlans) ? server.pricePlans[0] : null);
    setMessage('');
  };

  const handleBook = async () => {
    if (!selectedServer || !selectedPlan || !currentUser?.id || loading) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await checkoutServerAccess({
        courseId: selectedServer.id,
        user: currentUser,
        plan: selectedPlan,
        onAvailability: count => updateCourseAvailability(selectedServer.id, count),
      });
      updateCourseAvailability(selectedServer.id, data.availableCount);
      setBookings(previous => [{ id: data.bookingId, courseId: selectedServer.id, months: selectedPlan.months, originalPrice: selectedPlan.originalPrice, discountPrice: selectedPlan.discountPrice, discountPercent: selectedPlan.discountPercent, paymentStatus: 'paid', status: 'confirmed', chatId: data.chatId, createdAt: new Date().toISOString() }, ...previous]);
      setMessage('Payment confirmed. Your server login was sent to the admin chat.');
      if (data.chatId) setTargetChat({ chatId: data.chatId });
      setSelectedServer(null);
    } catch (error) {
      setMessage(error.message || 'Could not complete the booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>SAP Server Access</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748B' }}>Choose a server and duration. Your login is delivered after secure payment confirmation.</p>

        {message && <div style={{ background: message.includes('confirmed') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${message.includes('confirmed') ? '#BBF7D0' : '#FECACA'}`, borderRadius: 10, padding: '12px 14px', color: message.includes('confirmed') ? '#047857' : '#B91C1C', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{message}</div>}

        {servers.length === 0 && <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, color: '#64748B' }}>No server access is published yet.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {servers.map(server => {
            const available = Number(server.credentialCount || 0);
            const plans = Array.isArray(server.pricePlans) ? server.pricePlans : [];
            return <button key={server.id} type="button" onClick={() => available > 0 && openServer(server)} disabled={available < 1} style={{ textAlign: 'left', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, cursor: available > 0 ? 'pointer' : 'not-allowed', opacity: available > 0 ? 1 : 0.65 }}>
              {server.image && <img src={server.image} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
              <strong style={{ display: 'block', color: '#0F172A', fontSize: 14 }}>{server.title}</strong>
              <span style={{ display: 'block', color: '#64748B', fontSize: 12, margin: '5px 0 10px' }}>{server.shortDesc || server.module}</span>
              <span style={{ color: available > 0 ? '#047857' : '#B91C1C', fontSize: 12, fontWeight: 700 }}>{available > 0 ? `${available} credential${available === 1 ? '' : 's'} available` : 'Out of stock'}</span>
              {plans[0] && <span style={{ display: 'block', marginTop: 7, color: '#0A6ED1', fontWeight: 700, fontSize: 13 }}>{money(plans[0].discountPrice)} / {plans[0].months} month{Number(plans[0].months) === 1 ? '' : 's'}</span>}
            </button>;
          })}
        </div>

        {selectedServer && <div style={{ marginTop: 18, background: '#fff', border: '1px solid #BFDBFE', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
            <div><h3 style={{ margin: 0, fontSize: 16, color: '#0F172A' }}>{selectedServer.title}</h3><p style={{ margin: '4px 0 14px', fontSize: 12, color: '#64748B' }}>Select your access duration.</p></div>
            <button type="button" onClick={() => setSelectedServer(null)} aria-label="Close" style={{ border: 0, background: 'transparent', fontSize: 20, color: '#64748B', cursor: 'pointer' }}>x</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
            {(selectedServer.pricePlans || []).map(plan => <button key={plan.months} type="button" onClick={() => setSelectedPlan(plan)} style={{ border: `1px solid ${selectedPlan?.months === plan.months ? '#0A6ED1' : '#E2E8F0'}`, background: selectedPlan?.months === plan.months ? '#EFF6FF' : '#fff', borderRadius: 8, padding: 10, textAlign: 'left', cursor: 'pointer' }}><strong style={{ display: 'block', color: '#0F172A', fontSize: 12 }}>{plan.months} month{Number(plan.months) === 1 ? '' : 's'}</strong><span style={{ color: '#0A6ED1', fontWeight: 700, fontSize: 13 }}>{money(plan.discountPrice)}</span><span style={{ display: 'block', color: '#94A3B8', textDecoration: 'line-through', fontSize: 11 }}>{money(plan.originalPrice)}</span></button>)}
          </div>
          <button type="button" onClick={handleBook} disabled={loading || !selectedPlan} style={{ width: '100%', border: 0, borderRadius: 8, padding: 12, background: loading ? '#94A3B8' : '#0A6ED1', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Opening payment...' : `Pay ${money(selectedPlan?.discountPrice)} securely`}</button>
        </div>}

        <div style={{ marginTop: 28 }}><h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#0F172A' }}>My bookings</h3>{loadingBookings ? <p style={{ color: '#64748B', fontSize: 13 }}>Loading bookings...</p> : bookings.length === 0 ? <p style={{ color: '#64748B', fontSize: 13 }}>No bookings yet.</p> : bookings.map(booking => { const server = courses.find(course => course.id === booking.courseId); return <div key={booking.id} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}><strong style={{ color: '#0F172A', fontSize: 13 }}>{server?.title || 'Server access'}</strong><div style={{ color: '#047857', fontSize: 12, marginTop: 3 }}>{booking.months} month{Number(booking.months) === 1 ? '' : 's'} · {money(booking.discountPrice)} · {booking.status || 'confirmed'}</div></div>; })}</div>
      </div>
    </AppShell>
  );
}
