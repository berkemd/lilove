// Gamification Service - XP, Levels, Achievements
import { db } from './storage';
import { 
  users, 
  xpTransactions, 
  achievements, 
  userAchievements,
  levels
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export class GamificationService {
  // Calculate XP required for a level
  calculateXPForLevel(level: number): number {
    // Exponential curve: level^2 * 100
    return Math.floor(Math.pow(level, 2) * 100);
  }

  // Award XP to user
  async awardXP(userId: string, amount: number, source: string, sourceId?: string): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
    // Get current user
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      throw new Error('User not found');
    }

    const user = userRecord[0];
    const currentXP = user.xp || 0;
    const currentLevel = user.level || 1;
    const newXP = currentXP + amount;

    // Check if user leveled up
    let newLevel = currentLevel;
    let leveledUp = false;
    
    while (newXP >= this.calculateXPForLevel(newLevel + 1)) {
      newLevel++;
      leveledUp = true;
    }

    // Update user
    await db.update(users)
      .set({ 
        xp: newXP,
        level: newLevel
      })
      .where(eq(users.id, userId));

    // Log XP transaction
    await db.insert(xpTransactions).values({
      userId,
      delta: amount,
      source,
      sourceId,
      reason: `Earned ${amount} XP from ${source}`
    });

    return {
      newXP,
      newLevel,
      leveledUp
    };
  }

  // Check and unlock achievements
  async checkAchievements(userId: string, context: any): Promise<string[]> {
    const unlockedAchievements: string[] = [];

    // Get all achievements
    const allAchievements = await db.select().from(achievements);

    // Get user's unlocked achievements
    const userAchievementsRecord = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlockedIds = new Set(userAchievementsRecord.map(ua => ua.achievementId));

    // Check each achievement
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) {
        continue; // Already unlocked
      }

      // Check achievement criteria based on type
      let shouldUnlock = false;

      if (achievement.category === 'productivity') {
        // Check productivity achievements
        if (achievement.name === 'First Task' && context.tasksCompleted >= 1) {
          shouldUnlock = true;
        } else if (achievement.name === 'Task Master' && context.tasksCompleted >= 100) {
          shouldUnlock = true;
        }
      } else if (achievement.category === 'consistency') {
        // Check consistency achievements  
        if (achievement.name === 'Week Warrior' && context.loginStreak >= 7) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        // Unlock achievement
        await db.insert(userAchievements).values({
          userId,
          achievementId: achievement.id,
          unlockedAt: new Date()
        });

        // Award XP
        if (achievement.xpReward) {
          await this.awardXP(userId, achievement.xpReward, 'achievement', achievement.id);
        }

        unlockedAchievements.push(achievement.id);
      }
    }

    return unlockedAchievements;
  }

  // Get user's gamification stats
  async getUserStats(userId: string) {
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      throw new Error('User not found');
    }

    const user = userRecord[0];
    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const xpForNextLevel = this.calculateXPForLevel(currentLevel + 1);
    const xpForCurrentLevel = this.calculateXPForLevel(currentLevel);
    const xpProgress = currentXP - xpForCurrentLevel;
    const xpRequired = xpForNextLevel - xpForCurrentLevel;

    // Get achievements
    const userAchievementsRecord = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    return {
      level: currentLevel,
      xp: currentXP,
      xpForNextLevel,
      xpProgress,
      xpRequired,
      xpPercentage: Math.floor((xpProgress / xpRequired) * 100),
      coins: user.coins || 0,
      achievementsUnlocked: userAchievementsRecord.length,
      loginStreak: user.loginStreak || 0
    };
  }
}

export const gamificationService = new GamificationService();
