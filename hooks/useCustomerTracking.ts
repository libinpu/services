import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TrackingLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

export function useCustomerTracking(deliveryId: string) {
  const [driverLocation, setDriverLocation] = useState<TrackingLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deliveryId) return;

    let isMounted = true;

    // Fetch initial location
    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('delivery_id', deliveryId)
        .single();

      if (error) {
        console.error('Error fetching initial location:', error);
      } else if (data && isMounted) {
        setDriverLocation(data);
      }
      if (isMounted) setLoading(false);
    };

    fetchInitialLocation();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`delivery_tracking:${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'delivery_tracking',
          filter: `delivery_id=eq.${deliveryId}`,
        },
        (payload) => {
          if (payload.new && isMounted) {
            setDriverLocation(payload.new as TrackingLocation);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [deliveryId]);

  return { driverLocation, loading };
}
