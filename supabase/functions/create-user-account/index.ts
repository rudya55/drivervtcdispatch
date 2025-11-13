import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('create-user-account function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Configuration serveur manquante');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, password, role, name, phone } = await req.json();
    
    console.log('Creating user account with role:', role);

    if (!email || !password || !role) {
      throw new Error('Email, mot de passe et rôle requis');
    }

    // Validate role
    const validRoles = ['driver', 'fleet_manager', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error('Rôle invalide');
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      // User exists, check if they already have this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        throw new Error('Un compte avec ce rôle existe déjà pour cet email');
      }

      // Add new role to existing user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: existingUser.id,
          role
        });

      if (roleError) {
        console.error('Error adding role:', roleError);
        throw new Error('Erreur lors de l\'ajout du rôle');
      }

      // If driver role, create driver profile
      if (role === 'driver') {
        const { data: existingDriver } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (!existingDriver) {
          const { error: profileError } = await supabase
            .from('drivers')
            .insert({
              user_id: existingUser.id,
              name: name || email.split('@')[0],
              email,
              phone: phone || '',
              status: 'inactive',
              type: 'vtc'
            });

          if (profileError) {
            console.error('Error creating driver profile:', profileError);
            throw new Error('Erreur lors de la création du profil chauffeur');
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nouveau rôle ajouté à votre compte existant'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split('@')[0],
        phone: phone || ''
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Erreur lors de la création du compte');
    }

    const userId = authData.user.id;
    console.log('New user created:', userId);

    // Insert role in user_roles table
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role
      });

    if (roleError) {
      console.error('Error inserting role:', roleError);
      throw new Error('Erreur lors de l\'attribution du rôle');
    }

    // If driver role, create driver profile
    if (role === 'driver') {
      const { error: profileError } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          name: name || email.split('@')[0],
          email,
          phone: phone || '',
          status: 'inactive',
          type: 'vtc'
        });

      if (profileError) {
        console.error('Error creating driver profile:', profileError);
        throw new Error('Erreur lors de la création du profil');
      }
    }

    console.log('Account created successfully with role:', role);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte créé avec succès ! Connectez-vous pour continuer.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Create account error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
