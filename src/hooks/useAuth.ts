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
          // Fetch driver profile
          setTimeout(async () => {
            const { data } = await supabase
              .from('drivers')
              .select('*')
              .eq('user_id', currentSession.user.id)
              .single();
            
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
        supabase
          .from('drivers')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setDriver(data);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('driver-login', {
      body: { email, password }
    });

    if (error) throw error;
    
    if (data?.session) {
      await supabase.auth.setSession(data.session);
      return data;
    }
    
    throw new Error('Login failed');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setDriver(null);
  };

  return { session, driver, loading, login, logout };
};
