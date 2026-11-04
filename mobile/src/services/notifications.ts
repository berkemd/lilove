import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../lib/api';
import { tokenManager } from './tokenManager';

// Configure notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;

  async registerForPushNotifications(
    isCurrent: () => boolean = () => true
  ): Promise<string | null> {
    try {
      if (!isCurrent()) return null;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
        });
      }

      if (!isCurrent()) return null;
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (!isCurrent()) return null;
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (!isCurrent()) return null;
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('EAS Project ID not found');
        return null;
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (!isCurrent()) return null;
      this.pushToken = token;
      await this.sendTokenToBackend(token, isCurrent);
      return token;
    } catch (error) {
      // Permission and channel calls can reject on a real device too.
      console.error('Error registering push notifications:', error);
      return null;
    }
  }

  async sendTokenToBackend(token: string, isCurrent: () => boolean = () => true) {
    try {
      if (!isCurrent()) return;
      const authorizationToken = await tokenManager.getToken({ fresh: true });
      if (!authorizationToken || !isCurrent()) return;
      // Pin the checked session; the API must not look up a different account again.
      await api.updatePushToken(token, authorizationToken);
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#8B5CF6',
      },
      trigger: trigger || null, // null means immediate
    });

    return notificationId;
  }

  async cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  // Schedule daily reminder
  async scheduleDailyReminder(hour: number, minute: number) {
    await this.scheduleLocalNotification(
      '🎯 Daily Check-in',
      'Time to review your goals and habits!',
      { type: 'daily_reminder' },
      {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      }
    );
  }

  // Schedule habit reminder
  async scheduleHabitReminder(habitName: string, hour: number, minute: number) {
    await this.scheduleLocalNotification(
      `⏰ Habit Reminder`,
      `Time for: ${habitName}`,
      { type: 'habit_reminder', habitName },
      {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      }
    );
  }

  // Handle notification responses
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    // Handle notifications when app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    let responseListener: ReturnType<typeof Notifications.addNotificationResponseReceivedListener>;
    try {
      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      });
    } catch (error) {
      Notifications.removeNotificationSubscription(notificationListener);
      throw error;
    }

    return () => {
      try {
        Notifications.removeNotificationSubscription(notificationListener);
      } finally {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }

  getPushToken(): string | null {
    return this.pushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
