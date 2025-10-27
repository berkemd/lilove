// Notification Service - Push notifications and in-app notifications
import { db } from './storage';
import { notifications, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export class NotificationService {
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string = 'info',
    actionUrl?: string
  ) {
    // Create notification in database
    const notification = await db.insert(notifications).values({
      userId,
      title,
      message,
      type: type as any,
      actionUrl,
      read: false
    }).returning();

    // In a real implementation, this would also send push notifications
    // using services like Firebase Cloud Messaging or OneSignal

    return notification[0];
  }

  async getUserNotifications(userId: string, limit: number = 20) {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markAsRead(notificationId: string) {
    await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }

  async markAllAsRead(userId: string) {
    await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
  }

  async getUnreadCount(userId: string) {
    const unread = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));

    return unread.length;
  }
}

export const notificationService = new NotificationService();
