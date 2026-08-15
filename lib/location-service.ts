import { Platform } from 'react-native';
import * as Linking from 'expo-linking';


import { TRACKING_CONFIG } from './tracking-config';
import { trackingLog } from './tracking-logger';

export type LocationPermissionState =
  | 'granted'
  | 'denied'
  | 'denied_forever'
  | 'undetermined';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  mocked?: boolean;
}

export interface LocationServiceState {
  permission: LocationPermissionState;
  servicesEnabled: boolean;
  location: DeviceLocation | null;
  error: string | null;
}

type Listener = (state: LocationServiceState) => void;

let watchSubscription: { remove?: () => void } | null = null;
let listeners = new Set<Listener>();
let currentState: LocationServiceState = {
  permission: 'undetermined',
  servicesEnabled: false,
  location: null,
  error: null,
};

function notify() {
  listeners.forEach((fn) => fn({ ...currentState }));
}

function setState(patch: Partial<LocationServiceState>) {
  currentState = { ...currentState, ...patch };
  notify();
}

function mapPosition(pos: any): DeviceLocation {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    altitude: pos.coords.altitude ?? null,
    speed: pos.coords.speed ?? null,
    heading: pos.coords.heading ?? null,
    timestamp: pos.timestamp ?? Date.now(),
    mocked: pos.mocked ?? false,
  };
}

function isAccurateEnough(location: DeviceLocation): boolean {
  if (location.accuracy == null) return false;
  return location.accuracy <= TRACKING_CONFIG.LOCATION_ACCURACY_THRESHOLD_M;
}

/** Request foreground location permission with clear UX messaging handled by caller. */
export async function requestLocationPermission(): Promise<LocationPermissionState> {
  try {
    const Location = await import('expo-location');
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    trackingLog('LOCATION_PERMISSION', 'Foreground permission result', { status, canAskAgain });

    if (status === 'granted') {
      setState({ permission: 'granted' });
      return 'granted';
    }
    const perm: LocationPermissionState = canAskAgain === false ? 'denied_forever' : 'denied';
    setState({ permission: perm, error: 'Location permission denied' });
    return perm;
  } catch {
    setState({ permission: 'denied', error: 'Location permission unavailable' });
    return 'denied';
  }
}

/** Open device location settings when GPS is disabled. */
export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'web') {
    // Browser cannot open device settings — nothing to do
    return;
  }
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:');
  } else {
    await Linking.openSettings();
  }
}

/** Check whether device location services (GPS) are enabled. */
export async function checkLocationServicesEnabled(): Promise<boolean> {
  try {
    const Location = await import('expo-location');
    const enabled = await Location.hasServicesEnabledAsync();
    trackingLog('GPS_STATUS', enabled ? 'GPS enabled' : 'GPS disabled');
    setState({ servicesEnabled: enabled });
    return enabled;
  } catch {
    setState({ servicesEnabled: false });
    return false;
  }
}

/**
 * Fetch the best available current position — prefers recent accurate GPS over
 * stale last-known fixes.
 */
export async function fetchCurrentLocation(timeoutMs = 15_000): Promise<DeviceLocation | null> {
  try {
    const Location = await import('expo-location');
    const permission = await requestLocationPermission();
    if (permission !== 'granted') return null;

    const servicesEnabled = await checkLocationServicesEnabled();
    if (!servicesEnabled) {
      setState({ error: 'Enable GPS to continue' });
      return null;
    }

    const current = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);

    if (current) {
      const mapped = mapPosition(current);
      // Validate latitude, longitude, and timestamp age (should not be stale)
      const now = Date.now();
      const isStale = now - mapped.timestamp > TRACKING_CONFIG.LOCATION_STALE_MS;

      if (mapped.mocked) {
        trackingLog('LOCATION_UPDATE', 'Mock location detected and rejected');
        setState({ error: 'Mock location detected' });
        return null;
      }

      if (isStale) {
        trackingLog('LOCATION_UPDATE', 'Stale GPS reading rejected', { ageMs: now - mapped.timestamp });
        setState({ error: 'GPS signal is stale. Getting accurate location...' });
        return null;
      }

      if (!isAccurateEnough(mapped)) {
        trackingLog('LOCATION_UPDATE', 'Poor GPS accuracy', { accuracy: mapped.accuracy });
        setState({ location: mapped, error: 'GPS accuracy is low. Waiting for a better location…' });
        return null;
      }

      setState({ location: mapped, error: null });
      trackingLog('LOCATION_UPDATE', 'Current location fetched', {
        accuracy: mapped.accuracy,
        mocked: mapped.mocked,
      });
      return mapped;
    } else {
      setState({ error: 'Location unavailable — timeout' });
    }
    return null;
  } catch (e: any) {
    trackingLog('LOCATION_UPDATE', 'Fetch failed', { message: e?.message });
    setState({ error: 'Location unavailable' });
    return null;
  }
}

/** Subscribe to location service state changes. */
export function subscribeLocationService(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => listeners.delete(listener);
}

/** Start continuous location watching — single source of truth for device GPS. */
export async function startLocationWatching(): Promise<boolean> {
  if (watchSubscription) return true;

  const permission = await requestLocationPermission();
  if (permission !== 'granted') return false;

  const servicesEnabled = await checkLocationServicesEnabled();
  if (!servicesEnabled) return false;

  try {
    const Location = await import('expo-location');
    await fetchCurrentLocation();

    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: TRACKING_CONFIG.LOCATION_UPDATE_INTERVAL_MS,
        distanceInterval: TRACKING_CONFIG.MIN_LOCATION_UPDATE_DISTANCE_M,
      },
      (pos) => {
        const mapped = mapPosition(pos);
        if (mapped.mocked) {
          trackingLog('LOCATION_UPDATE', 'Mock location in watch stream rejected');
          return;
        }
        if (!isAccurateEnough(mapped)) {
          setState({
            error: 'GPS accuracy is low. Waiting for a better location…',
          });
          return;
        }
        setState({
          location: mapped,
          error: null,
        });
        trackingLog('LOCATION_UPDATE', 'Watch update', { accuracy: mapped.accuracy });
      },
    );

    trackingLog('LOCATION_SERVICE_STARTED', 'Location watch started');
    return true;
  } catch (e: any) {
    trackingLog('LOCATION_SERVICE_STOPPED', 'Failed to start watch', { message: e?.message });
    setState({ error: 'Location tracking unavailable' });
    return false;
  }
}

/** Stop continuous location watching. */
export function stopLocationWatching(): void {
  if (watchSubscription) {
    try {
      watchSubscription.remove?.();
    } catch {}
    watchSubscription = null;
    trackingLog('LOCATION_SERVICE_STOPPED', 'Location watch stopped');
  }
}

export function getLocationServiceState(): LocationServiceState {
  return { ...currentState };
}

