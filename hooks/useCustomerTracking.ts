import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createRealtimeChannel } from '../lib/realtime';

export interface TrackingLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  recorded_at: string;
}

export function useCustomerTracking(bookingId: string) {
  const [driverLocation, setDriverLocation] = useState<TrackingLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    let isMounted = true;

    // Fetch initial location
    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('booking_provider_locations')
        .select('*')
        .eq('booking_id', bookingId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching initial location:', error);
      } else if (data && isMounted) {
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading ?? undefined,
          speed: data.speed ?? undefined,
          accuracy: data.accuracy ?? undefined,
          recorded_at: data.recorded_at,
        });
      }
      if (isMounted) setLoading(false);
    };

    fetchInitialLocation();

    // Subscribe to realtime updates
    const channel = createRealtimeChannel(`booking_provider_locations:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_provider_locations',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          if (payload.new && isMounted) {
            const data = payload.new;
            setDriverLocation({
              latitude: data.latitude,
              longitude: data.longitude,
              heading: data.heading ?? undefined,
              speed: data.speed ?? undefined,
              accuracy: data.accuracy ?? undefined,
              recorded_at: data.recorded_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return { driverLocation, loading };
}

