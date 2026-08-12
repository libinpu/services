import { describe, it, expect } from 'vitest';
import {
  haversineMeters,
  isWithinArrivalRadius,
  bearingDegrees,
} from '../distance';
import { TRACKING_CONFIG } from '../tracking-config';

describe('distance and arrival', () => {
  it('100m away is not within arrival radius', () => {
    const lat1 = 9.12345;
    const lng1 = 76.54321;
    const lat2 = 9.12435;
    const lng2 = 76.54321;
    expect(haversineMeters(lat1, lng1, lat2, lng2)).toBeGreaterThan(60);
    expect(isWithinArrivalRadius(lat1, lng1, lat2, lng2)).toBe(false);
  });

  it('60m away is not within 50m arrival radius', () => {
    const lat1 = 9.12345;
    const lng1 = 76.54321;
    const lat2 = 9.12399;
    const lng2 = 76.54321;
    const d = haversineMeters(lat1, lng1, lat2, lng2);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(70);
    expect(isWithinArrivalRadius(lat1, lng1, lat2, lng2)).toBe(false);
  });

  it('50m or less triggers arrival candidate', () => {
    const lat1 = 9.12345;
    const lng1 = 76.54321;
    const lat2 = 9.12349;
    const lng2 = 76.54321;
    expect(haversineMeters(lat1, lng1, lat2, lng2)).toBeLessThanOrEqual(50);
    expect(isWithinArrivalRadius(lat1, lng1, lat2, lng2, TRACKING_CONFIG.ARRIVAL_RADIUS_M)).toBe(true);
  });

  it('identical coordinates are within arrival radius', () => {
    expect(isWithinArrivalRadius(9.12345, 76.54321, 9.12345, 76.54321)).toBe(true);
  });

  it('bearing points east for increasing longitude', () => {
    const bearing = bearingDegrees(10, 76, 10, 77);
    expect(bearing).toBeGreaterThan(80);
    expect(bearing).toBeLessThan(100);
  });
});

describe('job state transitions (documented)', () => {
  const validTransitions: Record<string, string[]> = {
    pending: ['accepted', 'cancelled', 'rejected'],
    accepted: ['on_the_way', 'cancelled'],
    on_the_way: ['arrived', 'cancelled'],
    arrived: ['in_progress', 'cancelled'],
    in_progress: ['awaiting_confirmation', 'cancelled'],
    awaiting_confirmation: ['completed'],
  };

  it('REQUESTED → COMPLETED is invalid', () => {
    expect(validTransitions.pending).not.toContain('completed');
  });

  it('on_the_way can only become arrived or cancelled', () => {
    expect(validTransitions.on_the_way).toEqual(['arrived', 'cancelled']);
  });
});
