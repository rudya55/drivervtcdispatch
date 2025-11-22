import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { ensureDriverExists } from '@/lib/ensureDriver';
import { toast } from 'sonner';
import { ArrowLeft, Volume2, Loader2 } from 'lucide-react';

const notificationSounds = [
  { id: 'default', name: 'Par défaut', url: '/sounds/default.mp3' },
  { id: 'bell', name: 'Cloche', url: '/sounds/bell.mp3' },
  { id: 'chime', name: 'Carillon', url: '/sounds/chime.mp3' },
  { id: 'alert', name: 'Alerte', url: '/sounds/alert.mp3' },
  { id: 'gentle', name: 'Doux', url: '/sounds/gentle.mp3' },
];

const Notifications = () => {
  const { driver, refreshDriver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(driver?.notifications_enabled ?? false);
  const [selectedSound, setSelectedSound] = useState(driver?.notification_sound || 'default');
  const [loading, setLoading] = useState(false);

  // Sync UI state with driver data when it changes
  useEffect(() => {
    if (!driver) return;
    
    setNotificationsEnabled(driver.notifications_enabled ?? false);
    setSelectedSound(driver.notification_sound || 'default');
  }, [driver]);

  const playSound = (soundId: string) => {
    try {
      const sound = notificationSounds.find(s => s.id === soundId);
      if (!sound) return;

      console.log('[Notifications] Playing sound preview:', sound);

      const audio = new Audio(sound.url);
      audio.volume = 0.7;
      
      audio.play().catch(err => {
        console.error('Audio playback error for', sound.url, err);
        toast.error("Impossible de jouer le son. Vérifiez les permissions audio de votre navigateur.");
      });
    } catch (e) {
      console.error('Audio preview error', e);
      toast.error("Erreur lors de la lecture du son.");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    console.log(`[${new Date().toISOString()}] Starting notifications settings update`);

    try {
      const updateData = {
        notifications_enabled: notificationsEnabled,
        notification_sound: selectedSound,
      };

      // === ATTEMPT 1: Direct update with driver.id ===
      if (driver?.id) {
        console.log(`[${new Date().toISOString()}] Attempt 1: Direct update with driver.id`);
        const { error: updateError } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('id', driver.id);

        if (!updateError) {
          console.log(`[${new Date().toISOString()}] ✅ Notifications updated successfully (Attempt 1)`);
          
          // Update local state immediately
          setNotificationsEnabled(updateData.notifications_enabled);
          setSelectedSound(updateData.notification_sound);
          
          // Refresh driver profile in context
          if (refreshDriver) {
            await refreshDriver();
          }
          
          setLoading(false);
          toast.success('Préférences enregistrées');
          setTimeout(() => navigate('/settings'), 300);
          return;
        }
        console.log(`[${new Date().toISOString()}] Attempt 1 failed:`, updateError);
      }

      // === ATTEMPT 2: Update by user_id ===
      console.log(`[${new Date().toISOString()}] Attempt 2: Update by user_id`);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Session non trouvée - veuillez vous reconnecter');
      }

      const { error: retryError } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('user_id', session.user.id);

      if (!retryError) {
        console.log(`[${new Date().toISOString()}] ✅ Notifications updated successfully (Attempt 2)`);
        
        // Update local state immediately
        setNotificationsEnabled(updateData.notifications_enabled);
        setSelectedSound(updateData.notification_sound);
        
        // Refresh driver profile in context
        if (refreshDriver) {
          await refreshDriver();
        }
        
        setLoading(false);
        toast.success('Préférences enregistrées');
        setTimeout(() => navigate('/settings'), 300);
        return;
      }
      console.log(`[${new Date().toISOString()}] Attempt 2 failed:`, retryError);

      // === ATTEMPT 3: Ensure driver exists and update ===
      console.log(`[${new Date().toISOString()}] Attempt 3: Ensure driver exists and retry`);
      const { driverId } = await ensureDriverExists();
      
      const { error: finalError } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId);

      if (finalError) {
        throw finalError;
      }

      console.log(`[${new Date().toISOString()}] ✅ Notifications updated successfully (Attempt 3)`);
      
      // Update local state immediately
      setNotificationsEnabled(updateData.notifications_enabled);
      setSelectedSound(updateData.notification_sound);
      
      // Refresh driver profile in context
      if (refreshDriver) {
        await refreshDriver();
      }
      
      setLoading(false);
      toast.success('Préférences enregistrées');
      setTimeout(() => navigate('/settings'), 300);

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Notifications update error:`, error);
      toast.error('Impossible de sauvegarder les préférences de notification. Réessayez.');
    } finally {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] Notifications update finished`);
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
                        playSound(sound.id);
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
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sauvegarder
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
