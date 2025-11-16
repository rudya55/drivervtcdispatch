import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'fleet_manager'])
      .maybeSingle();

    if (roleError || !userRole) {
      console.error('Role check error:', roleError);
      throw new Error('Insufficient permissions - admin or fleet_manager role required');
    }

    // Parse request body
    const { driver_id, approved } = await req.json();

    if (!driver_id || typeof approved !== 'boolean') {
      throw new Error('driver_id and approved (boolean) are required');
    }

    console.log(`Admin ${user.email} ${approved ? 'approving' : 'rejecting'} driver ${driver_id}`);

    // Update driver approval status
    const { data: updatedDriver, error: updateError } = await supabase
      .from('drivers')
      .update({ 
        approved,
        status: approved ? 'active' : 'inactive' // Activate driver when approved
      })
      .eq('id', driver_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update driver: ${updateError.message}`);
    }

    console.log(`Driver ${driver_id} ${approved ? 'approved' : 'rejected'} successfully`);

    // TODO: Send email notification to driver
    // This can be implemented using Resend or another email service
    // Example: await sendApprovalEmail(updatedDriver.email, approved);

    return new Response(
      JSON.stringify({ 
        success: true, 
        driver: updatedDriver,
        message: approved ? 'Driver approved successfully' : 'Driver approval revoked'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in admin-approve-driver:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' || error.message.includes('permissions') ? 403 : 400
      }
    );
  }
});
