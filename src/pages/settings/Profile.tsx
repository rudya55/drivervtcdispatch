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
import { toast } from 'sonner';
import { Loader2, ArrowLeft, User, Building2, Car, Trash2, Upload } from 'lucide-react';

type VehiclePhoto = {
  url: string;
  path: string;
  name: string;
};

const Profile = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    company_address: '',
    siret: '',
    profile_photo_url: '',
    company_logo_url: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<VehiclePhoto[]>([]);
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false);

  // Charger les données du profil
  useEffect(() => {
    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log('❌ No session found');
        return;
      }

      // Charger le profil driver depuis la base de données
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading driver:', error);
        return;
      }

      if (driverData) {
        console.log('✅ Driver data loaded:', driverData);
        setFormData({
          name: driverData.name || '',
          email: driverData.email || session.user.email || '',
          phone: driverData.phone || '',
          company_name: driverData.company_name || '',
          company_address: driverData.company_address || '',
          siret: driverData.siret || '',
          profile_photo_url: driverData.profile_photo_url || '',
          company_logo_url: driverData.company_logo_url || '',
        });
        setPhotoPreview(driverData.profile_photo_url || null);
        setLogoPreview(driverData.company_logo_url || null);
      } else {
        console.log('⚠️ No driver profile, showing email only');
        setFormData(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      }

      // Charger les photos de véhicule
      loadVehiclePhotos(session.user.id);
    };

    loadProfileData();
  }, []);

  const loadVehiclePhotos = async (userId: string) => {
    try {
      // Charger les URLs des photos depuis la base de données
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('vehicle_photos')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading vehicle photos from DB:', error);
        return;
      }

      if (!driverData?.vehicle_photos || driverData.vehicle_photos.length === 0) {
        setVehiclePhotos([]);
        return;
      }

      // Créer des URLs signées pour chaque photo
      const photos = await Promise.all(
        driverData.vehicle_photos.map(async (path: string) => {
          const { data: signedUrlData } = await supabase.storage
            .from('driver-documents')
            .createSignedUrl(path, 3600);

          return {
            url: signedUrlData?.signedUrl || '',
            path,
            name: path.split('/').pop() || '',
          };
        })
      );

      setVehiclePhotos(photos);
      console.log('✅ Vehicle photos loaded from DB:', photos.length);
    } catch (error) {
      console.error('❌ Error loading vehicle photos:', error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompanyLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleVehiclePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVehiclePhoto(true);
    console.log('📤 Uploading vehicle photo');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée. Reconnectez-vous.');
        return;
      }

      const userId = session.user.id;
      const photoPath = `${userId}/vehicle-photos/vehicle-${Date.now()}.${file.name.split('.').pop()}`;

      // 1. Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(photoPath, file);

      if (uploadError) throw uploadError;

      // 2. Récupérer les photos actuelles de la BDD
      const { data: driverData } = await supabase
        .from('drivers')
        .select('vehicle_photos')
        .eq('user_id', userId)
        .maybeSingle();

      // 3. Ajouter la nouvelle photo à la liste
      const currentPhotos = driverData?.vehicle_photos || [];
      const updatedPhotos = [...currentPhotos, photoPath];

      // 4. Sauvegarder dans la base de données
      const { error: dbError } = await supabase
        .from('drivers')
        .update({ vehicle_photos: updatedPhotos })
        .eq('user_id', userId);

      if (dbError) throw dbError;

      console.log('✅ Vehicle photo uploaded and saved to DB');
      toast.success('Photo du véhicule ajoutée');

      // Recharger les photos
      await loadVehiclePhotos(userId);

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('❌ Error uploading vehicle photo:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout de la photo');
    } finally {
      setUploadingVehiclePhoto(false);
    }
  };

  const handleVehiclePhotoDelete = async (path: string) => {
    console.log('🗑️ Deleting vehicle photo:', path);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée. Reconnectez-vous.');
        return;
      }

      const userId = session.user.id;

      // 1. Supprimer de Storage
      const { error: storageError } = await supabase.storage
        .from('driver-documents')
        .remove([path]);

      if (storageError) throw storageError;

      // 2. Récupérer les photos actuelles de la BDD
      const { data: driverData } = await supabase
        .from('drivers')
        .select('vehicle_photos')
        .eq('user_id', userId)
        .maybeSingle();

      // 3. Retirer la photo supprimée de la liste
      const currentPhotos = driverData?.vehicle_photos || [];
      const updatedPhotos = currentPhotos.filter((p: string) => p !== path);

      // 4. Mettre à jour la base de données
      const { error: dbError } = await supabase
        .from('drivers')
        .update({ vehicle_photos: updatedPhotos })
        .eq('user_id', userId);

      if (dbError) throw dbError;

      console.log('✅ Vehicle photo deleted from Storage and DB');
      toast.success('Photo du véhicule supprimée');

      // Update state
      setVehiclePhotos(prev => prev.filter(photo => photo.path !== path));
    } catch (error: any) {
      console.error('❌ Error deleting vehicle photo:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('💾 Starting profile save');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expirée. Reconnectez-vous.');
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      let profile_photo_url = formData.profile_photo_url;
      let company_logo_url = formData.company_logo_url;

      // Upload profile photo if changed
      if (profilePhoto) {
        const photoPath = `${userId}/profile-photo-${Date.now()}`;
        const { error: photoError } = await supabase.storage
          .from('driver-documents')
          .upload(photoPath, profilePhoto);

        if (photoError) {
          console.error('❌ Photo upload failed:', photoError);
          toast.error("Impossible d'envoyer la photo de profil. Vérifiez votre connexion et réessayez.");
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(photoPath);
        profile_photo_url = publicUrl;
        console.log('✅ Photo uploaded successfully:', publicUrl);
      }

      // Upload company logo if changed
      if (companyLogo) {
        const logoPath = `${userId}/company-logo-${Date.now()}`;
        const { error: logoError } = await supabase.storage
          .from('driver-documents')
          .upload(logoPath, companyLogo);

        if (logoError) {
          console.error('❌ Logo upload failed:', logoError);
          toast.error("Impossible d'envoyer le logo de la société. Vérifiez votre connexion et réessayez.");
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(logoPath);
        company_logo_url = publicUrl;
        console.log('✅ Logo uploaded successfully:', publicUrl);
      }

      // Ensure driver profile exists
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingDriver) {
        console.log('🔧 Creating driver profile');
        const { error: createError } = await supabase
          .from('drivers')
          .insert({
            user_id: userId,
            status: 'inactive',
            name: formData.name.trim() || session.user.email?.split('@')[0] || 'Chauffeur',
            email: session.user.email || '',
            phone: formData.phone.trim() || '',
          });

        if (createError) {
          console.error('❌ Error creating profile:', createError);
          throw new Error('Impossible de créer le profil');
        }
      }

      // Update driver profile
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        company_name: formData.company_name?.trim() || null,
        company_address: formData.company_address?.trim() || null,
        siret: formData.siret?.trim() || null,
        profile_photo_url: profile_photo_url || null,
        company_logo_url: company_logo_url || null,
      };

      console.log('💾 Updating profile with:', updateData);

      // Triple fallback for maximum reliability:
      // 1. Try Edge Function (bypass RLS, auto-create profile)
      // 2. Try direct UPDATE
      // 3. Handle missing columns gracefully
      
      console.log('💾 Tentative 1: Edge Function driver-update-profile');
      const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke(
        'driver-update-profile',
        { body: updateData }
      );

      if (!edgeFunctionError && edgeFunctionData?.driver) {
        console.log('✅ Profil sauvegardé via Edge Function');
        toast.success('Profil mis à jour avec succès');
        setTimeout(() => window.location.reload(), 500);
        return;
      }

      console.warn('⚠️ Edge Function failed, trying direct update:', edgeFunctionError);

      // Fallback 2: Direct UPDATE
      console.log('💾 Tentative 2: UPDATE direct');
      const { error: updateError } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        
        const msg = updateError.message || '';
        const isMissingColumns =
          msg.includes('profile_photo_url') ||
          msg.includes('company_logo_url') ||
          msg.includes('company_name') ||
          msg.includes('company_address') ||
          msg.includes('siret') ||
          msg.includes('schema cache') ||
          (msg.includes('column') && msg.includes('does not exist'));

        if (isMissingColumns) {
          console.warn('🛠 Colonnes manquantes, tentative de mise à jour minimale (nom + téléphone).');

          const basicUpdateData = {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
          };

          const { error: basicError } = await supabase
            .from('drivers')
            .update(basicUpdateData)
            .eq('user_id', userId);

          if (!basicError) {
            console.log('✅ Basic profile updated without advanced columns');
            toast.success('Profil de base mis à jour (nom + téléphone). Les infos société / photos seront activées plus tard.');
            setTimeout(() => window.location.reload(), 500);
            return;
          }

          console.error('❌ Basic update error:', basicError);
          throw new Error(`Erreur de mise à jour: ${basicError.message}`);
        }
        
        throw new Error(`Erreur de mise à jour: ${updateError.message}`);
      }

      console.log('✅ Profile updated successfully');
      toast.success('Profil mis à jour avec succès');
      
      // Recharger la page après 500ms
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error: any) {
      console.error('❌ Error saving profile:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Profil" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/settings')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux paramètres
        </Button>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            {/* Photo de profil */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <Label className="font-semibold">Photo de profil</Label>
              </div>
              {photoPreview && (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                  <img src={photoPreview} alt="Profil" className="w-full h-full object-cover" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="cursor-pointer"
              />
            </div>

            {/* Nom complet */}
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Votre nom complet"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            {/* Informations société */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <Label className="font-semibold">Informations société</Label>
              </div>

              {/* Logo société */}
              <div className="space-y-3">
                <Label>Logo de la société</Label>
                {logoPreview && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="cursor-pointer"
                />
              </div>

              {/* Nom de la société */}
              <div className="space-y-2">
                <Label>Nom de la société</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Nom de votre société"
                />
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  placeholder="Saisissez l'adresse de votre société"
                />
              </div>

              {/* Numéro SIRET */}
              <div className="space-y-2">
                <Label>Numéro SIRET</Label>
                <Input
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                  maxLength={14}
                />
              </div>
            </div>

            {/* Photos du véhicule */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  <Label className="font-semibold">Photos du véhicule</Label>
                </div>
                <Label htmlFor="vehicle-photo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    {uploadingVehiclePhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Ajouter
                      </>
                    )}
                  </div>
                  <Input
                    id="vehicle-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleVehiclePhotoUpload}
                    disabled={uploadingVehiclePhoto}
                    className="hidden"
                  />
                </Label>
              </div>

              {vehiclePhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {vehiclePhotos.map((photo) => (
                    <div key={photo.path} className="relative group">
                      <div className="aspect-video rounded-lg overflow-hidden border-2 border-border">
                        <img
                          src={photo.url}
                          alt="Véhicule"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleVehiclePhotoDelete(photo.path)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune photo de véhicule ajoutée
                </p>
              )}
            </div>

            {/* Bouton de sauvegarde */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde en cours...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default Profile;
