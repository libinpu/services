import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { useDriverTracking } from '../hooks/useDriverTracking';

export default function DriverTrackingDemo() {
  // Hardcoded IDs for demo purposes
  const deliveryId = 'demo-delivery-123';
  const driverId = 'demo-driver-456';
  
  const { isTracking, startTracking, stopTracking } = useDriverTracking(deliveryId, driverId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Driver Tracking' }} />
      
      <View style={styles.card}>
        <Text style={styles.title}>Delivery: {deliveryId}</Text>
        <Text style={styles.status}>
          Status: {isTracking ? 'Active Tracking (Publishing Location)' : 'Offline'}
        </Text>
        
        <Pressable 
          style={[styles.button, isTracking ? styles.buttonStop : styles.buttonStart]} 
          onPress={isTracking ? stopTracking : startTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonStart: {
    backgroundColor: '#10B981', // Emerald 500
  },
  buttonStop: {
    backgroundColor: '#EF4444', // Red 500
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
