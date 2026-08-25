'use client';

import { useState } from 'react';
import AppShell from '../AppShell';
import { useApp, MOCK_SERVERS } from '../AppContext';

const STATUS_STYLE = {
  online: { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0', dot: '#22C55E', label: 'Online' },
  busy: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', dot: '#EF4444', label: 'Full' },
  offline: { bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', dot: '#94A3B8', label: 'Offline' },
};

const DURATIONS = ['1 Hour', '2 Hours', '4 Hours', 'Full Day'];

export default function BookingsPage() {
  const { currentUser } = useApp();
  const [selectedServer, setSelectedServer] = useState(null);
  const [duration, setDuration] = useState('2 Hours');
  const [quota, setQuota] = useState(1);
  const [booked, setBooked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleBook = async () => {
    if (!selectedServer) return;
    if (selectedServer.status === 'busy') { alert('This server is fully booked.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setBooked(prev => [...prev, { server: selectedServer, duration, quota, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setSuccess(`Successfully booked ${selectedServer.name} for ${duration}!`);
    setSelectedServer(null);
    setLoading(false);
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
        {/* Header */}
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>SAP Server Access</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>Select a server to request access for your training session.</p>

        {success && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', color: '#059669', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>✅ {success}</div>
        )}

        {/* Server Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {MOCK_SERVERS.map(server => {
            const s = STATUS_STYLE[server.status];
            const pct = Math.round((server.used / server.capacity) * 100);
            return (
              <div
                key={server.id}
                onClick={() => server.status !== 'offline' && setSelectedServer(server)}
                style={{ background: '#fff', border: `2px solid ${selectedServer?.id === server.id ? '#0A6ED1' : '#E2E8F0'}`, borderRadius: 16, padding: '16px', cursor: server.status === 'offline' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: selectedServer?.id === server.id ? '0 0 0 3px rgba(10,110,209,0.15)' : 'none', opacity: server.status === 'offline' ? 0.6 : 1 }}
                onMouseEnter={e => { if (server.status !== 'offline') e.currentTarget.style.borderColor = '#0A6ED1'; }}
                onMouseLeave={e => { if (selectedServer?.id !== server.id) e.currentTarget.style.borderColor = '#E2E8F0'; }}
              >
                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖥️</div>
                  <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.04em' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, background: s.dot, borderRadius: '50%', marginRight: 4, verticalAlign: 'middle' }} />
                    {s.label}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{server.name}</h3>
                <p style={{ margin: '0 0 10px', fontSize: 11, color: '#94A3B8' }}>{server.version}</p>
                {/* Capacity bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#64748B' }}>Capacity</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? '#DC2626' : '#059669' }}>{server.used}/{server.capacity}</span>
                  </div>
                  <div style={{ height: 4, background: '#F1F5F9', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#DC2626' : pct > 70 ? '#F59E0B' : '#059669', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Booking Modal */}
        {selectedServer && (
          <div style={{ background: '#fff', border: '2px solid #BFDBFE', borderRadius: 20, padding: '20px', marginBottom: 24, boxShadow: '0 4px 20px rgba(10,110,209,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{selectedServer.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>{selectedServer.description}</p>
              </div>
              <button onClick={() => setSelectedServer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Duration</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{ padding: '6px 14px', border: `1.5px solid ${duration === d ? '#0A6ED1' : '#E2E8F0'}`, background: duration === d ? '#EFF6FF' : '#fff', color: duration === d ? '#0A6ED1' : '#64748B', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System User Quota: <span style={{ color: '#0A6ED1' }}>{quota}</span></label>
              <input type="range" min={1} max={5} value={quota} onChange={e => setQuota(Number(e.target.value))} style={{ width: '100%', accentColor: '#0A6ED1' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}><span>1 User</span><span>5 Users</span></div>
            </div>

            <button onClick={handleBook} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#94A3B8' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Booking...' : `Request Access · ${duration}`}
            </button>
          </div>
        )}

        {/* My Bookings */}
        {booked.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>My Active Bookings</h3>
            {booked.map((b, i) => (
              <div key={i} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{b.server.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#059669' }}>{b.duration} · {b.quota} user{b.quota > 1 ? 's' : ''} · Booked at {b.time}</p>
                </div>
                <span style={{ fontSize: 20 }}>✅</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
