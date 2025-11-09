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

    const { course_id, action } = await req.json();

    if (!course_id || !action) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get driver
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driver) {
      return new Response(JSON.stringify({ error: 'Chauffeur non trouvé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const now = new Date().toISOString();
    let updateData: any = {};
    let newStatus: string = '';

    switch (action) {
      case 'accept':
        updateData = {
          status: 'accepted',
          driver_id: driver.id,
          accepted_at: now
        };
        newStatus = 'accepted';
        break;

      case 'refuse':
        updateData = {
          status: 'pending',
          driver_id: null,
          accepted_at: null
        };
        newStatus = 'pending';
        break;

      case 'start':
        // Vérifier que la course peut être démarrée (1h avant pickup_date)
        const { data: course } = await supabase
          .from('courses')
          .select('pickup_date, driver_id')
          .eq('id', course_id)
          .single();

        if (!course || course.driver_id !== driver.id) {
          return new Response(JSON.stringify({ error: 'Course non trouvée ou non autorisée' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          });
        }

        const pickup = new Date(course.pickup_date);
        const unlockTime = new Date(pickup.getTime() - 60 * 60000);
        const currentTime = new Date();

        if (currentTime < unlockTime) {
          return new Response(JSON.stringify({ 
            error: 'La course ne peut pas encore être démarrée',
            unlock_time: unlockTime.toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        updateData = {
          status: 'in_progress',
          started_at: now
        };
        newStatus = 'in_progress';
        break;

      case 'complete':
        updateData = {
          status: 'completed',
          completed_at: now
        };
        newStatus = 'completed';
        break;

      default:
        return new Response(JSON.stringify({ error: 'Action non valide' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    // Update course
    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', course_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Course ${course_id} updated to ${newStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        course: updatedCourse
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
