importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Initializes the background service setup using your credentials
firebase.initializeApp({
  apiKey: "AIzaSyDAJNto-qn6OGybOi9WmGhwFcHIjUthFmA",
  authDomain: "ssrbs-d41fb.firebaseapp.com",
  projectId: "ssrbs-d41fb",
  storageBucket: "ssrbs-d41fb.firebasestorage.app",
  messagingSenderId: "263500284164",
  appId: "1:263500284164:web:4aabf9f181dbcd74b0d051"
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const targetUrl = data.url;
  if (!targetUrl) return;
  const target = new URL(targetUrl, self.location.origin);
  if (event.action === 'reply' || event.action === 'like') {
    target.searchParams.set('notificationAction', event.action);
  }
  const absoluteTargetUrl = target.toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existingClient = windowClients.find(client => client.url.includes('/ssr-app/')) || windowClients.find(client => 'focus' in client);
      if (existingClient) {
        existingClient.postMessage({ type: 'ssr-notification-click', url: absoluteTargetUrl });
        return existingClient.focus();
      }
      return clients.openWindow(absoluteTargetUrl);
    })
  );
});

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

// Listens and intercepts incoming notifications while the browser tab is closed/minimized
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notification = payload.notification || {};
  const notificationTitle = notification.title || 'SSR Learning Platform';
  const notificationOptions = {
    body: notification.body || 'You have a new notification.',
    icon: '/logo/SSR_Business_Solutions_192x192_uncropped.png',
    data: payload.data || {},
    actions: actionsForType(payload.data?.type),
    tag: payload.data?.messageId || payload.data?.postId || `ssr-${Date.now()}`,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
