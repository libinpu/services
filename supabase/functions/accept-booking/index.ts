import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACTIVE_STATUSES = ["assigned", "accepted", "on_the_way", "arrived", "in_progress", "awaiting_confirmation"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, provider_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (booking.provider_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (booking.status !== "assigned") {
      return new Response(JSON.stringify({ error: "Booking is not awaiting acceptance" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", authData.user.id)
      .in("status", ACTIVE_STATUSES.filter((s) => s !== "assigned"))
      .neq("id", bookingId);

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "You already have an active job" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "on_the_way", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, status: "on_the_way" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
