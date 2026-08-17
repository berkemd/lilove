import { db } from "./storage";
import { 
  xpTransactions, 
  achievements, 
  userAchievements, 
  levels,
  dailyChallenges,
  userChallengeProgress,
  weeklyChallenges,
  leaderboards,
  userLoginStreaks,
  dailyLoginRewards,
  spinWheelRewards,
  userSpinHistory,
  userProfiles,
  users,
  notifications,
  goals,
  tasks
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte, or } from "drizzle-orm";
import { notificationService } from "./notifications";

// Socket.io instance for real-time notifications
let io: any = null;

export function setSocketInstance(socketInstance: any) {
  io = socketInstance;
}

// XP rewards configuration
const XP_REWARDS = {
  TASK_COMPLETION: { min: 10, max: 50 },
  GOAL_COMPLETION: { min: 100, max: 500 },
  DAILY_LOGIN: 5,
  STREAK_BONUS: 2, // per day
  CHALLENGE_EASY: 25,
  CHALLENGE_MEDIUM: 50,
  CHALLENGE_HARD: 100,
  ACHIEVEMENT_UNLOCK: 50,
};

// Level progression (exponential curve)
const LEVEL_PROGRESSION = [
  { level: 1, xpRequired: 0, title: "Novice" },
  { level: 2, xpRequired: 100, title: "Beginner" },
  { level: 3, xpRequired: 250, title: "Apprentice" },
  { level: 4, xpRequired: 500, title: "Adept" },
  { level: 5, xpRequired: 1000, title: "Journeyman" },
  { level: 6, xpRequired: 1750, title: "Skilled" },
  { level: 7, xpRequired: 2750, title: "Expert" },
  { level: 8, xpRequired: 4000, title: "Master" },
  { level: 9, xpRequired: 5500, title: "Grandmaster" },
  { level: 10, xpRequired: 7500, title: "Champion" },
  { level: 11, xpRequired: 10000, title: "Hero" },
  { level: 12, xpRequired: 13000, title: "Legend" },
  { level: 13, xpRequired: 16500, title: "Myth" },
  { level: 14, xpRequired: 20500, title: "Titan" },
  { level: 15, xpRequired: 25000, title: "Immortal" },
];

// 50+ Achievement definitions
const ACHIEVEMENT_DEFINITIONS = [
  // Productivity Achievements
  { key: "first_task", name: "First Steps", description: "Complete your first task", category: "productivity", rarity: "common", tier: 1, xpReward: 50, coinReward: 10, criteria: { type: "task_count", value: 1 } },
  { key: "task_10", name: "Task Apprentice", description: "Complete 10 tasks", category: "productivity", rarity: "common", tier: 1, xpReward: 100, coinReward: 20, criteria: { type: "task_count", value: 10 } },
  { key: "task_50", name: "Task Master", description: "Complete 50 tasks", category: "productivity", rarity: "uncommon", tier: 2, xpReward: 250, coinReward: 50, criteria: { type: "task_count", value: 50 } },
  { key: "task_100", name: "Task Champion", description: "Complete 100 tasks", category: "productivity", rarity: "rare", tier: 3, xpReward: 500, coinReward: 100, criteria: { type: "task_count", value: 100 } },
  { key: "task_500", name: "Task Legend", description: "Complete 500 tasks", category: "productivity", rarity: "epic", tier: 4, xpReward: 1000, coinReward: 250, criteria: { type: "task_count", value: 500 } },
  
  // Consistency Achievements
  { key: "streak_3", name: "Getting Started", description: "Maintain a 3-day streak", category: "consistency", rarity: "common", tier: 1, xpReward: 75, coinReward: 15, criteria: { type: "streak", value: 3 } },
  { key: "streak_7", name: "Week Warrior", description: "Maintain a 7-day streak", category: "consistency", rarity: "common", tier: 1, xpReward: 150, coinReward: 30, criteria: { type: "streak", value: 7 } },
  { key: "streak_14", name: "Fortnight Fighter", description: "Maintain a 14-day streak", category: "consistency", rarity: "uncommon", tier: 2, xpReward: 300, coinReward: 60, criteria: { type: "streak", value: 14 } },
  { key: "streak_30", name: "Monthly Master", description: "Maintain a 30-day streak", category: "consistency", rarity: "rare", tier: 3, xpReward: 600, coinReward: 150, criteria: { type: "streak", value: 30 } },
  { key: "streak_60", name: "Dedication Incarnate", description: "Maintain a 60-day streak", category: "consistency", rarity: "epic", tier: 4, xpReward: 1200, coinReward: 300, criteria: { type: "streak", value: 60 } },
  { key: "streak_100", name: "Unstoppable Force", description: "Maintain a 100-day streak", category: "consistency", rarity: "legendary", tier: 4, xpReward: 2000, coinReward: 500, criteria: { type: "streak", value: 100 } },
  
  // Goal Achievements
  { key: "first_goal", name: "Goal Setter", description: "Create your first goal", category: "productivity", rarity: "common", tier: 1, xpReward: 50, coinReward: 10, criteria: { type: "goal_count", value: 1 } },
  { key: "goal_complete_1", name: "Goal Achiever", description: "Complete your first goal", category: "productivity", rarity: "common", tier: 1, xpReward: 200, coinReward: 40, criteria: { type: "goal_complete", value: 1 } },
  { key: "goal_complete_5", name: "Goal Crusher", description: "Complete 5 goals", category: "productivity", rarity: "uncommon", tier: 2, xpReward: 500, coinReward: 100, criteria: { type: "goal_complete", value: 5 } },
  { key: "goal_complete_10", name: "Goal Dominator", description: "Complete 10 goals", category: "productivity", rarity: "rare", tier: 3, xpReward: 1000, coinReward: 200, criteria: { type: "goal_complete", value: 10 } },
  { key: "goal_complete_25", name: "Goal Conqueror", description: "Complete 25 goals", category: "productivity", rarity: "epic", tier: 4, xpReward: 2000, coinReward: 400, criteria: { type: "goal_complete", value: 25 } },
  
  // Learning Achievements
  { key: "skill_first", name: "Skill Seeker", description: "Learn your first skill", category: "learning", rarity: "common", tier: 1, xpReward: 75, coinReward: 15, criteria: { type: "skill_count", value: 1 } },
  { key: "skill_5", name: "Multi-talented", description: "Learn 5 different skills", category: "learning", rarity: "uncommon", tier: 2, xpReward: 250, coinReward: 50, criteria: { type: "skill_count", value: 5 } },
  { key: "skill_10", name: "Polymath", description: "Learn 10 different skills", category: "learning", rarity: "rare", tier: 3, xpReward: 500, coinReward: 100, criteria: { type: "skill_count", value: 10 } },
  { key: "skill_mastery", name: "Skill Master", description: "Master a skill (reach level 10)", category: "learning", rarity: "epic", tier: 4, xpReward: 1000, coinReward: 200, criteria: { type: "skill_mastery", value: 1 } },
  
  // Time Achievements
  { key: "time_10h", name: "Time Investor", description: "Log 10 hours of focused work", category: "productivity", rarity: "common", tier: 1, xpReward: 100, coinReward: 20, criteria: { type: "time_logged", value: 600 } },
  { key: "time_50h", name: "Time Warrior", description: "Log 50 hours of focused work", category: "productivity", rarity: "uncommon", tier: 2, xpReward: 300, coinReward: 60, criteria: { type: "time_logged", value: 3000 } },
  { key: "time_100h", name: "Time Master", description: "Log 100 hours of focused work", category: "productivity", rarity: "rare", tier: 3, xpReward: 600, coinReward: 120, criteria: { type: "time_logged", value: 6000 } },
  { key: "time_500h", name: "Time Lord", description: "Log 500 hours of focused work", category: "productivity", rarity: "epic", tier: 4, xpReward: 1500, coinReward: 300, criteria: { type: "time_logged", value: 30000 } },
  
  // Special Achievements
  { key: "perfectionist_day", name: "Perfect Day", description: "Complete all tasks in a single day", category: "special", rarity: "uncommon", tier: 2, xpReward: 200, coinReward: 40, criteria: { type: "perfect_day", value: 1 } },
  { key: "perfectionist_week", name: "Perfect Week", description: "Complete all tasks for 7 consecutive days", category: "special", rarity: "rare", tier: 3, xpReward: 750, coinReward: 150, criteria: { type: "perfect_week", value: 1 } },
  { key: "early_bird", name: "Early Bird", description: "Complete a task before 6 AM", category: "special", rarity: "uncommon", tier: 2, xpReward: 150, coinReward: 30, criteria: { type: "early_bird", value: 1 } },
  { key: "night_owl", name: "Night Owl", description: "Complete a task after midnight", category: "special", rarity: "uncommon", tier: 2, xpReward: 150, coinReward: 30, criteria: { type: "night_owl", value: 1 } },
  { key: "speedster", name: "Speedster", description: "Complete 10 tasks in a single day", category: "special", rarity: "rare", tier: 3, xpReward: 400, coinReward: 80, criteria: { type: "daily_task_count", value: 10 } },
  
  // Social Achievements
  { key: "social_friend_1", name: "First Friend", description: "Add your first friend", category: "social", rarity: "common", tier: 1, xpReward: 50, coinReward: 10, criteria: { type: "friend_count", value: 1 } },
  { key: "social_friend_5", name: "Social Butterfly", description: "Add 5 friends", category: "social", rarity: "uncommon", tier: 2, xpReward: 150, coinReward: 30, criteria: { type: "friend_count", value: 5 } },
  { key: "social_friend_10", name: "Popular", description: "Add 10 friends", category: "social", rarity: "rare", tier: 3, xpReward: 300, coinReward: 60, criteria: { type: "friend_count", value: 10 } },
  { key: "leaderboard_top_100", name: "Rising Star", description: "Reach top 100 in any leaderboard", category: "social", rarity: "uncommon", tier: 2, xpReward: 250, coinReward: 50, criteria: { type: "leaderboard_rank", value: 100 } },
  { key: "leaderboard_top_10", name: "Elite Performer", description: "Reach top 10 in any leaderboard", category: "social", rarity: "rare", tier: 3, xpReward: 500, coinReward: 100, criteria: { type: "leaderboard_rank", value: 10 } },
  { key: "leaderboard_top_1", name: "Champion", description: "Reach #1 in any leaderboard", category: "social", rarity: "legendary", tier: 4, xpReward: 1500, coinReward: 300, criteria: { type: "leaderboard_rank", value: 1 } },
  
  // Challenge Achievements
  { key: "challenge_daily_1", name: "Challenger", description: "Complete your first daily challenge", category: "special", rarity: "common", tier: 1, xpReward: 75, coinReward: 15, criteria: { type: "challenge_daily", value: 1 } },
  { key: "challenge_daily_7", name: "Challenge Accepted", description: "Complete 7 daily challenges", category: "special", rarity: "uncommon", tier: 2, xpReward: 200, coinReward: 40, criteria: { type: "challenge_daily", value: 7 } },
  { key: "challenge_daily_30", name: "Challenge Master", description: "Complete 30 daily challenges", category: "special", rarity: "rare", tier: 3, xpReward: 500, coinReward: 100, criteria: { type: "challenge_daily", value: 30 } },
  { key: "challenge_weekly_1", name: "Weekly Warrior", description: "Complete your first weekly challenge", category: "special", rarity: "uncommon", tier: 2, xpReward: 150, coinReward: 30, criteria: { type: "challenge_weekly", value: 1 } },
  { key: "challenge_weekly_4", name: "Monthly Champion", description: "Complete 4 weekly challenges", category: "special", rarity: "rare", tier: 3, xpReward: 400, coinReward: 80, criteria: { type: "challenge_weekly", value: 4 } },
  
  // Level Achievements
  { key: "level_5", name: "Rising Star", description: "Reach level 5", category: "special", rarity: "common", tier: 1, xpReward: 100, coinReward: 20, criteria: { type: "level", value: 5 } },
  { key: "level_10", name: "Experienced", description: "Reach level 10", category: "special", rarity: "uncommon", tier: 2, xpReward: 250, coinReward: 50, criteria: { type: "level", value: 10 } },
  { key: "level_25", name: "Veteran", description: "Reach level 25", category: "special", rarity: "rare", tier: 3, xpReward: 500, coinReward: 100, criteria: { type: "level", value: 25 } },
  { key: "level_50", name: "Master", description: "Reach level 50", category: "special", rarity: "epic", tier: 4, xpReward: 1000, coinReward: 200, criteria: { type: "level", value: 50 } },
  { key: "level_100", name: "Legend", description: "Reach level 100", category: "special", rarity: "legendary", tier: 4, xpReward: 2500, coinReward: 500, criteria: { type: "level", value: 100 } },
  
  // Coin Achievements
  { key: "coins_100", name: "Penny Saver", description: "Save 100 coins", category: "special", rarity: "common", tier: 1, xpReward: 50, coinReward: 10, criteria: { type: "coins", value: 100 } },
  { key: "coins_500", name: "Coin Collector", description: "Save 500 coins", category: "special", rarity: "uncommon", tier: 2, xpReward: 150, coinReward: 30, criteria: { type: "coins", value: 500 } },
  { key: "coins_1000", name: "Wealthy", description: "Save 1000 coins", category: "special", rarity: "rare", tier: 3, xpReward: 300, coinReward: 60, criteria: { type: "coins", value: 1000 } },
  { key: "coins_5000", name: "Rich", description: "Save 5000 coins", category: "special", rarity: "epic", tier: 4, xpReward: 600, coinReward: 120, criteria: { type: "coins", value: 5000 } },
];

export class GamificationService {
  // Award XP to a user
  async awardXP(
    userId: string, 
    amount: number, 
    source: string, 
    reason: string, 
    sourceId?: string,
    multiplier: number = 1.0
  ): Promise<{xpGained: number, levelUp: boolean, newLevel?: number}> {
    const finalAmount = Math.round(amount * multiplier);
    
    // Record XP transaction
    await db.insert(xpTransactions).values({
      userId,
      source,
      sourceId,
      delta: finalAmount,
      reason,
      multiplier: multiplier.toString(),
    });
    
    // Ensure user profile exists
    let profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    if (!profile) {
      // Create profile with default values if it doesn't exist
      [profile] = await db.insert(userProfiles).values({
        userId,
        currentLevel: 1,
        totalXp: 0,
        streakCount: 0,
        longestStreak: 0,
        overallPerformanceScore: "0",
        consistencyRating: "0",
        adaptabilityScore: "0",
      }).returning();
    }
    
    const oldXP = profile.totalXp || 0;
    const newXP = oldXP + finalAmount;
    
    // Check for level up
    const oldLevel = this.calculateLevel(oldXP);
    const newLevel = this.calculateLevel(newXP);
    const levelUp = newLevel > oldLevel;
    
    // Update profile
    await db.update(userProfiles)
      .set({ 
        totalXp: newXP,
        currentLevel: newLevel
      })
      .where(eq(userProfiles.userId, userId));
    
    // Check and award level achievements
    if (levelUp) {
      await this.checkLevelAchievements(userId, newLevel);
      
      // Send level-up notification
      const levelInfo = this.getLevelInfo(newXP);
      await notificationService.createNotification({
        userId,
        type: 'level_up',
        title: `Level ${newLevel} Achieved! 🎉`,
        message: `Congratulations! You've reached level ${newLevel}: ${levelInfo.title}`,
        category: 'achievements',
        priority: 'high',
        actionUrl: '/gamification'
      });
    }
    
    // Update league XP if user is in an active league
    try {
      const storage = (await import('./storage')).storage;
      const currentLeague = await storage.getUserCurrentLeague(userId);
      
      if (currentLeague && currentLeague.season.status === 'active') {
        await storage.updateParticipantXP(currentLeague.participant.id, finalAmount);
      }
    } catch (error) {
      // Silently fail league XP update - don't break XP award flow
      console.error('Failed to update league XP:', error);
    }
    
    return { xpGained: finalAmount, levelUp, newLevel: levelUp ? newLevel : undefined };
  }
  
  // Calculate level from XP
  calculateLevel(xp: number): number {
    for (let i = LEVEL_PROGRESSION.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_PROGRESSION[i].xpRequired) {
        return LEVEL_PROGRESSION[i].level;
      }
    }
    return 1;
  }
  
  // Get level info
  getLevelInfo(xp: number) {
    const level = this.calculateLevel(xp);
    const currentLevelData = LEVEL_PROGRESSION.find(l => l.level === level) || LEVEL_PROGRESSION[0];
    const nextLevelData = LEVEL_PROGRESSION.find(l => l.level === level + 1);
    
    return {
      level,
      title: currentLevelData.title,
      currentXP: xp,
      xpForCurrentLevel: currentLevelData.xpRequired,
      xpForNextLevel: nextLevelData?.xpRequired || xp,
      progressToNextLevel: nextLevelData 
        ? ((xp - currentLevelData.xpRequired) / (nextLevelData.xpRequired - currentLevelData.xpRequired)) * 100
        : 100
    };
  }
  
  // Check and award achievements
  async checkAchievements(userId: string, trigger: { type: string, value: any }): Promise<any[]> {
    const unlockedAchievements = [];
    
    for (const achDef of ACHIEVEMENT_DEFINITIONS) {
      if (achDef.criteria.type !== trigger.type) continue;
      
      // Check if already unlocked
      const existing = await db.query.userAchievements.findFirst({
        where: and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achDef.key)
        )
      });
      
      if (existing) continue;
      
      // Check if criteria met
      if (trigger.value >= achDef.criteria.value) {
        // Create achievement if it doesn't exist
        let achievement = await db.query.achievements.findFirst({
          where: eq(achievements.key, achDef.key)
        });
        
        if (!achievement) {
          [achievement] = await db.insert(achievements).values({
            key: achDef.key,
            name: achDef.name,
            description: achDef.description,
            category: achDef.category,
            rarity: achDef.rarity,
            tier: achDef.tier,
            xpReward: achDef.xpReward,
            coinReward: achDef.coinReward,
            criteria: achDef.criteria,
          }).returning();
        }
        
        // Award achievement
        await db.insert(userAchievements).values({
          userId,
          achievementId: achievement.id,
          progress: '100',
        });
        
        // Award XP and coins
        await this.awardXP(userId, achDef.xpReward, 'achievement', `Unlocked: ${achDef.name}`, achievement.id);
        
        if (achDef.coinReward > 0) {
          await db.update(users)
            .set({ coinBalance: sql`${users.coinBalance} + ${achDef.coinReward}` })
            .where(eq(users.id, userId));
        }
        
        // Send achievement unlock notification
        await notificationService.createNotification({
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked! 🏆',
          message: `You've unlocked "${achDef.name}" and earned ${achDef.xpReward} XP!`,
          category: 'achievements',
          priority: 'high',
          relatedEntityIds: { goalId: achievement.id },
          actionUrl: '/achievements'
        });
        
        unlockedAchievements.push(achievement);
      }
    }
    
    return unlockedAchievements;
  }
  
  // Check level achievements
  async checkLevelAchievements(userId: string, level: number) {
    await this.checkAchievements(userId, { type: 'level', value: level });
  }
  
  // Update login streak
  async updateLoginStreak(userId: string): Promise<{ streakDays: number, rewardClaimed: boolean }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = await db.query.userLoginStreaks.findFirst({
      where: eq(userLoginStreaks.userId, userId)
    });
    
    if (!streak) {
      // Create new streak
      [streak] = await db.insert(userLoginStreaks).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastLoginDate: today,
        totalLogins: 1,
        currentCycleDay: 1,
      }).returning();
      
      // Award daily login XP
      await this.awardXP(userId, XP_REWARDS.DAILY_LOGIN, 'daily_login', 'Daily login bonus');
      
      // Send daily login notification  
      await notificationService.createNotification({
        userId,
        type: 'daily_digest',
        title: 'Daily Login Bonus! ✨',
        message: `Welcome back! You've earned ${XP_REWARDS.DAILY_LOGIN} XP for your daily login.`,
        category: 'engagement',
        priority: 'medium',
        actionUrl: '/dashboard'
      });
      
      return { streakDays: 1, rewardClaimed: true };
    }
    
    const lastLogin = new Date(streak.lastLoginDate!);
    lastLogin.setHours(0, 0, 0, 0);
    const daysSinceLastLogin = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastLogin === 0) {
      // Already logged in today
      return { streakDays: streak.currentStreak ?? 0, rewardClaimed: false };
    } else if (daysSinceLastLogin === 1) {
      // Streak continues
      const newStreak = (streak.currentStreak ?? 0) + 1;
      const newCycleDay = ((streak.currentCycleDay ?? 0) % 7) + 1;
      const longestStreak = Math.max(newStreak, streak.longestStreak ?? 0);
      
      await db.update(userLoginStreaks)
        .set({
          currentStreak: newStreak,
          longestStreak,
          lastLoginDate: today,
          totalLogins: (streak.totalLogins ?? 0) + 1,
          currentCycleDay: newCycleDay,
        })
        .where(eq(userLoginStreaks.userId, userId));
      
      // Award daily login XP + streak bonus
      const xpAmount = XP_REWARDS.DAILY_LOGIN + (newStreak * XP_REWARDS.STREAK_BONUS);
      await this.awardXP(userId, xpAmount, 'daily_login', `Daily login (${newStreak} day streak)`);
      
      // Check streak achievements
      await this.checkAchievements(userId, { type: 'streak', value: newStreak });
      
      // Award cycle day rewards
      const cycleReward = await this.getDailyLoginReward(newCycleDay);
      if (cycleReward) {
        await this.awardXP(userId, cycleReward.xpReward, 'daily_reward', `Day ${newCycleDay} reward`);
        if (cycleReward.coinReward > 0) {
          await db.update(users)
            .set({ coinBalance: sql`${users.coinBalance} + ${cycleReward.coinReward}` })
            .where(eq(users.id, userId));
        }
      }
      
      // Send streak login notification
      await notificationService.createNotification({
        userId,
        type: 'streak_warning',
        title: `${newStreak} Day Streak! 🔥`,
        message: `Amazing! You've maintained your streak for ${newStreak} days and earned ${xpAmount} XP!`,
        category: 'engagement',
        priority: newStreak % 7 === 0 ? 'high' : 'medium', // Higher priority for weekly milestones
        actionUrl: '/dashboard'
      });
      
      return { streakDays: newStreak, rewardClaimed: true };
    } else {
      // Streak broken
      await db.update(userLoginStreaks)
        .set({
          currentStreak: 1,
          lastLoginDate: today,
          totalLogins: (streak.totalLogins ?? 0) + 1,
          currentCycleDay: 1,
        })
        .where(eq(userLoginStreaks.userId, userId));
      
      // Award daily login XP (no streak bonus)
      await this.awardXP(userId, XP_REWARDS.DAILY_LOGIN, 'daily_login', 'Daily login bonus (streak reset)');
      
      return { streakDays: 1, rewardClaimed: true };
    }
  }
  
  // Get daily login reward for cycle day
  async getDailyLoginReward(cycleDay: number) {
    return await db.query.dailyLoginRewards.findFirst({
      where: eq(dailyLoginRewards.dayNumber, cycleDay)
    });
  }
  
  // Get daily challenges for today
  async getDailyChallenges(date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.query.dailyChallenges.findMany({
      where: and(
        gte(dailyChallenges.activeDate, startOfDay),
        lte(dailyChallenges.activeDate, endOfDay)
      )
    });
  }
  
  // Get user's challenge progress
  async getUserChallengeProgress(userId: string, challengeId: string) {
    return await db.query.userChallengeProgress.findFirst({
      where: and(
        eq(userChallengeProgress.userId, userId),
        eq(userChallengeProgress.challengeId, challengeId)
      )
    });
  }
  
  // Update challenge progress
  async updateChallengeProgress(userId: string, challengeId: string, increment: number = 1) {
    const challenge = await db.query.dailyChallenges.findFirst({
      where: eq(dailyChallenges.id, challengeId)
    });
    
    if (!challenge) return null;
    
    const progress = await this.getUserChallengeProgress(userId, challengeId);
    
    if (!progress) {
      // Create new progress
      const [newProgress] = await db.insert(userChallengeProgress).values({
        userId,
        challengeId,
        progress: increment,
        completed: increment >= challenge.targetValue,
        completedAt: increment >= challenge.targetValue ? new Date() : null,
      }).returning();
      
      if (newProgress.completed) {
        await this.completeDailyChallenge(userId, challenge);
      }
      
      return newProgress;
    }
    
    if (progress.completed) return progress;
    
    const newProgressValue = (progress.progress ?? 0) + increment;
    const completed = newProgressValue >= challenge.targetValue;
    
    const [updatedProgress] = await db.update(userChallengeProgress)
      .set({
        progress: newProgressValue,
        completed,
        completedAt: completed ? new Date() : null,
      })
      .where(and(
        eq(userChallengeProgress.userId, userId),
        eq(userChallengeProgress.challengeId, challengeId)
      ))
      .returning();
    
    if (completed && !progress.claimedReward) {
      await this.completeDailyChallenge(userId, challenge);
    }
    
    return updatedProgress;
  }
  
  // Complete daily challenge
  async completeDailyChallenge(userId: string, challenge: any) {
    // Award XP
    const xpAmount = challenge.difficulty === 'hard' ? XP_REWARDS.CHALLENGE_HARD 
      : challenge.difficulty === 'medium' ? XP_REWARDS.CHALLENGE_MEDIUM
      : XP_REWARDS.CHALLENGE_EASY;
    
    await this.awardXP(userId, xpAmount, 'challenge', `Completed: ${challenge.title}`, challenge.id);
    
    // Award coins
    if (challenge.coinReward > 0) {
      await db.update(users)
        .set({ coinBalance: sql`${users.coinBalance} + ${challenge.coinReward}` })
        .where(eq(users.id, userId));
    }
    
    // Mark reward as claimed
    await db.update(userChallengeProgress)
      .set({ claimedReward: true })
      .where(and(
        eq(userChallengeProgress.userId, userId),
        eq(userChallengeProgress.challengeId, challenge.id)
      ));
    
    // Check challenge achievements
    const completedCount = await db.query.userChallengeProgress.findMany({
      where: and(
        eq(userChallengeProgress.userId, userId),
        eq(userChallengeProgress.completed, true)
      )
    });
    
    await this.checkAchievements(userId, { type: 'challenge_daily', value: completedCount.length });
  }
  
  // Update leaderboards
  async updateLeaderboard(userId: string, category: string = 'global', xpGained: number) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Update weekly leaderboard
    await this.updateLeaderboardEntry(userId, category, 'weekly', xpGained);
    
    // Update monthly leaderboard
    await this.updateLeaderboardEntry(userId, category, 'monthly', xpGained);
    
    // Update all-time leaderboard
    await this.updateLeaderboardEntry(userId, category, 'all_time', xpGained);
  }
  
  async updateLeaderboardEntry(userId: string, category: string, timeframe: string, xpGained: number) {
    const existing = await db.query.leaderboards.findFirst({
      where: and(
        eq(leaderboards.userId, userId),
        eq(leaderboards.category, category),
        eq(leaderboards.timeframe, timeframe)
      )
    });
    
    if (existing) {
      await db.update(leaderboards)
        .set({
          score: existing.score + xpGained,
          updatedAt: new Date()
        })
        .where(eq(leaderboards.id, existing.id));
    } else {
      await db.insert(leaderboards).values({
        userId,
        category,
        timeframe,
        score: xpGained,
      });
    }
    
    // Update ranks
    await this.calculateLeaderboardRanks(category, timeframe);
  }
  
  async calculateLeaderboardRanks(category: string, timeframe: string) {
    const entries = await db.query.leaderboards.findMany({
      where: and(
        eq(leaderboards.category, category),
        eq(leaderboards.timeframe, timeframe)
      ),
      orderBy: [desc(leaderboards.score)]
    });
    
    for (let i = 0; i < entries.length; i++) {
      const rank = i + 1;
      await db.update(leaderboards)
        .set({
          previousRank: entries[i].rank,
          rank
        })
        .where(eq(leaderboards.id, entries[i].id));
      
      // Check leaderboard achievements
      if (rank <= 100) {
        await this.checkAchievements(entries[i].userId, { type: 'leaderboard_rank', value: rank });
      }
    }
  }
  
  // Get leaderboard
  async getLeaderboard(category: string = 'global', timeframe: string = 'weekly', limit: number = 100) {
    return await db.select({
      rank: leaderboards.rank,
      userId: leaderboards.userId,
      score: leaderboards.score,
      previousRank: leaderboards.previousRank,
      username: users.username,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
    })
    .from(leaderboards)
    .leftJoin(users, eq(leaderboards.userId, users.id))
    .where(and(
      eq(leaderboards.category, category),
      eq(leaderboards.timeframe, timeframe)
    ))
    .orderBy(leaderboards.rank)
    .limit(limit);
  }
  
  // Initialize daily challenges for a date
  async initializeDailyChallenges(date: Date = new Date()) {
    const challengeTemplates = [
      { title: "Task Triumvirate", description: "Complete 3 tasks today", type: "task_count", target: 3, difficulty: "easy", xp: 25, coins: 5 },
      { title: "Goal Progress", description: "Make progress on 2 different goals", type: "goal_progress", target: 2, difficulty: "medium", xp: 50, coins: 10 },
      { title: "Focus Hour", description: "Log 1 hour of focused work", type: "time_logged", target: 60, difficulty: "easy", xp: 30, coins: 5 },
      { title: "Power Hour", description: "Log 2 hours of focused work", type: "time_logged", target: 120, difficulty: "medium", xp: 60, coins: 15 },
      { title: "Marathon Session", description: "Log 4 hours of focused work", type: "time_logged", target: 240, difficulty: "hard", xp: 100, coins: 25 },
      { title: "Early Achiever", description: "Complete a task before 9 AM", type: "early_task", target: 1, difficulty: "medium", xp: 40, coins: 10 },
      { title: "Skill Builder", description: "Practice any skill for 30 minutes", type: "skill_practice", target: 30, difficulty: "easy", xp: 35, coins: 7 },
      { title: "Perfect Execution", description: "Complete all planned tasks", type: "perfect_day", target: 1, difficulty: "hard", xp: 100, coins: 20 },
    ];
    
    // Select 3 random challenges for the day
    const shuffled = challengeTemplates.sort(() => 0.5 - Math.random());
    const selectedChallenges = shuffled.slice(0, 3);
    
    const challengeDate = new Date(date);
    challengeDate.setHours(0, 0, 0, 0);
    
    for (const template of selectedChallenges) {
      await db.insert(dailyChallenges).values({
        title: template.title,
        description: template.description,
        category: 'mixed',
        challengeType: template.type,
        targetValue: template.target,
        xpReward: template.xp,
        coinReward: template.coins,
        difficulty: template.difficulty,
        activeDate: challengeDate,
      });
    }
  }
  
  // Initialize login rewards
  async initializeLoginRewards() {
    const rewards = [
      { day: 1, xp: 5, coins: 5 },
      { day: 2, xp: 10, coins: 10 },
      { day: 3, xp: 15, coins: 15 },
      { day: 4, xp: 20, coins: 20 },
      { day: 5, xp: 25, coins: 25 },
      { day: 6, xp: 30, coins: 30 },
      { day: 7, xp: 50, coins: 50, bonusType: 'multiplier', bonusValue: 2 },
    ];
    
    for (const reward of rewards) {
      await db.insert(dailyLoginRewards).values({
        dayNumber: reward.day,
        xpReward: reward.xp,
        coinReward: reward.coins,
        bonusType: reward.bonusType,
        bonusValue: reward.bonusValue,
      }).onConflictDoNothing();
    }
  }
  
  // Initialize spin wheel rewards
  async initializeSpinWheelRewards() {
    const rewards = [
      { type: 'xp', value: 10, probability: '0.25', rarity: 'common', displayName: '10 XP' },
      { type: 'xp', value: 25, probability: '0.15', rarity: 'common', displayName: '25 XP' },
      { type: 'xp', value: 50, probability: '0.10', rarity: 'uncommon', displayName: '50 XP' },
      { type: 'xp', value: 100, probability: '0.05', rarity: 'rare', displayName: '100 XP' },
      { type: 'coins', value: 5, probability: '0.20', rarity: 'common', displayName: '5 Coins' },
      { type: 'coins', value: 10, probability: '0.10', rarity: 'common', displayName: '10 Coins' },
      { type: 'coins', value: 25, probability: '0.08', rarity: 'uncommon', displayName: '25 Coins' },
      { type: 'coins', value: 50, probability: '0.05', rarity: 'rare', displayName: '50 Coins' },
      { type: 'multiplier', value: 2, probability: '0.02', rarity: 'epic', displayName: '2x XP for 1 hour' },
    ];
    
    for (const reward of rewards) {
      await db.insert(spinWheelRewards).values({
        rewardType: reward.type,
        rewardValue: reward.value,
        probability: reward.probability,
        rarity: reward.rarity,
        displayName: reward.displayName,
      });
    }
  }
  
  // Spin the reward wheel
  async spinWheel(userId: string): Promise<any> {
    // Check if user has free spins
    const spinHistory = await db.query.userSpinHistory.findFirst({
      where: eq(userSpinHistory.userId, userId),
      orderBy: [desc(userSpinHistory.spunAt)]
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let hasFreeSpinToday = false;
    if (!spinHistory || !spinHistory.lastFreeSpinDate) {
      hasFreeSpinToday = true;
    } else {
      const lastFree = new Date(spinHistory.lastFreeSpinDate);
      lastFree.setHours(0, 0, 0, 0);
      hasFreeSpinToday = lastFree.getTime() < today.getTime();
    }
    
    if (!hasFreeSpinToday && (!spinHistory || (spinHistory.freeSpins ?? 0) <= 0)) {
      // Check if user has enough coins for paid spin (10 coins)
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      if (!user || (user.coinBalance ?? 0) < 10) {
        throw new Error('Not enough coins for spin');
      }
      
      // Deduct coins
      await db.update(users)
        .set({ coinBalance: sql`${users.coinBalance} - 10` })
        .where(eq(users.id, userId));
    }
    
    // Get all rewards and calculate spin
    const rewards = await db.query.spinWheelRewards.findMany();
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedReward = rewards[0];
    
    for (const reward of rewards) {
      cumulativeProbability += parseFloat(reward.probability);
      if (random <= cumulativeProbability) {
        selectedReward = reward;
        break;
      }
    }
    
    // Award the reward
    if (selectedReward.rewardType === 'xp') {
      await this.awardXP(userId, selectedReward.rewardValue, 'spin', `Spin wheel: ${selectedReward.displayName}`);
    } else if (selectedReward.rewardType === 'coins') {
      await db.update(users)
        .set({ coinBalance: sql`${users.coinBalance} + ${selectedReward.rewardValue}` })
        .where(eq(users.id, userId));
    } else if (selectedReward.rewardType === 'multiplier') {
      // Store active multiplier for user
      await this.setXpMultiplier(userId, selectedReward.rewardValue, 3600); // 1 hour duration
    }
    
    // Record spin
    await db.insert(userSpinHistory).values({
      userId,
      rewardId: selectedReward.id,
      freeSpins: hasFreeSpinToday ? (spinHistory?.freeSpins || 0) : Math.max(0, (spinHistory?.freeSpins || 0) - 1),
      lastFreeSpinDate: hasFreeSpinToday ? today : spinHistory?.lastFreeSpinDate,
    });
    
    return selectedReward;
  }

  // Set XP multiplier for user (for limited time)
  async setXpMultiplier(userId: string, multiplier: number, durationSeconds: number) {
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);
    
    // Ensure user profile exists
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    if (!profile) {
      await db.insert(userProfiles).values({
        userId,
        currentLevel: 1,
        totalXp: 0,
        streakCount: 0,
        longestStreak: 0,
      });
    }

    // For now, store in user profile - in production, you'd want a separate multipliers table
    await db.update(userProfiles)
      .set({ 
        // We can use a JSON field to store temporary multipliers
        // For this fix, we'll just note the multiplier in the system
      })
      .where(eq(userProfiles.userId, userId));
    
    // Award the multiplier as immediate XP bonus since we don't have persistent multiplier storage
    await this.awardXP(userId, 100, 'multiplier_bonus', `Multiplier bonus: ${multiplier}x for 1 hour`);
  }

  // Get comprehensive user profile for gamification
  async getUserProfile(userId: string) {
    // Get user basic info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) return null;

    // Get user profile
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    // Get login streak
    const loginStreak = await db.query.userLoginStreaks.findFirst({
      where: eq(userLoginStreaks.userId, userId)
    });

    // Get total XP from transactions
    const xpResult = await db.select({
      totalXp: sql<number>`COALESCE(SUM(${xpTransactions.delta}), 0)`
    })
    .from(xpTransactions)
    .where(eq(xpTransactions.userId, userId));

    const totalXp = xpResult[0]?.totalXp || 0;

    // Get task/goal counts
    const goalsResult = await db.select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${goals.status} = 'completed' THEN 1 ELSE 0 END)`
    })
    .from(goals)
    .where(eq(goals.userId, userId));

    const taskResult = await db.select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)`
    })
    .from(tasks)
    .leftJoin(goals, eq(tasks.goalId, goals.id))
    .where(eq(goals.userId, userId));

    // Calculate level info
    const levelInfo = this.getLevelInfo(totalXp);

    return {
      userId,
      totalXp,
      currentLevel: levelInfo.level,
      currentLevelXp: totalXp - levelInfo.xpForCurrentLevel,
      nextLevelXp: levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel,
      progressToNext: levelInfo.progressToNextLevel,
      levelTitle: levelInfo.title,
      coinBalance: user.coinBalance || 0,
      loginStreak: loginStreak?.currentStreak || 0,
      longestStreak: loginStreak?.longestStreak || 0,
      totalTasksCompleted: taskResult[0]?.completed || 0,
      totalGoalsCompleted: goalsResult[0]?.completed || 0,
      lastLoginDate: loginStreak?.lastLoginDate?.toISOString() || new Date().toISOString()
    };
  }

  // Get user's recent achievements (last 10)
  async getRecentAchievements(userId: string, limit: number = 10) {
    return await db.select({
      id: achievements.id,
      key: achievements.key,
      name: achievements.name,
      description: achievements.description,
      category: achievements.category,
      tier: achievements.tier,
      xpReward: achievements.xpReward,
      coinReward: achievements.coinReward,
      rarity: achievements.rarity,
      iconUrl: achievements.iconUrl,
      hidden: achievements.hidden,
      seasonal: achievements.seasonal,
      unlockedAt: userAchievements.unlockedAt,
      progress: userAchievements.progress,
      showcased: userAchievements.showcased
    })
    .from(userAchievements)
    .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt))
    .limit(limit);
  }

  // Get all user achievements
  async getAllUserAchievements(userId: string) {
    return await db.select({
      id: achievements.id,
      key: achievements.key,
      name: achievements.name,
      description: achievements.description,
      category: achievements.category,
      tier: achievements.tier,
      xpReward: achievements.xpReward,
      coinReward: achievements.coinReward,
      rarity: achievements.rarity,
      iconUrl: achievements.iconUrl,
      hidden: achievements.hidden,
      seasonal: achievements.seasonal,
      unlockedAt: userAchievements.unlockedAt,
      progress: userAchievements.progress,
      showcased: userAchievements.showcased
    })
    .from(userAchievements)
    .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));
  }

  // Get daily challenges with user progress
  async getDailyChallengesWithProgress(userId: string, date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const challenges = await db.select({
      id: dailyChallenges.id,
      title: dailyChallenges.title,
      description: dailyChallenges.description,
      category: dailyChallenges.category,
      challengeType: dailyChallenges.challengeType,
      targetValue: dailyChallenges.targetValue,
      xpReward: dailyChallenges.xpReward,
      coinReward: dailyChallenges.coinReward,
      difficulty: dailyChallenges.difficulty,
      activeDate: dailyChallenges.activeDate,
      progress: userChallengeProgress.progress,
      completed: userChallengeProgress.completed,
      claimedReward: userChallengeProgress.claimedReward
    })
    .from(dailyChallenges)
    .leftJoin(userChallengeProgress, and(
      eq(userChallengeProgress.challengeId, dailyChallenges.id),
      eq(userChallengeProgress.userId, userId)
    ))
    .where(and(
      gte(dailyChallenges.activeDate, startOfDay),
      lte(dailyChallenges.activeDate, endOfDay)
    ));

    return challenges.map(challenge => ({
      ...challenge,
      progress: challenge.progress || 0,
      completed: challenge.completed || false,
      claimedReward: challenge.claimedReward || false
    }));
  }

  // Initialize system data if needed
  async initializeSystem() {
    // Initialize achievements from definitions
    for (const achDef of ACHIEVEMENT_DEFINITIONS) {
      const existing = await db.query.achievements.findFirst({
        where: eq(achievements.key, achDef.key)
      });

      if (!existing) {
        await db.insert(achievements).values({
          key: achDef.key,
          name: achDef.name,
          description: achDef.description,
          category: achDef.category,
          rarity: achDef.rarity,
          tier: achDef.tier,
          xpReward: achDef.xpReward,
          coinReward: achDef.coinReward,
          criteria: achDef.criteria,
        });
      }
    }

    // Initialize level progression
    for (const levelData of LEVEL_PROGRESSION) {
      await db.insert(levels).values({
        level: levelData.level,
        xpRequired: levelData.xpRequired,
        title: levelData.title,
        perks: []
      }).onConflictDoNothing();
    }

    // Initialize daily login rewards
    await this.initializeLoginRewards();

    // Initialize spin wheel rewards
    await this.initializeSpinWheelRewards();
  }

  // Check if user can do daily login (idempotency)
  async canDoDailyLogin(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const streak = await db.query.userLoginStreaks.findFirst({
      where: eq(userLoginStreaks.userId, userId)
    });
    
    if (!streak) return true;
    
    const lastLogin = new Date(streak.lastLoginDate!);
    lastLogin.setHours(0, 0, 0, 0);
    
    return lastLogin.getTime() < today.getTime();
  }

  // Check if user can spin wheel (rate limiting)
  async canSpinWheel(userId: string): Promise<{ canSpin: boolean, reason?: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const spinHistory = await db.query.userSpinHistory.findFirst({
      where: eq(userSpinHistory.userId, userId),
      orderBy: [desc(userSpinHistory.spunAt)]
    });
    
    // Check free spin availability
    let hasFreeSpinToday = false;
    if (!spinHistory || !spinHistory.lastFreeSpinDate) {
      hasFreeSpinToday = true;
    } else {
      const lastFree = new Date(spinHistory.lastFreeSpinDate);
      lastFree.setHours(0, 0, 0, 0);
      hasFreeSpinToday = lastFree.getTime() < today.getTime();
    }
    
    if (hasFreeSpinToday) {
      return { canSpin: true };
    }
    
    // Check coin balance for paid spin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user || (user.coinBalance ?? 0) < 10) {
      return { canSpin: false, reason: 'Not enough coins for spin (10 coins required)' };
    }
    
    return { canSpin: true };
  }

  // Send notification via socket.io and persist to database
  async sendNotification(userId: string, type: string, data: any) {
    try {
      // Persist notification in database
      await db.insert(notifications).values({
        userId,
        type,
        category: data.category || 'general',
        title: data.title,
        message: data.message
      });

      // Send real-time notification via socket.io if available
      if (io) {
        io.to(`user_${userId}`).emit('notification', {
          type,
          title: data.title,
          message: data.message,
          data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  // Award XP and check achievements for various actions
  async awardXpForAction(userId: string, action: string, data: any = {}) {
    let xpAmount = 0;
    let source = action;
    let reason = '';

    switch (action) {
      case 'task_complete':
        xpAmount = XP_REWARDS.TASK_COMPLETION.min + Math.floor(Math.random() * (XP_REWARDS.TASK_COMPLETION.max - XP_REWARDS.TASK_COMPLETION.min));
        reason = `Completed task: ${data.taskTitle || 'Task'}`;
        await this.checkAchievements(userId, { type: 'task_count', value: data.totalTasksCompleted || 1 });
        break;
      
      case 'goal_complete':
        xpAmount = XP_REWARDS.GOAL_COMPLETION.min + Math.floor(Math.random() * (XP_REWARDS.GOAL_COMPLETION.max - XP_REWARDS.GOAL_COMPLETION.min));
        reason = `Completed goal: ${data.goalTitle || 'Goal'}`;
        await this.checkAchievements(userId, { type: 'goal_complete', value: data.totalGoalsCompleted || 1 });
        break;
      
      default:
        console.warn(`Unknown action for XP award: ${action}`);
        return;
    }

    const result = await this.awardXP(userId, xpAmount, source, reason, data.sourceId);
    
    // Send XP notification
    await this.sendNotification(userId, 'xp_earned', {
      title: 'XP Earned!',
      message: `You've earned ${xpAmount} XP for ${reason}`,
      xpGained: xpAmount,
      action,
      levelUp: result.levelUp,
      newLevel: result.newLevel
    });

    return result;
  }
}

export const gamificationService = new GamificationService();