import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export function useDriverTracking(deliveryId: string, driverId: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

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
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000, // Or every 5 seconds
        },
        async (location) => {
          // Push to Supabase
          const { error } = await supabase.from('delivery_tracking').upsert({
            delivery_id: deliveryId,
            driver_id: driverId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'delivery_id' });

          if (error) {
            console.error('Error updating location:', error);
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
