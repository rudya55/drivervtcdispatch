import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Course {
  id: string;
  status: string;
  dispatch_mode: string | null;
  driver_id: string | null;
  client_name: string;
  departure_location: string;
  destination_location: string;
  pickup_date: string;
  client_price: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { courseId } = await req.json();

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'Course ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing course:', course);

    let targetDrivers: string[] = [];

    // Determine which drivers to notify based on dispatch_mode
    if (course.dispatch_mode === 'auto') {
      // Auto mode: notify all active drivers
      const { data: activeDrivers, error: driversError } = await supabase
        .from('drivers')
        .select('id, fcm_token')
        .eq('status', 'active')
        .not('fcm_token', 'is', null);

      if (driversError) {
        console.error('Error fetching active drivers:', driversError);
      } else {
        targetDrivers = (activeDrivers || []).map(d => d.id);
        console.log(`Auto dispatch: notifying ${targetDrivers.length} active drivers`);
      }
    } else if (course.dispatch_mode === 'manual' && course.driver_id) {
      // Manual mode: notify only assigned driver
      targetDrivers = [course.driver_id];
      console.log(`Manual dispatch: notifying driver ${course.driver_id}`);
    }

    // Create notifications for target drivers
    const notifications = targetDrivers.map(driverId => ({
      driver_id: driverId,
      course_id: course.id,
      type: 'new_course',
      title: '🚗 Nouvelle course disponible',
      message: `${course.departure_location} → ${course.destination_location}\n${course.client_price}€ • ${new Date(course.pickup_date).toLocaleDateString('fr-FR')}`,
      read: false,
      data: {
        course_id: course.id,
        dispatch_mode: course.dispatch_mode,
      }
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('driver_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        return new Response(
          JSON.stringify({ error: 'Failed to create notifications' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created ${notifications.length} notifications`);

      // Send FCM push notifications
      const { data: driversWithTokens } = await supabase
        .from('drivers')
        .select('id, fcm_token, name')
        .in('id', targetDrivers)
        .not('fcm_token', 'is', null);

      if (driversWithTokens && driversWithTokens.length > 0) {
        console.log(`Sending push notifications to ${driversWithTokens.length} drivers`);
        
        // Note: To send actual FCM push notifications, you would need to:
        // 1. Add FIREBASE_SERVER_KEY to secrets
        // 2. Use fetch to call FCM API
        // For now, notifications are created in database and will be picked up by realtime subscriptions
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified_drivers: targetDrivers.length,
        dispatch_mode: course.dispatch_mode 
      }),
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
