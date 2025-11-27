import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, course_id, driver_id, content } = await req.json();
    console.log("Chat action:", action, "course_id:", course_id);

    if (action === "get_messages") {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        // Return empty array with error info
        return new Response(JSON.stringify({ 
          error: error.message, 
          messages: [],
          table_missing: error.message?.includes("does not exist") || error.code === "42P01"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ messages: messages || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_message") {
      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const actualDriverId = driver?.id || driver_id;
      
      if (!actualDriverId) {
        return new Response(JSON.stringify({ error: "Driver not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          course_id,
          driver_id: actualDriverId,
          sender_role: "driver",
          sender_user_id: user.id,
          content,
          read_by_driver: true,
          read_by_fleet: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        return new Response(JSON.stringify({ 
          error: error.message,
          table_missing: error.message?.includes("does not exist") || error.code === "42P01"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message, success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_read") {
      const { error } = await supabase
        .from("messages")
        .update({ read_by_driver: true })
        .eq("course_id", course_id)
        .eq("read_by_driver", false);

      if (error) {
        console.error("Error marking as read:", error);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Chat messages error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
