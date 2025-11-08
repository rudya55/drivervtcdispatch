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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { name, phone, email, password } = await req.json();
    console.log('Signup attempt for email:', email);

    if (!name || !phone || !email || !password) {
      throw new Error('Tous les champs sont requis');
    }

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error('Erreur lors de la vérification de l\'email');
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      // User exists, check if they already have a driver profile
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;

      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingDriver) {
        throw new Error('Vous avez déjà un compte chauffeur. Veuillez vous connecter.');
      }

      // Check if user has driver role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'driver')
        .maybeSingle();

      if (existingRole) {
        throw new Error('Vous avez déjà le rôle chauffeur.');
      }

      // Create driver profile
      const { error: profileError } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          name,
          email,
          phone,
          status: 'inactive'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Erreur lors de la création du profil chauffeur');
      }

      // Add driver role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'driver'
        });

      if (roleError) {
        console.error('Role creation error:', roleError);
        throw new Error('Erreur lors de l\'ajout du rôle chauffeur');
      }

      console.log('Driver role and profile added to existing user');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte chauffeur créé ! Connectez-vous avec vos identifiants existants.',
          existing_user: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Create new user
      console.log('Creating new user');

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          phone
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      userId = authData.user.id;
      console.log('New user created:', userId);

      // Create driver profile
      const { error: profileError } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          name,
          email,
          phone,
          status: 'inactive'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Erreur lors de la création du profil');
      }

      // Add driver role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'driver'
        });

      if (roleError) {
        console.error('Role creation error:', roleError);
        throw new Error('Erreur lors de l\'ajout du rôle');
      }

      console.log('Driver profile and role created');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte créé avec succès ! Connectez-vous pour continuer.',
          existing_user: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
