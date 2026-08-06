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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [profilesResult, providerProfilesResult, providerApplicationsResult, bookingsResult, serviceZonesResult, serviceCategoriesResult, serviceSubcategoriesResult, reviewsResult, walletsResult, offersResult, addressesResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("provider_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("provider_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("service_zones").select("*").order("created_at", { ascending: false }),
      supabase.from("service_categories").select("*").order("created_at", { ascending: false }),
      supabase.from("service_subcategories").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("*").order("created_at", { ascending: false }),
      supabase.from("offers").select("*").order("created_at", { ascending: false }),
      supabase.from("addresses").select("*").order("created_at", { ascending: false }),
    ]);

    const errors = [profilesResult, providerProfilesResult, providerApplicationsResult, bookingsResult, serviceZonesResult, serviceCategoriesResult, serviceSubcategoriesResult, reviewsResult, walletsResult, offersResult, addressesResult].filter((result) => result.error);
    if (errors.length > 0) {
      throw errors[0].error;
    }

    return new Response(
      JSON.stringify({
        data: {
          profiles: profilesResult.data || [],
          provider_profiles: providerProfilesResult.data || [],
          provider_applications: providerApplicationsResult.data || [],
          bookings: bookingsResult.data || [],
          service_zones: serviceZonesResult.data || [],
          service_categories: serviceCategoriesResult.data || [],
          service_subcategories: serviceSubcategoriesResult.data || [],
          reviews: reviewsResult.data || [],
          wallets: walletsResult.data || [],
          offers: offersResult.data || [],
          addresses: addressesResult.data || [],
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("admin-dashboard-data failed", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load admin dashboard data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
