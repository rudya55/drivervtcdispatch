import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Driver } from '@/lib/supabase';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notificationSounds';
import { playHapticFeedback } from '@/lib/notificationHaptics';

interface UseChatNotificationsOptions {
  driver: Driver | null;
  enabled?: boolean;
}

export const useChatNotifications = ({ driver, enabled = true }: UseChatNotificationsOptions) => {
  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!driver?.id || !enabled) return;

    console.log('🔔 Chat notifications listener starting for driver:', driver.id);

    // Écouter les nouveaux messages du dispatcher
    const channel = supabase
      .channel(`chat-notifications-${driver.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Ignorer les messages du chauffeur lui-même
          if (newMessage.sender_role === 'driver') return;
          
          // Ignorer les messages déjà traités
          if (processedMessageIds.current.has(newMessage.id)) return;
          processedMessageIds.current.add(newMessage.id);

          console.log('💬 New dispatcher message received:', newMessage);

          // Jouer le son de notification
          const soundToPlay = driver.notification_sound || 'default';
          await playNotificationSound(soundToPlay);

          // Vibration haptic pour message chat
          await playHapticFeedback('chat_message');

          // Afficher un toast
          toast.info('💬 Nouveau message du Dispatch', {
            description: newMessage.message?.substring(0, 50) + (newMessage.message?.length > 50 ? '...' : ''),
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Chat notifications listener stopping');
      supabase.removeChannel(channel);
    };
  }, [driver?.id, driver?.notification_sound, enabled]);
};
