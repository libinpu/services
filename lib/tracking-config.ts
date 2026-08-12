/** Configurable tracking constants — do not hard-code these elsewhere. */
export const TRACKING_CONFIG = {
  /** Send GPS at least this often while tracking (ms). */
  LOCATION_UPDATE_INTERVAL_MS: 4_000,
  /** Also send when moved at least this many meters. */
  MIN_LOCATION_UPDATE_DISTANCE_M: 15,
  /** Proximity threshold for arrival detection (meters). */
  ARRIVAL_RADIUS_M: 50,
  /** Reject arrival when accuracy is worse than this (meters). */
  LOCATION_ACCURACY_THRESHOLD_M: 80,
  /** OTP validity window (ms). */
  OTP_EXPIRATION_MS: 15 * 60 * 1000,
  /** Max failed OTP attempts before lockout. */
  MAX_OTP_ATTEMPTS: 5,
  /** Recalculate route after provider moves this far (meters). */
  ROUTE_REFRESH_DISTANCE_M: 60,
  /** Minimum interval between route API calls (ms). */
  ROUTE_REFRESH_INTERVAL_MS: 20_000,
  /** Marker animation duration on map (ms). */
  MARKER_ANIMATION_MS: 4_000,
  /** Max buffered location points when offline. */
  LOCATION_BUFFER_MAX: 20,
  /** Show "stale location" warning after this (ms). */
  LOCATION_STALE_MS: 30_000,
} as const;

export type TrackingConfig = typeof TRACKING_CONFIG;
