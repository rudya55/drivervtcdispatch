import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('🚀 driver-update-course-status called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body with better error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('📦 Raw body received:', bodyText);
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { course_id, action, latitude, longitude, rating, comment, final_price } = requestBody;
    console.log(`📍 Action received: "${action}" for course ${course_id}`, {
      course_id,
      action,
      hasLocation: !!(latitude && longitude),
      rating,
      comment,
      final_price
    });

    if (!course_id) {
      console.error('❌ Missing course_id');
      return new Response(
        JSON.stringify({ error: 'Missing course_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action) {
      console.error('❌ Missing action');
      return new Response(
        JSON.stringify({ error: 'Missing action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get driver record with name
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (driverError) {
      console.error('❌ Driver query error:', driverError);
      return new Response(
        JSON.stringify({ error: 'Driver lookup failed', details: driverError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!driver) {
      console.error('❌ Driver not found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Driver found:', driver.id, driver.name);

    // Get current course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .maybeSingle();

    if (courseError) {
      console.error('❌ Course query error:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course lookup failed', details: courseError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!course) {
      console.error('❌ Course not found:', course_id);
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Course found:', course.id, 'status:', course.status);

    const now = new Date().toISOString();
    let updateData: Record<string, unknown> = {};
    let trackingNotes = '';

    // Handle different actions
    switch (action) {
      case 'accept':
        updateData = {
          status: 'accepted',
          driver_id: driver.id,
          accepted_at: now,
          // RESET tous les timestamps de progression pour commencer à l'étape 1
          started_at: null,
          arrived_at: null,
          picked_up_at: null,
          dropped_off_at: null,
          completed_at: null,
        };
        trackingNotes = 'Course acceptée par le chauffeur';
        break;

      case 'refuse':
        updateData = {
          status: 'pending',
          driver_id: null,
        };
        trackingNotes = 'Course refusée par le chauffeur';
        break;

      case 'start':
        // Validate timing (within 1 hour before pickup)
        const pickupTime = new Date(course.pickup_date).getTime();
        const currentTime = new Date().getTime();
        const oneHourBefore = pickupTime - 60 * 60 * 1000;

        if (currentTime < oneHourBefore) {
          console.log('⏰ Course locked - too early to start');
          return new Response(
            JSON.stringify({ 
              error: 'Vous ne pouvez démarrer la course qu\'une heure avant l\'heure de prise en charge' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updateData = {
          status: 'in_progress',
          started_at: now,
        };
        trackingNotes = 'Chauffeur en route vers le point de départ';
        break;

      case 'arrived':
        updateData = {
          arrived_at: now,
        };
        trackingNotes = 'Chauffeur arrivé sur place';
        break;

      case 'pickup':
        updateData = {
          picked_up_at: now,
        };
        trackingNotes = 'Client à bord';
        break;

      case 'dropoff':
        updateData = {
          dropped_off_at: now,
        };
        trackingNotes = 'Client déposé';
        break;

      case 'complete':
        updateData = {
          status: 'completed',
          completed_at: now,
        };
        
        if (rating !== undefined) {
          updateData.rating = rating;
        }
        if (comment) {
          updateData.notes = (course.notes ? course.notes + '\n\n' : '') + 
                            `Commentaire chauffeur: ${comment}`;
        }
        if (final_price !== undefined) {
          updateData.client_price = final_price;
        }
        
        trackingNotes = 'Course terminée';
        if (rating) trackingNotes += ` - Note: ${rating}/5`;
        break;

      case 'cancel':
        updateData = {
          status: 'cancelled',
        };
        trackingNotes = 'Course annulée';
        break;

      default:
        console.error(`❌ Invalid action received: "${action}"`);
        return new Response(
          JSON.stringify({ 
            error: `Invalid action: "${action}"`,
            validActions: ['accept', 'refuse', 'start', 'arrived', 'pickup', 'dropoff', 'complete', 'cancel']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('📝 Updating course with:', updateData);

    // Update course
    const { error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', course_id);

    if (updateError) {
      console.error('❌ Error updating course:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update course', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Course updated successfully');

    // Map action to status for tracking
    const statusMapping: Record<string, string> = {
      'accept': 'accepted',
      'refuse': 'refused',
      'start': 'in_progress',
      'arrived': 'arrived',
      'pickup': 'picked_up',
      'dropoff': 'dropped_off',
      'complete': 'completed',
      'cancel': 'cancelled',
    };

    const titleMapping: Record<string, string> = {
      'accept': 'Course acceptée',
      'refuse': 'Course refusée',
      'start': 'Course démarrée',
      'arrived': 'Arrivée sur place',
      'pickup': 'Client à bord',
      'dropoff': 'Client déposé',
      'complete': 'Course terminée',
      'cancel': 'Course annulée',
    };

    // Insert tracking notification into driver_notifications
    try {
      const notificationData = {
        driver_id: driver.id,
        course_id,
        type: 'course_status',
        title: titleMapping[action] || 'Mise à jour de course',
        message: trackingNotes,
        read: false,
        data: {
          action,
          status: statusMapping[action] || course.status,
          latitude: latitude || null,
          longitude: longitude || null,
          rating: rating || null,
          comment: comment || null,
        },
      };

      const { error: notifError } = await supabase
        .from('driver_notifications')
        .insert(notificationData);
      
      if (notifError) {
        console.log('⚠️ Notification insert warning:', notifError.message);
      } else {
        console.log('✅ Tracking notification inserted');
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to insert tracking notification:', notificationError);
    }

    // Notify admin/dispatch of status changes
    try {
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'fleet_manager']);

      if (adminUsers && adminUsers.length > 0) {
        const adminNotifications = adminUsers.map(admin => ({
          driver_id: null,
          course_id,
          type: 'admin_course_update',
          title: `${course.client_name} - ${titleMapping[action]}`,
          message: `Le chauffeur a ${trackingNotes.toLowerCase()}`,
          read: false,
          data: {
            action,
            status: statusMapping[action] || course.status,
            driver_id: driver.id,
            driver_name: driver.name,
            course_id,
            client_name: course.client_name,
            latitude: latitude || null,
            longitude: longitude || null,
            timestamp: new Date().toISOString(),
          },
        }));

        await supabase
          .from('driver_notifications')
          .insert(adminNotifications);
        
        console.log(`✅ ${adminNotifications.length} notification(s) envoyée(s) au dispatch`);
      }
    } catch (adminNotificationError) {
      console.error('⚠️ Failed to send admin notifications:', adminNotificationError);
    }

    // Add tracking entry with location if provided
    try {
      const trackingData: Record<string, unknown> = {
        course_id,
        status: updateData.status || course.status,
        notes: trackingNotes,
      };

      if (latitude && longitude) {
        trackingData.latitude = latitude;
        trackingData.longitude = longitude;
      }

      await supabase
        .from('course_tracking')
        .insert(trackingData);
    } catch (trackingError) {
      console.log('⚠️ Tracking insert skipped (table may not exist)');
    }

    // Si la course est terminée, créer une entrée comptable
    if (action === 'complete') {
      try {
        console.log('💰 Création de l\'entrée comptable...');
        
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) {
          console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
        } else {
          const supabaseServiceRole = createClient(supabaseUrl, serviceRoleKey);

          const clientPrice = course.client_price || 0;
          const netDriver = course.net_driver || clientPrice * 0.8;
          const netFleet = clientPrice - netDriver;

          console.log('💰 Données comptables:', {
            course_id,
            driver_id: driver.id,
            driver_amount: netDriver,
            fleet_amount: netFleet,
            total_amount: clientPrice,
          });

          const { data: accountingData, error: accountingError } = await supabaseServiceRole
            .from('accounting_entries')
            .insert({
              course_id,
              driver_id: driver.id,
              driver_amount: netDriver,
              fleet_amount: netFleet,
              total_amount: clientPrice,
              rating: rating || null,
              comment: comment || null,
              payment_status: 'pending',
              created_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();

          if (accountingError) {
            console.error('⚠️ Erreur création entrée comptable:', accountingError.message);
          } else if (accountingData) {
            console.log('✅ Entrée comptable créée:', accountingData.id);
          }
        }
      } catch (accountingError) {
        console.error('⚠️ Exception comptabilité:', accountingError);
      }
    }

    console.log('🎉 Action completed successfully:', action);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Course updated successfully',
        action,
        course_id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Unexpected error in driver-update-course-status:');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    
    let errorMessage = 'Internal server error';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.name;
      errorDetails = error.message;
      console.error('Stack:', error.stack);
    } else if (typeof error === 'string') {
      errorDetails = error;
    } else if (error && typeof error === 'object') {
      errorDetails = JSON.stringify(error);
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
