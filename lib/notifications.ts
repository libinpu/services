import { Platform } from 'react-native';
import { supabase } from './supabase';

// Only import expo-notifications on native; it is not available on web.
let Notifications: any = null;
let Device: any = null;

if (Platform.OS !== 'web') {
  // Dynamic requires so the web bundler doesn't choke on native modules.
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch (_) {
    // expo-notifications not installed — graceful no-op
  }
}

/**
 * Register the provider device and save the Expo push token to the authoritative
 * provider_devices table. Multiple devices per provider are supported.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.log('[notifications] Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[notifications] Permission not granted for push notifications.');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'services',
  });
  const token = tokenData.data;
  if (!token || !token.startsWith('ExponentPushToken')) {
    console.warn('[notifications] Invalid Expo token returned, skipping provider_devices save.');
    return null;
  }

  const { error } = await supabase
    .from('provider_devices')
    .upsert(
      {
        provider_id: userId,
        push_token: token,
        device_model: Device.modelName ?? Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_id,push_token' }
    );

  if (error) {
    console.warn('[notifications] Failed to save provider device token:', error.message);
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('job-alerts', {
      name: 'Job Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
      sound: 'default',
    });
  }

  return token;
}

/** Set how notifications behave when the app is in the foreground. */
export function setForegroundNotificationHandler(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
