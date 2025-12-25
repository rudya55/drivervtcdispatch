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
    console.log('🗺️ get-google-maps-key function called - v2');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      throw new Error('Non autorisé');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log('❌ Auth error:', authError?.message);
      throw new Error('Non autorisé');
    }
    
    console.log('✅ User authenticated:', user.id);

    const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!key) {
      console.log('❌ GOOGLE_MAPS_API_KEY not found in secrets');
      throw new Error('Clé API manquante');
    }
    
    console.log('✅ Google Maps API key retrieved successfully, length:', key.length);

    return new Response(JSON.stringify({ key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
