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

    console.log('🚗 User ID:', user.id);
    console.log('🚗 Driver found:', driver ? 'Yes' : 'No');
    console.log('🚗 Driver ID:', driver?.id);
    console.log('🚗 Driver status:', driver?.status);
    console.log('🚗 Driver vehicle_types_accepted:', driver?.vehicle_types_accepted);

    if (driverError) {
      console.error('❌ Driver error:', driverError);
      return new Response(JSON.stringify({ error: 'Chauffeur non trouvé', details: driverError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (!driver) {
      return new Response(JSON.stringify({ error: 'Chauffeur non trouvé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const driverId = driver.id;
    // If vehicle_types_accepted is null/undefined/empty, accept ALL vehicle types
    const acceptedTypes = driver.vehicle_types_accepted || [];
    const acceptsAllTypes = !acceptedTypes || acceptedTypes.length === 0;
    
    console.log('🔍 Driver ID:', driverId);
    console.log('🔍 Accepted types:', acceptedTypes);
    console.log('🔍 Accepts all types:', acceptsAllTypes);

    // Fetch ALL courses that are not cancelled - we'll filter in JavaScript for robustness
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .neq('status', 'cancelled')
      .order('pickup_date', { ascending: true });

    if (coursesError) {
      console.error('❌ Courses error:', coursesError);
      return new Response(JSON.stringify({ error: coursesError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`📊 Total courses in database (non-cancelled): ${courses?.length || 0}`);
    
    // Log first few courses for debugging
    if (courses && courses.length > 0) {
      console.log('📋 Sample courses:');
      courses.slice(0, 3).forEach((c, i) => {
        console.log(`  Course ${i+1}: id=${c.id}, status=${c.status}, dispatch_mode=${c.dispatch_mode}, driver_id=${c.driver_id}, vehicle_type=${c.vehicle_type}`);
      });
    }

    // Filter courses based on visibility rules
    const filteredCourses = (courses || []).filter((course) => {
      // Rule 1: Always show courses assigned to this driver
      if (course.driver_id === driverId) {
        console.log(`✅ Course ${course.id}: Assigned to this driver`);
        return true;
      }

      // Rule 2: Show dispatched courses
      if (course.status === 'dispatched') {
        // If course has a specific driver_id assigned and it's NOT me → not visible
        if (course.driver_id && course.driver_id !== driverId) {
          console.log(`❌ Course ${course.id}: Assigned to another driver`);
          return false;
        }
        
        // Course is dispatched without specific driver OR dispatch_mode is auto → visible to all
        // Apply vehicle type filter if driver has preferences
        if (acceptsAllTypes) {
          console.log(`✅ Course ${course.id}: Dispatched, driver accepts all types`);
          return true;
        }
        
        const vehicleMatch = acceptedTypes.includes(course.vehicle_type);
        console.log(`${vehicleMatch ? '✅' : '❌'} Course ${course.id}: Dispatched, vehicle_type=${course.vehicle_type}, match=${vehicleMatch}`);
        return vehicleMatch;
      }

      // Rule 3: Show pending courses (filter by vehicle type if driver has preferences)
      if (course.status === 'pending') {
        if (acceptsAllTypes) {
          console.log(`✅ Course ${course.id}: Pending, driver accepts all types`);
          return true;
        }
        const vehicleMatch = acceptedTypes.includes(course.vehicle_type);
        console.log(`${vehicleMatch ? '✅' : '❌'} Course ${course.id}: Pending, vehicle_type=${course.vehicle_type}, match=${vehicleMatch}`);
        return vehicleMatch;
      }

      // Default: don't show (completed courses not assigned to this driver, etc.)
      console.log(`❌ Course ${course.id}: Not matching any rule (status=${course.status})`);
      return false;
    });

    console.log(`📊 Filtered courses for driver: ${filteredCourses.length}`);

    // Sort courses by priority
    const sortedCourses = filteredCourses.sort((a, b) => {
      // Priority 1: My active courses (accepted, in_progress, started, arrived, picked_up, dropped_off)
      const activeStatuses = ['accepted', 'in_progress', 'started', 'arrived', 'picked_up', 'dropped_off'];
      const aIsMyActive = a.driver_id === driverId && activeStatuses.includes(a.status);
      const bIsMyActive = b.driver_id === driverId && activeStatuses.includes(b.status);
      if (aIsMyActive && !bIsMyActive) return -1;
      if (!aIsMyActive && bIsMyActive) return 1;
      
      // Priority 2: Dispatched courses (new courses to accept)
      if (a.status === 'dispatched' && b.status !== 'dispatched') return -1;
      if (a.status !== 'dispatched' && b.status === 'dispatched') return 1;
      
      // Priority 3: Pending courses
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Default: sort by pickup_date
      return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
    });

    console.log(`✅ Returning ${sortedCourses.length} courses to driver`);

    return new Response(
      JSON.stringify({ 
        success: true,
        courses: sortedCourses,
        debug: {
          driverId,
          acceptedTypes,
          acceptsAllTypes,
          totalCourses: courses?.length || 0,
          filteredCount: filteredCourses.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
