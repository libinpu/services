// Supabase Edge Function: send-job-notification
// Triggered via HTTP POST from a Postgres trigger (pg_net) when a new booking is inserted.
// Finds all on-shift providers (no active job) and sends Expo push notifications.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const booking = body.record ?? body;

    if (!booking?.id) {
      return new Response(JSON.stringify({ error: 'No booking record provided' }), { status: 400 });
    }

    // Only notify for pending bookings
    if (booking.status !== 'pending') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a pending booking' }), { status: 200 });
    }

    // Get service subcategory name
    const { data: sub } = await supabase
      .from('service_subcategories')
      .select('name_en')
      .eq('id', booking.subcategory_id)
      .maybeSingle();

    // Get address area
    const { data: address } = await supabase
      .from('addresses')
      .select('area, district')
      .eq('id', booking.address_id)
      .maybeSingle();

    // Find all on-shift providers who don't have an active job
    // "active job" = bookings with status in (accepted, on_the_way, arrived, in_progress, awaiting_confirmation)
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('provider_id')
      .in('status', ['accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation']);

    const busyProviderIds = new Set((activeBookings || []).map((b: any) => b.provider_id).filter(Boolean));

    // Get on-shift providers with push tokens
    const { data: providers } = await supabase
      .from('provider_profiles')
      .select('id, push_token')
      .eq('is_online', true)
      .not('push_token', 'is', null)
      .not('shift_started_at', 'is', null);

    const freeProviders = (providers || []).filter((p: any) => !busyProviderIds.has(p.id));

    if (freeProviders.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No free on-shift providers' }), { status: 200 });
    }

    const serviceName = sub?.name_en ?? 'Service';
    const area = address ? `${address.area || ''}`.trim() : 'Nearby';
    const cost = booking.estimated_cost ? `₹${booking.estimated_cost}` : '';

    // Build Expo push messages
    const messages = freeProviders
      .filter((p: any) => p.push_token?.startsWith('ExponentPushToken'))
      .map((p: any) => ({
        to: p.push_token,
        sound: 'default',
        title: `🔔 New Job: ${serviceName}${cost ? ` · ${cost}` : ''}`,
        body: `${area} · Tap to accept`,
        data: { bookingId: booking.id, screen: 'provider-job' },
        priority: 'high',
        channelId: 'job-alerts',
        badge: 1,
      }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No valid Expo push tokens' }), { status: 200 });
    }

    // Send to Expo Push API (chunked at 100 per request)
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

    return new Response(JSON.stringify({ sent: totalSent, providers: freeProviders.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[send-job-notification] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
