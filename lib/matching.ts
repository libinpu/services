import { haversineKm, estimateEtaMins } from './distance';
import { TRACKING_CONFIG } from './tracking-config';

export interface MatchableProvider {
  id: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy?: number | null;
  last_location_at?: string | null;
  is_online?: boolean;
}

export interface ProviderMatchResult {
  providerId: string;
  distanceKm: number;
  etaMins: number;
}

const ACTIVE_JOB_STATUSES = ['assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'];

export { ACTIVE_JOB_STATUSES };

export function isProviderLocationFresh(lastLocationAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastLocationAt) return false;
  return now - new Date(lastLocationAt).getTime() <= TRACKING_CONFIG.PROVIDER_LOCATION_MAX_AGE_MS;
}

export function isProviderGpsEligible(
  provider: MatchableProvider,
  now = Date.now(),
): provider is MatchableProvider & { latitude: number; longitude: number } {
  if (!provider.is_online) return false;
  if (provider.latitude == null || provider.longitude == null) return false;
  if (!isProviderLocationFresh(provider.last_location_at, now)) return false;
  if (
    provider.location_accuracy != null &&
    provider.location_accuracy > TRACKING_CONFIG.LOCATION_ACCURACY_THRESHOLD_M
  ) {
    return false;
  }
  return true;
}

/** Find nearest eligible provider within MATCH_RADIUS_KM. */
export function findNearestProvider(
  customerLat: number,
  customerLng: number,
  providers: MatchableProvider[],
): ProviderMatchResult | null {
  const eligible = providers
    .filter(isProviderGpsEligible)
    .map((p) => ({
      id: p.id,
      distanceKm: haversineKm(customerLat, customerLng, p.latitude!, p.longitude!),
    }))
    .filter((p) => p.distanceKm <= TRACKING_CONFIG.MATCH_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (eligible.length === 0) return null;

  const best = eligible[0];
  return {
    providerId: best.id,
    distanceKm: best.distanceKm,
    etaMins: estimateEtaMins(best.distanceKm),
  };
}
