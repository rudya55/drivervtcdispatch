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

    console.log('Setting up driver_locations table...');

    // Create driver_locations table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create driver_locations table
        CREATE TABLE IF NOT EXISTS driver_locations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL UNIQUE,
          latitude double precision NOT NULL,
          longitude double precision NOT NULL,
          heading double precision,
          speed double precision,
          updated_at timestamptz DEFAULT now() NOT NULL,
          created_at timestamptz DEFAULT now() NOT NULL
        );

        -- Enable RLS
        ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Drivers can update own location" ON driver_locations;
        DROP POLICY IF EXISTS "Authenticated users can view locations" ON driver_locations;

        -- Policy: Drivers can update their own location
        CREATE POLICY "Drivers can update own location"
        ON driver_locations
        FOR ALL
        TO authenticated
        USING (driver_id IN (
          SELECT id FROM drivers WHERE user_id = auth.uid()
        ));

        -- Policy: Anyone authenticated can view driver locations
        CREATE POLICY "Authenticated users can view locations"
        ON driver_locations
        FOR SELECT
        TO authenticated
        USING (true);

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
        CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);
      `
    });

    if (createError) {
      console.error('Table creation error:', createError);
      throw createError;
    }

    console.log('driver_locations table created successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tracking GPS activé avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
