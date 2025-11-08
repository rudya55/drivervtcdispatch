import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Map } from 'lucide-react';

const GoogleMaps = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(driver?.google_maps_api_key || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ google_maps_api_key: apiKey })
        .eq('id', driver.id);

      if (error) throw error;

      toast.success('Clé API Google Maps enregistrée');
      navigate('/settings');
    } catch (error: any) {
      console.error('Update API key error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Google Maps" unreadCount={unreadCount} />

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

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Clé API Google Maps</h2>
              <p className="text-sm text-muted-foreground">
                Configuration de l'API Google Maps
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_key">Clé API Google Maps</Label>
              <Input
                id="api_key"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                required
              />
              <p className="text-xs text-muted-foreground">
                Obtenez votre clé API sur Google Cloud Console
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default GoogleMaps;
