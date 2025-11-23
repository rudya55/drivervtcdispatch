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
      .select('id, status, vehicle_types_accepted')
      .eq('user_id', user.id)
      .single();

    console.log('🚗 Driver ID:', driver?.id);
    console.log('🚗 Driver vehicle_types_accepted:', driver?.vehicle_types_accepted);

    if (driverError || !driver) {
      return new Response(JSON.stringify({ error: 'Chauffeur non trouvé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('Fetching courses for driver:', driver.id);
    console.log('Driver accepts vehicle types:', driver.vehicle_types_accepted);

    // Simplified fetch: get all relevant courses without vehicle_type filtering in SQL
    // We'll filter by vehicle_type in JavaScript for more robustness
    
    const driverId = driver.id;
    const acceptedTypes = driver.vehicle_types_accepted || [];
    
    console.log('🔍 Driver ID:', driverId);
    console.log('🔍 Accepted types:', acceptedTypes);
    
    // Simple SQL query: get courses based on driver_id, status, dispatch_mode
    let query = supabase
      .from('courses')
      .select('*')
      .neq('status', 'cancelled')
      .order('pickup_date', { ascending: true })
      .or(
        `driver_id.eq.${driverId},` + // My assigned courses
        `and(status.eq.dispatched,dispatch_mode.eq.auto),` + // Auto-dispatch courses
        `and(status.eq.dispatched,dispatch_mode.eq.manual,driver_id.eq.${driverId}),` + // Manual-dispatch assigned to me
        `status.eq.pending` // Pending courses
      );

    const { data: courses, error: coursesError } = await query;

    if (coursesError) {
      console.error('Courses error:', coursesError);
      return new Response(JSON.stringify({ error: coursesError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`📊 Raw courses fetched: ${courses?.length || 0}`);

    // Filter by vehicle_type in JavaScript (more robust than SQL OR clause)
    const filteredCourses = (courses || []).filter((course) => {
      // Always show all my assigned courses (regardless of vehicle type)
      if (course.driver_id === driverId) {
        console.log(`✅ Keeping assigned course ${course.id} (driver_id match)`);
        return true;
      }

      // If driver accepts all types (empty array), show everything
      if (acceptedTypes.length === 0) {
        console.log(`✅ Keeping course ${course.id} (driver accepts all types)`);
        return true;
      }

      // For auto-dispatch courses, filter by vehicle_type
      if (course.status === 'dispatched' && course.dispatch_mode === 'auto') {
        const match = acceptedTypes.includes(course.vehicle_type);
        console.log(`${match ? '✅' : '❌'} Auto-dispatch course ${course.id}, vehicle_type: ${course.vehicle_type}, accepted: ${match}`);
        return match;
      }

      // For manual-dispatch courses not yet assigned, filter by vehicle_type
      if (course.status === 'dispatched' && course.dispatch_mode === 'manual' && !course.driver_id) {
        const match = acceptedTypes.includes(course.vehicle_type);
        console.log(`${match ? '✅' : '❌'} Manual-dispatch course ${course.id}, vehicle_type: ${course.vehicle_type}, accepted: ${match}`);
        return match;
      }

      // For pending courses, filter by vehicle_type
      if (course.status === 'pending') {
        const match = acceptedTypes.includes(course.vehicle_type);
        console.log(`${match ? '✅' : '❌'} Pending course ${course.id}, vehicle_type: ${course.vehicle_type}, accepted: ${match}`);
        return match;
      }

      // Default: include the course
      console.log(`✅ Keeping course ${course.id} (default)`);
      return true;
    });

    console.log(`📊 Filtered courses: ${filteredCourses.length}`);

    // Sort courses by priority:
    // 1. Accepted/In Progress/Completed courses for this driver (my courses)
    // 2. Auto-dispatched courses (available to all)
    // 3. Manual-dispatched courses assigned to me
    // 4. Pending courses
    const sortedCourses = filteredCourses.sort((a, b) => {
      // My active courses first
      if (a.driver_id === driver.id && ['accepted', 'in_progress', 'completed'].includes(a.status)) {
        return -1;
      }
      if (b.driver_id === driver.id && ['accepted', 'in_progress', 'completed'].includes(b.status)) {
        return 1;
      }
      
      // Then auto-dispatch courses
      if (a.dispatch_mode === 'auto' && a.status === 'dispatched') return -1;
      if (b.dispatch_mode === 'auto' && b.status === 'dispatched') return 1;
      
      // Then manual-dispatch assigned to me
      if (a.dispatch_mode === 'manual' && a.status === 'dispatched' && a.driver_id === driver.id) return -1;
      if (b.dispatch_mode === 'manual' && b.status === 'dispatched' && b.driver_id === driver.id) return 1;
      
      // Then pending
      return 0;
    });

    console.log(`Found ${sortedCourses.length} courses`);

    return new Response(
      JSON.stringify({ 
        success: true,
        courses: sortedCourses
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
