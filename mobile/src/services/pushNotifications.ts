import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission denied');
      return null;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'ab7bb029-eeb4-4407-a810-a9b27462f0ae',
    })).data;

    console.log('[Push] Token obtained:', token);

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6', // LiLove purple
      });
    }

    return token;
  } catch (error) {
    console.error('[Push] Registration failed:', error);
    return null;
  }
}

// Send push token to server
export async function sendPushTokenToServer(token: string, accessToken: string): Promise<boolean> {
  try {
    // Use Constants.expoConfig for EAS builds, fallback to env for local dev
    const API_URL = Constants.expoConfig?.extra?.apiUrl || 
                    process.env.EXPO_PUBLIC_API_URL || 
                    'https://lilove.org';
    
    const response = await fetch(`${API_URL}/api/user/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to send push token');
    }

    console.log('[Push] Token sent to server successfully');
    return true;
  } catch (error) {
    console.error('[Push] Failed to send token to server:', error);
    return false;
  }
}

// Add notification received listener
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

// Add notification response listener (user taps notification)
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

// Schedule a local notification (for testing)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 5
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false
      },
    });
    
    console.log('[Push] Local notification scheduled');
  } catch (error) {
    console.error('[Push] Failed to schedule notification:', error);
  }
}
