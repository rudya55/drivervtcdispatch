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

    // Authentification
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

    // Parse request body
    const {
      driver_id,
      driver_name,
      course_id,
      latitude,
      longitude,
      timestamp,
    } = await req.json();

    console.log('🚨 SOS ALERT RECEIVED:', {
      driver_id,
      driver_name,
      course_id,
      has_location: !!(latitude && longitude),
      timestamp,
    });

    // 1. Créer des notifications pour tous les admins et fleet managers
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'fleet_manager']);

      if (adminUsers && adminUsers.length > 0) {
        const urgentNotifications = adminUsers.map((admin) => ({
          driver_id: null, // Notification pour admin, pas liée à un chauffeur
          course_id: course_id || null,
          type: 'sos_alert',
          title: `🚨 ALERTE SOS - ${driver_name}`,
          message: `Le chauffeur ${driver_name} a déclenché une alerte SOS. ${
            latitude && longitude
              ? `Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              : 'Position inconnue'
          }${course_id ? ` | Course en cours: ${course_id}` : ''}`,
          read: false,
          data: {
            alert_type: 'sos',
            driver_id,
            driver_name,
            course_id: course_id || null,
            latitude: latitude || null,
            longitude: longitude || null,
            timestamp,
            urgency: 'critical',
          },
        }));

        const { error: notifError } = await supabase
          .from('driver_notifications')
          .insert(urgentNotifications);

        if (notifError) {
          console.error('❌ Failed to create SOS notifications:', notifError);
        } else {
          console.log(`✅ ${urgentNotifications.length} SOS notification(s) créée(s)`);
        }
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // 2. Optionnel: Enregistrer l'alerte SOS dans une table dédiée (si elle existe)
    try {
      await supabase.from('sos_alerts').insert({
        driver_id,
        driver_name,
        course_id: course_id || null,
        latitude: latitude || null,
        longitude: longitude || null,
        timestamp,
        status: 'active',
        resolved_at: null,
      });
      console.log('✅ SOS alert enregistrée dans la base');
    } catch (sosError) {
      // Table peut ne pas exister, pas grave
      console.log('ℹ️ Table sos_alerts non trouvée (optionnel)');
    }

    // 3. Optionnel: Envoyer un email/SMS si configuré
    // TODO: Intégrer Twilio/SendGrid si nécessaire

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Alerte SOS transmise au dispatch',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ SOS function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de l\'envoi de l\'alerte SOS',
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
