import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { playHapticFeedback, HapticNotificationType } from '@/lib/notificationHaptics';
import { playNotificationSound } from '@/lib/notificationSounds';

interface Driver {
  notification_sound?: string;
  notifications_enabled?: boolean;
}

export const useNativePushNotifications = (driverId: string | undefined, driver?: Driver) => {
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
          
          // Déterminer le type de vibration selon le payload
          const notificationType = notification.data?.type || 'default';
          const hapticType: HapticNotificationType = 
            notificationType === 'new_course' ? 'new_course' :
            notificationType === 'chat_message' ? 'chat_message' :
            notificationType === 'urgent' ? 'urgent_alert' :
            notificationType === 'course_update' ? 'course_update' :
            'default';
          
          // Jouer la vibration appropriée
          playHapticFeedback(hapticType);
          
          // Jouer le son personnalisé si activé
          if (driver?.notifications_enabled !== false) {
            playNotificationSound(driver?.notification_sound || 'default');
          }
          
          // Rafraîchir les données si nouvelle course
          if (notificationType === 'new_course') {
            window.dispatchEvent(new CustomEvent('reload-courses'));
          }
          
          // PAS de toast - la notification native s'affiche dans la barre de notifications
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
  }, [driverId, driver]);
};
