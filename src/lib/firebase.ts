import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDINevIQHW3nmiz1Z1nYlkbOeH3XYSsTyc",
  authDomain: "vtc-dispatch-admin.firebaseapp.com",
  projectId: "vtc-dispatch-admin",
  storageBucket: "vtc-dispatch-admin.firebasestorage.app",
  messagingSenderId: "900889515127",
  appId: "1:900889515127:web:39d7d7a40db3f728242272"
};

const vapidKey = "BOlQMOQTwrvYPlwk5JPHdvx7bxugKve857bclQthPvfQrJwleK9gpstfDmXKhL59C-k5JNV00U9wHdtrT0kMJLk";

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
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      return token;
    }
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
