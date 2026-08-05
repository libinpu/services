import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { useCustomerTracking } from '../hooks/useCustomerTracking';

export default function CustomerTrackingDemo() {
  const deliveryId = 'demo-delivery-123';
  
  // Fixed customer location for demo
  const customerLocation = {
    latitude: 37.78825,
    longitude: -122.4324
  };

  const { driverLocation, loading } = useCustomerTracking(deliveryId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Track Order' }} />
      
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Locating driver...</Text>
          </View>
        ) : (
          <LiveTrackingMap 
            userLat={customerLocation.latitude} 
            userLng={customerLocation.longitude}
            providerLat={driverLocation?.latitude}
            providerLng={driverLocation?.longitude}
          />
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title}>Delivery Status</Text>
        {driverLocation ? (
          <View>
            <Text style={styles.subtitle}>Driver is on the way</Text>
            <Text style={styles.detail}>Last updated: {new Date(driverLocation.updated_at).toLocaleTimeString()}</Text>
            {driverLocation.speed !== undefined && driverLocation.speed !== null && (
              <Text style={styles.detail}>Speed: {(driverLocation.speed * 3.6).toFixed(1)} km/h</Text>
            )}
          </View>
        ) : (
          <Text style={styles.subtitle}>Waiting for driver location...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  mapContainer: {
    flex: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  infoContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 18,
    color: '#10B981',
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  }
});
