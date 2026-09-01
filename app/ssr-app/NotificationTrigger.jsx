"use client";

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../../firebase';
import { useApp } from './AppContext';

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function actionsForType(type) {
  if (type === 'chat') return [
    { action: 'reply', title: 'Reply' },
    { action: 'like', title: 'Like' },
  ];
  if (type === 'post') return [
    { action: 'like', title: 'Like' },
    { action: 'open', title: 'View post' },
  ];
  if (type === 'meeting') return [{ action: 'open', title: 'View meeting' }];
  return [{ action: 'open', title: 'Open' }];
}

export default function NotificationTrigger() {
  const { currentUser } = useApp();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    const handleNotificationClick = event => {
      const url = event.data?.type === 'ssr-notification-click' ? event.data.url : null;
      if (!url) return;
      try {
        const target = new URL(url, window.location.origin);
        if (target.origin !== window.location.origin) return;
        window.location.assign(`${target.pathname}${target.search}${target.hash}`);
      } catch {
        console.warn('Notification click URL was invalid.');
      }
    };
    navigator.serviceWorker.addEventListener('message', handleNotificationClick);
    return () => navigator.serviceWorker.removeEventListener('message', handleNotificationClick);
  }, []);

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined' || !messaging) return undefined;
    if (!vapidKey) {
      console.error('FCM is not configured: NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing from the client build.');
      return undefined;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('This browser does not support web push notifications.');
      return undefined;
    }

    let cancelled = false;
    let unsubscribe = () => {};
    let messagingRegistration = null;

    const requestPermissionAndRegisterToken = async (askForPermission = false) => {
      try {
        let permission = Notification.permission;
        if (askForPermission && permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted' || cancelled) {
          console.warn(`Notification permission is ${permission}. Use the Enable notifications button or browser/site settings.`);
          return;
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js?v=2', { scope: '/firebase-cloud-messaging-push-scope' });
        messagingRegistration = registration;
        await registration.update().catch(() => {});
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        if (!token || cancelled) {
          console.error('FCM did not return a device token. Check the Firebase Web Push certificate and VAPID key.');
          return;
        }

        const response = await fetch('/api/ssr/push-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            token,
            platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            userAgent: navigator.userAgent,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || 'The device token could not be saved');
        console.info('FCM device token registered for this account.');
      } catch (error) {
        console.error('Unable to register push notifications:', error);
      }
    };

    const enablePushFromSettings = () => requestPermissionAndRegisterToken(true);
    window.addEventListener('ssr-enable-push', enablePushFromSettings);
    if (Notification.permission === 'granted') requestPermissionAndRegisterToken(false);

    unsubscribe = onMessage(messaging, async payload => {
      if (Notification.permission !== 'granted') return;
      const notification = payload.notification || {};
      if (notification.title) {
        const registration = messagingRegistration || await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
        if (registration) {
          await registration.showNotification(notification.title, {
            body: notification.body || '',
            icon: '/logo/SSR_Business_Solutions_192x192_uncropped.png',
            data: payload.data || {},
            actions: actionsForType(payload.data?.type),
            tag: payload.data?.messageId || payload.data?.postId || `ssr-${Date.now()}`,
          });
        }
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener('ssr-enable-push', enablePushFromSettings);
      unsubscribe();
    };
  }, [currentUser?.id]);

  return null;
}
