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

      // Attempt inserting with progressive fallbacks for legacy schemas
      const basePayload: any = {
        user_id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Chauffeur',
        email: user.email,
        phone: user.user_metadata?.phone || null,
        status: status,
      };

      const tryInserts: Array<Record<string, any>> = [
        { ...basePayload },
        { ...basePayload, type: 'driver' },
        { ...basePayload, type: 'chauffeur' },
        { ...basePayload, type: 'vtc' },
      ];

      let created = false;
      let lastInsertError: any = null;

      for (const payload of tryInserts) {
        const { error: insertError } = await supabaseAdmin
          .from('drivers')
          .insert(payload);
        if (!insertError) { created = true; break; }
        lastInsertError = insertError;
        console.log('Insert attempt failed with payload keys:', Object.keys(payload), 'error:', insertError?.message);
        // If error is not related to "type" constraint, no point trying more
        const msg = (insertError?.message || '').toLowerCase();
        if (!msg.includes('type') && !msg.includes('check constraint') && !msg.includes('not-null')) {
          break;
        }
      }

      if (!created) {
        const reason = lastInsertError?.message || 'Insertion failed for unknown reason';
        console.error('Insert error (final):', reason);
        throw new Error(`Erreur création profil: ${reason}`);
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
