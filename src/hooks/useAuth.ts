import { useState, useEffect } from 'react';
import { supabase, Driver } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Vérifier que c'est bien un compte chauffeur
          const userRole = currentSession.user.user_metadata?.role;

          // Bloquer si le rôle n'est pas explicitement 'driver'
          // Cela force l'assignation du rôle lors de la création de compte
          if (userRole !== 'driver') {
            console.warn('❌ Rôle invalide ou manquant:', userRole);
            // Déconnecter et arrêter
            setTimeout(async () => {
              await supabase.auth.signOut();
              setDriver(null);
              setSession(null);
              setLoading(false);
            }, 0);
            return;
          }
          
          // Fetch or create driver profile via backend (service role) to avoid RLS issues
          setTimeout(async () => {
            const user = currentSession.user;
            try {
              const token = currentSession.access_token;
              await supabase.functions.invoke('driver-update-status', {
                body: { status: 'inactive' },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
            } catch (e) {
              console.warn('ensure-driver-profile failed:', e);
            }

            const { data, error } = await supabase
              .from('drivers')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();

            if (error) {
              console.error('Error fetching driver profile:', error);
            }

            if (data) {
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
        const userRole = user.user_metadata?.role;

        // Bloquer si le rôle n'est pas explicitement 'driver'
        if (userRole !== 'driver') {
          console.warn('❌ Rôle invalide ou manquant à l\'init:', userRole);
          supabase.auth.signOut();
          setDriver(null);
          setSession(null);
          setLoading(false);
          return;
        }
        // Ensure driver profile exists via backend function (service role)
        (async () => {
          try {
            const token = currentSession.access_token;
            await supabase.functions.invoke('driver-update-status', {
              body: { status: 'inactive' },
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
          } catch (e) {
            console.warn('ensure-driver-profile at init failed:', e);
          }

          supabase
            .from('drivers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching driver profile at init:', error);
              }
              if (data) setDriver(data);
              else console.warn('No driver profile available at init for user:', user.id);
              setLoading(false);
            });
        })();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || 'Erreur de connexion');
      }

      if (!data?.session) {
        throw new Error('Connexion échouée - session manquante');
      }

      // Vérifier que c'est bien un compte chauffeur
      const userRole = data.session.user.user_metadata?.role;
      if (userRole !== 'driver') {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'est pas un compte chauffeur. Rôle manquant ou invalide.");
      }

      setSession(data.session);
      return data;
    } catch (error: any) {
      console.error('Login error in hook:', error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setDriver(null);
  };

  return { session, driver, loading, login, logout };
};
