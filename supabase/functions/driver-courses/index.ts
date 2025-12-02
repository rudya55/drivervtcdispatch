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
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driver) {
      return new Response(JSON.stringify({ error: 'Chauffeur non trouvé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('Fetching courses for driver:', driver.id);

    // Fetch courses based on dispatch mode logic:
    // 1. Courses assigned to this driver (any status except cancelled)
    // 2. Courses in 'dispatched' status with dispatch_mode = 'auto' (visible to all active drivers)
    // 3. Courses in 'dispatched' status with dispatch_mode = 'manual' ONLY if assigned to this driver
    // 4. Courses in 'pending' status (not yet dispatched)
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .or(`driver_id.eq.${driver.id},and(status.eq.dispatched,dispatch_mode.eq.auto),and(status.eq.dispatched,dispatch_mode.eq.manual,driver_id.eq.${driver.id}),status.eq.pending`)
      .neq('status', 'cancelled')
      .order('pickup_date', { ascending: true });

    if (coursesError) {
      console.error('Courses error:', coursesError);
      return new Response(JSON.stringify({ error: coursesError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Sort courses by priority:
    // 1. Accepted/In Progress/Completed courses for this driver (my courses)
    // 2. Auto-dispatched courses (available to all)
    // 3. Manual-dispatched courses assigned to me
    // 4. Pending courses
    const sortedCourses = (courses || []).sort((a, b) => {
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
