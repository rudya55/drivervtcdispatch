import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Volume2 } from 'lucide-react';

const notificationSounds = [
  { id: 'default', name: 'Par défaut', url: '/sounds/default.mp3' },
  { id: 'bell', name: 'Cloche', url: '/sounds/bell.mp3' },
  { id: 'chime', name: 'Carillon', url: '/sounds/chime.mp3' },
  { id: 'alert', name: 'Alerte', url: '/sounds/alert.mp3' },
  { id: 'gentle', name: 'Doux', url: '/sounds/gentle.mp3' },
];

const Notifications = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(driver?.notifications_enabled ?? true);
  const [selectedSound, setSelectedSound] = useState(driver?.notification_sound || 'default');
  const [loading, setLoading] = useState(false);

  const playSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.36);
    } catch (e) {
      console.error('Audio preview error', e);
    }
  };

  const handleSave = async () => {
    if (!driver) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          notifications_enabled: notificationsEnabled,
          notification_sound: selectedSound,
        })
        .eq('id', driver.id);

      if (error) throw error;

      toast.success('Préférences enregistrées');
      navigate('/settings');
    } catch (error: any) {
      console.error('Update notifications error:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Notifications" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="space-y-4">
          {/* Enable/Disable Notifications */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications" className="text-base font-semibold">
                  Activer les notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les notifications pour les nouvelles courses
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </Card>

          {/* Sound Selection */}
          {notificationsEnabled && (
            <Card className="p-6">
              <h3 className="text-base font-semibold mb-4">Son de notification</h3>
              <div className="space-y-2">
                {notificationSounds.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => setSelectedSound(sound.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedSound === sound.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <span className={selectedSound === sound.id ? 'text-primary font-medium' : ''}>
                      {sound.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound(sound.url);
                      }}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Button onClick={handleSave} className="w-full" disabled={loading}>
            Sauvegarder
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
