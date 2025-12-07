import { useState, useEffect } from 'react';
import { supabase, Driver } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ensureDriverExists } from '@/lib/ensureDriver';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [profilePhotoSignedUrl, setProfilePhotoSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Fetch driver profile - auto-heal if missing
          setTimeout(async () => {
            const user = currentSession.user;

            let { data, error } = await supabase
              .from('drivers')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();

            if (error) {
              console.error('Error fetching driver profile:', error);
            }

            // Auto-create driver profile if missing
            if (!data) {
              console.log('🔧 No driver profile found, creating...');
              try {
                await ensureDriverExists();
                // Re-fetch after creation
                const { data: newData } = await supabase
                  .from('drivers')
                  .select('*')
                  .eq('user_id', user.id)
                  .maybeSingle();
                data = newData;
              } catch (err) {
                console.error('Failed to create driver profile:', err);
              }
            }

            if (data) {
              // Check if driver is approved (with graceful fallback if column doesn't exist yet)
              try {
                if (data.approved === false) {
                  console.warn('❌ Driver not approved:', user.id);
                  await supabase.auth.signOut();
                  setDriver(null);
                  setSession(null);
                  setLoading(false);
                  return;
                }
              } catch (err: any) {
                // If the 'approved' column doesn't exist yet, allow login until migration is applied
                if (err?.message?.includes('column') || err?.code === 'PGRST116') {
                  console.warn('⚠️ Column approved not yet created, skipping check');
                } else {
                  console.error('Error checking approval status:', err);
                }
              }

              // Generate signed URL for avatar if available
              if (data.profile_photo_url) {
                const { data: signedData } = await supabase.storage
                  .from('driver-documents')
                  .createSignedUrl(data.profile_photo_url, 60 * 60 * 24 * 7); // 7 days
                
                if (signedData?.signedUrl) {
                  setProfilePhotoSignedUrl(signedData.signedUrl);
                  console.log('✅ Avatar signed URL generated');
                }
              }

              setDriver(data);
            } else {
              console.warn('No driver profile available for user:', user.id);
            }
            setLoading(false);
          }, 0);
        } else {
          setDriver(null);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        const user = currentSession.user;
        
        // Fetch driver profile - auto-heal if missing
        (async () => {
          let { data, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching driver profile at init:', error);
          }

          // Auto-create driver profile if missing
          if (!data) {
            console.log('🔧 No driver profile found at init, creating...');
            try {
              await ensureDriverExists();
              // Re-fetch after creation
              const { data: newData } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
              data = newData;
            } catch (err) {
              console.error('Failed to create driver profile at init:', err);
            }
          }

          if (data) {
            // Check if driver is approved (with graceful fallback if column doesn't exist yet)
            try {
              if (data.approved === false) {
                console.warn('❌ Driver not approved at init:', user.id);
                supabase.auth.signOut();
                setDriver(null);
                setSession(null);
                setLoading(false);
                return;
              }
            } catch (err: any) {
              // If the 'approved' column doesn't exist yet, allow login until migration is applied
              if (err?.message?.includes('column') || err?.code === 'PGRST116') {
                console.warn('⚠️ Column approved not yet created at init, skipping check');
              } else {
                console.error('Error checking approval status at init:', err);
              }
            }

            // Generate signed URL for avatar if available
            if (data.profile_photo_url) {
              const { data: signedData } = await supabase.storage
                .from('driver-documents')
                .createSignedUrl(data.profile_photo_url, 60 * 60 * 24 * 7); // 7 days
              
              if (signedData?.signedUrl) {
                setProfilePhotoSignedUrl(signedData.signedUrl);
                console.log('✅ Avatar signed URL generated at init');
              }
            }

            setDriver(data);
          } else {
            console.warn('No driver profile available at init for user:', user.id);
          }
          setLoading(false);
        })();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Calling driver-login Edge Function...');
      
      // Appeler l'Edge Function driver-login au lieu de supabase.auth.signInWithPassword
      const { data, error } = await supabase.functions.invoke('driver-login', {
        body: { email, password }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erreur de connexion');
      }

      if (data?.error) {
        console.error('Driver-login returned error:', data.error);
        throw new Error(data.error);
      }

      if (!data?.session) {
        throw new Error('Connexion échouée - session manquante');
      }

      console.log('✅ Driver-login successful, setting session...');

      // Établir la session côté client avec le token retourné
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Erreur établissement session');
      }

      // Vérifier si le chauffeur est approuvé
      if (data.driver && data.driver.approved === false) {
        console.warn('❌ Driver not approved');
        await supabase.auth.signOut();
        throw new Error("PENDING_APPROVAL");
      }

      setSession(data.session);
      setDriver(data.driver);
      
      console.log('✅ Login complete, last_login_at updated, notifications sent');
      return data;
    } catch (error: any) {
      console.error('Login error in hook:', error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setDriver(null);
    setSession(null);
    setProfilePhotoSignedUrl(null);
  };

  // Auto-refresh session to prevent expiration during background usage
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (session) {
        console.log('[Auth] Auto-refreshing session...');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[Auth] Session refresh failed:', error);
        } else if (data.session) {
          console.log('[Auth] Session refreshed successfully');
          setSession(data.session);
        }
      }
    }, 10 * 60 * 1000); // Refresh every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [session]);

  const refreshDriver = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error refreshing driver profile:', error);
      return;
    }

    if (data) {
      setDriver(data);
      
      // Refresh signed URL for avatar if available
      if (data.profile_photo_url) {
        const { data: signedData } = await supabase.storage
          .from('driver-documents')
          .createSignedUrl(data.profile_photo_url, 60 * 60 * 24 * 7);
        
        if (signedData?.signedUrl) {
          setProfilePhotoSignedUrl(signedData.signedUrl);
        }
      }
    }
  };

  return { session, driver, loading, login, logout, profilePhotoSignedUrl, refreshDriver };
};
