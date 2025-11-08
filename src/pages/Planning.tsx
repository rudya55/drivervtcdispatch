import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';

const Planning = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Planning" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            Page du planning en cours de développement
          </p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Planning;
