import { TRACKING_CONFIG } from './tracking-config';

/** Haversine distance in meters between two lat/long points. */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}

/** Whether two coordinates are within the configured arrival radius. */
export function isWithinArrivalRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusM = TRACKING_CONFIG.ARRIVAL_RADIUS_M,
): boolean {
  return haversineMeters(lat1, lon1, lat2, lon2) <= radiusM;
}

/** Bearing in degrees from point A to B (0 = north). */
export function bearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const dLon = (lon2 - lon1) * r;
  const y = Math.sin(dLon) * Math.cos(lat2 * r);
  const x =
    Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// Haversine distance in km between two lat/long points
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate travel time in minutes (assume 25 km/h average city speed)
export function estimateEtaMins(distanceKm: number): number {
  return Math.max(5, Math.round((distanceKm / 25) * 60));
}

export function formatDistance(km: number | null): string {
  if (km == null) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatEta(mins: number | null): string {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
