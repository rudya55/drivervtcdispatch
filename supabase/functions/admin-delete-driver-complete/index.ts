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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Non authentifié');
    }

    const { driver_id, user_id } = await req.json();

    if (!driver_id && !user_id) {
      throw new Error('driver_id ou user_id requis');
    }

    console.log(`🗑️ Deleting driver: ${driver_id || user_id}`);

    // 1. Trouver le chauffeur
    let driverData;
    if (driver_id) {
      const { data } = await supabase
        .from('drivers')
        .select('id, user_id, email, name')
        .eq('id', driver_id)
        .single();
      driverData = data;
    } else {
      const { data } = await supabase
        .from('drivers')
        .select('id, user_id, email, name')
        .eq('user_id', user_id)
        .single();
      driverData = data;
    }

    if (!driverData) {
      throw new Error('Chauffeur non trouvé');
    }

    // 2. Supprimer documents storage
    const { data: files } = await supabase.storage
      .from('driver-documents')
      .list(driverData.id);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${driverData.id}/${f.name}`);
      await supabase.storage.from('driver-documents').remove(filePaths);
      console.log(`  ✅ Deleted ${files.length} files from storage`);
    }

    // 3. Supprimer notifications
    await supabase
      .from('driver_notifications')
      .delete()
      .eq('driver_id', driverData.id);
    console.log(`  ✅ Deleted notifications`);

    // 4. Mettre courses à NULL (conserver l'historique)
    await supabase
      .from('courses')
      .update({ driver_id: null })
      .eq('driver_id', driverData.id);
    console.log(`  ✅ Unlinked courses`);

    // 5. Supprimer profil drivers
    await supabase
      .from('drivers')
      .delete()
      .eq('id', driverData.id);
    console.log(`  ✅ Deleted driver profile`);

    // 6. Supprimer user_roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', driverData.user_id)
      .eq('role', 'driver');
    console.log(`  ✅ Deleted user role`);

    // 7. Supprimer compte auth
    const { error: authError } = await supabase.auth.admin.deleteUser(driverData.user_id);
    if (authError) {
      console.error(`  ❌ Failed to delete auth user: ${authError.message}`);
      throw authError;
    }
    console.log(`  ✅ Deleted auth account`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Chauffeur ${driverData.email} supprimé complètement`,
        email: driverData.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Delete error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
