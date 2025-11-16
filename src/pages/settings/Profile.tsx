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
  const [progressMessage, setProgressMessage] = useState('');
  const [retryData, setRetryData] = useState<any>(null);
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

  // IMPORTANT: Mettre à jour formData quand driver change
  useEffect(() => {
    const loadProfileData = async () => {
      // Get session to get email if driver doesn't have it
      const { data: { session } } = await supabase.auth.getSession();
      
      if (driver) {
        console.log('📊 Loading driver data into form:', driver);
        setFormData({
          name: driver.name || '',
          email: driver.email || session?.user?.email || '',
          phone: driver.phone || '',
          company_name: driver.company_name || '',
          company_address: driver.company_address || '',
          siret: driver.siret || '',
          profile_photo_url: driver.profile_photo_url || '',
          company_logo_url: driver.company_logo_url || '',
        });
        setPhotoPreview(driver.profile_photo_url || null);
        setLogoPreview(driver.company_logo_url || null);
      } else if (session?.user) {
        // Si pas de driver mais session existe, pré-remplir au moins l'email
        console.log('📊 No driver profile, loading session email');
        setFormData(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      }
    };
    
    loadProfileData();
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

  const callEdgeFunctionWithTimeout = async (updateData: any, session: any, timeoutMs = 15000) => {
    const startTime = Date.now();
    console.log(`⏱️ [${new Date().toISOString()}] Starting Edge Function call`);

    return Promise.race([
      (async () => {
        try {
          const response = await supabase.functions.invoke('driver-update-profile', {
            body: updateData,
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          
          const duration = Date.now() - startTime;
          console.log(`✅ [${new Date().toISOString()}] Edge Function completed in ${duration}ms`);
          
          return response;
        } catch (err: any) {
          const duration = Date.now() - startTime;
          console.error(`❌ [${new Date().toISOString()}] Edge Function failed after ${duration}ms:`, err);
          throw err;
        }
      })(),
      new Promise((_, reject) => 
        setTimeout(() => {
          console.error(`⏱️ [${new Date().toISOString()}] Edge Function timeout after ${timeoutMs}ms`);
          reject(new Error('TIMEOUT'));
        }, timeoutMs)
      )
    ]);
  };

  const handleSubmit = async (e?: React.FormEvent, retryPayload?: any) => {
    if (e) e.preventDefault();
    setLoading(true);
    setProgressMessage('Récupération de la session...');
    setRetryData(null);
    console.log(`[${new Date().toISOString()}] Starting profile update submission`);

    try {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log(`[${new Date().toISOString()}] Session retrieved:`, session ? 'OK' : 'NONE');
      
      if (!session || sessionError) {
        toast.error('Session expirée', {
          description: 'Veuillez vous reconnecter'
        });
        return;
      }

      // Use driver ID if available, otherwise session user ID
      const ownerId = driver?.id || session.user.id;

      let profile_photo_url = retryPayload?.profile_photo_url || driver?.profile_photo_url;
      let company_logo_url = retryPayload?.company_logo_url || driver?.company_logo_url;

      // Upload profile photo if changed
      if (profilePhoto && !retryPayload) {
        setProgressMessage('Upload de la photo de profil...');
        console.log(`[${new Date().toISOString()}] Starting profile photo upload`);
        
        try {
          const photoPath = `${ownerId}/profile-photo-${Date.now()}`;
          const { error: photoError } = await supabase.storage
            .from('driver-documents')
            .upload(photoPath, profilePhoto);

          if (photoError) {
            console.error(`[${new Date().toISOString()}] Photo upload error:`, photoError);
            toast.warning('Erreur lors de l\'upload de la photo, mais les autres données seront sauvegardées');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('driver-documents')
              .getPublicUrl(photoPath);
            profile_photo_url = publicUrl;
            console.log(`[${new Date().toISOString()}] Photo uploaded successfully`);
          }
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
        }
      }

      // Upload company logo if changed
      if (companyLogo && !retryPayload) {
        setProgressMessage('Upload du logo d\'entreprise...');
        console.log(`[${new Date().toISOString()}] Starting company logo upload`);
        
        try {
          const logoPath = `${ownerId}/company-logo-${Date.now()}`;
          const { error: logoError } = await supabase.storage
            .from('driver-documents')
            .upload(logoPath, companyLogo);

          if (logoError) {
            console.error(`[${new Date().toISOString()}] Logo upload error:`, logoError);
            toast.warning('Erreur lors de l\'upload du logo, mais les autres données seront sauvegardées');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('driver-documents')
              .getPublicUrl(logoPath);
            company_logo_url = publicUrl;
            console.log(`[${new Date().toISOString()}] Logo uploaded successfully`);
          }
        } catch (logoErr) {
          console.error('Logo upload failed:', logoErr);
        }
      }

      // Prepare update data
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        company_name: formData.company_name || null,
        company_address: formData.company_address || null,
        siret: formData.siret || null,
        profile_photo_url: profile_photo_url || null,
        company_logo_url: company_logo_url || null,
      };

      // === ATTEMPT 1: supabase.functions.invoke ===
      setProgressMessage('Sauvegarde du profil (méthode 1)...');
      console.log(`[${new Date().toISOString()}] Attempt 1: Calling Edge Function via invoke`);
      
      let invokeData: any = null;
      let invokeError: any = null;

      try {
        const response: any = await callEdgeFunctionWithTimeout(updateData, session, 15000);
        invokeData = response.data;
        invokeError = response.error;
      } catch (err: any) {
        if (err.message === 'TIMEOUT') {
          console.error(`[${new Date().toISOString()}] Request timeout after 15s`);
          setRetryData(updateData);
          toast.error('La requête prend trop de temps', {
            description: 'Vérifiez votre connexion et cliquez sur "Réessayer"',
            duration: 10000,
          });
          setProgressMessage('');
          return;
        }
        invokeError = err;
      }

      if (invokeError) {
        console.log(`[${new Date().toISOString()}] Invoke failed:`, invokeError.message);
        
        // Check for network/Safari specific errors
        const isNetworkError = 
          invokeError.message?.includes('Failed to send a request to the Edge Function') ||
          invokeError.message?.includes('fetch failed') ||
          invokeError.message?.includes('NetworkError') ||
          invokeError.message?.includes('timeout');

        if (isNetworkError) {
          // === ATTEMPT 2: Direct fetch ===
          setProgressMessage('Sauvegarde du profil (méthode 2)...');
          console.log(`[${new Date().toISOString()}] Attempt 2: Trying direct fetch to Edge Function`);
          
          try {
            const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('@/lib/supabase');
            const response = await fetch(`${SUPABASE_URL}/functions/v1/driver-update-profile`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updateData),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.log(`[${new Date().toISOString()}] Direct fetch failed:`, errorData);
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const fetchData = await response.json();
            console.log(`[${new Date().toISOString()}] Direct fetch succeeded`);
            
            toast.success('Profil mis à jour (méthode alternative)');
            setTimeout(() => navigate('/settings'), 500);
            return;
          } catch (fetchError: any) {
            console.log(`[${new Date().toISOString()}] Direct fetch error:`, fetchError.message);
            
            // === ATTEMPT 3: Client-side fallback ===
            setProgressMessage('Sauvegarde du profil (méthode 3 - fallback client)...');
            console.log(`[${new Date().toISOString()}] Attempt 3: Client-side fallback`);
            
            // Check if driver profile exists
            const { data: existingDriver, error: selectError } = await supabase
              .from('drivers')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (selectError) {
              console.error(`[${new Date().toISOString()}] Error checking driver:`, selectError);
              throw selectError;
            }

            if (!existingDriver) {
              // Create driver profile client-side
              console.log(`[${new Date().toISOString()}] Creating driver profile client-side`);
              const { error: insertError } = await supabase
                .from('drivers')
                .insert({
                  user_id: session.user.id,
                  status: 'inactive',
                  name: formData.name || session.user.email?.split('@')[0] || 'Chauffeur',
                  email: session.user.email || '',
                  phone: formData.phone || '',
                  company_name: formData.company_name || null,
                  company_address: formData.company_address || null,
                  siret: formData.siret || null,
                  profile_photo_url: profile_photo_url || null,
                  company_logo_url: company_logo_url || null,
                });

              if (insertError) {
                console.error(`[${new Date().toISOString()}] Client-side insert failed:`, insertError);
                throw insertError;
              }

              console.log(`[${new Date().toISOString()}] Driver profile created successfully (client-side)`);
            } else {
              // Update existing driver profile client-side
              console.log(`[${new Date().toISOString()}] Updating driver profile client-side`);
              const { error: updateError } = await supabase
                .from('drivers')
                .update({
                  name: formData.name,
                  phone: formData.phone,
                  company_name: formData.company_name || null,
                  company_address: formData.company_address || null,
                  siret: formData.siret || null,
                  profile_photo_url: profile_photo_url || null,
                  company_logo_url: company_logo_url || null,
                })
                .eq('user_id', session.user.id);

              if (updateError) {
                console.error(`[${new Date().toISOString()}] Client-side update failed:`, updateError);
                throw updateError;
              }

              console.log(`[${new Date().toISOString()}] Driver profile updated successfully (client-side)`);
            }

            toast.success('Profil mis à jour (méthode locale)');
            setTimeout(() => navigate('/settings'), 500);
            return;
          }
        } else {
          // Non-network error, throw it
          throw invokeError;
        }
      }

      // Success with invoke
      console.log(`[${new Date().toISOString()}] Profile updated successfully via invoke`);
      toast.success('Profil mis à jour avec succès');
      setTimeout(() => navigate('/settings'), 500);

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Profile update error:`, error);
      setProgressMessage('');
      
      const errorMessage = [
        error.message,
        error.hint,
        error.code
      ].filter(Boolean).join(' - ');
      
      if (!retryData) {
        toast.error(errorMessage || 'Erreur lors de la mise à jour du profil');
      }
    } finally {
      if (!retryData) {
        setLoading(false);
        setProgressMessage('');
      }
      console.log(`[${new Date().toISOString()}] Profile update submission finished`);
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

            {retryData && (
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={() => handleSubmit(undefined, retryData)}
              >
                Réessayer
              </Button>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progressMessage || 'Chargement...'}
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
