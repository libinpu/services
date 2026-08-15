import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACTIVE_STATUSES = ["accepted", "on_the_way", "arrived", "in_progress", "awaiting_confirmation"];

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

    // Verify the user's JWT via Supabase Auth REST API directly.
    // Using service role key as apikey is always accepted regardless of client key format.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SERVICE_ROLE_KEY,
      },
    });

    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userData = await authRes.json();
    const userId: string = userData.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, provider_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (booking.provider_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (booking.status !== "assigned") {
      return new Response(JSON.stringify({ error: "Booking is not awaiting acceptance", currentStatus: booking.status }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure provider does not have another active job
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
<<<<<<< HEAD
      .eq("provider_id", authData.user.id)
      .in("status", ACTIVE_STATUSES)
=======
      .eq("provider_id", userId)
      .in("status", ACTIVE_STATUSES.filter((s) => s !== "assigned"))
>>>>>>> 96bcc6a5e471a8fbbcbca178e8a87dfa8f8bbd84
      .neq("id", bookingId);

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "You already have an active job" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // CORRECT: assigned → accepted (NOT on_the_way; provider navigates separately)
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, status: "accepted" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
