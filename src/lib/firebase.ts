import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Allow build-time override from Vite env vars for CI or local builds.
// If not provided, fall back to the existing hard-coded values so the
// app keeps working in development without changing files.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDINevIQHW3nmiz1Z1nYlkbOeH3XYSsTyc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "vtc-dispatch-admin.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "vtc-dispatch-admin",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "vtc-dispatch-admin.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "900889515127",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:900889515127:web:39d7d7a40db3f728242272"
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "BOlQMOQTwrvYPlwk5JPHdvx7bxugKve857bclQthPvfQrJwleK9gpstfDmXKhL59C-k5JNV00U9wHdtrT0kMJLk";

export const app = initializeApp(firebaseConfig);

let messaging: any = null;

// Initialize messaging only if supported
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  } else {
    console.warn('Firebase Messaging is not supported in this browser');
  }
}).catch((err) => {
  console.warn('Error checking Firebase Messaging support:', err);
});

export const requestNotificationPermission = async () => {
  try {
    // Always try to ask permission if Notifications API exists
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    // If Firebase Messaging is available, return a token
    if (messaging) {
      const token = await getToken(messaging, { vapidKey });
      return token;
    }

    // Permission granted but messaging not available (e.g., iOS Safari not installed as PWA)
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return;
    }
    
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
