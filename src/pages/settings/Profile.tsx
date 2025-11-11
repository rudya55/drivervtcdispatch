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
import { Loader2, ArrowLeft } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const Profile = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: driver?.name || '',
    email: driver?.email || '',
    phone: driver?.phone || '',
    company_name: driver?.company_name || '',
    company_address: driver?.company_address || '',
    siret: driver?.siret || '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(driver?.profile_photo_url || null);
  const [logoPreview, setLogoPreview] = useState<string | null>(driver?.company_logo_url || null);

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
    if (!driver) return;

    setLoading(true);
    try {
      let profile_photo_url = driver.profile_photo_url;
      let company_logo_url = driver.company_logo_url;

      // Upload profile photo
      if (profilePhoto) {
        const photoPath = `${driver.id}/profile-photo-${Date.now()}`;
        const { error: photoError } = await supabase.storage
          .from('driver-documents')
          .upload(photoPath, profilePhoto);
        
        if (photoError) throw photoError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(photoPath);
        profile_photo_url = publicUrl;
      }

      // Upload company logo
      if (companyLogo) {
        const logoPath = `${driver.id}/company-logo-${Date.now()}`;
        const { error: logoError } = await supabase.storage
          .from('driver-documents')
          .upload(logoPath, companyLogo);
        
        if (logoError) throw logoError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(logoPath);
        company_logo_url = publicUrl;
      }

      console.log('Updating driver profile:', { 
        driverId: driver.id,
        updates: {
          name: formData.name,
          phone: formData.phone,
          company_name: formData.company_name,
          company_address: formData.company_address,
          siret: formData.siret,
          profile_photo_url,
          company_logo_url,
        }
      });

      const { data, error } = await supabase
        .from('drivers')
        .update({
          name: formData.name,
          phone: formData.phone,
          company_name: formData.company_name,
          company_address: formData.company_address,
          siret: formData.siret,
          profile_photo_url,
          company_logo_url,
        })
        .eq('id', driver.id)
        .select();

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Profile updated successfully:', data);
      toast.success('Profil mis à jour avec succès');
      navigate('/settings');
    } catch (error: any) {
      console.error('Update profile error:', error);
      
      let errorMessage = 'Erreur lors de la mise à jour';
      
      if (error.message?.includes('permission denied') || error.code === '42501') {
        errorMessage = 'Permissions insuffisantes pour modifier le profil';
      } else if (error.message?.includes('JWT')) {
        errorMessage = 'Session expirée, veuillez vous reconnecter';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
                  <AddressAutocomplete
                    id="company_address"
                    value={formData.company_address}
                    onChange={(val) => setFormData({ ...formData, company_address: val })}
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
