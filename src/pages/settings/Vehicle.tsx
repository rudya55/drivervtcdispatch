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
import { Loader2, ArrowLeft, Camera, X } from 'lucide-react';

const Vehicle = () => {
  const { driver, refreshDriver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [photoSignedUrls, setPhotoSignedUrls] = useState<{[key: string]: string}>({});
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_brand: driver?.vehicle_brand || '',
    vehicle_model: driver?.vehicle_model || '',
    vehicle_year: driver?.vehicle_year || '',
    vehicle_plate: driver?.vehicle_plate || '',
    license_number: driver?.license_number || '',
    vehicle_icon: (driver?.vehicle_icon as 'car' | 'taxi' | 'van' | 'motorcycle' | 'suv') || 'car',
    vehicle_types_accepted: driver?.vehicle_types_accepted || ['Standard', 'Berline', 'Van', 'Minibus', 'First Class'],
  });

  const vehicleIcons = [
    { id: 'car', name: 'Berline', emoji: '🚗' },
    { id: 'taxi', name: 'Taxi', emoji: '🚕' },
    { id: 'van', name: 'Van', emoji: '🚐' },
    { id: 'motorcycle', name: 'Moto', emoji: '🏍️' },
    { id: 'suv', name: 'First Class', emoji: '💎' },
  ] as const;

  const vehicleTypes = [
    { id: 'Standard', name: 'Standard', emoji: '🚗' },
    { id: 'Berline', name: 'Berline', emoji: '✨' },
    { id: 'Van', name: 'Van', emoji: '🚐' },
    { id: 'Minibus', name: 'Minibus', emoji: '🚌' },
    { id: 'First Class', name: 'First Class', emoji: '💎' },
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
        vehicle_types_accepted: driver.vehicle_types_accepted || ['Standard', 'Berline', 'Van', 'Minibus', 'First Class'],
      });
      setVehiclePhotos(driver.vehicle_photos_urls || []);
    }
  }, [driver]);

  useEffect(() => {
    const generateSignedUrls = async () => {
      if (vehiclePhotos.length === 0) {
        setPhotoSignedUrls({});
        return;
      }

      setLoadingPhotos(true);
      try {
        const urls: {[key: string]: string} = {};
        for (const path of vehiclePhotos) {
          const { data } = await supabase.storage
            .from('driver-documents')
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            urls[path] = data.signedUrl;
          }
        }
        setPhotoSignedUrls(urls);
      } catch (error) {
        console.error('Error generating signed URLs:', error);
      } finally {
        setLoadingPhotos(false);
      }
    };

    generateSignedUrls();
  }, [vehiclePhotos]);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (vehiclePhotos.length >= 5) {
      toast.error('Maximum 5 photos autorisées');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont autorisées');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 10 MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `vehicle-${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/vehicle/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: signedUrlData } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(filePath, 604800);

      if (signedUrlData?.signedUrl) {
        const newPhotos = [...vehiclePhotos, filePath];
        
        // Mise à jour de la base de données avec gestion d'erreur explicite
        const { error: dbError } = await supabase
          .from('drivers')
          .update({ vehicle_photos_urls: newPhotos })
          .eq('user_id', session.user.id);

        if (dbError) {
          console.error('Error saving photo to database:', dbError);
          // Supprimer le fichier uploadé si la sauvegarde DB échoue
          await supabase.storage.from('driver-documents').remove([filePath]);
          
          if (dbError.code === '42703' || dbError.message?.includes('column')) {
            toast.error('⚠️ Migration requise : Exécutez le script SQL pour vehicle_photos_urls');
          } else {
            toast.error('Erreur lors de la sauvegarde en base de données');
          }
          return;
        }

        // Succès - mettre à jour l'état local
        setVehiclePhotos(newPhotos);
        setPhotoSignedUrls(prev => ({
          ...prev,
          [filePath]: signedUrlData.signedUrl
        }));
        
        // Rafraîchir le driver pour synchroniser avec DriverProfile
        await refreshDriver();
        toast.success('Photo ajoutée avec succès');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (index: number) => {
    try {
      const photoPath = vehiclePhotos[index];
      const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
      
      await supabase.storage
        .from('driver-documents')
        .remove([photoPath]);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: dbError } = await supabase
          .from('drivers')
          .update({ vehicle_photos_urls: newPhotos })
          .eq('user_id', session.user.id);
          
        if (dbError) {
          console.error('Error updating database:', dbError);
          toast.error('Erreur lors de la mise à jour en base');
          return;
        }
      }

      setVehiclePhotos(newPhotos);
      await refreshDriver();
      toast.success('Photo supprimée');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log(`[${new Date().toISOString()}] Starting vehicle update`);
    console.log('🚗 Données à sauvegarder:');
    console.log('  - vehicle_icon:', formData.vehicle_icon);
    console.log('  - vehicle_types_accepted:', formData.vehicle_types_accepted);
    console.log('  - driver.id:', driver?.id);

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
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      });
      
      // Vérification si c'est une erreur de colonne manquante (migration non appliquée)
      if (error?.code === 'PGRST204' || 
          error?.code === '42703' || 
          error?.message?.toLowerCase().includes('column') ||
          error?.message?.toLowerCase().includes('does not exist')) {
        toast.error("⚠️ Migration requise : Veuillez appliquer MIGRATION_REQUIRED.sql dans Supabase Dashboard > SQL Editor");
      } else if (error?.code === 'PGRST116') {
        toast.error("Aucun profil chauffeur trouvé. Reconnectez-vous.");
      } else {
        toast.error("Erreur lors de la sauvegarde. Vérifiez votre connexion et réessayez.");
      }
    } finally {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] ✅ Vehicle update process finished`);
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
                    <span className="text-4xl mb-1">{icon.emoji}</span>
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
                    <span className="text-4xl mb-1">{type.emoji}</span>
                    <span className="text-xs font-medium">{type.name}</span>
                    {formData.vehicle_types_accepted?.includes(type.id) && (
                      <span className="text-xs text-primary mt-1">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Photos du véhicule</Label>
              <p className="text-sm text-muted-foreground">
                Ajoutez jusqu'à 5 photos de votre véhicule (visibles par les dispatchers)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {vehiclePhotos.map((photoPath, index) => (
                  <div key={index} className="relative aspect-square">
                    {loadingPhotos ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : photoSignedUrls[photoPath] ? (
                      <img 
                        src={photoSignedUrls[photoPath]}
                        className="w-full h-full object-cover rounded-lg border border-border" 
                        alt={`Véhicule ${index + 1}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                
                {vehiclePhotos.length < 5 && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">
                      {uploading ? 'Upload...' : 'Ajouter'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
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
