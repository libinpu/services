import { supabase } from './supabase';
import { trackingLog } from './tracking-logger';
import type { DeviceLocation } from './location-service';

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wrozyadpfcktedltxhox.supabase.co'}/functions/v1/${name}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`);
  }
  return json as T;
}

/** Backend assigns nearest eligible provider within 10 km. */
export async function assignNearestProvider(bookingId: string) {
  trackingLog('JOB_STATE_CHANGE', 'Requesting nearest provider assignment', { bookingId });
  const { data, error } = await supabase.rpc('auto_assign_provider', { p_booking_id: bookingId });
  if (error) throw error;
  return data as { success: boolean; status: string; providerId?: string; message?: string };
}

/** Provider accepts an assigned job → accepted state. */
export async function acceptBooking(bookingId: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider accepting booking (via RPC)', { bookingId });
  const { data, error } = await supabase.rpc('accept_booking', { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; status: string };
}

/** Provider starts navigation → transitions accepted → on_the_way. */
export async function startNavigation(bookingId: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider starting navigation (via RPC)', { bookingId });
  const { data, error } = await supabase.rpc('start_navigation', { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; status: string };
}

/** Provider rejects an assigned job; auto mode may reassign. */
export async function rejectBooking(bookingId: string, reason?: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider rejecting booking (via RPC)', { bookingId });
  const { data, error } = await supabase.rpc('reject_booking', { p_booking_id: bookingId, p_reason: reason || 'Provider rejected the job' });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  // If auto-mode, the client needs to re-trigger auto-assign-provider
  // since RPCs cannot do HTTP fetches easily
  try {
    const { data: booking } = await supabase.from('bookings').select('booking_mode').eq('id', bookingId).single();
    if (booking?.booking_mode === 'auto') {
      await assignNearestProvider(bookingId);
    }
  } catch (e) {
    trackingLog('ERROR', 'Failed to trigger auto-reassign after reject', { error: String(e) });
  }

  return data as { success: boolean; status: string };
}

/** Backend validates proximity and transitions on_the_way → arrived; OTP generated server-side. */
export async function markBookingArrived(
  bookingId: string,
  location: Pick<DeviceLocation, 'latitude' | 'longitude' | 'accuracy'>,
  consecutiveReadings: number,
): Promise<{ success: boolean; status: string }> {
  trackingLog('ARRIVAL_DETECTED', 'Requesting backend arrival confirmation', { bookingId });
  const { data, error } = await supabase.rpc('mark_booking_arrived', {
    p_booking_id: bookingId,
    p_latitude: location.latitude,
    p_longitude: location.longitude,
    p_accuracy: location.accuracy,
    p_consecutive_readings: consecutiveReadings,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; status: string };
}

/** Backend verifies OTP — never trust client-side comparison. */
export async function verifyBookingOtp(
  bookingId: string,
  otp: string,
): Promise<{ success: boolean; status: string }> {
  trackingLog('OTP_VERIFICATION', 'Submitting OTP for backend verification', { bookingId });
  const { data, error } = await supabase.rpc('verify_booking_otp', { p_booking_id: bookingId, p_otp: otp });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; status: string };
}

/** Provider starts navigation: accepted → on_the_way. */
export async function startNavigation(bookingId: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider starting navigation to customer', { bookingId });
  return invokeFunction<{ success: boolean; status: string }>('start-navigation', { bookingId });
}

/** Provider starts job after OTP verified + selfie: arrived → in_progress. */
export async function startJob(bookingId: string, startSelfieUrl?: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider starting job (post-OTP)', { bookingId });
  return invokeFunction<{ success: boolean; status: string }>('start-job', { bookingId, startSelfieUrl });
}

/** Provider completes job + end selfie: in_progress → awaiting_confirmation. */
export async function completeJob(bookingId: string, endSelfieUrl?: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider completing job', { bookingId });
  return invokeFunction<{ success: boolean; status: string }>('complete-job', { bookingId, endSelfieUrl });
}

/** Customer confirms job completion: awaiting_confirmation → completed. */
export async function confirmComplete(bookingId: string, finalCost?: number, paymentMethod?: string) {
  trackingLog('JOB_STATE_CHANGE', 'Customer confirming job completion', { bookingId });
  return invokeFunction<{ success: boolean; status: string }>('confirm-complete', { bookingId, finalCost, paymentMethod });
}

/** Publish provider GPS to Supabase (validated by RLS). */
export async function uploadProviderLocation(
  providerId: string,
  location: DeviceLocation,
  bookingId?: string,
): Promise<void> {
  if (!bookingId) return;
  trackingLog('LOCATION_UPLOAD', 'Uploading provider location to secure table', {
    bookingId,
    accuracy: location.accuracy,
  });

  const { error } = await supabase
    .from('booking_provider_locations')
    .insert({
      booking_id: bookingId,
      provider_id: providerId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      accuracy: location.accuracy,
      speed: location.speed,
      recorded_at: new Date(location.timestamp).toISOString(),
    });

  if (error) throw error;
}

/** Fetch the provider's active tracking job from backend. */
export async function fetchActiveProviderJob(providerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('provider_id', providerId)
    .in('status', ['assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
