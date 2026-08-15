import { supabase } from './supabase';
import { trackingLog } from './tracking-logger';
import type { DeviceLocation } from './location-service';

const FUNCTIONS_BASE = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wrozyadpfcktedltxhox.supabase.co';
  return `${url}/functions/v1`;
};

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTIONS_BASE()}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
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
  return invokeFunction<{ success: boolean; status: string; providerId?: string; message?: string }>(
    'auto-assign-provider',
    { bookingId },
  );
}

/** Provider accepts an assigned job → on_the_way. */
export async function acceptBooking(bookingId: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider accepting booking', { bookingId });
  return invokeFunction<{ success: boolean; status: string }>('accept-booking', { bookingId });
}

/** Provider rejects an assigned job; auto mode may reassign. */
export async function rejectBooking(bookingId: string, reason?: string) {
  trackingLog('JOB_STATE_CHANGE', 'Provider rejecting booking', { bookingId });
  return invokeFunction<{ success: boolean; status: string }>('reject-booking', { bookingId, reason });
}

/** Backend validates proximity and transitions on_the_way → arrived; OTP generated server-side. */
export async function markBookingArrived(
  bookingId: string,
  location: Pick<DeviceLocation, 'latitude' | 'longitude' | 'accuracy'>,
  consecutiveReadings: number,
): Promise<{ success: boolean; status: string }> {
  trackingLog('ARRIVAL_DETECTED', 'Requesting backend arrival confirmation', { bookingId });
  return invokeFunction('mark-booking-arrived', {
    bookingId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    consecutiveReadings,
  });
}

/** Backend verifies OTP — never trust client-side comparison. */
export async function verifyBookingOtp(
  bookingId: string,
  otp: string,
): Promise<{ success: boolean; status: string }> {
  trackingLog('OTP_VERIFICATION', 'Submitting OTP for backend verification', { bookingId });
  return invokeFunction('verify-booking-otp', { bookingId, otp });
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
