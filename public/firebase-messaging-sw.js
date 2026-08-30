importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

// Initializes the background service setup using your credentials
firebase.initializeApp({
  apiKey: "AIzaSyDAJNto-qn60GybOi9WmGhwFCHiJUtHFmA",
  authDomain: "ssrbs-d41fb.firebaseapp.com",
  projectId: "ssrbs-d41fb",
  storageBucket: "ssrbs-d41fb.firebasestorage.app",
  messagingSenderId: "263500284164",
  appId: "1:263500284164:web:6e18f2d5792c30e927c3f3"
});

const messaging = firebase.messaging();

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
