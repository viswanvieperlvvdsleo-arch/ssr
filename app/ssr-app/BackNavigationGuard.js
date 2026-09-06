'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from './AppContext';

export default function BackNavigationGuard() {
  const pathname = usePathname();
  const { currentUser, runBackHandler } = useApp();
  const [exitArmed, setExitArmed] = useState(false);
  const exitArmedRef = useRef(false);
  const exitTimerRef = useRef(null);
  const exitingRef = useRef(false);

  useEffect(() => {
    exitArmedRef.current = false;
    exitingRef.current = false;
    setExitArmed(false);
  }, [pathname, currentUser?.id]);

  useEffect(() => {
    if (!currentUser || pathname !== '/ssr-app/home') return undefined;

    window.history.pushState({ ...(window.history.state || {}), ssrHomeEntry: true }, '', window.location.href);

    const clearExitPrompt = () => {
      exitArmedRef.current = false;
      setExitArmed(false);
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    };

    const handlePopState = () => {
      if (exitingRef.current) return;
      if (runBackHandler()) {
        clearExitPrompt();
        window.history.pushState({ ...(window.history.state || {}), ssrLayerRestored: true }, '', window.location.href);
        return;
      }

      if (exitArmedRef.current) {
        exitingRef.current = true;
        clearExitPrompt();
        window.history.back();
        window.setTimeout(() => {
          exitingRef.current = false;
        }, 1000);
        return;
      }

      exitArmedRef.current = true;
      setExitArmed(true);
      window.history.pushState({ ...(window.history.state || {}), ssrExitArmed: true }, '', window.location.href);
      exitTimerRef.current = window.setTimeout(clearExitPrompt, 3000);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('ssr:app-navigation', clearExitPrompt);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('ssr:app-navigation', clearExitPrompt);
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, [currentUser?.id, pathname, runBackHandler]);

  if (!exitArmed) return null;
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 10000, background: '#0F172A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(15,23,42,0.25)', pointerEvents: 'none' }}>
      Press back again to exit the app
    </div>
  );
}
