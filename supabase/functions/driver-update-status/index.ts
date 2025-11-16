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

    // Validate envs early for clearer errors
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing Supabase envs', {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
        hasService: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({ error: 'Configuration manquante du backend (clés d\'environnement).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

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
      console.log('No driver row, creating minimal profile for user:', user.id);

      // Try minimal insert first (most compatible across schemas)
      const minimalPayload: any = {
        user_id: user.id,
        status,
      };

      const { data: minimalData, error: minimalError } = await supabaseAdmin
        .from('drivers')
        .insert(minimalPayload)
        .select('id')
        .maybeSingle();

      if (!minimalError && minimalData) {
        console.log('Minimal driver profile created');
        return new Response(
          JSON.stringify({ success: true, status, created: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      console.warn('Minimal insert failed, trying with optional fields', minimalError);

      // If minimal insert fails due to NOT NULL constraints on other fields, try with more data
      const basePayload: any = {
        user_id: user.id,
        status,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Chauffeur',
        phone: user.user_metadata?.phone || null,
        email: user.email || null,
      };

      // Try without "type" first (avoid unknown column errors)
      let created = false;
      let lastInsertError: any = null;

      const attempts: Array<Record<string, any>> = [
        { ...basePayload },
        { ...basePayload, type: 'vtc' },
        { ...basePayload, type: 'driver' },
        { ...basePayload, type: 'chauffeur' },
      ];

      for (const payload of attempts) {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('drivers')
          .insert(payload)
          .select('id')
          .maybeSingle();

        if (!insertError && insertData) { created = true; break; }
        lastInsertError = insertError;

        // If column doesn't exist for 'type', skip attempts with type
        const msg = (insertError?.message || '').toLowerCase();
        if (msg.includes('column') && msg.includes('type') && msg.includes('does not exist')) {
          break;
        }
      }

      if (!created) {
        const reason = lastInsertError?.message || 'Insertion failed for unknown reason';
        return new Response(
          JSON.stringify({ error: `Erreur création profil: ${reason}`, details: lastInsertError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Driver profile created with status:', status);
      return new Response(
        JSON.stringify({ success: true, status, created: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
    console.error('=====================================');
    console.error('CRITICAL ERROR IN driver-update-status');
    console.error('Error type:', typeof error);
    console.error('Error object:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      hint: error?.hint,
      code: error?.code,
      details: error?.details,
      name: error?.name,
    });
    console.error('=====================================');
    
    let errorMessage = 'Erreur inconnue';
    try {
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString) {
        errorMessage = error.toString();
      } else {
        errorMessage = JSON.stringify(error);
      }
    } catch (e) {
      errorMessage = 'Erreur lors de la conversion du message d\'erreur';
      console.error('Error stringifying error:', e);
    }
    
    const payload = {
      error: errorMessage,
      hint: error?.hint || null,
      code: error?.code || null,
      details: error?.details || null,
      timestamp: new Date().toISOString(),
    };
    
    console.error('Returning error payload:', payload);
    
    return new Response(
      JSON.stringify(payload),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
