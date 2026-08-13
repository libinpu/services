import { isWithinArrivalRadius } from './distance';
import { TRACKING_CONFIG } from './tracking-config';

export interface ArrivalSample {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/** Tracks consecutive valid in-radius GPS readings before triggering arrival. */
export class ArrivalDetector {
  private consecutive = 0;

  reset() {
    this.consecutive = 0;
  }

  /**
   * Returns true when enough consecutive accurate readings are within arrival radius.
   */
  evaluate(
    sample: ArrivalSample,
    destLat: number,
    destLng: number,
  ): boolean {
    if (
      sample.accuracy != null &&
      sample.accuracy > TRACKING_CONFIG.LOCATION_ACCURACY_THRESHOLD_M
    ) {
      this.consecutive = 0;
      return false;
    }

    if (!isWithinArrivalRadius(sample.latitude, sample.longitude, destLat, destLng)) {
      this.consecutive = 0;
      return false;
    }

    this.consecutive += 1;
    return this.consecutive >= TRACKING_CONFIG.ARRIVAL_CONSECUTIVE_READINGS;
  }

  get consecutiveCount() {
    return this.consecutive;
  }
}
