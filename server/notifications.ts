import { db } from './storage';
import { 
  notifications, 
  notificationPreferences, 
  users, 
  goals,
  tasks,
  achievements,
  userAchievements,
  xpTransactions,
  teams,
  challenges,
  type Notification, 
  type InsertNotification,
  type NotificationPreferences,
  type User
} from '@shared/schema';
import { eq, and, or, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import { Server as SocketIOServer } from 'socket.io';
import webpush from 'web-push';
import nodemailer from 'nodemailer';

// Configure web push with VAPID keys (you'll need to generate these)
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:love@lilove.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Notification types
export type NotificationType = 
  | 'task_reminder'
  | 'goal_checkin'
  | 'achievement'
  | 'friend_request'
  | 'team_invite'
  | 'challenge_update'
  | 'streak_warning'
  | 'mentor_insight'
  | 'level_up'
  | 'new_message'
  | 'daily_digest'
  | 'weekly_report';

export type NotificationCategory = 
  | 'social'
  | 'achievements'
  | 'reminders'
  | 'system'
  | 'engagement'
  | 'goals'
  | 'tasks';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationChannel = 'inApp' | 'email' | 'push';

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  category: NotificationCategory;
  relatedEntityIds?: {
    userId?: string;
    teamId?: string;
    challengeId?: string;
    postId?: string;
    goalId?: string;
    taskId?: string;
  };
  actionUrl?: string;
  scheduledFor?: Date;
  channels?: NotificationChannel[];
}

class NotificationService {
  private io: SocketIOServer | null = null;
  private batchedNotifications: Map<string, CreateNotificationOptions[]> = new Map();
  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  // Create a notification with smart channel selection
  async createNotification(options: CreateNotificationOptions): Promise<Notification> {
    // Get user preferences
    const prefs = await this.getUserPreferences(options.userId);
    
    // Check if notification should be sent based on preferences
    const shouldSend = await this.shouldSendNotification(options, prefs);
    if (!shouldSend) {
      console.log(`Notification skipped for user ${options.userId} based on preferences`);
      return null as any;
    }

    // Check for batching
    if (prefs?.batchingEnabled && options.priority !== 'urgent') {
      return await this.batchNotification(options, prefs);
    }

    // Create the notification record
    const notification = await this.saveNotification(options);

    // Send through appropriate channels
    const channels = await this.determineChannels(options, prefs);
    await this.sendThroughChannels(notification, channels, prefs);

    return notification;
  }

  private async saveNotification(options: CreateNotificationOptions): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      userId: options.userId,
      type: options.type,
      title: options.title,
      message: options.message || '',
      priority: options.priority || 'medium',
      category: options.category,
      relatedUserId: options.relatedEntityIds?.userId,
      relatedTeamId: options.relatedEntityIds?.teamId,
      relatedChallengeId: options.relatedEntityIds?.challengeId,
      relatedPostId: options.relatedEntityIds?.postId,
      relatedGoalId: options.relatedEntityIds?.goalId,
      relatedTaskId: options.relatedEntityIds?.taskId,
      actionUrl: options.actionUrl,
      scheduledFor: options.scheduledFor,
    }).returning();

    return notification;
  }

  private async batchNotification(
    options: CreateNotificationOptions, 
    prefs: NotificationPreferences
  ): Promise<Notification> {
    const userId = options.userId;
    
    // Add to batch
    if (!this.batchedNotifications.has(userId)) {
      this.batchedNotifications.set(userId, []);
    }
    this.batchedNotifications.get(userId)!.push(options);

    // Set timeout if not already set
    if (!this.batchTimeouts.has(userId)) {
      const timeout = setTimeout(async () => {
        await this.sendBatchedNotifications(userId);
      }, (prefs.batchingInterval || 15) * 60 * 1000); // Convert minutes to ms

      this.batchTimeouts.set(userId, timeout);
    }

    // Return a placeholder (notification will be created when batch is sent)
    return {} as Notification;
  }

  private async sendBatchedNotifications(userId: string) {
    const batch = this.batchedNotifications.get(userId);
    if (!batch || batch.length === 0) return;

    // Create a summary notification
    const summaryNotification = await this.saveNotification({
      userId,
      type: 'daily_digest',
      title: `You have ${batch.length} loving updates waiting for you`,
      message: batch.map(n => `• ${n.title}`).join('\n'),
      priority: 'medium',
      category: 'system',
    });

    // Save individual notifications
    for (const notif of batch) {
      await this.saveNotification(notif);
    }

    // Send the summary
    const prefs = await this.getUserPreferences(userId);
    const channels = await this.determineChannels(
      { ...batch[0], type: 'daily_digest' }, 
      prefs
    );
    await this.sendThroughChannels(summaryNotification, channels, prefs);

    // Clear batch
    this.batchedNotifications.delete(userId);
    this.batchTimeouts.delete(userId);
  }

  private async shouldSendNotification(
    options: CreateNotificationOptions,
    prefs: NotificationPreferences | null
  ): Promise<boolean> {
    if (!prefs) return true; // No preferences set, send by default

    // Check priority filter
    if (prefs.priorityOnly && options.priority !== 'high' && options.priority !== 'urgent') {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHoursEnabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = (prefs.quietHoursStart || '22:00').split(':').map(Number);
      const [endHour, endMin] = (prefs.quietHoursEnd || '08:00').split(':').map(Number);
      
      const quietStart = startHour * 60 + startMin;
      const quietEnd = endHour * 60 + endMin;
      
      // Handle overnight quiet hours
      if (quietStart > quietEnd) {
        if (currentTime >= quietStart || currentTime <= quietEnd) {
          return false; // Within quiet hours
        }
      } else {
        if (currentTime >= quietStart && currentTime <= quietEnd) {
          return false; // Within quiet hours
        }
      }
    }

    // Check type-specific settings
    const typeSettings = prefs.typeSettings as any;
    if (typeSettings && typeSettings[options.type]) {
      const settings = typeSettings[options.type];
      // If all channels are disabled for this type, don't send
      if (!settings.inApp && !settings.email && !settings.push) {
        return false;
      }
    }

    return true;
  }

  private async determineChannels(
    options: CreateNotificationOptions,
    prefs: NotificationPreferences | null
  ): Promise<NotificationChannel[]> {
    const channels: NotificationChannel[] = [];
    
    if (!prefs) {
      // Default channels if no preferences
      return ['inApp'];
    }

    const typeSettings = prefs.typeSettings as any;
    const specificSettings = typeSettings?.[options.type];

    // Check each channel
    if (prefs.inAppEnabled && (!specificSettings || specificSettings.inApp !== false)) {
      channels.push('inApp');
    }

    if (prefs.emailEnabled && (!specificSettings || specificSettings.email !== false)) {
      // Check email frequency setting
      if (prefs.emailFrequency === 'realtime' || options.priority === 'urgent') {
        channels.push('email');
      }
    }

    if (prefs.pushEnabled && prefs.pushSubscription && (!specificSettings || specificSettings.push !== false)) {
      channels.push('push');
    }

    // Override with explicit channels if provided
    if (options.channels && options.channels.length > 0) {
      return options.channels.filter(c => channels.includes(c));
    }

    return channels;
  }

  private async sendThroughChannels(
    notification: Notification,
    channels: NotificationChannel[],
    prefs: NotificationPreferences | null
  ) {
    for (const channel of channels) {
      switch (channel) {
        case 'inApp':
          await this.sendInAppNotification(notification);
          break;
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'push':
          if (prefs?.pushSubscription) {
            await this.sendPushNotification(notification, prefs.pushSubscription as any);
          }
          break;
      }
    }

    // Mark notification as sent
    await db.update(notifications)
      .set({ 
        sentAt: new Date(),
        isEmail: channels.includes('email'),
        isPush: channels.includes('push')
      })
      .where(eq(notifications.id, notification.id));
  }

  private async sendInAppNotification(notification: Notification) {
    // Send via Socket.IO if connected
    if (this.io) {
      this.io.to(`user:${notification.userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
      });
    }
  }

  private async sendEmailNotification(notification: Notification) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email not configured, skipping email notification');
      return;
    }

    // Get user email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, notification.userId))
      .limit(1);

    if (!user?.email) return;

    const emailTemplate = this.getEmailTemplate(notification);

    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'LiLove <noreply@lilove.com>',
        to: user.email,
        subject: notification.title,
        html: emailTemplate,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  private async sendPushNotification(
    notification: Notification,
    pushSubscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log('Web push not configured, skipping push notification');
      return;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        id: notification.id,
        type: notification.type,
        actionUrl: notification.actionUrl,
      },
    });

    try {
      await webpush.sendNotification(pushSubscription as any, payload);
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private getEmailTemplate(notification: Notification): string {
    // Create beautiful HTML email template based on notification type
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LiLove</h1>
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p>${notification.message?.replace(/\n/g, '<br>')}</p>
            ${notification.actionUrl ? `
              <a href="${process.env.APP_URL || 'http://localhost:5000'}${notification.actionUrl}" class="button">
                View Details
              </a>
            ` : ''}
          </div>
          <div class="footer">
            <p>© 2024 LiLove. All rights reserved.</p>
            <p>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}/settings">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    const [prefs] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    return prefs || null;
  }

  // Update user notification preferences
  async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(notificationPreferences)
        .values({ userId, ...updates })
        .returning();
      return created;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));

    // Send real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:read', notificationId);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    // Send real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:all-read');
    }
  }

  // Clear notification
  async clearNotification(notificationId: string, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isArchived: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));

    // Send real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:cleared', notificationId);
    }
  }

  // Clear all notifications
  async clearAll(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isArchived: true })
      .where(eq(notifications.userId, userId));

    // Send real-time update
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:all-cleared');
    }
  }

  // Get user notifications with filtering
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: NotificationCategory;
      unreadOnly?: boolean;
      includeArchived?: boolean;
    } = {}
  ): Promise<Notification[]> {
    let query = db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        options.includeArchived ? undefined : eq(notifications.isArchived, false),
        options.unreadOnly ? eq(notifications.isRead, false) : undefined,
        options.category ? eq(notifications.category, options.category) : undefined
      ))
      .orderBy(desc(notifications.createdAt))
      .$dynamic();

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false)
      ));

    return Number(result?.count || 0);
  }

  // Schedule a notification
  async scheduleNotification(options: CreateNotificationOptions & { scheduledFor: Date }): Promise<void> {
    // Save the notification with scheduledFor time
    await this.saveNotification(options);
    
    // In production, you'd use a job queue like Bull or Agenda
    // For now, we'll use setTimeout for near-future notifications
    const delay = options.scheduledFor.getTime() - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
      setTimeout(async () => {
        await this.createNotification(options);
      }, delay);
    }
  }

  // Smart notification timing based on user activity patterns
  async getOptimalNotificationTime(userId: string, type: NotificationType): Promise<Date> {
    // Analyze user's past engagement with notifications
    const engagementData = await db.select({
      hour: sql<number>`EXTRACT(HOUR FROM ${notifications.readAt})`,
      count: sql<number>`count(*)`
    })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        sql`${notifications.readAt} IS NOT NULL`
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${notifications.readAt})`)
      .orderBy(sql`count(*) DESC`)
      .limit(3);

    if (engagementData.length > 0) {
      // Return the most engaged hour
      const optimalHour = engagementData[0].hour;
      const now = new Date();
      const optimal = new Date(now);
      optimal.setHours(optimalHour, 0, 0, 0);
      
      // If that time has passed today, schedule for tomorrow
      if (optimal <= now) {
        optimal.setDate(optimal.getDate() + 1);
      }
      
      return optimal;
    }

    // Default to 9 AM if no data
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    if (defaultTime <= new Date()) {
      defaultTime.setDate(defaultTime.getDate() + 1);
    }
    return defaultTime;
  }

  // Send scheduled notifications (should be called periodically)
  async sendScheduledNotifications(): Promise<void> {
    const now = new Date();
    const scheduled = await db.select()
      .from(notifications)
      .where(and(
        lte(notifications.scheduledFor, now),
        isNull(notifications.sentAt)
      ));

    for (const notification of scheduled) {
      const prefs = await this.getUserPreferences(notification.userId);
      const channels = await this.determineChannels(
        {
          userId: notification.userId,
          type: notification.type as NotificationType,
          title: notification.title,
          message: notification.message || '',
          category: notification.category as NotificationCategory,
        },
        prefs
      );
      
      await this.sendThroughChannels(notification, channels, prefs);
    }
  }

  // Create specific notification types
  async sendTaskReminder(userId: string, taskId: string, taskTitle: string, dueTime: Date) {
    const minutesUntilDue = Math.round((dueTime.getTime() - Date.now()) / (1000 * 60));
    
    await this.createNotification({
      userId,
      type: 'task_reminder',
      title: 'Task Due Soon',
      message: `"${taskTitle}" is due in ${minutesUntilDue} minutes`,
      category: 'reminders',
      priority: minutesUntilDue <= 15 ? 'high' : 'medium',
      relatedEntityIds: { taskId },
      actionUrl: '/tasks',
    });
  }

  async sendAchievementUnlocked(userId: string, achievementTitle: string, xpGained: number) {
    await this.createNotification({
      userId,
      type: 'achievement',
      title: 'Achievement Unlocked! 🏆',
      message: `You've unlocked "${achievementTitle}" and earned ${xpGained} XP!`,
      category: 'achievements',
      priority: 'high',
      actionUrl: '/achievements',
    });
  }

  async sendStreakWarning(userId: string, streakDays: number) {
    await this.createNotification({
      userId,
      type: 'streak_warning',
      title: `Don't lose your ${streakDays}-day streak!`,
      message: `Complete a task today to maintain your streak`,
      category: 'engagement',
      priority: 'urgent',
      actionUrl: '/tasks',
    });
  }

  async sendLevelUp(userId: string, newLevel: number) {
    await this.createNotification({
      userId,
      type: 'level_up',
      title: `Level ${newLevel} Achieved! 🎉`,
      message: `Congratulations! You've reached a new level and unlocked new features`,
      category: 'achievements',
      priority: 'high',
      actionUrl: '/profile',
    });
  }

  async sendDailyDigest(userId: string) {
    // Gather user's daily statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's completed tasks by joining with goals to filter by user
    const completedTasks = await db.select()
      .from(tasks)
      .innerJoin(goals, eq(tasks.goalId, goals.id))
      .where(and(
        eq(goals.userId, userId),
        eq(tasks.status, 'completed'),
        gte(tasks.completedAt, today)
      ));

    // Get XP gained today (delta is the XP amount column)
    const xpGained = await db.select({
      total: sql<number>`SUM(${xpTransactions.delta})`
    })
      .from(xpTransactions)
      .where(and(
        eq(xpTransactions.userId, userId),
        gte(xpTransactions.createdAt, today)
      ));

    const message = `
      Today's Summary:
      • Tasks completed: ${completedTasks.length}
      • XP gained: ${xpGained[0]?.total || 0}
      • Keep up the great work!
    `;

    await this.createNotification({
      userId,
      type: 'daily_digest',
      title: 'Your Daily Progress Report',
      message,
      category: 'system',
      priority: 'low',
      actionUrl: '/analytics',
    });
  }
}

export const notificationService = new NotificationService();