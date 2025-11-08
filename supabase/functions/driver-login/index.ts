import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password } = await req.json();
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Échec de l\'authentification');
    }

    console.log('User authenticated:', authData.user.id);

    // Get driver profile (serves as driver verification)
    // If a driver profile exists for this user, they are considered a driver


    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (driverError) {
      console.error('Driver fetch error:', driverError);
      throw new Error('Erreur lors de la récupération du profil chauffeur');
    }

    if (!driver) {
      console.error('No driver profile found for user:', authData.user.id);
      throw new Error('Profil chauffeur introuvable');
    }

    console.log('Driver profile found:', driver.id);

    return new Response(
      JSON.stringify({
        session: authData.session,
        driver: driver,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
