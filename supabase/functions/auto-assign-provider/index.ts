import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*, subcategory:service_subcategories(*)")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status !== "pending") {
      return new Response(JSON.stringify({ message: "Booking already processed", status: booking.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.provider_id) {
      await supabase
        .from("bookings")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", bookingId);
      return new Response(JSON.stringify({ success: true, message: "Provider accepted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const catId = booking.subcategory?.category_id;
    if (!catId) {
      return new Response(JSON.stringify({ error: "No category found for booking" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: providers, error: provErr } = await supabase
      .from("profiles")
      .select(`id, full_name, provider_profile:provider_profiles(is_online, rating_avg, jobs_completed)`)
      .eq("role", "provider")
      .filter("provider_profile.category_ids", "cs", `{${catId}}`)
      .limit(5);

    if (provErr) {
      return new Response(JSON.stringify({ error: "Failed to find providers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const onlineProviders = (providers || []).filter((p: any) => p.provider_profile?.is_online);
    const targetProviders = onlineProviders.length > 0 ? onlineProviders : (providers || []);

    if (targetProviders.length === 0) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "provider")
        .limit(1);

      if (fallback && fallback.length > 0) {
        await supabase
          .from("bookings")
          .update({ provider_id: fallback[0].id, updated_at: new Date().toISOString() })
          .eq("id", bookingId);

        return new Response(JSON.stringify({ success: true, message: "Assigned to provider (pending acceptance)" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "No providers available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assignedProvider = targetProviders[0];
    await supabase
      .from("bookings")
      .update({ provider_id: assignedProvider.id, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({ success: true, message: "Provider assigned (pending acceptance)", providerId: assignedProvider.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
