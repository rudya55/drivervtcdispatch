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

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60000);
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000);

    // Chercher les courses acceptées qui peuvent être démarrées
    const { data: unlockedCourses, error: unlockedError } = await supabase
      .from('courses')
      .select('id, driver_id, client_name, pickup_date, departure_location')
      .eq('status', 'accepted')
      .lte('pickup_date', oneHourFromNow.toISOString())
      .gt('pickup_date', now.toISOString());

    if (unlockedError) {
      console.error('Error fetching unlocked courses:', unlockedError);
    }

    if (unlockedCourses && unlockedCourses.length > 0) {
      console.log(`Found ${unlockedCourses.length} courses ready to start`);

      for (const course of unlockedCourses) {
        const unlockTime = new Date(new Date(course.pickup_date).getTime() - 60 * 60000);
        
        // Vérifier si notification de déblocage déjà envoyée
        const { data: existingNotif } = await supabase
          .from('driver_notifications')
          .select('id')
          .eq('course_id', course.id)
          .eq('type', 'course_unlocked')
          .maybeSingle();

        if (!existingNotif && now >= unlockTime) {
          // Envoyer notification de déblocage
          await supabase
            .from('driver_notifications')
            .insert({
              driver_id: course.driver_id,
              course_id: course.id,
              type: 'course_unlocked',
              title: 'Course débloquée',
              message: `Vous pouvez maintenant démarrer la course pour ${course.client_name}`,
              read: false,
              data: { course_id: course.id }
            });
          
          console.log(`Unlock notification sent for course ${course.id}`);
        }
      }
    }

    // Chercher les courses débloquées depuis plus de 15 min et pas encore démarrées
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60000);
    const { data: lateCourses, error: lateError } = await supabase
      .from('courses')
      .select('id, driver_id, client_name, pickup_date')
      .eq('status', 'accepted')
      .lte('pickup_date', now.toISOString())
      .gt('pickup_date', fifteenMinutesAgo.toISOString());

    if (lateError) {
      console.error('Error fetching late courses:', lateError);
    }

    if (lateCourses && lateCourses.length > 0) {
      console.log(`Found ${lateCourses.length} late courses`);

      for (const course of lateCourses) {
        const unlockTime = new Date(new Date(course.pickup_date).getTime() - 60 * 60000);
        const minutesLate = Math.floor((now.getTime() - unlockTime.getTime()) / 60000);

        if (minutesLate >= 15) {
          // Vérifier dernière notification de rappel
          const { data: lastReminder } = await supabase
            .from('driver_notifications')
            .select('created_at')
            .eq('course_id', course.id)
            .eq('type', 'course_reminder')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const shouldSendReminder = !lastReminder || 
            (now.getTime() - new Date(lastReminder.created_at).getTime()) > 5 * 60000; // 5 min entre rappels

          if (shouldSendReminder) {
            await supabase
              .from('driver_notifications')
              .insert({
                driver_id: course.driver_id,
                course_id: course.id,
                type: 'course_reminder',
                title: '⚠️ Course non démarrée',
                message: `La course pour ${course.client_name} devrait être démarrée !`,
                read: false,
                data: { course_id: course.id, minutes_late: minutesLate }
              });
            
            console.log(`Reminder sent for course ${course.id} (${minutesLate} min late)`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        unlocked: unlockedCourses?.length || 0,
        late: lateCourses?.length || 0
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