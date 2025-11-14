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
          last_name: 'Démo'
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
      .eq('id', userId)
      .single();

    if (!existingDriver) {
      // Create driver profile
      const { error: driverError } = await supabase.from('drivers').insert({
        id: userId,
        first_name: 'Jean',
        last_name: 'Démo',
        phone: '+33612345678',
        email: demoEmail,
        license_number: 'DEMO123456',
        vehicle_type: 'Berline',
        vehicle_model: 'Mercedes Classe E',
        vehicle_plate: 'AB-123-CD',
        status: 'available',
        is_active: true
      });

      if (driverError) throw driverError;
      console.log('Created driver profile');
    }

    // Delete existing demo courses
    await supabase
      .from('courses')
      .delete()
      .eq('driver_id', userId);

    // Create demo courses
    const now = new Date();
    const pickupTime = new Date(now.getTime() + 30 * 60000); // +30 minutes

    const demoCourses = [
      {
        driver_id: userId,
        company_name: 'VTC Premium',
        client_name: 'Marie Dupont',
        client_phone: '+33698765432',
        departure_address: '15 Avenue des Champs-Élysées, 75008 Paris',
        destination_address: 'Aéroport Charles de Gaulle, Terminal 2E, 95700 Roissy-en-France',
        departure_lat: 48.8698,
        departure_lng: 2.3078,
        destination_lat: 49.0097,
        destination_lng: 2.5479,
        pickup_date: pickupTime.toISOString(),
        vehicle_type: 'Berline',
        passenger_count: 2,
        luggage_count: 3,
        client_price: 85.00,
        commission_rate: 20,
        driver_net: 68.00,
        payment_method: 'Carte bancaire',
        status: 'dispatched',
        notes: 'Vol Air France AF1234 - Arrivée prévue 14h30'
      },
      {
        driver_id: userId,
        company_name: 'TransportPro',
        client_name: 'Pierre Martin',
        client_phone: '+33687654321',
        departure_address: 'Gare de Lyon, Place Louis Armand, 75012 Paris',
        destination_address: '1 Rue de la Paix, 75002 Paris',
        departure_lat: 48.8447,
        departure_lng: 2.3737,
        destination_lat: 48.8689,
        destination_lng: 2.3308,
        pickup_date: new Date(now.getTime() - 120 * 60000).toISOString(), // -2 hours (unlocked)
        vehicle_type: 'Van',
        passenger_count: 4,
        luggage_count: 5,
        client_price: 45.00,
        commission_rate: 15,
        driver_net: 38.25,
        payment_method: 'Espèces',
        status: 'dispatched',
        notes: 'Client avec bagages volumineux'
      }
    ];

    const { data: insertedCourses, error: coursesError } = await supabase
      .from('courses')
      .insert(demoCourses)
      .select();

    if (coursesError) throw coursesError;

    console.log(`Created ${insertedCourses.length} demo courses`);

    // Create notifications for each course
    for (const course of insertedCourses) {
      await supabase.from('driver_notifications').insert({
        driver_id: userId,
        type: 'new_course',
        title: 'Nouvelle course disponible',
        message: `Course ${course.company_name} - ${course.departure_address} → ${course.destination_address}`,
        data: {
          course_id: course.id,
          company: course.company_name,
          departure: course.departure_address,
          destination: course.destination_address
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte de démonstration créé avec succès',
        credentials: {
          email: demoEmail,
          password: demoPassword
        },
        driver_id: userId,
        courses_created: insertedCourses.length
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
