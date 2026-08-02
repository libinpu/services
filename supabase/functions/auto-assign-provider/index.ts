import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Haversine distance in km between two lat/long points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
      .select("*, subcategory:service_subcategories(*), address:addresses(*)")
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
      .select(`id, full_name, provider_profile:provider_profiles(is_online, rating_avg, jobs_completed, latitude, longitude)`)
      .eq("role", "provider")
      .filter("provider_profile.category_ids", "cs", `{${catId}}`)
      .limit(20);

    if (provErr) {
      return new Response(JSON.stringify({ error: "Failed to find providers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer online providers; fall back to all matched
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

    // Sort by distance to customer address if we have coordinates
    const custLat = booking.address?.latitude;
    const custLon = booking.address?.longitude;

    let assignedProvider = targetProviders[0];
    let bestDistance: number | null = null;

    if (custLat != null && custLon != null) {
      const withDistance = targetProviders.map((p: any) => {
        const pp = p.provider_profile;
        if (pp?.latitude != null && pp?.longitude != null) {
          return { ...p, _dist: haversineKm(custLat, custLon, pp.latitude, pp.longitude) };
        }
        return { ...p, _dist: Infinity };
      });
      withDistance.sort((a: any, b: any) => a._dist - b._dist);
      assignedProvider = withDistance[0];
      bestDistance = withDistance[0]._dist === Infinity ? null : withDistance[0]._dist;
    }

    // Estimate ETA: assume 25 km/h average city speed
    const etaMins = bestDistance != null ? Math.max(5, Math.round((bestDistance / 25) * 60)) : null;

    await supabase
      .from("bookings")
      .update({
        provider_id: assignedProvider.id,
        distance_km: bestDistance,
        estimated_eta_mins: etaMins,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Provider assigned (pending acceptance)",
        providerId: assignedProvider.id,
        distanceKm: bestDistance,
        etaMins: etaMins,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
