import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface UnreadMessage {
  course_id: string;
  count: number;
}

export const useUnreadChatMessages = () => {
  const { driver } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByCourse, setUnreadByCourse] = useState<UnreadMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver?.id) {
      setLoading(false);
      return;
    }

    const fetchUnreadMessages = async () => {
      try {
        // Récupérer tous les messages non lus par le chauffeur
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, course_id')
          .eq('driver_id', driver.id)
          .neq('sender_role', 'driver')
          .eq('read_by_driver', false);

        if (error) {
          console.error('Error fetching unread messages:', error);
          return;
        }

        if (data) {
          setUnreadCount(data.length);
          
          // Grouper par course_id
          const grouped = data.reduce((acc: Record<string, number>, msg) => {
            acc[msg.course_id] = (acc[msg.course_id] || 0) + 1;
            return acc;
          }, {});

          setUnreadByCourse(
            Object.entries(grouped).map(([course_id, count]) => ({
              course_id,
              count,
            }))
          );
        }
      } catch (error) {
        console.error('Error in fetchUnreadMessages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadMessages();

    // Écouter les nouveaux messages en temps réel
    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `driver_id=eq.${driver.id}`,
        },
        () => {
          // Refetch à chaque changement
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id]);

  return { unreadCount, unreadByCourse, loading };
};
