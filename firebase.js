import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDAJNto-qn60GybOi9WmGhwFCHiJUtHFmA",
  authDomain: "ssrbs-d41fb.firebaseapp.com",
  projectId: "ssrbs-d41fb",
  storageBucket: "ssrbs-d41fb.firebasestorage.app",
  messagingSenderId: "263500284164",
  appId: "1:263500284164:web:6e18f2d5792c30e927c3f3" // Fixed: Built automatically from your project numbers
};

// Next.js fix: Prevents Firebase from initializing multiple times during hot-reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Only initialize messaging in browsers that support Firebase messaging.
let messaging = null;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Firebase messaging is not supported in this browser.', error);
  }
}

export { messaging };
