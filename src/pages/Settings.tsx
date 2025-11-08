import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Bell, 
  BarChart3, 
  Car, 
  FileText, 
  User,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Settings = () => {
  const { driver, logout } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const settingsGroups = [
    {
      title: 'Compte',
      items: [
        { icon: User, label: 'Profil', path: '/settings/profile' },
        { icon: Shield, label: 'Sécurité', path: '/settings/security' },
      ],
    },
    {
      title: 'Préférences',
      items: [
        { icon: Bell, label: 'Notifications', path: '/settings/notifications' },
      ],
    },
    {
      title: 'Professionnel',
      items: [
        { icon: BarChart3, label: 'Analyses', path: '/settings/analytics' },
        { icon: Car, label: 'Véhicule', path: '/settings/vehicle' },
        { icon: FileText, label: 'Documents', path: '/settings/documents' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Paramètres" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Driver Info */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{driver?.name}</h3>
              <p className="text-sm text-muted-foreground">{driver?.email}</p>
            </div>
          </div>
        </Card>

        {/* Settings Groups */}
        {settingsGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-2">
              {group.title}
            </h3>
            <Card className="divide-y divide-border">
              {group.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </Card>
          </div>
        ))}

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
