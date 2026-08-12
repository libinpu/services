import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_OTP_ATTEMPTS = 5;

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const { bookingId, otp } = await req.json();
    if (!bookingId || !otp) {
      return new Response(JSON.stringify({ error: "bookingId and otp required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, provider_id, status, otp_hash, otp, otp_expires_at, otp_attempts, otp_verified")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.provider_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status !== "arrived") {
      return new Response(JSON.stringify({ error: "Invalid job state for OTP verification" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.otp_verified) {
      return new Response(JSON.stringify({ error: "OTP already used" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((booking.otp_attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "Too many OTP attempts" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.otp_expires_at && new Date(booking.otp_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP expired" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enteredHash = await sha256(String(otp));
    const storedHash = booking.otp_hash;
    const legacyPlain = booking.otp;

    let valid = false;
    if (storedHash) {
      valid = enteredHash === storedHash;
    } else if (legacyPlain && /^\d{4}$/.test(legacyPlain)) {
      valid = String(otp) === legacyPlain;
    }

    if (!valid) {
      await supabase
        .from("bookings")
        .update({
          otp_attempts: (booking.otp_attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      return new Response(JSON.stringify({ error: "Incorrect OTP" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        otp_verified: true,
        status: "in_progress",
        started_at: new Date().toISOString(),
        otp_hash: null,
        otp: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, status: "in_progress" }), {
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
