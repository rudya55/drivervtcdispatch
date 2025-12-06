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

    // Get or create driver profile
    let { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (driverError) {
      console.error('Driver fetch error:', driverError);
      throw new Error('Erreur lors de la récupération du profil chauffeur');
    }

    if (!driver) {
      console.log('No driver profile found, creating one...');
      const nameFromMeta = (authData.user.user_metadata?.name as string) || authData.user.email?.split('@')[0] || 'Chauffeur';
      const emailFromUser = authData.user.email as string | null;

      const { data: created, error: createError } = await supabase
        .from('drivers')
        .insert({
          user_id: authData.user.id,
          name: nameFromMeta,
          email: emailFromUser,
          phone: authData.user.user_metadata?.phone ?? null,
          status: 'inactive'
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Driver create error:', createError);
        throw new Error(`Impossible de créer le profil chauffeur: ${createError.message}`);
      }

      if (!created) {
        throw new Error('Profil chauffeur non créé');
      }

      driver = created;
      console.log('Driver profile created successfully:', driver.id);
    } else {
      console.log('Driver profile found:', driver.id);
    }

    // Mise à jour du last_login_at
    const now = new Date();
    await supabase
      .from('drivers')
      .update({ last_login_at: now.toISOString() })
      .eq('id', driver.id);

    // Envoyer notification aux admins/fleet managers
    try {
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'fleet_manager']);

      if (adminUsers && adminUsers.length > 0) {
        const frenchDate = now.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const frenchTime = now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Créer une notification pour chaque admin
        const loginNotifications = adminUsers.map(admin => ({
          driver_id: driver.id,
          type: 'driver_login',
          title: `🟢 ${driver.name} connecté`,
          message: `Le chauffeur ${driver.name} s'est connecté le ${frenchDate} à ${frenchTime}`,
          read: false,
          data: {
            driver_id: driver.id,
            driver_name: driver.name,
            driver_email: driver.email,
            login_at: now.toISOString(),
            admin_user_id: admin.user_id
          }
        }));

        const { error: notifError } = await supabase
          .from('driver_notifications')
          .insert(loginNotifications);

        if (notifError) {
          console.error('Error sending login notifications:', notifError);
        } else {
          console.log(`✅ Notification de connexion envoyée à ${adminUsers.length} admin(s)`);
        }
      }
    } catch (notifErr) {
      console.error('Error in notification process:', notifErr);
      // Ne pas bloquer la connexion si les notifications échouent
    }

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
