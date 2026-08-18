import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const booking = body.record ?? body;

    if (!booking?.id || !booking.customer_latitude || !booking.customer_longitude) {
      return new Response(JSON.stringify({ error: 'Invalid booking or missing customer GPS' }), { status: 400 });
    }

    if (booking.status !== 'pending') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a pending booking' }), { status: 200 });
    }

    // 1. Get service category details
    const { data: sub } = await supabase
      .from('service_subcategories')
      .select('name_en, category_id')
      .eq('id', booking.subcategory_id)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ error: 'Service category not found' }), { status: 400 });
    }

    // 2. Find all active bookings to exclude busy providers
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('provider_id')
      .in('status', ['assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation']);

    const busyProviderIds = new Set((activeBookings || []).map((b: any) => b.provider_id).filter(Boolean));

    // 3. Use DB RPC to find nearby eligible providers (enforces online/verified/availability/distance)
    const { data: nearby, error: nearbyErr } = await supabase.rpc('find_nearby_providers', {
      p_subcategory_id: booking.subcategory_id,
      p_customer_latitude: booking.customer_latitude,
      p_customer_longitude: booking.customer_longitude,
      p_limit: 200,
    });

    if (nearbyErr) {
      console.error('[send-job-notification] nearby RPC failed', nearbyErr);
      return new Response(JSON.stringify({ sent: 0, reason: 'Nearby providers lookup failed' }), { status: 500 });
    }

    // nearby already contains distance_km and filtered providers; exclude busy ones defensively
    const nearbyProviders = (nearby || []).filter((p: any) => !busyProviderIds.has(p.provider_id));

    if (nearbyProviders.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No eligible nearby providers found' }), { status: 200 });
    }

    // 5. Insert requests into booking_provider_requests
    const requestInserts = nearbyProviders.map((p: any) => ({
      booking_id: booking.id,
      provider_id: p.provider_id,
      distance_km: Number(p.distance_km),
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('booking_provider_requests')
      .insert(requestInserts);

    if (insertError) {
      console.error('[send-job-notification] Failed to insert requests', insertError);
      // Proceed anyway if it's a unique constraint error on retry, but log it
    }

    // 6. Get push tokens securely from provider_devices
    const providerIdsToNotify = nearbyProviders.map((p: any) => p.provider_id);
    const { data: devices } = await supabase
      .from('provider_devices')
      .select('provider_id, push_token')
      .in('provider_id', providerIdsToNotify);

    const tokens = (devices || []).filter(d => d.push_token?.startsWith('ExponentPushToken'));

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No valid push tokens among eligible providers' }), { status: 200 });
    }

    const serviceName = sub.name_en ?? 'Service';
    const cost = booking.estimated_cost ? `₹${booking.estimated_cost}` : '';

    // 7. Send push notifications
    const messages = tokens.map(d => ({
      to: d.push_token,
      sound: 'default',
      title: `🔔 New Request: ${serviceName}${cost ? ` · ${cost}` : ''}`,
      body: `Tap to accept this nearby job`,
      data: { bookingId: booking.id, screen: 'provider-job' },
      priority: 'high',
      channelId: 'job-alerts',
      badge: 1,
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (res.ok) totalSent += chunk.length;
    }

    return new Response(JSON.stringify({ sent: totalSent, matchedProviders: nearbyProviders.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[send-job-notification] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
