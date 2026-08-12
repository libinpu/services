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

/** Backend generates a secure OTP for the booking (customer only). */
export async function initBookingOtp(bookingId: string): Promise<{ otp: string }> {
  trackingLog('OTP_REQUEST', 'Initializing booking OTP', { bookingId });
  return invokeFunction('init-booking-otp', { bookingId });
}

/** Backend validates proximity and transitions EN_ROUTE → ARRIVED. */
export async function markBookingArrived(
  bookingId: string,
  location: Pick<DeviceLocation, 'latitude' | 'longitude' | 'accuracy'>,
): Promise<{ success: boolean; status: string }> {
  trackingLog('ARRIVAL_DETECTED', 'Requesting backend arrival confirmation', { bookingId });
  return invokeFunction('mark-booking-arrived', {
    bookingId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
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

/** Publish provider GPS to Supabase (validated by RLS). */
export async function uploadProviderLocation(
  providerId: string,
  location: DeviceLocation,
  bookingId?: string,
): Promise<void> {
  trackingLog('LOCATION_UPLOAD', 'Uploading provider location', {
    bookingId,
    accuracy: location.accuracy,
  });

  const { error } = await supabase
    .from('provider_profiles')
    .update({
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      location_accuracy: location.accuracy,
      speed: location.speed,
      last_location_at: new Date(location.timestamp).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);

  if (error) throw error;
}

/** Fetch the provider's active tracking job from backend. */
export async function fetchActiveProviderJob(providerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('provider_id', providerId)
    .in('status', ['accepted', 'on_the_way', 'arrived', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
