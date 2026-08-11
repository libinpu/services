import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

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

    // Fetch bookings with customer and provider profiles plus subcategory name
    const [profilesResult, providerProfilesResult, providerApplicationsResult, bookingsResult, serviceZonesResult, serviceCategoriesResult, serviceSubcategoriesResult, reviewsResult, walletsResult, offersResult, addressesResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("provider_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("provider_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select(`
        *,
        customer:profiles!bookings_customer_id_fkey(full_name),
        provider:profiles!bookings_provider_id_fkey(full_name),
        subcategory:service_subcategories(name_en)
      `).order("created_at", { ascending: false }),
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

    // Map bookings to flatten joined fields for backward compatibility with html panel
    const formattedBookings = (bookingsResult.data || []).map((b: any) => ({
      ...b,
      customer_name: b.customer?.full_name || "Customer",
      provider_name: b.provider?.full_name || "Unassigned",
      service_name: b.subcategory?.name_en || "General Service"
    }));

    return new Response(
      JSON.stringify({
        data: {
          profiles: profilesResult.data || [],
          provider_profiles: providerProfilesResult.data || [],
          provider_applications: providerApplicationsResult.data || [],
          bookings: formattedBookings,
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
