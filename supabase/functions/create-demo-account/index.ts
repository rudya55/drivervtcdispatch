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

    // Create demo user
    const demoEmail = 'demo@drivervtc.com';
    const demoPassword = 'Demo123!';

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === demoEmail);

    let userId: string;

    if (existingUser) {
      console.log('Demo user already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Jean',
          last_name: 'Démo',
          name: 'Jean Démo',
          phone: '+33612345678',
          role: 'driver'
        }
      });

      if (userError) throw userError;
      userId = newUser.user.id;
      console.log('Created demo user:', userId);
    }

    // Check if driver profile exists
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let driverId: string;

    if (!existingDriver) {
      // Create driver profile
      const { data: newDriver, error: driverError } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          name: 'Jean Démo',
          phone: '+33612345678',
          email: demoEmail,
          license_number: 'DEMO123456',
          vehicle_model: 'Mercedes Classe E',
          vehicle_plate: 'AB-123-CD',
          status: 'available'
        })
        .select()
        .single();

      if (driverError || !newDriver) throw driverError;
      driverId = newDriver.id;
      console.log('Created driver profile:', driverId);
    } else {
      driverId = existingDriver.id;
      console.log('Driver profile exists:', driverId);
    }

    // Delete existing demo courses
    await supabase
      .from('courses')
      .delete()
      .eq('driver_id', driverId);

    // Create demo courses
    const now = new Date();
    const pickupTime = new Date(now.getTime() + 30 * 60000); // +30 minutes

    const demoCourses = [
      {
        driver_id: driverId,
        company_name: 'VTC Premium',
        client_name: 'Marie Dupont',
        client_phone: '+33698765432',
        departure_location: '15 Avenue des Champs-Élysées, 75008 Paris',
        destination_location: 'Aéroport Charles de Gaulle, Terminal 2E, 95700 Roissy-en-France',
        pickup_date: pickupTime.toISOString(),
        vehicle_type: 'Berline',
        passengers_count: 2,
        luggage_count: 3,
        client_price: 85.00,
        commission: 17.00,
        net_driver: 68.00,
        status: 'dispatched',
        dispatch_mode: 'auto',
        flight_number: 'AF1234',
        notes: 'Vol Air France AF1234 - Arrivée prévue 14h30'
      },
      {
        driver_id: driverId,
        company_name: 'TransportPro',
        client_name: 'Pierre Martin',
        client_phone: '+33687654321',
        departure_location: 'Gare de Lyon, Place Louis Armand, 75012 Paris',
        destination_location: '1 Rue de la Paix, 75002 Paris',
        pickup_date: new Date(now.getTime() - 120 * 60000).toISOString(), // -2 hours (unlocked)
        vehicle_type: 'Van',
        passengers_count: 4,
        luggage_count: 5,
        client_price: 45.00,
        commission: 6.75,
        net_driver: 38.25,
        status: 'dispatched',
        dispatch_mode: 'manual',
        notes: 'Client avec bagages volumineux'
      }
    ];

    const { data: insertedCourses, error: coursesError } = await supabase
      .from('courses')
      .insert(demoCourses)
      .select();

    if (coursesError) throw coursesError;
    console.log('Created demo courses:', insertedCourses?.length);

    // Create notifications for each course
    if (insertedCourses && insertedCourses.length > 0) {
      const notifications = insertedCourses.map((course: any) => ({
        driver_id: driverId,
        course_id: course.id,
        type: 'new_course',
        title: 'Nouvelle course disponible',
        message: `Course vers ${course.destination_location}`,
        read: false,
        data: {
          course_id: course.id,
          client_name: course.client_name,
          destination: course.destination_location
        }
      }));

      const { error: notificationsError } = await supabase
        .from('driver_notifications')
        .insert(notifications);

      if (notificationsError) throw notificationsError;
      console.log('Created notifications for demo courses');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte démo créé avec succès',
        credentials: {
          email: demoEmail,
          password: demoPassword
        },
        driver_id: driverId,
        courses_created: insertedCourses?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error creating demo account:', error);
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
