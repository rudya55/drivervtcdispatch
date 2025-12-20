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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get driver record with name
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driver) {
      console.error('Driver not found:', driverError);
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get location data from request
    const { latitude, longitude, heading, speed, accuracy } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert location in driver_locations table
    const { error: locationError } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driver.id,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'driver_id'
      });

    if (locationError) {
      console.error('Error updating location:', locationError);
      return new Response(
        JSON.stringify({ error: 'Failed to update location' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== SYSTÈME D'ALERTE DE RETARD AUTOMATIQUE ==========
    // Vérifier les courses actives et calculer le retard potentiel
    try {
      const { data: activeCourses } = await supabase
        .from('courses')
        .select('id, pickup_date, departure_location, client_name, status')
        .eq('driver_id', driver.id)
        .in('status', ['accepted', 'started']);

      if (activeCourses && activeCourses.length > 0) {
        const now = new Date();
        
        for (const course of activeCourses) {
          const pickupTime = new Date(course.pickup_date);
          const minutesUntilPickup = (pickupTime.getTime() - now.getTime()) / 60000;
          
          // Alerter si:
          // - Course acceptée et moins de 10 min avant le pickup
          // - Course démarrée et en retard (pickup passé depuis moins de 30 min)
          const shouldAlert = 
            (course.status === 'accepted' && minutesUntilPickup <= 10 && minutesUntilPickup > -5) ||
            (course.status === 'started' && minutesUntilPickup <= 5 && minutesUntilPickup > -30);
          
          if (shouldAlert) {
            console.log(`🔴 ALERTE RETARD: Course ${course.id}, ${minutesUntilPickup.toFixed(1)} min avant pickup`);
            
            // Vérifier si une alerte récente existe déjà (éviter spam)
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
            const { data: existingAlert } = await supabase
              .from('driver_notifications')
              .select('id')
              .eq('course_id', course.id)
              .eq('type', 'late_alert')
              .gte('created_at', tenMinutesAgo)
              .limit(1);
            
            if (!existingAlert || existingAlert.length === 0) {
              // Récupérer les admins/dispatchers
              const { data: adminUsers } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('role', ['admin', 'fleet_manager']);
              
              if (adminUsers && adminUsers.length > 0) {
                const isLate = minutesUntilPickup < 0;
                const alertMessage = isLate
                  ? `🔴 RETARD: Le chauffeur ${driver.name} a ${Math.abs(Math.round(minutesUntilPickup))} min de retard pour ${course.client_name}`
                  : `⚠️ ATTENTION: Le chauffeur ${driver.name} doit prendre en charge ${course.client_name} dans ${Math.round(minutesUntilPickup)} min`;
                
                const alertNotifications = adminUsers.map(admin => ({
                  driver_id: null,
                  course_id: course.id,
                  type: 'late_alert',
                  title: isLate ? `🔴 RETARD - ${course.client_name}` : `⚠️ Pickup imminent - ${course.client_name}`,
                  message: alertMessage,
                  read: false,
                  data: {
                    driver_id: driver.id,
                    driver_name: driver.name,
                    latitude,
                    longitude,
                    minutes_until_pickup: Math.round(minutesUntilPickup),
                    is_late: isLate,
                    course_status: course.status,
                    timestamp: now.toISOString(),
                  }
                }));
                
                await supabase
                  .from('driver_notifications')
                  .insert(alertNotifications);
                
                console.log(`✅ Alerte retard envoyée à ${adminUsers.length} admin(s)`);
              }
            } else {
              console.log(`⏭️ Alerte récente existe déjà pour course ${course.id}, skip`);
            }
          }
        }
      }
    } catch (alertError) {
      // Ne pas faire échouer la mise à jour de position si les alertes échouent
      console.error('⚠️ Erreur lors de la vérification des alertes:', alertError);
    }
    // ============================================================

    return new Response(
      JSON.stringify({ success: true, message: 'Location updated' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
