import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Non autorisé - token manquant');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Non autorisé - utilisateur invalide');
    }

    console.log('🗑️ Starting account deletion for user:', user.id);

    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (driverError) {
      console.error('Error fetching driver:', driverError);
      throw new Error('Erreur lors de la récupération du profil');
    }

    if (!driver) {
      console.warn('No driver profile found for user:', user.id);
      // Still proceed to delete auth user
    }

    const driverId = driver?.id;

    if (driverId) {
      // Step 1: Delete driver documents from storage
      console.log('📁 Deleting driver documents from storage...');
      try {
        const { data: files, error: listError } = await supabase
          .storage
          .from('driver-documents')
          .list(driverId);

        if (!listError && files && files.length > 0) {
          const filePaths = files.map(file => `${driverId}/${file.name}`);
          const { error: deleteFilesError } = await supabase
            .storage
            .from('driver-documents')
            .remove(filePaths);

          if (deleteFilesError) {
            console.warn('⚠️ Error deleting some documents:', deleteFilesError);
          } else {
            console.log(`✅ Deleted ${files.length} document(s)`);
          }
        }
      } catch (storageError) {
        console.warn('⚠️ Storage deletion error:', storageError);
      }

      // Step 2: Delete profile photos from storage
      console.log('🖼️ Deleting profile photos from storage...');
      try {
        const { data: profileFiles } = await supabase
          .storage
          .from('driver-profiles')
          .list('', { prefix: driverId });

        if (profileFiles && profileFiles.length > 0) {
          const profilePaths = profileFiles.map(file => `${driverId}/${file.name}`);
          await supabase.storage.from('driver-profiles').remove(profilePaths);
        }
      } catch (photoError) {
        console.warn('⚠️ Photo deletion error:', photoError);
      }

      // Step 3: Delete course tracking
      console.log('📍 Deleting course tracking data...');
      const { error: trackingError } = await supabase
        .from('course_tracking')
        .delete()
        .in('course_id',
          supabase
            .from('courses')
            .select('id')
            .eq('driver_id', driverId)
        );

      if (trackingError) {
        console.warn('⚠️ Course tracking deletion error:', trackingError);
      }

      // Step 4: Delete or anonymize courses
      console.log('🚗 Anonymizing courses...');
      const { error: coursesError } = await supabase
        .from('courses')
        .update({
          driver_id: null,
          status: 'cancelled',
          notes: 'Driver account deleted'
        })
        .eq('driver_id', driverId);

      if (coursesError) {
        console.warn('⚠️ Courses anonymization error:', coursesError);
      }

      // Step 5: Delete driver locations
      console.log('🗺️ Deleting location history...');
      const { error: locationsError } = await supabase
        .from('driver_locations')
        .delete()
        .eq('driver_id', driverId);

      if (locationsError) {
        console.warn('⚠️ Locations deletion error:', locationsError);
      }

      // Step 6: Delete driver notifications
      console.log('🔔 Deleting notifications...');
      const { error: notificationsError } = await supabase
        .from('driver_notifications')
        .delete()
        .eq('driver_id', driverId);

      if (notificationsError) {
        console.warn('⚠️ Notifications deletion error:', notificationsError);
      }

      // Step 7: Delete driver profile
      console.log('👤 Deleting driver profile...');
      const { error: deleteDriverError } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);

      if (deleteDriverError) {
        throw new Error(`Erreur lors de la suppression du profil: ${deleteDriverError.message}`);
      }
    }

    // Step 8: Delete auth user
    console.log('🔐 Deleting auth user...');
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      throw new Error(`Erreur lors de la suppression du compte: ${deleteUserError.message}`);
    }

    console.log('✅ Account deletion completed successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte supprimé avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Delete account error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors de la suppression du compte'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
