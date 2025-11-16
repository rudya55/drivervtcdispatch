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
import { Loader2, ArrowLeft } from 'lucide-react';


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
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // IMPORTANT: Mettre à jour formData quand driver change
  useEffect(() => {
    if (driver) {
      console.log('📊 Loading driver data into form:', driver);
      setFormData({
        name: driver.name || '',
        email: driver.email || '',
        phone: driver.phone || '',
        company_name: driver.company_name || '',
        company_address: driver.company_address || '',
        siret: driver.siret || '',
      });
      setPhotoPreview(driver.profile_photo_url || null);
      setLogoPreview(driver.company_logo_url || null);
    }
  }, [driver]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current session first
      const { data: { session } } = await supabase.auth.getSession();

      // Use driver ID if available, otherwise session user ID
      const ownerId = driver?.id || session?.user?.id;

      if (!ownerId) {
        toast.error('Session invalide, veuillez vous reconnecter');
        return;
      }

      console.log('🔄 Starting profile update...', {
        ownerId,
        driverId: driver?.id,
        userId: session?.user?.id,
        currentData: driver ? {
          name: driver.name,
          phone: driver.phone,
          email: driver.email
        } : 'Pas de profil existant',
        newData: {
          name: formData.name,
          phone: formData.phone
        }
      });

      let profile_photo_url = driver?.profile_photo_url;
      let company_logo_url = driver?.company_logo_url;

      // Upload profile photo (continue even if it fails)
      if (profilePhoto) {
        try {
          console.log('📸 Uploading profile photo...');
          const photoPath = `${ownerId}/profile-photo-${Date.now()}`;
          const { error: photoError } = await supabase.storage
            .from('driver-documents')
            .upload(photoPath, profilePhoto);

          if (photoError) {
            console.error('❌ Photo upload error:', photoError);
            toast.warning('Erreur lors de l\'upload de la photo, mais les autres données seront sauvegardées');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('driver-documents')
              .getPublicUrl(photoPath);
            profile_photo_url = publicUrl;
            console.log('✅ Photo uploaded:', publicUrl);
          }
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
        }
      }

      // Upload company logo (continue even if it fails)
      if (companyLogo) {
        try {
          console.log('🏢 Uploading company logo...');
          const logoPath = `${ownerId}/company-logo-${Date.now()}`;
          const { error: logoError } = await supabase.storage
            .from('driver-documents')
            .upload(logoPath, companyLogo);

          if (logoError) {
            console.error('❌ Logo upload error:', logoError);
            toast.warning('Erreur lors de l\'upload du logo, mais les autres données seront sauvegardées');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('driver-documents')
              .getPublicUrl(logoPath);
            company_logo_url = publicUrl;
            console.log('✅ Logo uploaded:', publicUrl);
          }
        } catch (logoErr) {
          console.error('Logo upload failed:', logoErr);
        }
      }

      console.log('🔐 Current session:', {
        userId: session?.user?.id,
        driverUserId: driver?.user_id,
        hasDriver: !!driver
      });

      const updateData = {
        name: formData.name,
        phone: formData.phone,
        company_name: formData.company_name,
        company_address: formData.company_address,
        siret: formData.siret,
        profile_photo_url,
        company_logo_url,
      };

      console.log('📝 Updating database with:', updateData);

      const { data, error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', ownerId)
        .select();

      if (error) {
        console.error('❌ Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          ownerId
        });

        // More specific error messages
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          throw new Error('ERREUR RLS: Les politiques de sécurité ne sont pas configurées. Ouvrez setup-rls.html dans votre navigateur.');
        } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          throw new Error('Session expirée. Veuillez vous déconnecter et vous reconnecter.');
        } else {
          throw error;
        }
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Update returned no data');
        toast.warning('Mise à jour effectuée mais aucune donnée retournée');
      } else {
        console.log('✅ Profile updated successfully:', data[0]);
        toast.success('Profil mis à jour avec succès !');
      }

      // Small delay to show success message
      setTimeout(() => {
        navigate('/settings');
      }, 1000);

    } catch (error: any) {
      console.error('❌ Update profile error:', error);

      let errorMessage = 'Erreur lors de la mise à jour du profil';
      let errorDetails = '';

      if (error.message?.includes('ERREUR RLS')) {
        errorMessage = 'Erreur de permissions';
        errorDetails = 'Les politiques de sécurité doivent être configurées. Ouvrez setup-rls.html dans votre navigateur.';
      } else if (error.message?.includes('Session expirée')) {
        errorMessage = error.message;
        errorDetails = 'Cliquez sur Déconnexion puis reconnectez-vous.';
      } else if (error.code === '42501') {
        errorMessage = 'Permissions refusées';
        errorDetails = 'RLS non configuré. Utilisez setup-rls.html';
      } else if (error.message) {
        errorMessage = error.message;
        errorDetails = error.code ? `Code: ${error.code}` : '';
      }

      toast.error(errorMessage, {
        description: errorDetails,
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Profil" unreadCount={unreadCount} />

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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo de profil */}
            <div className="space-y-2">
              <Label>Photo de profil</Label>
              <div className="flex items-center gap-4">
                {photoPreview && (
                  <img src={photoPreview} alt="Profil" className="w-20 h-20 rounded-full object-cover" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            {/* Informations société */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4">Informations société</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nom de la société</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Adresse</Label>
                  <Input
                    id="company_address"
                    value={formData.company_address}
                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                    placeholder="Saisissez l'adresse de votre société"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siret">Numéro SIRET</Label>
                  <Input
                    id="siret"
                    value={formData.siret}
                    onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo société</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded object-cover" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
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

export default Profile;
