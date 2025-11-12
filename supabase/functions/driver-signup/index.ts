import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('driver-signup function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('Processing signup request...');
    
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

    const requestBody = await req.json();
    const { name, phone, email, password } = requestBody;
    
    console.log('Signup attempt for email:', email);

    if (!name || !phone || !email || !password) {
      throw new Error('Tous les champs sont requis');
    }

    // Check if driver profile already exists
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingDriver) {
      console.log('Driver profile already exists for email:', email);
      throw new Error('Un compte chauffeur existe déjà avec cet email. Veuillez vous connecter.');
    }

    // Check if user already exists in Auth
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error('Erreur lors de la vérification de l\'email');
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      // User exists (from fleet app), just create driver profile
      console.log('User already exists in Auth (fleet user):', existingUser.id);
      userId = existingUser.id;
      
      // Create driver profile linked to existing auth user
      const { error: profileError } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          name,
          email,
          phone,
          status: 'inactive',
          type: 'vtc'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Erreur lors de la création du profil chauffeur');
      }

      console.log('Driver profile created for existing user');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte chauffeur créé ! Utilisez votre mot de passe existant pour vous connecter.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Create new user in Auth
      console.log('Creating new user in Auth');

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
          status: 'inactive',
          type: 'vtc'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Erreur lors de la création du profil');
      }

      console.log('Driver profile created');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte créé avec succès ! Connectez-vous pour continuer.',
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
