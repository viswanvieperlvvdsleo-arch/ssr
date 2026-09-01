importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

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
  const targetUrl = event.notification?.data?.url;
  if (!targetUrl) return;
  const absoluteTargetUrl = new URL(targetUrl, self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existingClient = windowClients.find(client => 'focus' in client);
      if (existingClient) {
        existingClient.navigate(absoluteTargetUrl);
        return existingClient.focus();
      }
      return clients.openWindow(absoluteTargetUrl);
    })
  );
});

// Listens and intercepts incoming notifications while the browser tab is closed/minimized
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notification = payload.notification || {};
  const notificationTitle = notification.title || 'SSR Learning Platform';
  const notificationOptions = {
    body: notification.body || 'You have a new notification.',
    icon: '/logo/SSR_Business_Solutions_192x192_uncropped.png',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
