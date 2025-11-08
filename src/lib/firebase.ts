import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
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
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
