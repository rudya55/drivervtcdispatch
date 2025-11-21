import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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

    // Ensure driver row exists
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (selectError) {
      console.error('Select driver error:', selectError);
      throw new Error(`Erreur de lecture: ${selectError.message}`);
    }

    if (!existing) {
      console.log('No driver row, creating simple profile for user:', user.id);

      // Single attempt with fixed payload
      const createPayload = {
        user_id: user.id,
        status: 'inactive',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Chauffeur',
        phone: user.user_metadata?.phone || '',
        email: user.email || '',
      };

      const { error: createError } = await supabaseAdmin
        .from('drivers')
        .insert(createPayload)
        .select('id')
        .single();

      if (createError) {
        console.error('❌ Driver creation failed:', createError);
        throw new Error(`Impossible de créer le profil: ${createError.message}`);
      }

      console.log('✅ Driver profile created successfully');
    }

    // Update driver profile using service role to bypass RLS
    const fullUpdate = {
      name,
      phone,
      company_name,
      company_address,
      siret,
      profile_photo_url,
      company_logo_url,
    };

    let updatedDriver = null;

    const { data: fullUpdated, error: fullError } = await supabaseAdmin
      .from('drivers')
      .update(fullUpdate)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();

    if (!fullError) {
      updatedDriver = fullUpdated;
    } else {
      const msg = fullError.message || '';
      const isMissingColumns =
        msg.includes('profile_photo_url') ||
        msg.includes('company_logo_url') ||
        msg.includes('company_name') ||
        msg.includes('company_address') ||
        msg.includes('siret') ||
        msg.includes('schema cache') ||
        (msg.includes('column') && msg.includes('does not exist'));

      if (!isMissingColumns) {
        console.error('❌ Update error (non lié aux colonnes):', fullError);
        throw new Error(`Erreur de mise à jour: ${fullError.message}`);
      }

      console.warn('🛠 Colonnes manquantes, tentative de mise à jour minimale via Edge Function.');

      const { data: basicUpdated, error: basicError } = await supabaseAdmin
        .from('drivers')
        .update({
          name,
          phone,
        })
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle();

      if (basicError) {
        console.error('❌ Basic update via Edge Function failed:', basicError);
        throw new Error(`Erreur de mise à jour: ${basicError.message}`);
      }

      updatedDriver = basicUpdated;
    }

    if (!updatedDriver) {
      throw new Error('Profil non trouvé après mise à jour');
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
    console.error('=====================================');
    console.error('CRITICAL ERROR IN driver-update-profile');
    console.error('Error object:', error);
    console.error('Error message:', error?.message);
    console.error('Error details:', {
      hint: error?.hint,
      code: error?.code,
      details: error?.details,
    });
    console.error('=====================================');
    
    let errorMessage = 'Erreur inconnue';
    if (error?.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        hint: error?.hint || null,
        code: error?.code || null,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
