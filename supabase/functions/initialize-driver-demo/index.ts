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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log('Initializing demo for user:', user.id);

    // 1. Supprimer la colonne type si elle existe
    console.log('Removing type column...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_type_check;
        ALTER TABLE drivers DROP COLUMN IF EXISTS type;
      `
    });

    // 2. Créer ou récupérer le profil driver
    console.log('Creating driver profile...');
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let driverId: string;

    if (existingDriver) {
      driverId = existingDriver.id;
      console.log('Driver already exists:', driverId);
    } else {
      const { data: newDriver, error: driverError } = await supabase
        .from('drivers')
        .insert({
          user_id: user.id,
          name: user.email?.split('@')[0] || 'Driver',
          email: user.email,
          phone: user.phone || null,
          status: 'inactive'
        })
        .select('id')
        .single();

      if (driverError) {
        console.error('Driver creation error:', driverError);
        throw driverError;
      }

      driverId = newDriver.id;
      console.log('Driver created:', driverId);
    }

    // 3. Supprimer les anciennes courses de test
    console.log('Cleaning old test courses...');
    await supabase
      .from('courses')
      .delete()
      .eq('driver_id', driverId)
      .ilike('client_name', '%TEST%');

    // 4. Créer 3 courses de test
    console.log('Creating test courses...');
    const now = new Date();
    const demoCourses = [
      {
        driver_id: driverId,
        client_name: 'Jean Dupont - TEST',
        client_phone: '+33612345678',
        client_email: 'jean.dupont@email.com',
        departure_location: 'Aéroport Charles de Gaulle, Terminal 2E',
        destination_location: '15 Avenue des Champs-Élysées, 75008 Paris',
        pickup_date: new Date(now.getTime() + 10000).toISOString(), // 10 sec
        status: 'accepted',
        client_price: 85.00,
        commission: 12.75,
        net_driver: 72.25,
        passengers_count: 2,
        luggage_count: 3,
        vehicle_type: 'Berline',
        notes: 'Vol AF1234 - Client attend à la sortie',
        flight_number: 'AF1234',
        company_name: 'Paris VTC Premium',
        accepted_at: now.toISOString(),
      },
      {
        driver_id: driverId,
        client_name: 'Marie Martin - TEST',
        client_phone: '+33623456789',
        departure_location: 'Gare du Nord, Paris',
        destination_location: 'Hôtel Ritz, Place Vendôme, Paris',
        pickup_date: new Date(now.getTime() + 2 * 60000).toISOString(), // 2 min
        status: 'pending',
        client_price: 45.00,
        commission: 6.75,
        net_driver: 38.25,
        passengers_count: 1,
        luggage_count: 1,
        vehicle_type: 'Berline',
        notes: 'Client régulier',
        company_name: 'City Transfer',
      },
      {
        driver_id: driverId,
        client_name: 'Pierre Dubois - TEST',
        client_phone: '+33634567890',
        departure_location: 'Tour Eiffel, Champ de Mars',
        destination_location: 'Gare de Lyon, Paris',
        pickup_date: new Date(now.getTime() + 5 * 60000).toISOString(), // 5 min
        status: 'pending',
        client_price: 35.00,
        commission: 5.25,
        net_driver: 29.75,
        passengers_count: 3,
        luggage_count: 2,
        vehicle_type: 'Van',
        notes: 'Famille avec enfants',
        company_name: 'Paris VTC Premium',
      },
    ];

    const { data: insertedCourses, error: coursesError } = await supabase
      .from('courses')
      .insert(demoCourses)
      .select();

    if (coursesError) {
      console.error('Courses creation error:', coursesError);
      throw coursesError;
    }

    console.log('Test courses created:', insertedCourses?.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Profil et courses de test créés !',
        driver_id: driverId,
        courses_count: insertedCourses?.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
