import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MATCH_RADIUS_KM = 10;
const ACCURACY_THRESHOLD_M = 80;
const PROVIDER_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = ["assigned", "accepted", "on_the_way", "arrived", "in_progress", "awaiting_confirmation"];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isFresh(lastAt: string | null | undefined): boolean {
  if (!lastAt) return false;
  return Date.now() - new Date(lastAt).getTime() <= PROVIDER_LOCATION_MAX_AGE_MS;
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*, subcategory:service_subcategories(category_id)")
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
      return new Response(JSON.stringify({ success: true, status: "assigned", providerId: booking.provider_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const custLat = booking.customer_latitude;
    const custLng = booking.customer_longitude;
    const catId = booking.subcategory?.category_id;

    if (custLat == null || custLng == null) {
      return new Response(JSON.stringify({ error: "Customer GPS location required" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!catId) {
      return new Response(JSON.stringify({ error: "No category found for booking" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: providers, error: provErr } = await supabase
      .from("profiles")
      .select(`id, provider_profile:provider_profiles(is_online, latitude, longitude, location_accuracy, last_location_at, category_ids)`)
      .eq("role", "provider")
      .filter("provider_profile.category_ids", "cs", `{${catId}}`)
      .limit(100);

    if (provErr) {
      return new Response(JSON.stringify({ error: "Failed to find providers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: activeJobs } = await supabase
      .from("bookings")
      .select("provider_id")
      .in("status", ACTIVE_STATUSES);

    const busyProviders = new Set((activeJobs || []).map((j: { provider_id: string }) => j.provider_id));

    const candidates = (providers || [])
      .map((p: any) => {
        const pp = p.provider_profile;
        if (!pp?.is_online || busyProviders.has(p.id)) return null;
        if (pp.latitude == null || pp.longitude == null) return null;
        if (!isFresh(pp.last_location_at)) return null;
        if (pp.location_accuracy != null && pp.location_accuracy > ACCURACY_THRESHOLD_M) return null;
        const distanceKm = haversineKm(custLat, custLng, pp.latitude, pp.longitude);
        if (distanceKm > MATCH_RADIUS_KM) return null;
        return { id: p.id, distanceKm };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    if (candidates.length === 0) {
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancellation_reason: "No nearby professional available within 10 km",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      return new Response(JSON.stringify({
        success: false,
        message: "No nearby professional available",
        status: "cancelled",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assigned = candidates[0];
    const etaMins = Math.max(5, Math.round((assigned.distanceKm / 25) * 60));

    await supabase
      .from("bookings")
      .update({
        provider_id: assigned.id,
        status: "assigned",
        distance_km: assigned.distanceKm,
        estimated_eta_mins: etaMins,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    return new Response(JSON.stringify({
      success: true,
      status: "assigned",
      providerId: assigned.id,
      distanceKm: assigned.distanceKm,
      etaMins,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
