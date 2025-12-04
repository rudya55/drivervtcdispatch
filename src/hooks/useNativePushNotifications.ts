import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useNativePushNotifications = (driverId: string | undefined) => {
  useEffect(() => {
    if (!driverId) return;

    const initPushNotifications = async () => {
      console.log('📱 [Native Push] Initialisation pour driver:', driverId);
      
      try {
        // Request permission
        console.log('📱 [Native Push] Demande permission...');
        const permission = await PushNotifications.requestPermissions();
        console.log('📱 [Native Push] Permission:', permission.receive);
        
        if (permission.receive === 'granted') {
          console.log('✅ [Native Push] Permission accordée, enregistrement...');
          await PushNotifications.register();
        } else {
          console.warn('⚠️ [Native Push] Permission refusée:', permission.receive);
          return;
        }

        // Register FCM token
        await PushNotifications.addListener('registration', async (token) => {
          console.log('✅ [Native Push] Token FCM obtenu:', token.value.substring(0, 30) + '...');
          
          try {
            const { error } = await supabase
              .from('drivers')
              .update({ fcm_token: token.value })
              .eq('id', driverId);
            
            if (error) {
              console.error('❌ [Native Push] Erreur sauvegarde token:', error);
            } else {
              console.log('✅ [Native Push] Token sauvegardé en base de données');
              toast.success('Notifications push activées');
            }
          } catch (error) {
            console.error('❌ [Native Push] Échec sauvegarde token:', error);
          }
        });

        // Handle registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ [Native Push] Erreur d\'enregistrement:', error);
        });

        // Handle incoming notifications when app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📬 [Native Push] Notification reçue:', notification);
          toast.success(notification.title || 'Notification', {
            description: notification.body,
          });
        });

        // Handle notification taps
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 [Native Push] Action sur notification:', notification);
          const data = notification.notification.data;
          
          if (data?.course_id) {
            window.location.href = `/course/${data.course_id}`;
          }
        });
        
        console.log('✅ [Native Push] Initialisation terminée');
      } catch (error) {
        console.error('❌ [Native Push] Échec initialisation:', error);
      }
    };

    initPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [driverId]);
};
