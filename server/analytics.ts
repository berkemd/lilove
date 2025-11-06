// Analytics Service - Track user behavior and provide insights
import { db } from './storage';
import { usageStatistics, users, goals, tasks, habits } from '@shared/schema';
import { eq, and, gte, desc, count, sql } from 'drizzle-orm';

export class AnalyticsService {
  async trackEvent(userId: string, eventType: string, eventData: any = {}) {
    // Log event for analytics - sanitize eventType to prevent format string issues
    const sanitizedEventType = String(eventType).replace(/%/g, '');
    console.log('Analytics event:', sanitizedEventType, 'for user', userId, eventData);
    
    // In a real implementation, this would send to an analytics service like PostHog
    return { success: true };
  }

  async getUserStats(userId: string) {
    // Get user statistics
    const [goalsCount] = await db.select({ count: count() })
      .from(goals)
      .where(eq(goals.userId, userId));

    const [tasksCount] = await db.select({ count: count() })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const [habitsCount] = await db.select({ count: count() })
      .from(habits)
      .where(eq(habits.userId, userId));

    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRecord[0];

    return {
      goalsCount: goalsCount.count,
      tasksCount: tasksCount.count,
      habitsCount: habitsCount.count,
      level: user?.level || 1,
      xp: user?.xp || 0,
      coins: user?.coins || 0,
      loginStreak: user?.loginStreak || 0
    };
  }

  async getInsights(userId: string) {
    // Generate insights based on user activity
    const stats = await this.getUserStats(userId);
    
    const insights = [];

    if (stats.loginStreak >= 7) {
      insights.push({
        type: 'achievement',
        message: `Amazing! You're on a ${stats.loginStreak}-day streak!`
      });
    }

    if (stats.goalsCount === 0) {
      insights.push({
        type: 'suggestion',
        message: 'Start by creating your first goal to begin your growth journey.'
      });
    }

    return insights;
  }
}

export const analyticsService = new AnalyticsService();
