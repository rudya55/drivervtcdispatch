import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Driver } from '@/lib/supabase';
import { toast } from 'sonner';
import { playChatNotificationWithHaptic } from '@/lib/notificationSounds';

interface UseChatNotificationsOptions {
  driver: Driver | null;
  enabled?: boolean;
}

export const useChatNotifications = ({ driver, enabled = true }: UseChatNotificationsOptions) => {
  const processedMessageIds = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!driver?.id || !enabled) return;

    console.log('🔔 Chat notifications listener starting for driver:', driver.id);

    // Écouter les nouveaux messages du dispatcher pour ce chauffeur
    const channel = supabase
      .channel(`chat-notifications-${driver.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `driver_id=eq.${driver.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Ignorer les messages du chauffeur lui-même
          if (newMessage.sender_role === 'driver') return;
          
          // Ignorer les messages déjà traités
          if (processedMessageIds.current.has(newMessage.id)) return;
          processedMessageIds.current.add(newMessage.id);

          console.log('💬 New dispatcher message received:', newMessage);

          // Jouer le son chat dédié + haptic
          await playChatNotificationWithHaptic();

          // Afficher un toast entièrement cliquable pour ouvrir le chat
          const courseId = newMessage.course_id;
          const messageText = newMessage.message || newMessage.content || '';
          const preview = messageText.substring(0, 60) + (messageText.length > 60 ? '...' : '');
          
          // Fonction pour ouvrir le chat
          const openChat = () => {
            navigate(`/chat/${courseId}`);
          };
          
          // Toast avec action cliquable et wrapper cliquable
          const toastId = toast.info(
            <div 
              onClick={openChat}
              className="cursor-pointer w-full"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openChat();
                }
              }}
            >
              <div className="font-semibold">💬 Nouveau message du Dispatch</div>
              <div className="text-sm text-muted-foreground mt-1">{preview}</div>
              <div className="text-xs text-primary mt-2 font-medium">Appuyez pour ouvrir le chat →</div>
            </div>,
            {
              duration: 8000,
              action: {
                label: 'Ouvrir',
                onClick: openChat,
              },
            }
          );
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Chat notifications listener stopping');
      supabase.removeChannel(channel);
    };
  }, [driver?.id, driver?.notification_sound, enabled, navigate]);
};
