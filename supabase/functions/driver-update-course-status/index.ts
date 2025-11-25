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
      console.error('❌ Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body with better error handling
    let requestBody;
    try {
      requestBody = await req.json();
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

    if (!course_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing course_id or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Get current course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let updateData: any = {};
    let trackingNotes = '';

    // Handle different actions
    switch (action) {
      case 'accept':
        updateData = {
          status: 'accepted',
          driver_id: driver.id,
          accepted_at: now,
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
        // Driver arrived at pickup location
        updateData = {
          arrived_at: now,
        };
        trackingNotes = 'Chauffeur arrivé sur place';
        break;

      case 'pickup':
        // Client is on board
        updateData = {
          picked_up_at: now,
        };
        trackingNotes = 'Client à bord';
        break;

      case 'dropoff':
        // Client dropped off
        updateData = {
          dropped_off_at: now,
        };
        trackingNotes = 'Client déposé';
        break;

      case 'complete':
        // Permettre la terminaison même si les étapes intermédiaires n'ont pas été validées
        // Marquer automatiquement les étapes manquantes
        updateData = {
          status: 'completed',
          completed_at: now,
        };

        // Si les timestamps intermédiaires manquent, les remplir maintenant
        if (!course.arrived_at) {
          updateData.arrived_at = now;
        }
        if (!course.picked_up_at) {
          updateData.picked_up_at = now;
        }
        if (!course.dropped_off_at) {
          updateData.dropped_off_at = now;
        }

        // Add rating and comment if provided
        if (rating !== undefined && rating > 0) {
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
        console.error('Valid actions are: accept, refuse, start, arrived, pickup, dropoff, complete, cancel');
        return new Response(
          JSON.stringify({ 
            error: `Invalid action: "${action}"`,
            validActions: ['accept', 'refuse', 'start', 'arrived', 'pickup', 'dropoff', 'complete', 'cancel']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update course
    const { error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', course_id);

    if (updateError) {
      console.error('Error updating course:', updateError);
      console.error('Update data:', updateData);
      console.error('Course ID:', course_id);

      // Provide more detailed error messages
      let errorMessage = 'Erreur lors de la mise à jour de la course';
      if (updateError.message) {
        errorMessage += `: ${updateError.message}`;
      }
      if (updateError.code === 'PGRST116') {
        errorMessage = 'Course non trouvée ou vous n\'avez pas la permission de la modifier';
      }
      if (updateError.code === '42501') {
        errorMessage = 'Vous n\'avez pas la permission de modifier cette course';
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: updateError.code,
          details: updateError.details
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const notificationData: any = {
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

      await supabase
        .from('driver_notifications')
        .insert(notificationData);
      
      console.log('Tracking notification inserted successfully');
    } catch (notificationError) {
      console.error('Failed to insert tracking notification:', notificationError);
      // Don't fail the request if notification fails
    }

    // Notify admin/dispatch of status changes
    try {
      const { data: adminUsers, error: adminError } = await supabase
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
      console.error('Failed to send admin notifications:', adminNotificationError);
    }

    // Add tracking entry with location if provided (optional, table may not exist yet)
    try {
      const trackingData: any = {
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
      console.log('Tracking insert failed (table may not exist yet):', trackingError);
      // Don't fail the request if tracking fails
    }

    // Si la course est terminée, créer une entrée comptable
    if (action === 'complete') {
      try {
        const netDriver = course.net_driver || course.client_price * 0.8;
        const netFleet = course.client_price - netDriver;

        const { error: accountingError } = await supabase
          .from('accounting_entries')
          .insert({
            course_id,
            driver_id: driver.id,
            driver_amount: netDriver,
            fleet_amount: netFleet,
            total_amount: course.client_price,
            rating: rating || null,
            comment: comment || null,
            payment_status: 'pending',
            created_at: new Date().toISOString(),
          });

        if (accountingError) {
          console.error('Failed to create accounting entry:', accountingError);
        } else {
          console.log('✅ Entrée comptable créée automatiquement');
        }
      } catch (accountingError) {
        console.error('Accounting error:', accountingError);
        // Ne pas faire échouer la requête si la table n'existe pas encore
      }
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Unexpected error in driver-update-course-status:', error);
    console.error('Error details:', {
      name: errorName,
      message: errorMessage,
      stack: errorStack
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
