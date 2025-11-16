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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Non autorisé');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) throw new Error('Non autorisé');

    // Get request body
    const body = await req.json();
    const { 
      name, 
      phone, 
      company_name, 
      company_address, 
      siret,
      profile_photo_url,
      company_logo_url 
    } = body;

    console.log('Updating profile for user:', user.id, body);

    // Update driver profile using service role to bypass RLS
    const { data: updatedDriver, error: updateError } = await supabaseAdmin
      .from('drivers')
      .update({
        name,
        phone,
        company_name,
        company_address,
        siret,
        profile_photo_url,
        company_logo_url,
      })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Erreur de mise à jour: ${updateError.message}`);
    }

    console.log('Profile updated successfully:', updatedDriver);

    return new Response(
      JSON.stringify({ driver: updatedDriver }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in driver-update-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur inconnue' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
