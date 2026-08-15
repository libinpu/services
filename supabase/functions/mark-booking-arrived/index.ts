import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ARRIVAL_RADIUS_M = 5000;
const ACCURACY_THRESHOLD_M = 2000;
const OTP_EXPIRATION_MS = 15 * 60 * 1000;
const ARRIVAL_CONSECUTIVE_READINGS = 0;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLon = r(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(): string {
  const vals = new Uint32Array(1);
  crypto.getRandomValues(vals);
  // Map value to 1000 - 9999
  const otpVal = 1000 + (vals[0] % 9000);
  return otpVal.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId, latitude, longitude, accuracy, consecutiveReadings } = await req.json();
    if (!bookingId || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: "bookingId, latitude, longitude required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (accuracy != null && accuracy > ACCURACY_THRESHOLD_M) {
      return new Response(JSON.stringify({ error: "GPS accuracy too low for arrival" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const readings = Number(consecutiveReadings ?? 0);
    if (readings < ARRIVAL_CONSECUTIVE_READINGS) {
      return new Response(JSON.stringify({ error: "Insufficient consecutive arrival readings", readings }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SERVICE_ROLE_KEY,
      },
    });

    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = await authRes.json();
    const userId = userData.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, provider_id, status, customer_latitude, customer_longitude, otp_hash")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.provider_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "arrived") {
      return new Response(JSON.stringify({ success: true, status: "arrived" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status !== "on_the_way") {
      return new Response(JSON.stringify({ error: "Invalid job state for arrival" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const destLat = booking.customer_latitude;
    const destLng = booking.customer_longitude;

    if (destLat == null || destLng == null) {
      return new Response(JSON.stringify({ error: "Customer location unavailable" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const distanceM = haversineMeters(latitude, longitude, destLat, destLng);
    if (distanceM > ARRIVAL_RADIUS_M) {
      return new Response(JSON.stringify({ error: "Not within arrival radius", distanceM }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp = generateOtp();
    const otpHash = await sha256(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS).toISOString();

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: "arrived",
        arrived_at: new Date().toISOString(),
        otp,
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, status: "arrived", distanceM }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
