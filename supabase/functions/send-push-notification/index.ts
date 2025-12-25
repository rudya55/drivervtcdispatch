import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  driver_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 send-push-notification function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
    
    // Check if Firebase server key is configured
    if (!firebaseServerKey) {
      console.error('❌ FIREBASE_SERVER_KEY not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Firebase server key not configured',
          hint: 'Add FIREBASE_SERVER_KEY to Supabase secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { driver_id, title, body, data }: PushNotificationRequest = await req.json();
    
    // Validate required parameters
    if (!driver_id || !title || !body) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameters',
          required: ['driver_id', 'title', 'body']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`📤 Sending push notification to driver: ${driver_id}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Body: ${body}`);
    
    // Get driver's FCM token and notification settings
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, fcm_token, notifications_enabled')
      .eq('id', driver_id)
      .maybeSingle();
    
    if (driverError) {
      console.error('❌ Database error:', driverError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database error',
          details: driverError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!driver) {
      console.error('❌ Driver not found:', driver_id);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Driver not found',
          driver_id
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`👤 Driver found: ${driver.name}`);
    
    // Check if notifications are enabled for this driver
    if (driver.notifications_enabled === false) {
      console.log(`⏭️ Notifications disabled for driver: ${driver.name}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'notifications_disabled',
          driver_name: driver.name,
          message: 'Driver has notifications disabled'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if FCM token exists
    if (!driver.fcm_token) {
      console.log(`⚠️ No FCM token for driver: ${driver.name}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'no_fcm_token',
          driver_name: driver.name,
          message: 'Driver has no FCM token registered'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`🔑 FCM token found for ${driver.name}`);
    
    // Build FCM payload
    const fcmPayload = {
      to: driver.fcm_token,
      notification: {
        title,
        body,
        sound: 'default',
        badge: 1,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
    };
    
    console.log('📡 Sending FCM request...');
    
    // Send push notification via FCM Legacy API
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${firebaseServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });
    
    const fcmResult = await fcmResponse.json();
    
    console.log('📨 FCM Response:', JSON.stringify(fcmResult));
    
    // Check for FCM errors
    if (!fcmResponse.ok) {
      console.error('❌ FCM HTTP error:', fcmResponse.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'fcm_http_error',
          status: fcmResponse.status,
          fcm_result: fcmResult 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for delivery failures
    if (fcmResult.failure > 0) {
      const errorCode = fcmResult.results?.[0]?.error;
      console.error('❌ FCM delivery error:', errorCode);
      
      // Handle invalid/expired tokens by clearing them
      if (errorCode === 'NotRegistered' || errorCode === 'InvalidRegistration') {
        console.log('🗑️ Clearing invalid FCM token for driver:', driver.name);
        await supabase
          .from('drivers')
          .update({ fcm_token: null })
          .eq('id', driver_id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: 'invalid_token_cleared',
            driver_name: driver.name,
            message: 'FCM token was invalid and has been cleared'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'fcm_delivery_error',
          error_code: errorCode,
          fcm_result: fcmResult 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Success!
    const messageId = fcmResult.results?.[0]?.message_id;
    console.log(`✅ Push notification sent successfully to ${driver.name}`);
    console.log(`📬 Message ID: ${messageId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        driver_name: driver.name,
        message_id: messageId,
        message: 'Push notification sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
