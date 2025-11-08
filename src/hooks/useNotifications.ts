import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, DriverNotification } from '@/lib/supabase';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { toast } from 'sonner';

export const useNotifications = (driverId: string | null) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      
      const { data, error } = await supabase.functions.invoke('driver-get-notifications');
      
      if (error) throw error;
      return (data?.notifications || []) as DriverNotification[];
    },
    enabled: !!driverId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Count unread notifications
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Request notification permission and save FCM token
  useEffect(() => {
    if (!driverId) return;

    requestNotificationPermission().then(async (token) => {
      if (token) {
        // Update FCM token in database
        await supabase
          .from('drivers')
          .update({ fcm_token: token })
          .eq('id', driverId);
      }
    });
  }, [driverId]);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onMessageListener().then((payload: any) => {
      toast(payload.notification?.title || 'Nouvelle notification', {
        description: payload.notification?.body,
      });
      
      // Refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications', driverId] });
    });

    return () => {
      unsubscribe.then(() => {});
    };
  }, [driverId, queryClient]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel('driver-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_notifications',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications', driverId] });
          
          const notification = payload.new as DriverNotification;
          toast(notification.title, {
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, queryClient]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('driver_notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    queryClient.invalidateQueries({ queryKey: ['notifications', driverId] });
  };

  const markAllAsRead = async () => {
    if (!driverId) return;
    
    await supabase
      .from('driver_notifications')
      .update({ read: true })
      .eq('driver_id', driverId)
      .eq('read', false);
    
    queryClient.invalidateQueries({ queryKey: ['notifications', driverId] });
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
};
