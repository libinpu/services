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

/** Register the device for Expo push notifications and save the token to Supabase. */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (Platform.OS === 'web') return null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[notifications] Push notifications require a physical device.');
    return null;
  }

  // Request permission
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

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'services', // matches app.json slug
  });
  const token = tokenData.data;
  console.log('[notifications] Push token:', token);

  // Save to Supabase provider_profiles
  const { error } = await supabase
    .from('provider_profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.warn('[notifications] Failed to save push token:', error.message);
  }

  // Android notification channel
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
