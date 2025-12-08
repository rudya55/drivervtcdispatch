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
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, course_id, message } = body;
    console.log("Driver chat action:", action, "course_id:", course_id, "user:", user.id);

    // Get driver info
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driverError) {
      console.error("Error getting driver:", driverError);
    }

    const driverId = driver?.id;
    console.log("Driver ID:", driverId);

    // ACTION: load - Charger les messages d'une course
    if (action === "load") {
      if (!course_id) {
        return new Response(JSON.stringify({ error: "course_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return new Response(JSON.stringify({ 
          error: error.message, 
          messages: [],
          table_missing: error.message?.includes("does not exist") || error.code === "42P01"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Map to Chat.tsx expected format
      const formattedMessages = (messages || []).map(msg => ({
        id: msg.id,
        sender_role: msg.sender_role === 'driver' ? 'driver' : 'dispatcher',
        message: msg.content,
        created_at: msg.created_at,
        delivered_at: msg.delivered_at,
        read_at: msg.read_by_fleet ? msg.created_at : null, // read_by_fleet = lu par dispatcher
      }));

      console.log("Returning", formattedMessages.length, "messages");
      return new Response(JSON.stringify({ messages: formattedMessages }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: send - Envoyer un message
    if (action === "send") {
      if (!course_id || !message) {
        return new Response(JSON.stringify({ error: "course_id and message required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!driverId) {
        console.error("Driver not found for user:", user.id);
        return new Response(JSON.stringify({ error: "Driver not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newMessage, error } = await supabase
        .from("chat_messages")
        .insert({
          course_id,
          driver_id: driverId,
          sender_role: "driver",
          sender_user_id: user.id,
          content: message,
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

      // Format response for Chat.tsx
      const formattedMessage = {
        id: newMessage.id,
        sender_role: 'driver',
        message: newMessage.content,
        created_at: newMessage.created_at,
        delivered_at: newMessage.delivered_at,
        read_at: null,
      };

      console.log("Message sent:", formattedMessage.id);
      return new Response(JSON.stringify({ message: formattedMessage, success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: mark_read - Marquer les messages du dispatcher comme lus
    if (action === "mark_read") {
      if (!course_id) {
        return new Response(JSON.stringify({ error: "course_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("chat_messages")
        .update({ read_by_driver: true })
        .eq("course_id", course_id)
        .neq("sender_role", "driver")
        .eq("read_by_driver", false);

      if (error) {
        console.error("Error marking as read:", error);
      }

      console.log("Messages marked as read for course:", course_id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("Invalid action:", action);
    return new Response(JSON.stringify({ error: "Invalid action. Use: load, send, mark_read" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Driver chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
