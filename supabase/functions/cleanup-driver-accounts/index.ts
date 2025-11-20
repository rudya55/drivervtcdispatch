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

    console.log('🧹 Starting driver accounts cleanup...');

    // 1. Récupérer tous les user_ids avec role='driver'
    const { data: driverRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'driver');

    if (rolesError) throw rolesError;

    const driverUserIds = driverRoles.map(r => r.user_id);
    console.log(`📊 Found ${driverUserIds.length} driver accounts to delete`);

    if (driverUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun chauffeur à supprimer', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Récupérer les infos des chauffeurs (pour rapport)
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, user_id, email, name')
      .in('user_id', driverUserIds);

    const deletedEmails: string[] = [];
    let deletedCount = 0;

    // 3. Supprimer chaque chauffeur
    for (const driver of drivers || []) {
      console.log(`🗑️ Deleting driver: ${driver.email}`);

      try {
        // A. Supprimer documents storage
        const { data: files } = await supabase.storage
          .from('driver-documents')
          .list(driver.id);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${driver.id}/${f.name}`);
          await supabase.storage.from('driver-documents').remove(filePaths);
          console.log(`  ✅ Deleted ${files.length} files from storage`);
        }

        // B. Supprimer notifications
        await supabase
          .from('driver_notifications')
          .delete()
          .eq('driver_id', driver.id);
        console.log(`  ✅ Deleted notifications`);

        // C. Mettre courses à NULL (conserver l'historique)
        await supabase
          .from('courses')
          .update({ driver_id: null })
          .eq('driver_id', driver.id);
        console.log(`  ✅ Unlinked courses`);

        // D. Supprimer profil drivers
        await supabase
          .from('drivers')
          .delete()
          .eq('id', driver.id);
        console.log(`  ✅ Deleted driver profile`);

        // E. Supprimer user_roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', driver.user_id)
          .eq('role', 'driver');
        console.log(`  ✅ Deleted user role`);

        // F. Supprimer compte auth
        const { error: authError } = await supabase.auth.admin.deleteUser(driver.user_id);
        if (authError) {
          console.error(`  ❌ Failed to delete auth user: ${authError.message}`);
        } else {
          console.log(`  ✅ Deleted auth account`);
        }

        deletedEmails.push(driver.email);
        deletedCount++;
      } catch (err) {
        console.error(`  ❌ Error deleting ${driver.email}:`, err);
      }
    }

    console.log(`✅ Cleanup completed: ${deletedCount} drivers deleted`);

    return new Response(
      JSON.stringify({
        message: `${deletedCount} chauffeurs supprimés avec succès`,
        deleted: deletedCount,
        emails: deletedEmails
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
