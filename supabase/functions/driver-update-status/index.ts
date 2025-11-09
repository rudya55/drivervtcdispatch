import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client for auth verification (uses anon key with user's JWT)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    // Client for database operations (uses service key to bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { status } = await req.json();
    console.log('Update driver status request:', status);

    if (!status || !['active', 'inactive'].includes(status)) {
      throw new Error('Statut invalide. Utilisez "active" ou "inactive".');
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('Non autorisé - en-tête manquant');
    }

    // Verify JWT and get user using anon key client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Non autorisé - authentification échouée');
    }

    console.log('User authenticated:', user.id);

    // Check if driver profile exists (using admin client)
    const { data: existingDriver, error: selectError } = await supabaseAdmin
      .from('drivers')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (selectError) {
      console.error('Select error:', selectError);
      throw new Error(`Erreur de lecture: ${selectError.message}`);
    }

    if (!existingDriver) {
      console.error('No driver profile found for user:', user.id);
      // Create driver profile if it doesn't exist
      const { error: insertError } = await supabaseAdmin
        .from('drivers')
        .insert({
          user_id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Chauffeur',
          email: user.email,
          phone: user.user_metadata?.phone || null,
          status: status,
          type: 'driver',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Erreur création profil: ${insertError.message}`);
      }

      console.log('Driver profile created with status:', status);
      return new Response(
        JSON.stringify({ success: true, status, created: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update driver status (using admin client)
    const { error: updateError } = await supabaseAdmin
      .from('drivers')
      .update({ status })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }

    console.log('Driver status updated successfully to:', status);

    return new Response(
      JSON.stringify({ success: true, status }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Update status error:', error);
    const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
    console.error('Error message:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
