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
    const body = await req.json();
    const { userId, isVerified, status } = body || {};

    if (!userId || typeof isVerified !== "boolean" || !status) {
      return new Response(
        JSON.stringify({ error: "userId, isVerified, and status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const targetRole = isVerified ? "provider" : "customer";
    const now = new Date().toISOString();

    const providerResult = await supabase
      .from("provider_profiles")
      .update({ is_verified: isVerified, background_check_status: status, updated_at: now })
      .eq("id", userId);

    if (providerResult.error) throw providerResult.error;

    const applicationResult = await supabase
      .from("provider_applications")
      .update({ status, reviewed_at: now })
      .eq("user_id", userId);

    if (applicationResult.error) throw applicationResult.error;

    const profileResult = await supabase
      .from("profiles")
      .update({ role: targetRole, updated_at: now })
      .eq("id", userId);

    if (profileResult.error) throw profileResult.error;

    return new Response(
      JSON.stringify({ success: true, role: targetRole, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("admin-provider-status failed", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to update provider status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
