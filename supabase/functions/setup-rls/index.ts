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

    console.log('🔧 Setting up RLS policies...');

    // Execute RLS setup SQL
    const setupSQL = `
      -- Enable RLS
      ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE course_tracking ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies
      DROP POLICY IF EXISTS "Drivers can view own profile" ON drivers;
      DROP POLICY IF EXISTS "Drivers can update own profile" ON drivers;
      DROP POLICY IF EXISTS "Drivers can insert own profile" ON drivers;
      DROP POLICY IF EXISTS "Drivers can view own courses" ON courses;
      DROP POLICY IF EXISTS "Drivers can update own courses" ON courses;
      DROP POLICY IF EXISTS "Drivers can view own notifications" ON driver_notifications;
      DROP POLICY IF EXISTS "Drivers can update own notifications" ON driver_notifications;
      DROP POLICY IF EXISTS "Drivers can view own locations" ON driver_locations;
      DROP POLICY IF EXISTS "Drivers can insert own locations" ON driver_locations;
      DROP POLICY IF EXISTS "Drivers can update own locations" ON driver_locations;
      DROP POLICY IF EXISTS "Drivers can view own course tracking" ON course_tracking;
      DROP POLICY IF EXISTS "Drivers can insert own course tracking" ON course_tracking;

      -- Drivers policies
      CREATE POLICY "Drivers can view own profile" ON drivers FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Drivers can update own profile" ON drivers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Drivers can insert own profile" ON drivers FOR INSERT WITH CHECK (auth.uid() = user_id);

      -- Courses policies
      CREATE POLICY "Drivers can view own courses" ON courses FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
      CREATE POLICY "Drivers can update own courses" ON courses FOR UPDATE USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())) WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

      -- Notifications policies
      CREATE POLICY "Drivers can view own notifications" ON driver_notifications FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
      CREATE POLICY "Drivers can update own notifications" ON driver_notifications FOR UPDATE USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())) WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

      -- Locations policies
      CREATE POLICY "Drivers can view own locations" ON driver_locations FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
      CREATE POLICY "Drivers can insert own locations" ON driver_locations FOR INSERT WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
      CREATE POLICY "Drivers can update own locations" ON driver_locations FOR UPDATE USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())) WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

      -- Course tracking policies
      CREATE POLICY "Drivers can view own course tracking" ON course_tracking FOR SELECT USING (course_id IN (SELECT c.id FROM courses c INNER JOIN drivers d ON c.driver_id = d.id WHERE d.user_id = auth.uid()));
      CREATE POLICY "Drivers can insert own course tracking" ON course_tracking FOR INSERT WITH CHECK (course_id IN (SELECT c.id FROM courses c INNER JOIN drivers d ON c.driver_id = d.id WHERE d.user_id = auth.uid()));
    `;

    // Note: Direct SQL execution via service role
    // This bypasses RLS and executes with admin privileges
    const { error } = await supabase.rpc('exec_sql', { sql: setupSQL }).single();

    if (error) {
      console.error('RLS setup error:', error);
      // Try alternative method: execute via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: setupSQL })
      });

      if (!response.ok) {
        throw new Error('Failed to setup RLS policies. Migration file should be used instead.');
      }
    }

    console.log('✅ RLS policies configured successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies configured successfully',
        note: 'All tables now have proper Row Level Security policies'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        note: 'RLS policies should be configured via migration file: supabase/migrations/20241116000000_setup_rls_policies.sql'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
