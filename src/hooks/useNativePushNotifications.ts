import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useNativePushNotifications = (driverId: string | undefined) => {
  useEffect(() => {
    if (!driverId) return;

    const initPushNotifications = async () => {
      try {
        // Request permission
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          await PushNotifications.register();
        } else {
          console.warn('Push notification permission not granted');
          return;
        }

        // Register FCM token
        await PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token:', token.value);
          
          try {
            const { error } = await supabase
              .from('drivers')
              .update({ fcm_token: token.value })
              .eq('id', driverId);
            
            if (error) {
              console.error('Error updating FCM token:', error);
            }
          } catch (error) {
            console.error('Failed to update FCM token:', error);
          }
        });

        // Handle registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push notification registration error:', error);
        });

        // Handle incoming notifications when app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          toast.success(notification.title || 'Notification', {
            description: notification.body,
          });
        });

        // Handle notification taps
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Notification action performed:', notification);
          const data = notification.notification.data;
          
          if (data?.course_id) {
            // Navigate to course details
            window.location.href = `/course/${data.course_id}`;
          }
        });
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    };

    initPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [driverId]);
};
