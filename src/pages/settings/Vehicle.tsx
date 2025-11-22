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
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft } from 'lucide-react';

const Vehicle = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_brand: driver?.vehicle_brand || '',
    vehicle_model: driver?.vehicle_model || '',
    vehicle_year: driver?.vehicle_year || '',
    vehicle_plate: driver?.vehicle_plate || '',
    license_number: driver?.license_number || '',
    vehicle_icon: (driver?.vehicle_icon as 'car' | 'taxi' | 'van' | 'motorcycle' | 'suv') || 'car',
    vehicle_types_accepted: driver?.vehicle_types_accepted || ['Berline', 'Van', 'Standard', 'Moto', 'SUV', 'Minibus'],
  });

  const vehicleIcons = [
    { id: 'car', name: 'Berline', emoji: '🚗' },
    { id: 'taxi', name: 'Taxi', emoji: '🚕' },
    { id: 'van', name: 'Van', emoji: '🚐' },
    { id: 'motorcycle', name: 'Moto', emoji: '🏍️' },
    { id: 'suv', name: 'SUV', emoji: '🚙' },
  ] as const;

  const vehicleTypes = [
    { id: 'Berline', name: 'Berline', emoji: '🚗' },
    { id: 'Van', name: 'Van', emoji: '🚐' },
    { id: 'Standard', name: 'Standard', emoji: '🚕' },
    { id: 'Moto', name: 'Moto', emoji: '🏍️' },
    { id: 'SUV', name: 'SUV', emoji: '🚙' },
    { id: 'Minibus', name: 'Minibus', emoji: '🚌' },
  ];

  useEffect(() => {
    if (driver) {
      setFormData({
        vehicle_brand: driver.vehicle_brand || '',
        vehicle_model: driver.vehicle_model || '',
        vehicle_year: driver.vehicle_year || '',
        vehicle_plate: driver.vehicle_plate || '',
        license_number: driver.license_number || '',
        vehicle_icon: (driver.vehicle_icon as 'car' | 'taxi' | 'van' | 'motorcycle' | 'suv') || 'car',
        vehicle_types_accepted: driver.vehicle_types_accepted || ['Berline', 'Van', 'Standard', 'Moto', 'SUV', 'Minibus'],
      });
    }
  }, [driver]);

  const toggleVehicleType = (typeId: string) => {
    const currentTypes = formData.vehicle_types_accepted || [];
    const isSelected = currentTypes.includes(typeId);
    
    if (isSelected) {
      // Empêcher de tout désélectionner
      if (currentTypes.length === 1) {
        toast.error('Vous devez sélectionner au moins un type de véhicule');
        return;
      }
      setFormData({
        ...formData,
        vehicle_types_accepted: currentTypes.filter(t => t !== typeId)
      });
    } else {
      setFormData({
        ...formData,
        vehicle_types_accepted: [...currentTypes, typeId]
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log(`[${new Date().toISOString()}] Starting vehicle update`);

    try {
      const updateData = {
        vehicle_brand: formData.vehicle_brand,
        vehicle_model: formData.vehicle_model,
        vehicle_year: formData.vehicle_year,
        vehicle_plate: formData.vehicle_plate,
        license_number: formData.license_number,
        vehicle_icon: formData.vehicle_icon,
        vehicle_types_accepted: formData.vehicle_types_accepted,
      };

      // === ATTEMPT 1: Direct update with driver.id ===
      if (driver?.id) {
        console.log(`[${new Date().toISOString()}] Attempt 1: Direct update with driver.id`);
        const { error: updateError } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('id', driver.id);

        if (!updateError) {
          console.log(`[${new Date().toISOString()}] ✅ Vehicle updated successfully (Attempt 1)`);
          toast.success('Informations véhicule mises à jour');
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
        console.log(`[${new Date().toISOString()}] ✅ Vehicle updated successfully (Attempt 2)`);
        toast.success('Informations véhicule mises à jour');
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

      console.log(`[${new Date().toISOString()}] ✅ Vehicle updated successfully (Attempt 3)`);
      toast.success('Informations véhicule mises à jour');
      setTimeout(() => navigate('/settings'), 300);

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Vehicle update error:`, error);
      toast.error('Impossible de sauvegarder les informations du véhicule. Réessayez.');
    } finally {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] Vehicle update finished`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Véhicule" unreadCount={unreadCount} />

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
          {!driver && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Complétez d'abord votre Profil pour créer votre compte chauffeur.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Icône du véhicule sur la carte</Label>
              <div className="grid grid-cols-5 gap-2">
                {vehicleIcons.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, vehicle_icon: icon.id })}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                      formData.vehicle_icon === icon.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                  >
                    <span className="text-2xl mb-1">{icon.emoji}</span>
                    <span className="text-xs font-medium">{icon.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Types de véhicules acceptés</Label>
              <p className="text-sm text-muted-foreground">
                Sélectionnez les types de courses que vous souhaitez recevoir
              </p>
              <div className="grid grid-cols-3 gap-2">
                {vehicleTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleVehicleType(type.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                      formData.vehicle_types_accepted?.includes(type.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                  >
                    <span className="text-2xl mb-1">{type.emoji}</span>
                    <span className="text-xs font-medium">{type.name}</span>
                    {formData.vehicle_types_accepted?.includes(type.id) && (
                      <span className="text-xs text-primary mt-1">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={formData.vehicle_brand}
                onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                placeholder="Ex: Mercedes, BMW, Audi..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input
                id="model"
                value={formData.vehicle_model}
                onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                placeholder="Ex: Classe E, Série 5..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Année</Label>
              <Input
                id="year"
                value={formData.vehicle_year}
                onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                placeholder="Ex: 2022"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate">Plaque d'immatriculation</Label>
              <Input
                id="plate"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                placeholder="Ex: AB-123-CD"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">Numéro de licence VTC</Label>
              <Input
                id="license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="Numéro de licence"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !driver}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Vehicle;
