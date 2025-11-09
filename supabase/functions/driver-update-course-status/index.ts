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

    // Parse request body
    const { course_id, action, latitude, longitude, rating, comment, final_price } = await req.json();

    if (!course_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing course_id or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get driver record
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
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
        updateData = {
          status: 'completed',
          completed_at: now,
        };
        
        // Add rating and comment if provided
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
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
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
      return new Response(
        JSON.stringify({ error: 'Failed to update course' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Course updated successfully',
        action,
        course_id 
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
