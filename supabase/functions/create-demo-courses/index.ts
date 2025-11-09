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

    // Get driver
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driver) {
      return new Response(JSON.stringify({ error: 'Chauffeur non trouvé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const now = new Date();
    
    // Course 1: Dans 10 secondes (débloquée immédiatement)
    const course1Time = new Date(now.getTime() + 10000);
    
    // Course 2: Dans 2 minutes (débloquée immédiatement)
    const course2Time = new Date(now.getTime() + 2 * 60000);
    
    // Course 3: Dans 5 minutes (débloquée immédiatement)
    const course3Time = new Date(now.getTime() + 5 * 60000);

    const demoCourses = [
      {
        driver_id: driver.id,
        client_name: 'Jean Dupont',
        client_phone: '+33612345678',
        client_email: 'jean.dupont@email.com',
        departure_location: 'Aéroport Charles de Gaulle, Terminal 2E',
        destination_location: '15 Avenue des Champs-Élysées, 75008 Paris',
        pickup_date: course1Time.toISOString(),
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
        driver_id: driver.id,
        client_name: 'Marie Martin',
        client_phone: '+33623456789',
        departure_location: 'Gare du Nord, Paris',
        destination_location: 'Hôtel Ritz, Place Vendôme, Paris',
        pickup_date: course2Time.toISOString(),
        status: 'accepted',
        client_price: 45.00,
        commission: 6.75,
        net_driver: 38.25,
        passengers_count: 1,
        luggage_count: 1,
        vehicle_type: 'Berline',
        notes: 'Client régulier',
        company_name: 'City Transfer',
        accepted_at: now.toISOString(),
      },
      {
        driver_id: driver.id,
        client_name: 'Pierre Dubois',
        client_phone: '+33634567890',
        departure_location: 'Tour Eiffel, Champ de Mars',
        destination_location: 'Gare de Lyon, Paris',
        pickup_date: course3Time.toISOString(),
        status: 'accepted',
        client_price: 35.00,
        commission: 5.25,
        net_driver: 29.75,
        passengers_count: 3,
        luggage_count: 2,
        vehicle_type: 'Van',
        notes: 'Famille avec enfants',
        company_name: 'Paris VTC Premium',
        accepted_at: now.toISOString(),
      },
    ];

    const { data: insertedCourses, error: insertError } = await supabase
      .from('courses')
      .insert(demoCourses)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('Demo courses created:', insertedCourses.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        courses: insertedCourses,
        message: `${insertedCourses.length} courses de démo créées !`
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