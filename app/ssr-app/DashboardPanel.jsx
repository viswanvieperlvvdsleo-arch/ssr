'use client';

export default function DashboardPanel() {
  return (
    <section style={{ width: '100%', maxWidth: 1080, margin: '0 auto', padding: '24px 20px 48px', boxSizing: 'border-box' }}>
      <header style={{ paddingBottom: 18, borderBottom: '1px solid #DCE3EB' }}>
        <h2 style={{ margin: 0, color: '#0F172A', fontSize: 22, fontWeight: 800 }}>Dashboard</h2>
      </header>
      <div style={{ minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #DCE3EB', color: '#94A3B8', textAlign: 'center', padding: 24 }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m7 16 4-5 3 3 5-7" />
        </svg>
        <strong style={{ marginTop: 14, color: '#475569', fontSize: 14 }}>No dashboard data yet</strong>
      </div>
    </section>
  );
}
