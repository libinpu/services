import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';
import { TRACKING_CONFIG } from '../lib/tracking-config';

export function useDriverTracking(bookingId: string, providerId: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const lastSentRef = useRef<{ ts: number; lat: number; lng: number } | null>(null);

  const startTracking = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      setIsTracking(true);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: TRACKING_CONFIG.MIN_LOCATION_UPDATE_DISTANCE_M,
          timeInterval: TRACKING_CONFIG.LOCATION_UPDATE_INTERVAL_MS,
        },
        async (location) => {
          try {
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            const now = Date.now();

            if (location.mocked) {
              console.warn('Rejected mocked location update in driver tracking');
              return;
            }

            if (location.coords.accuracy != null && location.coords.accuracy > TRACKING_CONFIG.LOCATION_ACCURACY_THRESHOLD_M) {
              console.warn('Rejected inaccurate location update in driver tracking');
              return;
            }

            // Throttle writes: only send if moved by min interval distance or time
            const last = lastSentRef.current;
            let shouldSend = false;
            if (!last) shouldSend = true;
            else if (now - last.ts > TRACKING_CONFIG.LOCATION_UPDATE_INTERVAL_MS) shouldSend = true;
            else {
              const toRad = (v: number) => (v * Math.PI) / 180;
              const R = 6371000; // meters
              const dLat = toRad(lat - last.lat);
              const dLon = toRad(lng - last.lng);
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(last.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              if (distance >= TRACKING_CONFIG.MIN_LOCATION_UPDATE_DISTANCE_M) shouldSend = true;
            }

            if (!shouldSend) return;

            const { error } = await supabase.from('booking_provider_locations').insert({
              booking_id: bookingId,
              provider_id: providerId,
              latitude: lat,
              longitude: lng,
              heading: location.coords.heading,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
              recorded_at: new Date().toISOString(),
            });

            if (error) {
              console.error('Error updating location:', error);
            } else {
              lastSentRef.current = { ts: now, lat, lng };
            }
          } catch (err) {
            console.error('Driver tracking callback error:', err);
          }
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return { isTracking, startTracking, stopTracking };
}

