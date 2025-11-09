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
          // Fetch or create driver profile (deferred to avoid deadlocks)
          setTimeout(async () => {
            const user = currentSession.user;
            let { data, error } = await supabase
              .from('drivers')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!data) {
              const name = (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Chauffeur';
              const email = user.email as string | null;
              const phone = (user.user_metadata?.phone as string) || null;
              const { data: created, error: createError } = await supabase
                .from('drivers')
                .insert({ user_id: user.id, name, email, phone, status: 'inactive' })
                .select('*')
                .maybeSingle();
              if (!createError && created) data = created;
            }
            
            if (data) {
              setDriver(data);
            }
          }, 0);
        } else {
          setDriver(null);
        }
        
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        const user = currentSession.user;
        supabase
          .from('drivers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(async ({ data }) => {
            if (!data) {
              const name = (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Chauffeur';
              const email = user.email as string | null;
              const phone = (user.user_metadata?.phone as string) || null;
              const { data: created } = await supabase
                .from('drivers')
                .insert({ user_id: user.id, name, email, phone, status: 'inactive' })
                .select('*')
                .maybeSingle();
              if (created) data = created;
            }
            if (data) setDriver(data);
            setLoading(false);
          });
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
