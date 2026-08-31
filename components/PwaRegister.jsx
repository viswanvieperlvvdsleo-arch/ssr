"use client";

import { useEffect } from "react";
import { usePathname } from 'next/navigation';

export default function PwaRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const isAppRoute = pathname === '/ssr-app' || pathname.startsWith('/ssr-app/');
    const cleanupAndRegister = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      // Remove the old whole-domain PWA worker from earlier deployments.
      await Promise.all(registrations
        .filter(registration => registration.scope === `${window.location.origin}/` && (
          registration.active?.scriptURL.endsWith('/sw.js') ||
          registration.waiting?.scriptURL.endsWith('/sw.js') ||
          registration.installing?.scriptURL.endsWith('/sw.js')
        ))
        .map(registration => registration.unregister()));

      if (!isAppRoute) return;

      if (process.env.NODE_ENV === 'production') {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/ssr-app/' });
        console.log('SSR app service worker registered:', registration.scope);
      } else {
        await Promise.all((await navigator.serviceWorker.getRegistrations()).map(registration => registration.unregister()));
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        }
      }
    };

    cleanupAndRegister().catch(error => console.log('Service worker setup failed:', error));
    return undefined;
  }, [pathname]);

  return null;
}
