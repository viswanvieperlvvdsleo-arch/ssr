"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(
            (registration) => {
              console.log('Service Worker registration successful:', registration.scope);
            },
            (err) => {
              console.log('Service Worker registration failed:', err);
            }
          );
        });
      } else {
        // In development mode, unregister active service workers & clear cache so normal refresh works!
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (let name of names) {
              caches.delete(name);
            }
          });
        }
      }
    }
  }, []);

  return null;
}
