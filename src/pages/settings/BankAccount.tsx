import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { ensureDriverExists } from '@/lib/ensureDriver';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CreditCard } from 'lucide-react';

const BankAccount = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    iban: driver?.iban || '',
    bic: driver?.bic || '',
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        iban: driver.iban || '',
        bic: driver.bic || '',
      });
    }
  }, [driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log(`[${new Date().toISOString()}] Starting bank account update`);

    try {
      const updateData = {
        iban: formData.iban,
        bic: formData.bic,
      };

      // === ATTEMPT 1: Direct update with driver.id ===
      if (driver?.id) {
        console.log(`[${new Date().toISOString()}] Attempt 1: Direct update with driver.id`);
        const { error: updateError } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('id', driver.id);

        if (!updateError) {
          console.log(`[${new Date().toISOString()}] ✅ Bank account updated successfully (Attempt 1)`);
          toast.success('Coordonnées bancaires mises à jour');
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
        console.log(`[${new Date().toISOString()}] ✅ Bank account updated successfully (Attempt 2)`);
        toast.success('Coordonnées bancaires mises à jour');
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

      console.log(`[${new Date().toISOString()}] ✅ Bank account updated successfully (Attempt 3)`);
      toast.success('Coordonnées bancaires mises à jour');
      setTimeout(() => navigate('/settings'), 300);

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Bank account update error:`, error);
      toast.error('Impossible de sauvegarder les coordonnées bancaires. Réessayez.');
    } finally {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] Bank account update finished`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Coordonnées bancaires" unreadCount={unreadCount} />

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
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Informations de paiement</h3>
              <p className="text-sm text-muted-foreground">
                Pour recevoir vos virements
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                maxLength={34}
              />
              <p className="text-xs text-muted-foreground">
                Format: 2 lettres pays + 2 chiffres clé + max 30 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bic">BIC / SWIFT</Label>
              <Input
                id="bic"
                value={formData.bic}
                onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                placeholder="BNPAFRPPXXX"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                Code de 8 ou 11 caractères
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4 mt-4">
              <p className="text-xs text-muted-foreground">
                🔒 Vos informations bancaires sont sécurisées et cryptées. 
                Elles ne seront utilisées que pour vos virements.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BankAccount;
