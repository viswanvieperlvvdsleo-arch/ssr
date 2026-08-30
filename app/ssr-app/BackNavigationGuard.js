'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './AppContext';

export default function BackNavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, runBackHandler } = useApp();
  const [exitArmed, setExitArmed] = useState(false);
  const exitArmedRef = useRef(false);
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    exitArmedRef.current = false;
    setExitArmed(false);
  }, [pathname, currentUser?.id]);

  useEffect(() => {
    if (!currentUser || pathname !== '/ssr-app/home') return undefined;

    window.history.pushState({ ...(window.history.state || {}), ssrHomeEntry: true }, '', window.location.href);

    const handlePopState = () => {
      if (runBackHandler()) {
        window.history.pushState({ ...(window.history.state || {}), ssrLayerRestored: true }, '', window.location.href);
        return;
      }

      if (exitArmedRef.current) {
        exitArmedRef.current = false;
        logoutRef.current();
        router.replace('/ssr-app');
        return;
      }

      exitArmedRef.current = true;
      setExitArmed(true);
      window.history.pushState({ ...(window.history.state || {}), ssrExitArmed: true }, '', window.location.href);
      window.setTimeout(() => {
        exitArmedRef.current = false;
        setExitArmed(false);
      }, 2500);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser?.id, pathname, router, runBackHandler]);

  if (!exitArmed) return null;
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 10000, background: '#0F172A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(15,23,42,0.25)', pointerEvents: 'none' }}>
      Press back again to exit the app
    </div>
  );
}
