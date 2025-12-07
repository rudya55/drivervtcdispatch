import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

const Notifications = () => {
  const { driver } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications', driver?.id] });
  };

  return (
    <div className="min-h-screen bg-background pb-6 pt-14 md:pt-16">
      <header className="fixed top-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-card border-b border-border z-40">
        <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-xl font-bold">Notifications</h1>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout lire
            </Button>
          )}
          {unreadCount === 0 && <div className="w-10" />}
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">
                  Aucune notification
                </p>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''
                    }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{notification.title}</h3>
                        {!notification.read && (
                          <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), 'PPp', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </PullToRefresh>
      </div>
    </div>
  );
};

export default Notifications;
