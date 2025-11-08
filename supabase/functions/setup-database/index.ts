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

    console.log('Starting database setup...');

    // Add missing columns to drivers table
    console.log('Adding missing columns to drivers table...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE drivers 
          ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
          ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
          ADD COLUMN IF NOT EXISTS vehicle_year TEXT,
          ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
          ADD COLUMN IF NOT EXISTS license_number TEXT,
          ADD COLUMN IF NOT EXISTS iban TEXT,
          ADD COLUMN IF NOT EXISTS bic TEXT,
          ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
          ADD COLUMN IF NOT EXISTS company_name TEXT,
          ADD COLUMN IF NOT EXISTS company_address TEXT,
          ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
          ADD COLUMN IF NOT EXISTS siret TEXT,
          ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS notification_sound TEXT,
          ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);
        
        ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_type_check;
        ALTER TABLE drivers DROP COLUMN IF EXISTS type;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.error('Error altering drivers table:', alterError);
    }

    // Create storage bucket for driver documents
    console.log('Creating storage bucket...');
    const { error: bucketError } = await supabase
      .from('storage.buckets')
      .insert({ id: 'driver-documents', name: 'driver-documents', public: true })
      .select()
      .maybeSingle();

    if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('duplicate')) {
      console.log('Bucket might already exist or error:', bucketError);
    }

    // Create RLS policies for storage
    console.log('Creating storage policies...');
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Drivers can upload their own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Drivers can view their own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Drivers can update their own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Drivers can delete their own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Public can view documents in public bucket" ON storage.objects;

        CREATE POLICY "Drivers can upload their own documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'driver-documents' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );

        CREATE POLICY "Drivers can view their own documents"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
          bucket_id = 'driver-documents' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );

        CREATE POLICY "Drivers can update their own documents"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'driver-documents' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );

        CREATE POLICY "Drivers can delete their own documents"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'driver-documents' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );

        CREATE POLICY "Public can view documents in public bucket"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'driver-documents');
      `
    });

    if (policyError && !policyError.message.includes('already exists')) {
      console.log('Storage policies info:', policyError);
    }

    console.log('Database setup completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Base de données configurée avec succès !' 
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
        error: error.message,
        details: 'Erreur lors de la configuration de la base de données'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
