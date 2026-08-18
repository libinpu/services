import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { TRACKING_CONFIG } from './tracking-config';
import { trackingLog } from './tracking-logger';

export type LocationPermissionState = 'granted' | 'denied' | 'denied_forever' | 'undetermined';

export type ErrorCode = 
  | 'PERMISSION_DENIED'
  | 'SERVICES_DISABLED'
  | 'TIMEOUT'
  | 'LOW_ACCURACY'
  | 'UNKNOWN';

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

export interface LocationResponse {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: number;
  permissionStatus: LocationPermissionState;
  servicesEnabled: boolean;
  errorCode?: ErrorCode;
  errorMessage?: string;
}

export interface LocationServiceState {
  permission: LocationPermissionState;
  servicesEnabled: boolean;
  location: DeviceLocation | null;
  error: string | null;
  errorCode?: ErrorCode;
}

type Listener = (state: LocationServiceState) => void;

let watchSubscription: any = null;
let webWatchId: number | null = null;
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

export function isAccurateEnough(location: DeviceLocation | { accuracy?: number | null }): boolean {
  if (location.accuracy == null) return false;
  return location.accuracy <= TRACKING_CONFIG.LOCATION_ACCURACY_THRESHOLD_M;
}

export async function checkLocationPermission(): Promise<LocationPermissionState> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as any });
        if (result.state === 'granted') return 'granted';
        if (result.state === 'denied') return 'denied_forever';
        return 'undetermined';
      }
      return 'undetermined';
    } else {
      const Location = await import('expo-location');
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') return 'granted';
      return canAskAgain ? 'denied' : 'denied_forever';
    }
  } catch {
    return 'undetermined';
  }
}

export async function requestLocationPermission(): Promise<LocationPermissionState> {
  try {
    if (Platform.OS === 'web') {
      // Browsers don't have a direct "request permission" API without fetching location.
      // We will trigger a quick fetch just to trigger the permission prompt.
      return new Promise<LocationPermissionState>((resolve) => {
        if (!navigator.geolocation) {
          setState({ permission: 'denied_forever', error: 'Geolocation not supported', errorCode: 'UNKNOWN' });
          resolve('denied_forever');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => {
            setState({ permission: 'granted', error: null, errorCode: undefined });
            resolve('granted');
          },
          (error) => {
            const perm: LocationPermissionState = error.code === error.PERMISSION_DENIED ? 'denied_forever' : 'denied';
            setState({ permission: perm, error: 'Location permission denied', errorCode: 'PERMISSION_DENIED' });
            resolve(perm);
          },
          { maximumAge: 60000, timeout: 5000, enableHighAccuracy: false }
        );
      });
    } else {
      const Location = await import('expo-location');
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      trackingLog('LOCATION_PERMISSION', 'Foreground permission result', { status, canAskAgain });
      if (status === 'granted') {
        setState({ permission: 'granted', error: null, errorCode: undefined });
        return 'granted';
      }
      const perm: LocationPermissionState = canAskAgain === false ? 'denied_forever' : 'denied';
      setState({ permission: perm, error: 'Location permission denied', errorCode: 'PERMISSION_DENIED' });
      return perm;
    }
  } catch {
    setState({ permission: 'denied', error: 'Location permission unavailable', errorCode: 'UNKNOWN' });
    return 'denied';
  }
}

export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'web') return; // Cannot open browser settings programmatically
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch { /* silent */ }
}

export async function checkLocationServicesEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // We cannot definitively check if GPS hardware is on for web. Assume true until fetch fails.
      setState({ servicesEnabled: true });
      return true;
    } else {
      const Location = await import('expo-location');
      const enabled = await Location.hasServicesEnabledAsync();
      trackingLog('GPS_STATUS', enabled ? 'GPS enabled' : 'GPS disabled');
      setState({ servicesEnabled: enabled });
      return enabled;
    }
  } catch {
    setState({ servicesEnabled: false });
    return false;
  }
}

export function validateLocation(lat?: number, lng?: number, accuracy?: number, timestamp?: number): boolean {
  if (lat == null || lng == null) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (accuracy != null && accuracy > TRACKING_CONFIG.LOCATION_ACCURACY_THRESHOLD_M) return false;
  if (timestamp) {
    const age = Date.now() - timestamp;
    if (age > TRACKING_CONFIG.LOCATION_STALE_MS) return false;
  }
  return true;
}

export async function fetchCurrentLocation(timeoutMs = 15_000): Promise<LocationResponse> {
  const permStatus = await checkLocationPermission();
  if (permStatus !== 'granted') {
    const askedStatus = await requestLocationPermission();
    if (askedStatus !== 'granted') {
      return {
        success: false,
        permissionStatus: askedStatus,
        servicesEnabled: true,
        errorCode: 'PERMISSION_DENIED',
        errorMessage: Platform.OS === 'web' 
          ? 'Location permission is blocked for this website. Please allow location access in your browser settings and try again.'
          : 'Location permission denied. Please allow it in settings.',
      };
    }
  }

  const servicesEnabled = await checkLocationServicesEnabled();
  if (!servicesEnabled && Platform.OS !== 'web') {
    return {
      success: false,
      permissionStatus: 'granted',
      servicesEnabled: false,
      errorCode: 'SERVICES_DISABLED',
      errorMessage: 'Unable to get your current location. Please make sure GPS/Location Services are enabled and try again.',
    };
  }

  try {
    if (Platform.OS === 'web') {
      return new Promise<LocationResponse>((resolve) => {
        if (!navigator.geolocation) {
          resolve({
            success: false, permissionStatus: 'granted', servicesEnabled: false,
            errorCode: 'UNKNOWN', errorMessage: 'Geolocation is not supported by your browser.'
          });
          return;
        }

        const timer = setTimeout(() => {
          resolve({
            success: false, permissionStatus: 'granted', servicesEnabled: true,
            errorCode: 'TIMEOUT', errorMessage: 'Getting your location is taking too long. Please move to an area with better GPS signal and try again.'
          });
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            const mapped = mapPosition(pos);
            if (!validateLocation(mapped.latitude, mapped.longitude, mapped.accuracy ?? undefined, mapped.timestamp)) {
              resolve({
                success: false, permissionStatus: 'granted', servicesEnabled: true,
                latitude: mapped.latitude, longitude: mapped.longitude, accuracy: mapped.accuracy ?? undefined, timestamp: mapped.timestamp,
                errorCode: 'LOW_ACCURACY', errorMessage: 'Getting a more accurate location...'
              });
            } else {
              setState({ location: mapped, error: null, errorCode: undefined });
              resolve({
                success: true, permissionStatus: 'granted', servicesEnabled: true,
                latitude: mapped.latitude, longitude: mapped.longitude, accuracy: mapped.accuracy ?? undefined, timestamp: mapped.timestamp
              });
            }
          },
          (error) => {
            clearTimeout(timer);
            if (error.code === error.PERMISSION_DENIED) {
              resolve({
                success: false, permissionStatus: 'denied_forever', servicesEnabled: true,
                errorCode: 'PERMISSION_DENIED', errorMessage: 'Location permission is blocked for this website. Please allow location access in your browser settings and try again.'
              });
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              resolve({
                success: false, permissionStatus: 'granted', servicesEnabled: false,
                errorCode: 'SERVICES_DISABLED', errorMessage: 'Unable to get your current location. Please make sure GPS/Location Services are enabled and try again.'
              });
            } else {
              resolve({
                success: false, permissionStatus: 'granted', servicesEnabled: true,
                errorCode: 'TIMEOUT', errorMessage: 'Getting your location is taking too long. Please move to an area with better GPS signal and try again.'
              });
            }
          },
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
        );
      });
    } else {
      const Location = await import('expo-location');
      const current = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);

      if (!current) {
        return {
          success: false, permissionStatus: 'granted', servicesEnabled: true,
          errorCode: 'TIMEOUT', errorMessage: 'Getting your location is taking too long. Please move to an area with better GPS signal and try again.'
        };
      }

      const mapped = mapPosition(current);
      if (mapped.mocked) {
        return {
          success: false, permissionStatus: 'granted', servicesEnabled: true,
          errorCode: 'UNKNOWN', errorMessage: 'Mock locations are not allowed.'
        };
      }

      if (!validateLocation(mapped.latitude, mapped.longitude, mapped.accuracy ?? undefined, mapped.timestamp)) {
        const isStale = Date.now() - mapped.timestamp > TRACKING_CONFIG.LOCATION_STALE_MS;
        return {
          success: false, permissionStatus: 'granted', servicesEnabled: true,
          latitude: mapped.latitude, longitude: mapped.longitude, accuracy: mapped.accuracy ?? undefined, timestamp: mapped.timestamp,
          errorCode: isStale ? 'UNKNOWN' : 'LOW_ACCURACY', errorMessage: isStale ? 'GPS signal is stale.' : 'Getting a more accurate location...'
        };
      }

      setState({ location: mapped, error: null, errorCode: undefined });
      return {
        success: true, permissionStatus: 'granted', servicesEnabled: true,
        latitude: mapped.latitude, longitude: mapped.longitude, accuracy: mapped.accuracy ?? undefined, timestamp: mapped.timestamp
      };
    }
  } catch (e: any) {
    return {
      success: false, permissionStatus: 'granted', servicesEnabled: true,
      errorCode: 'UNKNOWN', errorMessage: e.message || 'Location unavailable'
    };
  }
}

export function subscribeLocationService(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => listeners.delete(listener);
}

export async function startLocationWatching(): Promise<boolean> {
  if (watchSubscription || webWatchId !== null) return true;

  const res = await fetchCurrentLocation();
  if (!res.success) return false;

  try {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) return false;
      webWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const mapped = mapPosition(pos);
          if (validateLocation(mapped.latitude, mapped.longitude, mapped.accuracy ?? undefined, mapped.timestamp)) {
            setState({ location: mapped, error: null, errorCode: undefined });
          }
        },
        (error) => {
          trackingLog('LOCATION_UPDATE', 'Web Watch Error', { code: error.code });
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      const Location = await import('expo-location');
      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: TRACKING_CONFIG.LOCATION_UPDATE_INTERVAL_MS,
          distanceInterval: TRACKING_CONFIG.MIN_LOCATION_UPDATE_DISTANCE_M,
        },
        (pos) => {
          const mapped = mapPosition(pos);
          if (!mapped.mocked && validateLocation(mapped.latitude, mapped.longitude, mapped.accuracy ?? undefined, mapped.timestamp)) {
            setState({ location: mapped, error: null, errorCode: undefined });
          }
        }
      );
    }
    trackingLog('LOCATION_SERVICE_STARTED', 'Location watch started');
    return true;
  } catch (e: any) {
    trackingLog('LOCATION_SERVICE_STOPPED', 'Failed to start watch', { message: e?.message });
    return false;
  }
}

export function stopLocationWatching(): void {
  if (Platform.OS === 'web') {
    if (webWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchId);
      webWatchId = null;
    }
  } else {
    if (watchSubscription) {
      try { watchSubscription.remove?.(); } catch {}
      watchSubscription = null;
    }
  }
  trackingLog('LOCATION_SERVICE_STOPPED', 'Location watch stopped');
}

export function getLocationServiceState(): LocationServiceState {
  return { ...currentState };
}
