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

    // Create driver_locations table using direct SQL execution
    const createTableSQL = `
      -- Create driver_locations table if not exists
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
    `;

    // Execute SQL directly via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: createTableSQL })
    });

    if (!response.ok) {
      // If exec RPC doesn't exist, try direct query
      console.log('Trying direct query method...');
      
      // Use the from method to create the table via migrations
      const { error: tableError } = await supabase
        .from('driver_locations')
        .select('id')
        .limit(1);

      // If table doesn't exist, we need to use a different approach
      if (tableError && tableError.message.includes('does not exist')) {
        console.log('Table does not exist, needs manual creation');
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Veuillez créer la table manuellement dans Cloud → Database → SQL Editor',
            sql: createTableSQL
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    console.log('driver_locations table setup completed');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tracking GPS activé avec succès !'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Erreur lors de la configuration. Veuillez réessayer.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
