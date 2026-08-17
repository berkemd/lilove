import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

// Send push notification to a single user
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`[Push] Invalid push token: ${pushToken}`);
    return false;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    badge: 1,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    console.log('[Push] Notification sent:', tickets);
    return true;
  } catch (error) {
    console.error('[Push] Failed to send notification:', error);
    return false;
  }
}

// Send push notification to multiple users
export async function sendBulkPushNotifications(
  messages: ExpoPushMessage[]
): Promise<void> {
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log('[Push] Bulk notifications sent:', tickets.length);
    } catch (error) {
      console.error('[Push] Failed to send bulk notifications:', error);
    }
  }
}
