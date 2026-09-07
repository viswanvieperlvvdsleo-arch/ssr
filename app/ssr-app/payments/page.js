'use client';

import { useRouter } from 'next/navigation';
import AppShell from '../AppShell';
import { useApp } from '../AppContext';
import PaymentHistory from '../PaymentHistory';

export default function PaymentsPage() {
  const router = useRouter();
  const { currentUser, setTargetChat } = useApp();

  return (
    <AppShell>
      <header style={{ height: 58, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
        <button type="button" onClick={() => router.back()} aria-label="Go back" title="Go back" style={{ width: 36, height: 36, border: 0, background: 'transparent', color: '#0A6ED1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <img src="/ssrlogo.jpeg" alt="SSR" style={{ width: 30, height: 30, objectFit: 'contain' }} />
        <strong style={{ color: '#0F172A', fontSize: 16 }}>Payment History</strong>
      </header>
      <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 16px' }}>
          <PaymentHistory currentUser={currentUser} onNavigateToChat={chatId => { setTargetChat({ chatId }); router.push(`/ssr-app/home?chatId=${encodeURIComponent(chatId)}`); }} />
        </div>
      </main>
    </AppShell>
  );
}
