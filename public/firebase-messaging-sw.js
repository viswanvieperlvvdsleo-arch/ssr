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
  if (event.action === 'dismiss') return;
  if (event.action === 'mark-read') {
    event.waitUntil((async () => {
      if (!data.chatId || !data.recipientUserId) return;
      const response = await fetch('/api/ssr/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.chatId, action: 'markRead', userId: data.recipientUserId }),
      });
      if (!response.ok) throw new Error('Could not mark the chat as read.');
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      windowClients.forEach(client => client.postMessage({ type: 'sj-chat-marked-read', chatId: data.chatId }));
    })());
    return;
  }
  const targetUrl = data.url;
  if (!targetUrl) return;
  const target = new URL(targetUrl, self.location.origin);
  if (event.action === 'reply' || event.action === 'like') {
    target.searchParams.set('notificationAction', event.action);
  }
  if (event.action === 'start' && data.meetingCode) {
    target.pathname = `/ssr-app/meeting/${encodeURIComponent(data.meetingCode)}`;
    target.search = '';
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
    { action: 'mark-read', title: 'Mark as read' },
  ];
  if (type === 'post') return [
    { action: 'like', title: 'Like' },
    { action: 'open', title: 'View post' },
  ];
  if (type === 'meeting' || type === 'meeting-time') return [
    { action: 'dismiss', title: 'Cancel' },
    { action: 'start', title: 'Start' },
  ];
  return [{ action: 'open', title: 'Open' }];
}

// Listens and intercepts incoming notifications while the browser tab is closed/minimized
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notification = payload.notification || {};
  const notificationTitle = notification.title || payload.data?.title || 'SJ INFO BUSINESS SOLUTIONS';
  const notificationOptions = {
    body: notification.body || payload.data?.body || 'You have a new notification.',
    icon: '/logo/192.png',
    data: payload.data || {},
    actions: actionsForType(payload.data?.type),
    tag: payload.data?.notificationTag || payload.messageId || `sj-${Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
