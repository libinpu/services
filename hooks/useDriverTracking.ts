import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export function useDriverTracking(deliveryId: string, driverId: string) {
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
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // Update callback from platform
          timeInterval: 5000, // Platform may deliver every ~5s
        },
        async (location) => {
          try {
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            const now = Date.now();

            // Throttle writes: only send if moved by >=30m or last write >15s
            const last = lastSentRef.current;
            const minIntervalMs = 15000; // 15s
            const minDistanceM = 30; // 30 meters

            let shouldSend = false;
            if (!last) shouldSend = true;
            else if (now - last.ts > minIntervalMs) shouldSend = true;
            else {
              const toRad = (v: number) => (v * Math.PI) / 180;
              const R = 6371000; // meters
              const dLat = toRad(lat - last.lat);
              const dLon = toRad(lng - last.lng);
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(last.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              if (distance >= minDistanceM) shouldSend = true;
            }

            if (!shouldSend) return;

            const { error } = await supabase.from('delivery_tracking').upsert({
              delivery_id: deliveryId,
              driver_id: driverId,
              latitude: lat,
              longitude: lng,
              heading: location.coords.heading,
              speed: location.coords.speed,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'delivery_id' });

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
