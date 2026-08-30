"use client";

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../../firebase';
import { useApp } from './AppContext';

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export default function NotificationTrigger() {
  const { currentUser } = useApp();

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined' || !messaging || !vapidKey) return undefined;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return undefined;

    let cancelled = false;
    let unsubscribe = () => {};

    const requestPermissionAndRegisterToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        if (!token || cancelled) return;

        await fetch('/api/ssr/push-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            token,
            platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            userAgent: navigator.userAgent,
          }),
        });
      } catch (error) {
        console.error('Unable to register push notifications:', error);
      }
    };

    requestPermissionAndRegisterToken();

    unsubscribe = onMessage(messaging, payload => {
      if (Notification.permission !== 'granted') return;
      const notification = payload.notification || {};
      if (notification.title) {
        new Notification(notification.title, {
          body: notification.body || '',
          icon: '/logo/SSR_Business_Solutions_192x192_uncropped.png',
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser?.id]);

  return null;
}
