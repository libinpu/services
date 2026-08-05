import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProviderLocation {
  latitude: number | null;
  longitude: number | null;
  updatedAt: number | null;
}

export function useProviderLocation(enabled: boolean) {
  const [location, setLocation] = useState<ProviderLocation>({
    latitude: null,
    longitude: null,
    updatedAt: null,
  });
  const watchRef = useRef<any>(null);
  const dbUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    if (!enabled) return;
    try {
      const expoLocation = await import('expo-location');
      const { status } = await expoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const sub = await expoLocation.watchPositionAsync(
        { accuracy: expoLocation.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updatedAt: Date.now(),
          });
        }
      );
      watchRef.current = sub;
    } catch {
      // location unavailable
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      start();
    }
    return () => {
      if (watchRef.current) {
        watchRef.current.remove?.();
        watchRef.current = null;
      }
      if (dbUpdateRef.current) {
        clearInterval(dbUpdateRef.current);
        dbUpdateRef.current = null;
      }
    };
  }, [enabled, start]);

  return location;
}

export async function updateProviderLocationInDb(
  supabaseClient: any,
  providerId: string,
  lat: number,
  lng: number
) {
  try {
    await supabaseClient
      .from('provider_profiles')
      .update({
        latitude: lat,
        longitude: lng,
        last_location_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);
  } catch {
    // ignore
  }
}
