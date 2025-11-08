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

    // Check if app_role enum already exists
    const { data: enumCheck } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'app_role')
      .maybeSingle();

    if (!enumCheck) {
      console.log('Creating app_role enum...');
      // Create enum for user roles
      const { error: enumError } = await supabase.rpc('exec_sql', {
        sql: `create type public.app_role as enum ('driver', 'fleet_manager');`
      });
      
      if (enumError && !enumError.message.includes('already exists')) {
        console.error('Error creating enum:', enumError);
        throw enumError;
      }
    }

    // Check if user_roles table exists
    const { data: tableCheck } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!tableCheck && tableCheck !== null) {
      console.log('Creating user_roles table...');
      const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          create table public.user_roles (
            id uuid primary key default gen_random_uuid(),
            user_id uuid references auth.users(id) on delete cascade not null,
            role text not null,
            created_at timestamptz default now() not null,
            unique (user_id, role)
          );
          
          alter table public.user_roles enable row level security;
        `
      });

      if (tableError && !tableError.message.includes('already exists')) {
        console.error('Error creating table:', tableError);
        throw tableError;
      }
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
