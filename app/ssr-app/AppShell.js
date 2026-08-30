'use client';

// AppShell is now minimal — the home page manages its own full layout.
// Used only by bookings, profile, and chat detail pages.

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp } from './AppContext';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ssr_app_user') || sessionStorage.getItem('ssr_app_user');
    if (!currentUser && !saved) {
      router.replace('/ssr-app');
    }
  }, [currentUser, router]);

  if (!mounted) return null;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: '#F0F2F5', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
