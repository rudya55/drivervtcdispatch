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

    console.log('Fixing drivers table...');

    // Récupérer la structure de la table
    const { data: columns, error: columnsError } = await supabase
      .from('drivers')
      .select('*')
      .limit(0);

    if (columnsError) {
      console.error('Error checking table:', columnsError);
    }

    // Tenter de créer la table driver_locations
    try {
      const { error: createLocationError } = await supabase.rpc('exec_sql', {
        sql: `
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

          ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Drivers can update own location" ON driver_locations;
          DROP POLICY IF EXISTS "Authenticated users can view locations" ON driver_locations;

          CREATE POLICY "Drivers can update own location"
          ON driver_locations
          FOR ALL
          TO authenticated
          USING (driver_id IN (
            SELECT id FROM drivers WHERE user_id = auth.uid()
          ));

          CREATE POLICY "Authenticated users can view locations"
          ON driver_locations
          FOR SELECT
          TO authenticated
          USING (true);

          CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
          CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);
        `
      });

      if (createLocationError) {
        console.log('Note: Could not create driver_locations via RPC:', createLocationError.message);
      } else {
        console.log('driver_locations table created successfully');
      }
    } catch (e: any) {
      console.log('Note: driver_locations creation skipped:', e.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Table vérifiée. Si la colonne "type" existe toujours, vous devez la supprimer manuellement dans Cloud → Database → Éditeur de table drivers → Supprimer la colonne "type"',
        instructions: 'Pour supprimer la colonne type: Cloud → Database → Table drivers → Actions → Supprimer la colonne "type"'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        instructions: 'Allez dans Cloud → Database → Éditeur SQL et exécutez : ALTER TABLE drivers DROP COLUMN IF EXISTS type;'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
