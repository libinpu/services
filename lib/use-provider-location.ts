import { useState, useEffect, useRef, useCallback } from 'react';
import {
  startLocationWatching,
  stopLocationWatching,
  subscribeLocationService,
  type DeviceLocation,
} from './location-service';
import { TRACKING_CONFIG } from './tracking-config';
import { trackingLog } from './tracking-logger';

export interface ProviderLocation {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  accuracy: number | null;
  speed: number | null;
  updatedAt: number | null;
  mocked?: boolean;
  error: string | null;
}

const EMPTY: ProviderLocation = {
  latitude: null,
  longitude: null,
  heading: null,
  accuracy: null,
  speed: null,
  updatedAt: null,
  error: null,
};

function toProviderLocation(loc: DeviceLocation | null, error: string | null): ProviderLocation {
  if (!loc) return { ...EMPTY, error };
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    heading: loc.heading,
    accuracy: loc.accuracy,
    speed: loc.speed,
    updatedAt: loc.timestamp,
    mocked: loc.mocked,
    error,
  };
}

/** Single source of truth for provider device GPS while tracking is enabled. */
export function useProviderLocation(enabled: boolean) {
  const [location, setLocation] = useState<ProviderLocation>(EMPTY);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const syncFromService = useCallback((loc: DeviceLocation | null, error: string | null) => {
    if (!enabledRef.current) return;
    setLocation(toProviderLocation(loc, error));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocation(EMPTY);
      return;
    }

    const unsubscribe = subscribeLocationService((state) => {
      syncFromService(state.location, state.error);
    });

    void startLocationWatching();

    return () => {
      unsubscribe();
      stopLocationWatching();
    };
  }, [enabled, syncFromService]);

  return location;
}

/** Throttled location upload with offline buffer (latest-only flush). */
export function useProviderLocationSync(
  enabled: boolean,
  providerId: string | undefined,
  upload: (loc: DeviceLocation) => Promise<void>,
) {
  const location = useProviderLocation(enabled);
  const lastSyncedRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const bufferRef = useRef<DeviceLocation[]>([]);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !providerId || location.latitude == null || location.longitude == null) return;

    const deviceLoc: DeviceLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: null,
      speed: location.speed,
      heading: location.heading,
      timestamp: location.updatedAt ?? Date.now(),
      mocked: location.mocked,
    };

    const now = Date.now();
    const previous = lastSyncedRef.current;
    const moved =
      !previous ||
      Math.hypot(
        (previous.lat - deviceLoc.latitude) * 111_000,
        (previous.lng - deviceLoc.longitude) * 111_000,
      ) >= TRACKING_CONFIG.MIN_LOCATION_UPDATE_DISTANCE_M;

    if (!moved && now - (previous?.ts ?? 0) < TRACKING_CONFIG.LOCATION_UPDATE_INTERVAL_MS) return;

    const flush = async () => {
      if (uploadingRef.current) {
        bufferRef.current.push(deviceLoc);
        if (bufferRef.current.length > TRACKING_CONFIG.LOCATION_BUFFER_MAX) {
          bufferRef.current = bufferRef.current.slice(-TRACKING_CONFIG.LOCATION_BUFFER_MAX);
        }
        return;
      }
      uploadingRef.current = true;
      try {
        await upload(deviceLoc);
        lastSyncedRef.current = { lat: deviceLoc.latitude, lng: deviceLoc.longitude, ts: now };
        trackingLog('LOCATION_UPLOAD', 'Synced provider location');
        if (bufferRef.current.length > 0) {
          const latest = bufferRef.current[bufferRef.current.length - 1];
          bufferRef.current = [];
          await upload(latest);
          lastSyncedRef.current = { lat: latest.latitude, lng: latest.longitude, ts: Date.now() };
        }
      } catch {
        bufferRef.current.push(deviceLoc);
      } finally {
        uploadingRef.current = false;
      }
    };

    void flush();
  }, [
    enabled,
    providerId,
    location.latitude,
    location.longitude,
    location.heading,
    location.accuracy,
    location.speed,
    location.updatedAt,
    location.mocked,
    upload,
  ]);

  return location;
}

// Backward-compatible helper used by legacy call sites.
export async function updateProviderLocationInDb(
  supabaseClient: any,
  providerId: string,
  lat: number,
  lng: number,
  heading: number | null = null,
  accuracy: number | null = null,
  speed: number | null = null,
) {
  try {
    await supabaseClient
      .from('provider_profiles')
      .update({
        latitude: lat,
        longitude: lng,
        heading,
        location_accuracy: accuracy,
        speed,
        last_location_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);
  } catch {
    // ignore
  }
}
