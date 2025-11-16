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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, name } = await req.json();

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    console.log('🧹 Starting database cleanup...');

    // 1. Delete all driver notifications
    const { error: notifError } = await supabase
      .from('driver_notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (notifError) console.error('Error deleting notifications:', notifError);
    else console.log('✅ Deleted all notifications');

    // 2. Delete all course tracking
    const { error: trackingError } = await supabase
      .from('course_tracking')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (trackingError) console.error('Error deleting course tracking:', trackingError);
    else console.log('✅ Deleted all course tracking');

    // 3. Delete all courses
    const { error: coursesError } = await supabase
      .from('courses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (coursesError) console.error('Error deleting courses:', coursesError);
    else console.log('✅ Deleted all courses');

    // 4. Delete all driver locations
    const { error: locationsError } = await supabase
      .from('driver_locations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (locationsError) console.error('Error deleting locations:', locationsError);
    else console.log('✅ Deleted all driver locations');

    // 5. Get all drivers to find their user_ids
    const { data: drivers } = await supabase
      .from('drivers')
      .select('user_id');

    const userIds = drivers?.map(d => d.user_id) || [];

    // 6. Delete all drivers
    const { error: driversError } = await supabase
      .from('drivers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (driversError) console.error('Error deleting drivers:', driversError);
    else console.log('✅ Deleted all drivers');

    // 7. Delete all auth users
    for (const userId of userIds) {
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log('✅ Deleted user:', userId);
      } catch (error) {
        console.error('Error deleting user:', userId, error);
      }
    }

    console.log('🧹 Database cleanup complete!');
    console.log('🆕 Creating new account...');

    // 8. Create new user with provided credentials
    const fullName = name || 'Jean Démo';
    const firstName = fullName.split(' ')[0] || 'Jean';
    const lastName = fullName.split(' ').slice(1).join(' ') || 'Démo';
    const phone = '+33612345678';

    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: 'driver'
      }
    });

    if (userError) throw userError;

    console.log('✅ Created user:', newUser.user.id);

    // 9. Create driver profile with complete information
    const { data: newDriver, error: driverError } = await supabase
      .from('drivers')
      .insert({
        user_id: newUser.user.id,
        name: fullName,
        email: email,
        phone: phone,
        status: 'active',
        notifications_enabled: true,
        rating: 0,
        company_name: null,
        company_address: null,
        siret: null,
        vehicle_brand: null,
        vehicle_model: null,
        vehicle_year: null,
        vehicle_plate: null,
        license_number: null,
        iban: null,
        bic: null,
        profile_photo_url: null,
        company_logo_url: null,
        notification_sound: null
      })
      .select()
      .single();

    if (driverError) throw driverError;

    console.log('✅ Created driver profile:', newDriver.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Base de données nettoyée et nouveau compte créé avec succès',
        user_id: newUser.user.id,
        driver_id: newDriver.id,
        credentials: {
          email,
          password
        },
        profile: {
          name: fullName,
          phone: phone,
          status: 'active'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
