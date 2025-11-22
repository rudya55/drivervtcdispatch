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
import { Loader2, ArrowLeft, User, Building2 } from 'lucide-react';

const Profile = () => {
  const { driver, profilePhotoSignedUrl, refreshDriver } = useAuth();
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
        
        // Generate signed URL for company logo only
        let logoSignedUrl = null;
        if (driverData.company_logo_url) {
          const { data: logoSigned, error: logoError } = await supabase.storage
            .from('driver-documents')
            .createSignedUrl(driverData.company_logo_url, 60 * 60 * 24 * 7);
          
          if (logoError) {
            console.error('❌ Error generating logo signed URL:', logoError);
          } else {
            logoSignedUrl = logoSigned?.signedUrl || null;
          }
        }

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
        
        // Use profilePhotoSignedUrl from useAuth for consistency
        setPhotoPreview(profilePhotoSignedUrl);
        setLogoPreview(logoSignedUrl);
      } else {
        console.log('⚠️ No driver profile, showing email only');
        setFormData(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      }
    };

    loadProfileData();
  }, []);

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
        // Validation: max 5MB
        if (profilePhoto.size > 5 * 1024 * 1024) {
          toast.error("La photo ne doit pas dépasser 5MB");
          setLoading(false);
          return;
        }

        // Validation: must be an image
        if (!profilePhoto.type.startsWith('image/')) {
          toast.error("Le fichier doit être une image");
          setLoading(false);
          return;
        }

        const fileExt = profilePhoto.name.split('.').pop();
        const photoPath = `${userId}/profile-photo-${Date.now()}.${fileExt}`;
        
        const { error: photoError } = await supabase.storage
          .from('driver-documents')
          .upload(photoPath, profilePhoto, { upsert: true });

        if (photoError) {
          console.error('❌ Photo upload failed:', photoError);
          toast.error("Impossible d'envoyer la photo de profil. Vérifiez votre connexion et réessayez.");
          setLoading(false);
          return;
        }

        // ✅ Store PATH, not public URL
        profile_photo_url = photoPath;
        console.log('✅ Photo uploaded, path saved:', photoPath);
      }

      // Upload company logo if changed
      if (companyLogo) {
        // Validation: max 5MB
        if (companyLogo.size > 5 * 1024 * 1024) {
          toast.error("Le logo ne doit pas dépasser 5MB");
          setLoading(false);
          return;
        }

        // Validation: must be an image
        if (!companyLogo.type.startsWith('image/')) {
          toast.error("Le fichier doit être une image");
          setLoading(false);
          return;
        }

        const fileExt = companyLogo.name.split('.').pop();
        const logoPath = `${userId}/company-logo-${Date.now()}.${fileExt}`;
        
        const { error: logoError } = await supabase.storage
          .from('driver-documents')
          .upload(logoPath, companyLogo, { upsert: true });

        if (logoError) {
          console.error('❌ Logo upload failed:', logoError);
          toast.error("Impossible d'envoyer le logo de la société. Vérifiez votre connexion et réessayez.");
          setLoading(false);
          return;
        }

        // ✅ Store PATH, not public URL
        company_logo_url = logoPath;
        console.log('✅ Logo uploaded, path saved:', logoPath);
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

      // Direct UPDATE to database (simplified, no Edge Function)
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

        if (updateError.message?.includes('permission')) {
          throw new Error('Permissions insuffisantes. Reconnectez-vous.');
        }

        throw new Error(`Erreur: ${updateError.message}`);
      }

      console.log('✅ Profile updated successfully');
      toast.success('Profil mis à jour avec succès');

      // Refresh driver data without full page reload
      await refreshDriver();
      
      // Update form data with new values
      setFormData(prev => ({
        ...prev,
        profile_photo_url,
        company_logo_url,
      }));

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
              {photoPreview ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                  <img src={photoPreview} alt="Profil" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="cursor-pointer"
              />
              {!photoPreview && (
                <p className="text-xs text-muted-foreground">
                  Aucune photo enregistrée. Sélectionnez un fichier pour ajouter une photo.
                </p>
              )}
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
                {logoPreview ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="cursor-pointer"
                />
                {!logoPreview && (
                  <p className="text-xs text-muted-foreground">
                    Aucun logo enregistré.
                  </p>
                )}
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
