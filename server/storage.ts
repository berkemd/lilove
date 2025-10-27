import { 
  users, userProfiles, skillCategories, skills, goals, goalSkills, 
  taskPlans, tasks, taskSkills, performanceEvents, adaptationLogs, 
  predictionSnapshots, knowledgeDomains, expertKnowledge, 
  taskKnowledgeLinks, knowledgeUsageLogs, mentorSessions, mentorConversations,
  achievements, userAchievements, xpTransactions, subscriptionPlans,
  coinPackages, purchaseItems, featureGates, userPurchases, coinTransactions,
  leaderboards, userLoginStreaks, friendConnections, spinWheelRewards,
  dailyChallenges, userChallengeProgress, weeklyChallenges, dailyLoginRewards, userSpinHistory, levels,
  habits, habitCompletions,
  teams, teamMembers, teamGoals, teamInvites, challenges, challengeParticipants, mentorships,
  socialFeedPosts, notifications,
  // Advanced Profile & Settings tables
  securityLogs, connectedAccounts, dataExports, accountDeletions,
  twoFactorAuth, profilePictures, usageStatistics, calendarTokens, userConsents,
  // League System tables
  leagues, leagueSeasons, leagueParticipants,
  // Avatar & Quest System tables
  avatars, quests, userQuests, avatarItems, userAvatarItems,
  // IAP tables
  iapReceipts,
  type User, type UserProfile, type Goal, type Task, type TaskPlan,
  type PerformanceEvent, type MentorSession, type MentorConversation, type Achievement,
  type UserAchievement, type XpTransaction, type Skill,
  type ExpertKnowledge, type AdaptationLog, type PredictionSnapshot,
  type InsertUser, type InsertGoal, type InsertTask, type InsertTaskPlan,
  type InsertPerformanceEvent, type InsertMentorSession, type InsertMentorConversation,
  type UserPerformanceMetrics, type GoalProgressAnalytics,
  type UpsertUser,
  // Habit types
  type Habit, type InsertHabit,
  type HabitCompletion, type InsertHabitCompletion,
  // Advanced Profile & Settings types
  type SecurityLog, type InsertSecurityLog,
  type ConnectedAccount, type InsertConnectedAccount,
  type DataExport, type InsertDataExport,
  type AccountDeletion, type InsertAccountDeletion,
  type TwoFactorAuth, type InsertTwoFactorAuth,
  type ProfilePicture, type InsertProfilePicture,
  type UsageStatistics, type InsertUsageStatistics,
  type CalendarToken, type InsertCalendarToken,
  type UserConsent, type InsertUserConsent,
  // League System types
  type League, type InsertLeague,
  type LeagueSeason, type InsertLeagueSeason,
  type LeagueParticipant, type InsertLeagueParticipant,
  // Avatar & Quest System types
  type Avatar, type InsertAvatar,
  type Quest, type InsertQuest,
  type UserQuest, type InsertUserQuest,
  type AvatarItem, type InsertAvatarItem,
  type UserAvatarItem, type InsertUserAvatarItem,
  // IAP types
  type IapReceipt, type InsertIapReceipt
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, asc, and, or, gte, lte, count, avg, sum, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

// ===== MASTERMIND AI STORAGE =====
// Sophisticated Performance Intelligence Database Layer
// Complex queries, analytics, and real-time performance tracking

// Database connection with full schema
const connectionString = process.env.DATABASE_URL || "";
const sql_client = neon(connectionString);

// Complete schema object with all tables
const schema = {
  users, userProfiles, skillCategories, skills, goals, goalSkills,
  taskPlans, tasks, taskSkills, performanceEvents, adaptationLogs,
  predictionSnapshots, knowledgeDomains, expertKnowledge,
  taskKnowledgeLinks, knowledgeUsageLogs, mentorSessions, mentorConversations,
  achievements, userAchievements, xpTransactions, subscriptionPlans,
  coinPackages, purchaseItems, featureGates, userPurchases, coinTransactions,
  leaderboards, userLoginStreaks, friendConnections, spinWheelRewards,
  dailyChallenges, userChallengeProgress, weeklyChallenges, dailyLoginRewards, userSpinHistory, levels,
  habits, habitCompletions,
  teams, teamMembers, teamGoals, teamInvites, challenges, challengeParticipants, mentorships,
  socialFeedPosts, notifications,
  // Advanced Profile & Settings tables
  securityLogs, connectedAccounts, dataExports, accountDeletions,
  twoFactorAuth, profilePictures, usageStatistics, calendarTokens, userConsents,
  // League System tables
  leagues, leagueSeasons, leagueParticipants,
  // Avatar & Quest System tables
  avatars, quests, userQuests, avatarItems, userAvatarItems,
  // IAP tables
  iapReceipts
};

export const db = drizzle(sql_client, { schema });

// ===== STORAGE INTERFACE =====

export interface IStorage {
  // ===== USER MANAGEMENT =====
  // Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // MasterMind AI specific user operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserStreaks(userId: string): Promise<void>;
  
  // ===== GOAL MANAGEMENT =====
  createGoal(goal: InsertGoal): Promise<Goal>;
  getUserGoals(userId: string, status?: string): Promise<Goal[]>;
  getGoalById(goalId: string): Promise<Goal | null>;
  updateGoal(goalId: string, updates: Partial<Goal>): Promise<void>;
  deleteGoal(goalId: string): Promise<void>;
  
  // ===== INTELLIGENT PLANNING =====
  createTaskPlan(plan: InsertTaskPlan): Promise<TaskPlan>;
  getActiveTaskPlan(goalId: string): Promise<TaskPlan | null>;
  getAllTaskPlans(goalId: string): Promise<TaskPlan[]>;
  deactivateTaskPlan(planId: string): Promise<void>;
  
  // ===== TASK MANAGEMENT =====
  createTasks(tasks: InsertTask[]): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  getTasksByPlan(planId: string): Promise<Task[]>;
  getTaskById(taskId: string): Promise<Task | null>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  getTaskHierarchy(planId: string): Promise<Task[]>;
  getNextTasks(userId: string, limit?: number): Promise<Task[]>;
  
  // User-specific task methods
  getUserTasks(userId: string, options?: {
    status?: string;
    priority?: string;
    goalId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Task[]>;
  getUserTasksCount(userId: string, status?: string): Promise<number>;
  
  // Timer management
  startTaskTimer(taskId: string, userId: string): Promise<void>;
  pauseTaskTimer(taskId: string, userId: string): Promise<void>;
  resumeTaskTimer(taskId: string, userId: string): Promise<void>;
  stopTaskTimer(taskId: string, userId: string): Promise<void>;
  getActiveTimer(userId: string): Promise<Task | null>;
  
  // Bulk operations
  bulkUpdateTasks(taskIds: string[], updates: Partial<Task>): Promise<void>;
  bulkDeleteTasks(taskIds: string[], userId: string): Promise<void>;
  
  // Task analytics
  getTaskAnalytics(userId: string, period?: string): Promise<any>;
  getTaskTimeLogsForUser(userId: string, limit?: number): Promise<any[]>;
  
  // ===== PERFORMANCE TRACKING =====
  recordPerformanceEvent(event: InsertPerformanceEvent): Promise<void>;
  getUserPerformanceEvents(userId: string, limit?: number): Promise<PerformanceEvent[]>;
  getGoalPerformanceEvents(goalId: string): Promise<PerformanceEvent[]>;
  getTaskPerformanceEvents(taskId: string): Promise<PerformanceEvent[]>;
  
  // ===== ANALYTICS & INSIGHTS =====
  getUserPerformanceMetrics(userId: string): Promise<UserPerformanceMetrics>;
  getGoalProgressAnalytics(goalId: string): Promise<GoalProgressAnalytics>;
  getUserActivityTrends(userId: string, days: number): Promise<any[]>;
  getSkillProficiencyMap(userId: string): Promise<Record<string, number>>;
  
  // ===== ADAPTATION SYSTEM =====
  logAdaptation(log: Partial<AdaptationLog>): Promise<void>;
  getAdaptationHistory(goalId: string): Promise<AdaptationLog[]>;
  recordPrediction(prediction: Partial<PredictionSnapshot>): Promise<void>;
  getPredictionAccuracy(modelVersion: string): Promise<number>;
  
  // ===== KNOWLEDGE SYSTEM =====
  getKnowledgeForTask(taskId: string): Promise<ExpertKnowledge[]>;
  recordKnowledgeUsage(usage: Partial<any>): Promise<void>;
  getRecommendedKnowledge(userId: string, category: string): Promise<ExpertKnowledge[]>;
  
  // ===== AI MENTOR =====
  saveMentorSession(session: InsertMentorSession): Promise<void>;
  getUserMentorHistory(userId: string, limit?: number): Promise<MentorSession[]>;
  createMentorConversation(conversation: InsertMentorConversation): Promise<MentorConversation>;
  getUserMentorConversations(userId: string): Promise<MentorConversation[]>;
  updateMentorConversation(id: string, updates: Partial<MentorConversation>): Promise<void>;
  getMentorConversation(id: string): Promise<MentorConversation | null>;
  getRecentTasks(userId: string, limit: number): Promise<Task[]>;
  
  // ===== GAMIFICATION =====
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  getUserXP(userId: string): Promise<number>;
  addXPTransaction(transaction: Partial<XpTransaction>): Promise<void>;
  getXPTransactionHistory(userId: string, limit?: number): Promise<XpTransaction[]>;
  checkAndUnlockAchievements(userId: string): Promise<Achievement[]>;
  
  // ===== SKILLS SYSTEM =====
  getAllSkills(): Promise<Skill[]>;
  getSkillsByCategory(categoryId: string): Promise<Skill[]>;
  getUserSkillProgress(userId: string): Promise<any[]>;
  
  // ===== TEAM MANAGEMENT =====
  createTeam(team: any): Promise<any>;
  getUserTeams(userId: string): Promise<any[]>;
  getPublicTeams(limit?: number, search?: string): Promise<any[]>;
  getTeamById(teamId: string): Promise<any | null>;
  updateTeam(teamId: string, updates: any): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;
  
  // Team membership management
  inviteToTeam(teamId: string, userId: string, invitedBy: string, role?: string): Promise<void>;
  acceptTeamInvitation(teamId: string, userId: string): Promise<void>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  updateMemberRole(teamId: string, userId: string, role: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<any[]>;
  
  // Team goals and collaboration
  createTeamGoal(teamGoal: any): Promise<any>;
  getTeamGoals(teamId: string): Promise<any[]>;
  getTeamAnalytics(teamId: string): Promise<any>;
  
  // ===== ADVANCED PROFILE & SETTINGS MANAGEMENT =====
  
  // Profile Picture Management
  uploadProfilePicture(picture: InsertProfilePicture): Promise<ProfilePicture>;
  getProfilePictures(userId: string): Promise<ProfilePicture[]>;
  getActiveProfilePicture(userId: string): Promise<ProfilePicture | null>;
  setActiveProfilePicture(userId: string, pictureId: string): Promise<void>;
  deleteProfilePicture(pictureId: string): Promise<void>;
  
  // Security Logs
  logSecurityEvent(event: InsertSecurityLog): Promise<void>;
  getUserSecurityLogs(userId: string, limit?: number): Promise<SecurityLog[]>;
  getFlaggedSecurityLogs(limit?: number): Promise<SecurityLog[]>;
  getRecentSecurityEvents(userId: string, eventTypes: string[], limit?: number): Promise<SecurityLog[]>;
  
  // Connected Accounts Management
  connectAccount(account: InsertConnectedAccount): Promise<ConnectedAccount>;
  getConnectedAccounts(userId: string): Promise<ConnectedAccount[]>;
  getConnectedAccountByProvider(userId: string, provider: string): Promise<ConnectedAccount | null>;
  updateConnectedAccount(accountId: string, updates: Partial<ConnectedAccount>): Promise<void>;
  disconnectAccount(accountId: string): Promise<void>;
  syncConnectedAccount(accountId: string): Promise<void>;
  
  // Data Export Functionality
  createDataExport(exportRequest: InsertDataExport): Promise<DataExport>;
  getDataExports(userId: string): Promise<DataExport[]>;
  getDataExportById(exportId: string): Promise<DataExport | null>;
  updateDataExportStatus(exportId: string, status: string, progress?: number, filePath?: string): Promise<void>;
  markDataExportDownloaded(exportId: string): Promise<void>;
  cleanupExpiredExports(): Promise<void>;
  
  // Account Deletion Management
  requestAccountDeletion(deletion: InsertAccountDeletion): Promise<AccountDeletion>;
  getAccountDeletion(userId: string): Promise<AccountDeletion | null>;
  cancelAccountDeletion(deletionId: string): Promise<void>;
  processAccountDeletion(deletionId: string): Promise<void>;
  getScheduledAccountDeletions(): Promise<AccountDeletion[]>;
  permanentlyDeleteAccount(userId: string): Promise<void>;
  
  // Two-Factor Authentication
  setupTwoFactorAuth(userId: string, secret: string): Promise<TwoFactorAuth>;
  getTwoFactorAuth(userId: string): Promise<TwoFactorAuth | null>;
  verifyTwoFactorAuth(userId: string, token: string): Promise<boolean>;
  enableTwoFactorAuth(userId: string): Promise<void>;
  disableTwoFactorAuth(userId: string): Promise<void>;
  generateBackupCodes(userId: string): Promise<string[]>;
  useBackupCode(userId: string, code: string): Promise<boolean>;
  updateTwoFactorFailedAttempts(userId: string, increment: boolean): Promise<void>;
  
  // Usage Statistics & Analytics
  recordUsageStatistics(stats: InsertUsageStatistics): Promise<void>;
  getUserUsageStatistics(userId: string, startDate?: Date, endDate?: Date): Promise<UsageStatistics[]>;
  getUsageInsights(userId: string, period: 'week' | 'month' | 'year'): Promise<any>;
  aggregateDailyStats(userId: string, date: Date): Promise<void>;
  getUserDeviceStats(userId: string): Promise<any[]>;
  
  // Calendar Integration & iCal Feed
  getOrCreateCalendarToken(userId: string): Promise<CalendarToken>;
  getCalendarTokenByToken(token: string): Promise<CalendarToken | null>;
  regenerateCalendarToken(userId: string): Promise<CalendarToken>;
  getAllCalendarEvents(userId: string): Promise<any[]>;
  getFeatureUsageStats(userId: string): Promise<any[]>;
  
  // ===== CONSENT MANAGEMENT =====
  getUserConsent(userId: string): Promise<UserConsent | null>;
  updateUserConsent(consent: InsertUserConsent): Promise<UserConsent>;
  withdrawUserConsent(userId: string, reason?: string): Promise<UserConsent>;
  
  // ===== HABIT TRACKING SYSTEM =====
  createHabit(habit: InsertHabit): Promise<Habit>;
  getUserHabits(userId: string, options?: { category?: string; isActive?: boolean }): Promise<Habit[]>;
  getHabitById(habitId: string): Promise<Habit | null>;
  updateHabit(habitId: string, updates: Partial<Habit>): Promise<void>;
  deleteHabit(habitId: string): Promise<void>;
  
  // Habit Completions
  checkHabit(habitId: string, userId: string, completion: InsertHabitCompletion): Promise<HabitCompletion>;
  getHabitCompletions(habitId: string, startDate?: Date, endDate?: Date): Promise<HabitCompletion[]>;
  getUserHabitCompletions(userId: string, date?: Date): Promise<HabitCompletion[]>;
  
  // Habit Stats & Analytics
  getHabitStats(habitId: string): Promise<any>;
  calculateRhythmScore(userId: string): Promise<number>;
  updateHabitStreaks(habitId: string): Promise<void>;
  
  // ===== LEAGUE SYSTEM =====
  getAllLeagues(): Promise<League[]>;
  getLeagueById(leagueId: string): Promise<League | null>;
  getUserCurrentLeague(userId: string): Promise<{ league: League; season: LeagueSeason; participant: LeagueParticipant } | null>;
  getActiveSeason(leagueId: string): Promise<LeagueSeason | null>;
  getAllActiveSeasons(): Promise<LeagueSeason[]>;
  createLeagueSeason(season: InsertLeagueSeason): Promise<LeagueSeason>;
  joinLeague(participant: InsertLeagueParticipant): Promise<LeagueParticipant>;
  getLeagueLeaderboard(seasonId: string, limit?: number): Promise<(LeagueParticipant & { user: User })[]>;
  updateParticipantXP(participantId: string, xpToAdd: number): Promise<void>;
  updateLeagueRankings(seasonId: string): Promise<void>;
  endLeagueSeason(seasonId: string): Promise<void>;
  distributeLeagueRewards(seasonId: string): Promise<void>;
  promoteAndRelegate(seasonId: string): Promise<void>;
  getUserLeagueHistory(userId: string, limit?: number): Promise<any[]>;
  
  // ===== iOS IN-APP PURCHASE SYSTEM =====
  recordIapPurchase(purchase: Partial<IapReceipt>): Promise<IapReceipt>;
  getUserIapReceipts(userId: string, limit?: number): Promise<IapReceipt[]>;
  getIapReceiptByTransaction(transactionId: string): Promise<IapReceipt | null>;
  updateSubscriptionFromIap(data: { userId: string; productId: string; expiresDate: Date | null; isActive: boolean }): Promise<void>;
  addCoinsFromIap(userId: string, coinAmount: number): Promise<void>;
  
  // ===== AVATAR & QUEST SYSTEM =====
  
  // Avatar Management
  getOrCreateAvatar(userId: string): Promise<Avatar>;
  updateAvatar(userId: string, updates: Partial<Avatar>): Promise<void>;
  equipItem(userId: string, itemId: string): Promise<void>;
  unequipItem(userId: string, category: string): Promise<void>;
  
  // Quest Management
  getAllQuests(filters?: { difficulty?: string; minLevel?: number }): Promise<Quest[]>;
  getQuestById(questId: string): Promise<Quest | null>;
  getUserActiveQuests(userId: string): Promise<(UserQuest & { quest: Quest })[]>;
  startQuest(userId: string, questId: string): Promise<UserQuest>;
  updateQuestProgress(userQuestId: string, progress: Record<string, number>): Promise<void>;
  completeQuest(userQuestId: string): Promise<void>;
  attackBoss(userQuestId: string, damage: number): Promise<{ defeated: boolean; remaining: number }>;
  
  // Shop Management
  getAllAvatarItems(filters?: { category?: string; rarity?: string }): Promise<AvatarItem[]>;
  getAvatarItemById(itemId: string): Promise<AvatarItem | null>;
  getUserAvatarItems(userId: string): Promise<(UserAvatarItem & { item: AvatarItem })[]>;
  purchaseAvatarItem(userId: string, itemId: string): Promise<UserAvatarItem>;
  
  // Quest seed data
  seedQuests(): Promise<void>;
  seedAvatarItems(): Promise<void>;
}

// ===== STORAGE IMPLEMENTATION =====

export class DatabaseStorage implements IStorage {
  
  // ===== USER MANAGEMENT =====
  
  // Required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        },
      })
      .returning();
    
    // Create or update user profile if it doesn't exist
    const existingProfile = await this.getUserProfile(user.id);
    if (!existingProfile) {
      await db.insert(userProfiles).values({
        userId: user.id,
        learningStyle: 'mixed',
        preferredPace: 'medium',
        difficultyPreference: 'incremental',
        currentLevel: 1,
        streakCount: 0,
        longestStreak: 0,
        totalXp: 0,
      });
    }
    
    // Update streak if applicable
    await this.updateUserStreaks(user.id);
    
    return user;
  }
  
  async updateUserStreaks(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    
    const profile = await this.getUserProfile(userId);
    if (!profile) return;
    
    const now = new Date();
    const lastLogin = user.lastLoginAt;
    
    if (lastLogin) {
      const daysSinceLastLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastLogin === 1) {
        // Consecutive day - increase streak
        const newStreak = (profile.streakCount || 0) + 1;
        const longestStreak = Math.max(newStreak, profile.longestStreak || 0);
        
        await db.update(userProfiles)
          .set({ 
            streakCount: newStreak,
            longestStreak,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, userId));
      } else if (daysSinceLastLogin > 1) {
        // Streak broken - reset to 1
        await db.update(userProfiles)
          .set({ 
            streakCount: 1,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, userId));
        
        await db.update(users)
          .set({ streakStartDate: now })
          .where(eq(users.id, userId));
      }
    } else {
      // First login - start streak
      await db.update(users)
        .set({ streakStartDate: now })
        .where(eq(users.id, userId));
      
      await db.update(userProfiles)
        .set({ 
          streakCount: 1,
          longestStreak: 1,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    
    // Create default user profile
    await db.insert(userProfiles).values({
      userId: newUser.id,
      learningStyle: 'mixed',
      preferredPace: 'medium',
      difficultyPreference: 'incremental',
      currentLevel: 1,
      streakCount: 0,
      longestStreak: 0,
    });
    
    return newUser;
  }
  
  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }
  
  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    await db.update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
  }
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const [profile] = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile || null;
  }
  
  // ===== GOAL MANAGEMENT =====
  
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values({
      ...goal,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return newGoal;
  }
  
  async getUserGoals(userId: string, status?: string): Promise<Goal[]> {
    let query = db.select().from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
    
    if (status) {
      query = db.select().from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.status, status)))
        .orderBy(desc(goals.createdAt));
    }
    
    return await query;
  }
  
  async getGoalById(goalId: string): Promise<Goal | null> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
    return goal || null;
  }
  
  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<void> {
    await db.update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, goalId));
  }
  
  async deleteGoal(goalId: string): Promise<void> {
    // Cascade deletion is handled by database constraints
    await db.delete(goals).where(eq(goals.id, goalId));
  }
  
  // ===== INTELLIGENT PLANNING =====
  
  async createTaskPlan(plan: InsertTaskPlan): Promise<TaskPlan> {
    // First deactivate any existing active plans for this goal
    await db.update(taskPlans)
      .set({ isActive: false, lastAdaptedAt: new Date() })
      .where(and(eq(taskPlans.goalId, plan.goalId), eq(taskPlans.isActive, true)));
    
    const [newPlan] = await db.insert(taskPlans).values({
      ...plan,
      createdAt: new Date(),
    }).returning();
    
    return newPlan;
  }
  
  async getActiveTaskPlan(goalId: string): Promise<TaskPlan | null> {
    const [plan] = await db.select().from(taskPlans)
      .where(and(eq(taskPlans.goalId, goalId), eq(taskPlans.isActive, true)));
    return plan || null;
  }
  
  async getAllTaskPlans(goalId: string): Promise<TaskPlan[]> {
    return await db.select().from(taskPlans)
      .where(eq(taskPlans.goalId, goalId))
      .orderBy(desc(taskPlans.createdAt));
  }
  
  async deactivateTaskPlan(planId: string): Promise<void> {
    await db.update(taskPlans)
      .set({ isActive: false, lastAdaptedAt: new Date() })
      .where(eq(taskPlans.id, planId));
  }
  
  // ===== TASK MANAGEMENT =====
  
  async createTasks(tasksToCreate: InsertTask[]): Promise<Task[]> {
    if (tasksToCreate.length === 0) return [];
    
    const newTasks = await db.insert(tasks).values(
      tasksToCreate.map(task => ({
        ...task,
        createdAt: new Date(),
      }))
    ).returning();
    
    return newTasks;
  }
  
  async getTasksByPlan(planId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.planId, planId))
      .orderBy(asc(tasks.orderIndex));
  }
  
  async getTaskById(taskId: string): Promise<Task | null> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return task || null;
  }
  
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, taskId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values({
      ...task,
      createdAt: new Date(),
    }).returning();
    
    return newTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  }

  // User-specific task methods
  async getUserTasks(userId: string, options?: {
    status?: string;
    priority?: string;
    goalId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Task[]> {
    // First get user's goals
    const userGoals = await db.select({ id: goals.id }).from(goals)
      .where(eq(goals.userId, userId));
    
    if (userGoals.length === 0) return [];
    
    const goalIds = userGoals.map(goal => goal.id);
    
    // Build query conditions
    let conditions = [inArray(tasks.goalId, goalIds)];
    
    if (options?.status) {
      conditions.push(eq(tasks.status, options.status));
    }
    if (options?.priority) {
      conditions.push(eq(tasks.priority, options.priority));
    }
    if (options?.goalId) {
      conditions.push(eq(tasks.goalId, options.goalId));
    }
    
    // Build base query
    let query = db.select().from(tasks).where(and(...conditions));
    
    // Add sorting
    const sortOrder = options?.sortOrder === 'asc' ? asc : desc;
    if (options?.sortBy === 'title') {
      query = query.orderBy(sortOrder(tasks.title));
    } else if (options?.sortBy === 'priority') {
      // Custom sort for priority: urgent, high, medium, low
      query = query.orderBy(
        sql`CASE 
          WHEN ${tasks.priority} = 'urgent' THEN 1
          WHEN ${tasks.priority} = 'high' THEN 2 
          WHEN ${tasks.priority} = 'medium' THEN 3
          WHEN ${tasks.priority} = 'low' THEN 4
          ELSE 5 END ${options.sortOrder === 'desc' ? sql`DESC` : sql`ASC`}`
      );
    } else if (options?.sortBy === 'dueDate') {
      query = query.orderBy(sortOrder(tasks.dueDate));
    } else {
      // Default sort by created date
      query = query.orderBy(desc(tasks.createdAt));
    }
    
    // Add pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  async getUserTasksCount(userId: string, status?: string): Promise<number> {
    // First get user's goals
    const userGoals = await db.select({ id: goals.id }).from(goals)
      .where(eq(goals.userId, userId));
    
    if (userGoals.length === 0) return 0;
    
    const goalIds = userGoals.map(goal => goal.id);
    
    let conditions = [inArray(tasks.goalId, goalIds)];
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    
    const [result] = await db.select({ count: count() }).from(tasks)
      .where(and(...conditions));
    
    return result.count;
  }

  // Timer management methods
  async startTaskTimer(taskId: string, userId: string): Promise<void> {
    const now = new Date();
    
    // First, stop any other running timers for this user
    const activeTimer = await this.getActiveTimer(userId);
    if (activeTimer && activeTimer.id !== taskId) {
      await this.stopTaskTimer(activeTimer.id, userId);
    }
    
    // Start this task's timer
    await db.update(tasks)
      .set({
        isTimerRunning: true,
        startedAt: now,
        status: 'active'
      })
      .where(eq(tasks.id, taskId));
      
    // Record performance event
    await this.recordPerformanceEvent({
      userId,
      taskId,
      eventType: 'task_start',
      eventData: { startTime: now },
      focusTime: 0
    });
  }

  async pauseTaskTimer(taskId: string, userId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task || !task.isTimerRunning) return;
    
    const now = new Date();
    const sessionTime = task.startedAt ? Math.floor((now.getTime() - task.startedAt.getTime()) / (1000 * 60)) : 0;
    
    await db.update(tasks)
      .set({
        isTimerRunning: false,
        pausedAt: now,
        timeSpent: (task.timeSpent || 0) + sessionTime,
        totalPauseTime: (task.totalPauseTime || 0)
      })
      .where(eq(tasks.id, taskId));
      
    // Record performance event
    await this.recordPerformanceEvent({
      userId,
      taskId,
      eventType: 'task_pause',
      eventData: { pauseTime: now, sessionTime },
      focusTime: sessionTime
    });
  }

  async resumeTaskTimer(taskId: string, userId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task || task.isTimerRunning) return;
    
    const now = new Date();
    let pauseTime = 0;
    
    if (task.pausedAt) {
      pauseTime = Math.floor((now.getTime() - task.pausedAt.getTime()) / (1000 * 60));
    }
    
    await db.update(tasks)
      .set({
        isTimerRunning: true,
        startedAt: now,
        pausedAt: null,
        totalPauseTime: (task.totalPauseTime || 0) + pauseTime
      })
      .where(eq(tasks.id, taskId));
      
    // Record performance event
    await this.recordPerformanceEvent({
      userId,
      taskId,
      eventType: 'task_resume',
      eventData: { resumeTime: now, pauseDuration: pauseTime },
      focusTime: 0
    });
  }

  async stopTaskTimer(taskId: string, userId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) return;
    
    const now = new Date();
    let sessionTime = 0;
    
    if (task.isTimerRunning && task.startedAt) {
      sessionTime = Math.floor((now.getTime() - task.startedAt.getTime()) / (1000 * 60));
    }
    
    await db.update(tasks)
      .set({
        isTimerRunning: false,
        timeSpent: (task.timeSpent || 0) + sessionTime,
        startedAt: null,
        pausedAt: null,
      })
      .where(eq(tasks.id, taskId));
      
    // Record performance event
    await this.recordPerformanceEvent({
      userId,
      taskId,
      eventType: 'task_stop',
      eventData: { stopTime: now, sessionTime, totalTime: (task.timeSpent || 0) + sessionTime },
      focusTime: sessionTime
    });
  }

  async getActiveTimer(userId: string): Promise<Task | null> {
    // Get user's goals first
    const userGoals = await db.select({ id: goals.id }).from(goals)
      .where(eq(goals.userId, userId));
    
    if (userGoals.length === 0) return null;
    
    const goalIds = userGoals.map(goal => goal.id);
    
    const [activeTask] = await db.select().from(tasks)
      .where(and(
        inArray(tasks.goalId, goalIds),
        eq(tasks.isTimerRunning, true)
      ))
      .limit(1);
    
    return activeTask || null;
  }

  // Bulk operations
  async bulkUpdateTasks(taskIds: string[], updates: Partial<Task>): Promise<void> {
    if (taskIds.length === 0) return;
    
    await db.update(tasks)
      .set(updates)
      .where(inArray(tasks.id, taskIds));
  }

  async bulkDeleteTasks(taskIds: string[], userId: string): Promise<void> {
    if (taskIds.length === 0) return;
    
    // Verify user owns these tasks
    const userGoals = await db.select({ id: goals.id }).from(goals)
      .where(eq(goals.userId, userId));
    
    const goalIds = userGoals.map(goal => goal.id);
    
    await db.delete(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        inArray(tasks.goalId, goalIds)
      ));
  }

  // Task analytics
  async getTaskAnalytics(userId: string, period: string = '30d'): Promise<any> {
    const userGoals = await db.select({ id: goals.id }).from(goals)
      .where(eq(goals.userId, userId));
    
    if (userGoals.length === 0) return {};
    
    const goalIds = userGoals.map(goal => goal.id);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (period === '7d') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(endDate.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(endDate.getDate() - 90);
    }
    
    // Get task completion stats
    const [completedTasks] = await db.select({ 
      count: count(),
      totalTime: sum(tasks.timeSpent)
    }).from(tasks)
    .where(and(
      inArray(tasks.goalId, goalIds),
      eq(tasks.status, 'completed'),
      gte(tasks.completedAt, startDate)
    ));
    
    // Get tasks by priority
    const priorityStats = await db.select({
      priority: tasks.priority,
      count: count(),
      avgTime: avg(tasks.timeSpent)
    }).from(tasks)
    .where(and(
      inArray(tasks.goalId, goalIds),
      gte(tasks.createdAt, startDate)
    ))
    .groupBy(tasks.priority);
    
    // Get tasks by status
    const statusStats = await db.select({
      status: tasks.status,
      count: count()
    }).from(tasks)
    .where(and(
      inArray(tasks.goalId, goalIds),
      gte(tasks.createdAt, startDate)
    ))
    .groupBy(tasks.status);
    
    return {
      period,
      completedTasks: completedTasks.count || 0,
      totalTimeSpent: completedTasks.totalTime || 0,
      priorityBreakdown: priorityStats,
      statusBreakdown: statusStats
    };
  }

  async getTaskTimeLogsForUser(userId: string, limit: number = 50): Promise<any[]> {
    // Get recent performance events for tasks
    return await db.select({
      taskId: performanceEvents.taskId,
      eventType: performanceEvents.eventType,
      eventData: performanceEvents.eventData,
      focusTime: performanceEvents.focusTime,
      timestamp: performanceEvents.timestamp
    }).from(performanceEvents)
    .where(and(
      eq(performanceEvents.userId, userId),
      inArray(performanceEvents.eventType, ['task_start', 'task_pause', 'task_stop', 'task_complete'])
    ))
    .orderBy(desc(performanceEvents.timestamp))
    .limit(limit);
  }
  
  async getTaskHierarchy(planId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.planId, planId))
      .orderBy(asc(tasks.depth), asc(tasks.orderIndex));
  }
  
  async getNextTasks(userId: string, limit: number = 5): Promise<Task[]> {
    // Get next pending/active tasks across all user goals
    const userGoals = await db.select({ id: goals.id }).from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));
    
    if (userGoals.length === 0) return [];
    
    const goalIds = userGoals.map(g => g.id);
    
    return await db.select().from(tasks)
      .where(and(
        inArray(tasks.goalId, goalIds),
        or(eq(tasks.status, 'pending'), eq(tasks.status, 'active'))
      ))
      .orderBy(asc(tasks.dueDate), asc(tasks.orderIndex))
      .limit(limit);
  }
  
  // ===== PERFORMANCE TRACKING =====
  
  async recordPerformanceEvent(event: InsertPerformanceEvent): Promise<void> {
    await db.insert(performanceEvents).values({
      ...event,
      timestamp: new Date(),
    });
  }
  
  async getUserPerformanceEvents(userId: string, limit: number = 50): Promise<PerformanceEvent[]> {
    return await db.select().from(performanceEvents)
      .where(eq(performanceEvents.userId, userId))
      .orderBy(desc(performanceEvents.timestamp))
      .limit(limit);
  }
  
  async getGoalPerformanceEvents(goalId: string): Promise<PerformanceEvent[]> {
    return await db.select().from(performanceEvents)
      .where(eq(performanceEvents.goalId, goalId))
      .orderBy(desc(performanceEvents.timestamp));
  }
  
  async getTaskPerformanceEvents(taskId: string): Promise<PerformanceEvent[]> {
    return await db.select().from(performanceEvents)
      .where(eq(performanceEvents.taskId, taskId))
      .orderBy(desc(performanceEvents.timestamp));
  }
  
  // ===== ANALYTICS & INSIGHTS =====
  
  async getUserPerformanceMetrics(userId: string): Promise<UserPerformanceMetrics> {
    // Get total XP
    const [xpResult] = await db.select({ 
      totalXP: sum(xpTransactions.delta).mapWith(Number) 
    }).from(xpTransactions).where(eq(xpTransactions.userId, userId));
    
    // Get user profile for level and scores
    const profile = await this.getUserProfile(userId);
    
    // Get goals statistics
    const [goalsStats] = await db.select({
      total: count(),
      completed: sum(sql`CASE WHEN ${goals.status} = 'completed' THEN 1 ELSE 0 END`).mapWith(Number)
    }).from(goals).where(eq(goals.userId, userId));
    
    // Get performance events statistics
    const performanceEventsData = await db.select({
      avgTime: avg(performanceEvents.focusTime).mapWith(Number),
      totalEvents: count(),
      completions: sum(sql`CASE WHEN ${performanceEvents.eventType} = 'task_complete' THEN 1 ELSE 0 END`).mapWith(Number),
      starts: sum(sql`CASE WHEN ${performanceEvents.eventType} = 'task_start' THEN 1 ELSE 0 END`).mapWith(Number)
    }).from(performanceEvents).where(eq(performanceEvents.userId, userId));
    
    const [eventsStats] = performanceEventsData;
    
    return {
      totalXP: xpResult?.totalXP || 0,
      currentLevel: profile?.currentLevel || 1,
      goalsCompleted: goalsStats?.completed || 0,
      averageTaskTime: eventsStats?.avgTime || 0,
      successRate: eventsStats?.starts ? ((eventsStats?.completions || 0) / eventsStats.starts) * 100 : 0,
      consistencyScore: parseFloat(profile?.consistencyRating || '0'),
      adaptabilityScore: parseFloat(profile?.adaptabilityScore || '0'),
      knowledgeAcquisitionRate: 0, // Computed from knowledge usage logs
    };
  }
  
  async getGoalProgressAnalytics(goalId: string): Promise<GoalProgressAnalytics> {
    const goal = await this.getGoalById(goalId);
    if (!goal) throw new Error('Goal not found');
    
    // Get task statistics
    const [taskStats] = await db.select({
      total: count(),
      completed: sum(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END`).mapWith(Number),
      totalTimeSpent: sum(tasks.timeSpent).mapWith(Number)
    }).from(tasks).where(eq(tasks.goalId, goalId));
    
    // Calculate estimated time remaining
    const completedTasks = taskStats?.completed || 0;
    const totalTasks = taskStats?.total || 0;
    const avgTimePerTask = totalTasks > 0 ? (taskStats?.totalTimeSpent || 0) / totalTasks : 0;
    const remainingTasks = totalTasks - completedTasks;
    
    return {
      currentProgress: parseFloat(goal.progress || '0'),
      tasksCompleted: completedTasks,
      totalTasks: totalTasks,
      timeSpent: (taskStats?.totalTimeSpent || 0) / 60, // Convert to hours
      estimatedTimeRemaining: (remainingTasks * avgTimePerTask) / 60, // Convert to hours
      performanceTrend: 'on_track', // Computed from recent performance
      riskFactors: [], // Computed from adaptation logs
      recommendedActions: [], // Generated by AI engine
    };
  }
  
  async getUserActivityTrends(userId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const trends = await db.select({
      date: sql`DATE(${performanceEvents.timestamp})`.as('date'),
      eventCount: count(),
      avgQuality: avg(performanceEvents.qualityScore).mapWith(Number),
      totalFocusTime: sum(performanceEvents.focusTime).mapWith(Number)
    })
    .from(performanceEvents)
    .where(and(
      eq(performanceEvents.userId, userId),
      gte(performanceEvents.timestamp, startDate)
    ))
    .groupBy(sql`DATE(${performanceEvents.timestamp})`)
    .orderBy(sql`DATE(${performanceEvents.timestamp})`);
    
    return trends;
  }
  
  async getSkillProficiencyMap(userId: string): Promise<Record<string, number>> {
    // This would join user progress with skills
    // For now, return empty map - will be implemented when skill tracking is added
    return {};
  }
  
  // ===== ADAPTATION SYSTEM =====
  
  async logAdaptation(log: Partial<AdaptationLog>): Promise<void> {
    await db.insert(adaptationLogs).values({
      ...log,
      createdAt: new Date(),
    } as any);
  }
  
  async getAdaptationHistory(goalId: string): Promise<AdaptationLog[]> {
    return await db.select().from(adaptationLogs)
      .where(eq(adaptationLogs.goalId, goalId))
      .orderBy(desc(adaptationLogs.createdAt));
  }
  
  async recordPrediction(prediction: Partial<PredictionSnapshot>): Promise<void> {
    await db.insert(predictionSnapshots).values({
      ...prediction,
      createdAt: new Date(),
    } as any);
  }
  
  async getPredictionAccuracy(modelVersion: string): Promise<number> {
    const resolvedPredictions = await db.select({
      total: count(),
      accurate: sum(sql`CASE WHEN ABS(${predictionSnapshots.predictedSuccess} - CASE WHEN ${predictionSnapshots.outcomeSuccess} THEN 100 ELSE 0 END) < 20 THEN 1 ELSE 0 END`).mapWith(Number)
    })
    .from(predictionSnapshots)
    .where(and(
      eq(predictionSnapshots.modelVersion, modelVersion),
      sql`${predictionSnapshots.resolvedAt} IS NOT NULL`
    ));
    
    const [stats] = resolvedPredictions;
    return stats?.total ? ((stats?.accurate || 0) / stats.total) * 100 : 0;
  }
  
  // ===== KNOWLEDGE SYSTEM =====
  
  async getKnowledgeForTask(taskId: string): Promise<ExpertKnowledge[]> {
    const results = await db.select({
      id: expertKnowledge.id,
      domainId: expertKnowledge.domainId,
      title: expertKnowledge.title,
      content: expertKnowledge.content,
      type: expertKnowledge.type,
      difficulty: expertKnowledge.difficulty,
      relatedConceptIds: expertKnowledge.relatedConceptIds,
      accuracyScore: expertKnowledge.accuracyScore,
      createdAt: expertKnowledge.createdAt,
      updatedAt: expertKnowledge.updatedAt
    })
      .from(expertKnowledge)
      .innerJoin(taskKnowledgeLinks, eq(expertKnowledge.id, taskKnowledgeLinks.knowledgeId))
      .where(eq(taskKnowledgeLinks.taskId, taskId))
      .orderBy(desc(taskKnowledgeLinks.importance));
    return results;
  }
  
  async recordKnowledgeUsage(usage: any): Promise<void> {
    await db.insert(knowledgeUsageLogs).values({
      ...usage,
      createdAt: new Date(),
    });
  }
  
  async getRecommendedKnowledge(userId: string, category: string): Promise<ExpertKnowledge[]> {
    // This would use sophisticated recommendation algorithms
    // For now, return top knowledge in category
    const results = await db.select({
      id: expertKnowledge.id,
      domainId: expertKnowledge.domainId,
      title: expertKnowledge.title,
      content: expertKnowledge.content,
      type: expertKnowledge.type,
      difficulty: expertKnowledge.difficulty,
      relatedConceptIds: expertKnowledge.relatedConceptIds,
      accuracyScore: expertKnowledge.accuracyScore,
      createdAt: expertKnowledge.createdAt,
      updatedAt: expertKnowledge.updatedAt
    })
      .from(expertKnowledge)
      .innerJoin(knowledgeDomains, eq(expertKnowledge.domainId, knowledgeDomains.id))
      .where(eq(knowledgeDomains.category, category))
      .orderBy(desc(expertKnowledge.accuracyScore))
      .limit(10);
    return results;
  }
  
  // ===== AI MENTOR =====
  
  async saveMentorSession(session: InsertMentorSession): Promise<void> {
    await db.insert(mentorSessions).values({
      ...session,
      timestamp: new Date(),
    });
  }
  
  async getUserMentorHistory(userId: string, limit: number = 20): Promise<MentorSession[]> {
    return await db.select().from(mentorSessions)
      .where(eq(mentorSessions.userId, userId))
      .orderBy(desc(mentorSessions.timestamp))
      .limit(limit);
  }

  async createMentorConversation(conversation: InsertMentorConversation): Promise<MentorConversation> {
    const [created] = await db.insert(mentorConversations).values(conversation as any).returning();
    return created;
  }

  async getUserMentorConversations(userId: string): Promise<MentorConversation[]> {
    return await db.select().from(mentorConversations)
      .where(eq(mentorConversations.userId, userId))
      .orderBy(desc(mentorConversations.lastActiveAt));
  }

  async updateMentorConversation(id: string, updates: Partial<MentorConversation>): Promise<void> {
    await db.update(mentorConversations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(mentorConversations.id, id));
  }

  async getMentorConversation(id: string): Promise<MentorConversation | null> {
    const [conversation] = await db.select().from(mentorConversations)
      .where(eq(mentorConversations.id, id));
    return conversation || null;
  }
  
  async getRecentTasks(userId: string, limit: number): Promise<Task[]> {
    const userGoals = await this.getUserGoals(userId, 'active');
    const goalIds = userGoals.map(g => g.id);
    
    if (goalIds.length === 0) return [];
    
    return await db.select().from(tasks)
      .where(inArray(tasks.goalId, goalIds))
      .orderBy(desc(tasks.createdAt))
      .limit(limit);
  }
  
  // ===== GAMIFICATION =====
  
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const results = await db.select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      achievementId: userAchievements.achievementId,
      goalId: userAchievements.goalId,
      progress: userAchievements.progress,
      currentTier: userAchievements.currentTier,
      showcased: userAchievements.showcased,
      unlockedAt: userAchievements.unlockedAt
    })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
    return results;
  }
  
  async getUserXP(userId: string): Promise<number> {
    const [result] = await db.select({ 
      totalXP: sum(xpTransactions.delta).mapWith(Number) 
    }).from(xpTransactions).where(eq(xpTransactions.userId, userId));
    
    return result?.totalXP || 0;
  }
  
  async addXPTransaction(transaction: Partial<XpTransaction>): Promise<void> {
    await db.insert(xpTransactions).values({
      ...transaction,
      createdAt: new Date(),
    } as any);
  }
  
  async getXPTransactionHistory(userId: string, limit: number = 50): Promise<XpTransaction[]> {
    return await db.select().from(xpTransactions)
      .where(eq(xpTransactions.userId, userId))
      .orderBy(desc(xpTransactions.createdAt))
      .limit(limit);
  }
  
  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    // This would implement achievement checking logic
    // For now, return empty array
    return [];
  }
  
  // ===== SKILLS SYSTEM =====
  
  async getAllSkills(): Promise<Skill[]> {
    return await db.select().from(skills)
      .orderBy(asc(skills.categoryId), asc(skills.name));
  }
  
  async getSkillsByCategory(categoryId: string): Promise<Skill[]> {
    return await db.select().from(skills)
      .where(eq(skills.categoryId, categoryId))
      .orderBy(asc(skills.difficultyLevel), asc(skills.name));
  }
  
  async getUserSkillProgress(userId: string): Promise<any[]> {
    // This would track user skill proficiency over time
    // For now, return empty array
    return [];
  }
  
  // ===== TEAM MANAGEMENT =====
  
  async createTeam(team: any): Promise<any> {
    const [newTeam] = await db.insert(teams).values({
      ...team,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Add creator as owner
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: team.createdById,
      role: 'owner',
      joinedAt: new Date(),
    });
    
    return newTeam;
  }
  
  async getUserTeams(userId: string): Promise<any[]> {
    const results = await db.select({
      // Team data
      teamId: teams.id,
      teamName: teams.name,
      teamDescription: teams.description,
      teamAvatarUrl: teams.avatarUrl,
      teamMaxMembers: teams.maxMembers,
      teamIsPublic: teams.isPublic,
      teamRequiresApproval: teams.requiresApproval,
      teamTotalXp: teams.totalXp,
      teamLevel: teams.teamLevel,
      teamWinStreak: teams.winStreak,
      teamChallengesWon: teams.challengesWon,
      teamCreatedById: teams.createdById,
      teamCreatedAt: teams.createdAt,
      teamUpdatedAt: teams.updatedAt,
      // Membership data
      membershipId: teamMembers.id,
      membershipUserId: teamMembers.userId,
      membershipTeamId: teamMembers.teamId,
      membershipRole: teamMembers.role,
      membershipContributionXp: teamMembers.contributionXp,
      membershipJoinedAt: teamMembers.joinedAt,
    }).from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(desc(teamMembers.joinedAt));
    
    return results;
  }
  
  async getPublicTeams(limit: number = 20, search?: string): Promise<any[]> {
    let query = db.select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      avatarUrl: teams.avatarUrl,
      maxMembers: teams.maxMembers,
      isPublic: teams.isPublic,
      requiresApproval: teams.requiresApproval,
      totalXp: teams.totalXp,
      teamLevel: teams.teamLevel,
      winStreak: teams.winStreak,
      challengesWon: teams.challengesWon,
      createdById: teams.createdById,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      memberCount: count(teamMembers.id).mapWith(Number)
    }).from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teams.isPublic, true))
      .groupBy(teams.id);

    if (search) {
      query = query.where(
        and(
          eq(teams.isPublic, true),
          or(
            sql`lower(${teams.name}) like lower(${'%' + search + '%'})`,
            sql`lower(${teams.description}) like lower(${'%' + search + '%'})`
          )
        )
      );
    }

    const results = await query
      .orderBy(desc(teams.totalXp))
      .limit(limit);

    return results;
  }
  
  async getTeamById(teamId: string): Promise<any | null> {
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    
    if (!team) return null;
    
    // Get member count
    const [memberCount] = await db.select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    
    return {
      ...team,
      memberCount: memberCount.count
    };
  }
  
  async updateTeam(teamId: string, updates: any): Promise<void> {
    await db.update(teams)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  }
  
  async deleteTeam(teamId: string): Promise<void> {
    // Team members will be deleted due to cascade
    await db.delete(teams).where(eq(teams.id, teamId));
  }
  
  // Team membership management
  async inviteToTeam(teamId: string, userId: string, invitedBy: string, role: string = 'member'): Promise<void> {
    // Create team invite
    await db.insert(teamInvites).values({
      teamId,
      invitedUserId: userId,
      invitedById: invitedBy,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }
  
  async acceptTeamInvitation(teamId: string, userId: string): Promise<void> {
    // Update invite status
    await db.update(teamInvites)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(
        and(
          eq(teamInvites.teamId, teamId),
          eq(teamInvites.invitedUserId, userId),
          eq(teamInvites.status, 'pending')
        )
      );
    
    // Add as team member
    await db.insert(teamMembers).values({
      teamId,
      userId,
      role: 'member',
      joinedAt: new Date(),
    });
  }
  
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db.delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      );
  }
  
  async updateMemberRole(teamId: string, userId: string, role: string): Promise<void> {
    await db.update(teamMembers)
      .set({ role })
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      );
  }
  
  async getTeamMembers(teamId: string): Promise<any[]> {
    const results = await db.select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      contributionXp: teamMembers.contributionXp,
      joinedAt: teamMembers.joinedAt,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
    }).from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.role, desc(teamMembers.joinedAt));
    
    return results;
  }
  
  // Team goals and collaboration
  async createTeamGoal(teamGoal: any): Promise<any> {
    const [newGoal] = await db.insert(teamGoals).values({
      ...teamGoal,
      createdAt: new Date(),
    }).returning();
    
    return newGoal;
  }
  
  async getTeamGoals(teamId: string): Promise<any[]> {
    return await db.select().from(teamGoals)
      .where(eq(teamGoals.teamId, teamId))
      .orderBy(desc(teamGoals.createdAt));
  }
  
  async getTeamAnalytics(teamId: string): Promise<any> {
    // Get team basic info
    const team = await this.getTeamById(teamId);
    if (!team) return null;
    
    // Get team members count and XP distribution
    const members = await this.getTeamMembers(teamId);
    const totalMembers = members.length;
    const totalContributionXp = members.reduce((sum, member) => sum + (member.contributionXp || 0), 0);
    
    // Get team goals progress
    const goals = await this.getTeamGoals(teamId);
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    
    return {
      teamId,
      totalMembers,
      totalXp: team.totalXp,
      totalContributionXp,
      teamLevel: team.teamLevel,
      winStreak: team.winStreak,
      challengesWon: team.challengesWon,
      activeGoals,
      completedGoals,
      totalGoals: goals.length,
      averageXpPerMember: totalMembers > 0 ? Math.round(totalContributionXp / totalMembers) : 0,
      topContributors: members.sort((a, b) => (b.contributionXp || 0) - (a.contributionXp || 0)).slice(0, 5),
    };
  }
  
  // ===== ADVANCED PROFILE & SETTINGS IMPLEMENTATION =====
  
  // Profile Picture Management
  async uploadProfilePicture(picture: InsertProfilePicture): Promise<ProfilePicture> {
    // Deactivate any existing active profile picture
    await db.update(profilePictures)
      .set({ isActive: false })
      .where(eq(profilePictures.userId, picture.userId));
    
    // Insert new profile picture
    const [newPicture] = await db.insert(profilePictures).values({
      ...picture,
      isActive: true,
      uploadedAt: new Date(),
    }).returning();
    
    // Update user's profile image URL
    await db.update(users)
      .set({ profileImageUrl: newPicture.filePath })
      .where(eq(users.id, picture.userId));
    
    return newPicture;
  }
  
  async getProfilePictures(userId: string): Promise<ProfilePicture[]> {
    return await db.select().from(profilePictures)
      .where(eq(profilePictures.userId, userId))
      .orderBy(desc(profilePictures.uploadedAt));
  }
  
  async getActiveProfilePicture(userId: string): Promise<ProfilePicture | null> {
    const [picture] = await db.select().from(profilePictures)
      .where(and(
        eq(profilePictures.userId, userId),
        eq(profilePictures.isActive, true)
      ));
    return picture || null;
  }
  
  async setActiveProfilePicture(userId: string, pictureId: string): Promise<void> {
    // Deactivate all pictures for user
    await db.update(profilePictures)
      .set({ isActive: false })
      .where(eq(profilePictures.userId, userId));
    
    // Activate selected picture
    await db.update(profilePictures)
      .set({ isActive: true })
      .where(eq(profilePictures.id, pictureId));
    
    // Update user's profile image URL
    const [picture] = await db.select().from(profilePictures)
      .where(eq(profilePictures.id, pictureId));
    
    if (picture) {
      await db.update(users)
        .set({ profileImageUrl: picture.filePath })
        .where(eq(users.id, userId));
    }
  }
  
  async deleteProfilePicture(pictureId: string): Promise<void> {
    const [picture] = await db.select().from(profilePictures)
      .where(eq(profilePictures.id, pictureId));
    
    if (picture) {
      await db.delete(profilePictures).where(eq(profilePictures.id, pictureId));
      
      // If this was the active picture, clear user's profile image
      if (picture.isActive) {
        await db.update(users)
          .set({ profileImageUrl: null })
          .where(eq(users.id, picture.userId));
      }
    }
  }
  
  // Security Logs
  async logSecurityEvent(event: InsertSecurityLog): Promise<void> {
    await db.insert(securityLogs).values({
      ...event,
      createdAt: new Date(),
    });
  }
  
  async getUserSecurityLogs(userId: string, limit: number = 50): Promise<SecurityLog[]> {
    return await db.select().from(securityLogs)
      .where(eq(securityLogs.userId, userId))
      .orderBy(desc(securityLogs.createdAt))
      .limit(limit);
  }
  
  async getFlaggedSecurityLogs(limit: number = 50): Promise<SecurityLog[]> {
    return await db.select().from(securityLogs)
      .where(eq(securityLogs.flagged, true))
      .orderBy(desc(securityLogs.createdAt))
      .limit(limit);
  }
  
  async getRecentSecurityEvents(userId: string, eventTypes: string[], limit: number = 10): Promise<SecurityLog[]> {
    return await db.select().from(securityLogs)
      .where(and(
        eq(securityLogs.userId, userId),
        inArray(securityLogs.eventType, eventTypes)
      ))
      .orderBy(desc(securityLogs.createdAt))
      .limit(limit);
  }
  
  // Connected Accounts Management
  async connectAccount(account: InsertConnectedAccount): Promise<ConnectedAccount> {
    const [newAccount] = await db.insert(connectedAccounts).values({
      ...account,
      connectedAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return newAccount;
  }
  
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return await db.select().from(connectedAccounts)
      .where(eq(connectedAccounts.userId, userId))
      .orderBy(desc(connectedAccounts.connectedAt));
  }
  
  async getConnectedAccountByProvider(userId: string, provider: string): Promise<ConnectedAccount | null> {
    const [account] = await db.select().from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, userId),
        eq(connectedAccounts.provider, provider)
      ));
    return account || null;
  }
  
  async updateConnectedAccount(accountId: string, updates: Partial<ConnectedAccount>): Promise<void> {
    await db.update(connectedAccounts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, accountId));
  }
  
  async disconnectAccount(accountId: string): Promise<void> {
    await db.delete(connectedAccounts).where(eq(connectedAccounts.id, accountId));
  }
  
  async syncConnectedAccount(accountId: string): Promise<void> {
    await db.update(connectedAccounts)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, accountId));
  }
  
  // Data Export Functionality (Basic implementation)
  async createDataExport(exportRequest: InsertDataExport): Promise<DataExport> {
    const [newExport] = await db.insert(dataExports).values({
      ...exportRequest,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }).returning();
    
    return newExport;
  }
  
  async getDataExports(userId: string): Promise<DataExport[]> {
    return await db.select().from(dataExports)
      .where(eq(dataExports.userId, userId))
      .orderBy(desc(dataExports.requestedAt));
  }
  
  async getDataExportById(exportId: string): Promise<DataExport | null> {
    const [exportRecord] = await db.select().from(dataExports)
      .where(eq(dataExports.id, exportId));
    return exportRecord || null;
  }
  
  async updateDataExportStatus(exportId: string, status: string, progress?: number, filePath?: string): Promise<void> {
    const updates: any = { status };
    if (progress !== undefined) updates.progress = progress;
    if (filePath) updates.filePath = filePath;
    if (status === 'completed') updates.completedAt = new Date();
    
    await db.update(dataExports)
      .set(updates)
      .where(eq(dataExports.id, exportId));
  }
  
  async markDataExportDownloaded(exportId: string): Promise<void> {
    const [exportRecord] = await db.select().from(dataExports)
      .where(eq(dataExports.id, exportId));
    
    if (exportRecord) {
      await db.update(dataExports)
        .set({
          downloadCount: (exportRecord.downloadCount || 0) + 1,
          lastDownloadedAt: new Date(),
        })
        .where(eq(dataExports.id, exportId));
    }
  }
  
  async cleanupExpiredExports(): Promise<void> {
    await db.delete(dataExports)
      .where(lte(dataExports.expiresAt, new Date()));
  }
  
  // Account Deletion Management
  async requestAccountDeletion(deletion: InsertAccountDeletion): Promise<AccountDeletion> {
    const [newDeletion] = await db.insert(accountDeletions).values({
      ...deletion,
      requestedAt: new Date(),
      scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }).returning();
    
    return newDeletion;
  }
  
  async getAccountDeletion(userId: string): Promise<AccountDeletion | null> {
    const [deletion] = await db.select().from(accountDeletions)
      .where(and(
        eq(accountDeletions.userId, userId),
        inArray(accountDeletions.status, ['scheduled', 'in_progress'])
      ));
    return deletion || null;
  }
  
  async cancelAccountDeletion(deletionId: string): Promise<void> {
    await db.update(accountDeletions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(accountDeletions.id, deletionId));
  }
  
  async processAccountDeletion(deletionId: string): Promise<void> {
    await db.update(accountDeletions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(accountDeletions.id, deletionId));
  }
  
  async getScheduledAccountDeletions(): Promise<AccountDeletion[]> {
    return await db.select().from(accountDeletions)
      .where(and(
        eq(accountDeletions.status, 'scheduled'),
        lte(accountDeletions.scheduledFor, new Date())
      ));
  }
  
  async permanentlyDeleteAccount(userId: string): Promise<void> {
    // Get user data for Stripe cancellation
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // 1. Cancel Stripe subscription if exists
    if (user.stripeSubscriptionId) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2023-10-16',
        });
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (error) {
        console.error('Error canceling Stripe subscription:', error);
      }
    }
    
    // 2. Delete user-generated content (order matters for foreign keys)
    await db.delete(goalSkills).where(
      inArray(goalSkills.goalId, db.select({ id: goals.id }).from(goals).where(eq(goals.userId, userId)))
    );
    await db.delete(taskSkills).where(
      inArray(taskSkills.taskId, db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId)))
    );
    await db.delete(taskKnowledgeLinks).where(
      inArray(taskKnowledgeLinks.taskId, db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId)))
    );
    
    await db.delete(tasks).where(eq(tasks.userId, userId));
    await db.delete(taskPlans).where(eq(taskPlans.userId, userId));
    await db.delete(goals).where(eq(goals.userId, userId));
    await db.delete(habits).where(eq(habits.userId, userId));
    await db.delete(habitCompletions).where(eq(habitCompletions.userId, userId));
    
    // 3. Delete social data
    await db.delete(friendConnections).where(or(
      eq(friendConnections.userId, userId),
      eq(friendConnections.friendId, userId)
    ));
    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
    await db.delete(teamGoals).where(
      inArray(teamGoals.teamId, db.select({ id: teams.id }).from(teams).where(eq(teams.ownerId, userId)))
    );
    await db.delete(teamInvites).where(
      or(
        eq(teamInvites.userId, userId),
        eq(teamInvites.invitedBy, userId)
      )
    );
    await db.delete(teams).where(eq(teams.ownerId, userId));
    await db.delete(socialFeedPosts).where(eq(socialFeedPosts.userId, userId));
    
    // 4. Delete gamification data
    await db.delete(userAchievements).where(eq(userAchievements.userId, userId));
    await db.delete(xpTransactions).where(eq(xpTransactions.userId, userId));
    await db.delete(userQuests).where(eq(userQuests.userId, userId));
    await db.delete(avatars).where(eq(avatars.userId, userId));
    await db.delete(userAvatarItems).where(eq(userAvatarItems.userId, userId));
    await db.delete(userPurchases).where(eq(userPurchases.userId, userId));
    await db.delete(coinTransactions).where(eq(coinTransactions.userId, userId));
    await db.delete(userLoginStreaks).where(eq(userLoginStreaks.userId, userId));
    await db.delete(userSpinHistory).where(eq(userSpinHistory.userId, userId));
    
    // 5. Delete challenges and mentorships
    await db.delete(challengeParticipants).where(eq(challengeParticipants.userId, userId));
    await db.delete(challenges).where(eq(challenges.createdBy, userId));
    await db.delete(mentorships).where(or(
      eq(mentorships.mentorId, userId),
      eq(mentorships.menteeId, userId)
    ));
    
    // 6. Delete AI & performance data
    await db.delete(performanceEvents).where(eq(performanceEvents.userId, userId));
    await db.delete(adaptationLogs).where(eq(adaptationLogs.userId, userId));
    await db.delete(predictionSnapshots).where(eq(predictionSnapshots.userId, userId));
    await db.delete(knowledgeUsageLogs).where(eq(knowledgeUsageLogs.userId, userId));
    await db.delete(mentorSessions).where(eq(mentorSessions.userId, userId));
    await db.delete(mentorConversations).where(eq(mentorConversations.userId, userId));
    
    // 7. Delete profile & security data
    await db.delete(profilePictures).where(eq(profilePictures.userId, userId));
    await db.delete(securityLogs).where(eq(securityLogs.userId, userId));
    await db.delete(connectedAccounts).where(eq(connectedAccounts.userId, userId));
    await db.delete(dataExports).where(eq(dataExports.userId, userId));
    await db.delete(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));
    await db.delete(usageStatistics).where(eq(usageStatistics.userId, userId));
    await db.delete(calendarTokens).where(eq(calendarTokens.userId, userId));
    
    // 8. Delete league participation
    await db.delete(leagueParticipants).where(eq(leagueParticipants.userId, userId));
    
    // 9. Delete notifications
    await db.delete(notifications).where(eq(notifications.userId, userId));
    
    // 10. Delete daily challenges
    await db.delete(userChallengeProgress).where(eq(userChallengeProgress.userId, userId));
    
    // 11. Delete user profile
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    
    // 12. Finally delete the user (this will cascade to accountDeletions)
    await db.delete(users).where(eq(users.id, userId));
  }
  
  // Two-Factor Authentication (Basic implementation)
  async setupTwoFactorAuth(userId: string, secret: string): Promise<TwoFactorAuth> {
    const [auth] = await db.insert(twoFactorAuth).values({
      userId,
      secret,
      isEnabled: false,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return auth;
  }
  
  async getTwoFactorAuth(userId: string): Promise<TwoFactorAuth | null> {
    const [auth] = await db.select().from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, userId));
    return auth || null;
  }
  
  async verifyTwoFactorAuth(userId: string, token: string): Promise<boolean> {
    // Basic implementation - in production you'd verify the TOTP token
    const auth = await this.getTwoFactorAuth(userId);
    return auth?.isEnabled === true;
  }
  
  async enableTwoFactorAuth(userId: string): Promise<void> {
    await db.update(twoFactorAuth)
      .set({
        isEnabled: true,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
    
    await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));
  }
  
  async disableTwoFactorAuth(userId: string): Promise<void> {
    await db.update(twoFactorAuth)
      .set({
        isEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
    
    await db.update(users)
      .set({ twoFactorEnabled: false })
      .where(eq(users.id, userId));
  }
  
  async generateBackupCodes(userId: string): Promise<string[]> {
    // Generate 10 backup codes
    const codes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 15)
    );
    
    await db.update(twoFactorAuth)
      .set({
        backupCodes: codes.map(code => `hashed_${code}`), // In production, hash these
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
    
    return codes;
  }
  
  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const auth = await this.getTwoFactorAuth(userId);
    if (!auth || !auth.backupCodes) return false;
    
    const hashedCode = `hashed_${code}`;
    const usedCodes = auth.usedBackupCodes || [];
    
    if (auth.backupCodes.includes(hashedCode) && !usedCodes.includes(hashedCode)) {
      await db.update(twoFactorAuth)
        .set({
          usedBackupCodes: [...usedCodes, hashedCode],
          updatedAt: new Date(),
        })
        .where(eq(twoFactorAuth.userId, userId));
      return true;
    }
    return false;
  }
  
  async updateTwoFactorFailedAttempts(userId: string, increment: boolean): Promise<void> {
    const auth = await this.getTwoFactorAuth(userId);
    if (!auth) return;
    
    const newCount = increment ? (auth.failedAttempts || 0) + 1 : 0;
    await db.update(twoFactorAuth)
      .set({
        failedAttempts: newCount,
        lastFailedAttempt: increment ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
  }
  
  // Usage Statistics & Analytics (Basic implementation)
  async recordUsageStatistics(stats: InsertUsageStatistics): Promise<void> {
    await db.insert(usageStatistics).values({
      ...stats,
      createdAt: new Date(),
    });
  }
  
  async getUserUsageStatistics(userId: string, startDate?: Date, endDate?: Date): Promise<UsageStatistics[]> {
    const conditions = [eq(usageStatistics.userId, userId)];
    
    if (startDate) conditions.push(gte(usageStatistics.date, startDate));
    if (endDate) conditions.push(lte(usageStatistics.date, endDate));
    
    return await db.select().from(usageStatistics)
      .where(and(...conditions))
      .orderBy(desc(usageStatistics.date));
  }
  
  async getUsageInsights(userId: string, period: 'week' | 'month' | 'year'): Promise<any> {
    const daysBack = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const stats = await this.getUserUsageStatistics(userId, startDate);
    
    return {
      totalSessions: stats.reduce((sum, s) => sum + (s.sessionCount || 0), 0),
      totalTime: stats.reduce((sum, s) => sum + (s.totalSessionTime || 0), 0),
      averageSessionTime: stats.length > 0 ? 
        stats.reduce((sum, s) => sum + (s.totalSessionTime || 0), 0) / stats.length : 0,
      goalsWorkedOn: stats.reduce((sum, s) => sum + (s.goalsWorkedOn || 0), 0),
      tasksCompleted: stats.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0),
      xpEarned: stats.reduce((sum, s) => sum + (s.xpEarned || 0), 0),
      topFeatures: this.aggregateFeatureUsage(stats),
    };
  }
  
  async aggregateDailyStats(userId: string, date: Date): Promise<void> {
    const existingStats = await db.select().from(usageStatistics)
      .where(and(
        eq(usageStatistics.userId, userId),
        eq(usageStatistics.date, date)
      ));
    
    if (existingStats.length === 0) {
      await db.insert(usageStatistics).values({
        userId,
        date,
        sessionCount: 1,
        totalSessionTime: 0,
        goalsWorkedOn: 0,
        tasksCompleted: 0,
        xpEarned: 0,
        featuresUsed: [],
        createdAt: new Date(),
      });
    }
  }
  
  async getUserDeviceStats(userId: string): Promise<any[]> {
    const stats = await db.select({
      deviceType: usageStatistics.deviceType,
      sessionCount: sum(usageStatistics.sessionCount).mapWith(Number),
      totalTime: sum(usageStatistics.totalSessionTime).mapWith(Number)
    })
    .from(usageStatistics)
    .where(eq(usageStatistics.userId, userId))
    .groupBy(usageStatistics.deviceType);
    
    return stats;
  }
  
  async getFeatureUsageStats(userId: string): Promise<any[]> {
    const stats = await this.getUserUsageStatistics(userId);
    return this.aggregateFeatureUsage(stats);
  }
  
  private aggregateFeatureUsage(stats: UsageStatistics[]): any[] {
    const featureMap = new Map<string, number>();
    
    stats.forEach(stat => {
      if (stat.featuresUsed) {
        stat.featuresUsed.forEach(feature => {
          featureMap.set(feature, (featureMap.get(feature) || 0) + 1);
        });
      }
    });
    
    return Array.from(featureMap.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  // ===== CALENDAR INTEGRATION & ICAL FEED =====
  
  async getOrCreateCalendarToken(userId: string): Promise<CalendarToken> {
    const existing = await db.select()
      .from(calendarTokens)
      .where(eq(calendarTokens.userId, userId))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const [newToken] = await db.insert(calendarTokens)
      .values({
        userId,
        icalToken: token,
        createdAt: new Date(),
      })
      .returning();
    
    return newToken;
  }
  
  async getCalendarTokenByToken(token: string): Promise<CalendarToken | null> {
    const result = await db.select()
      .from(calendarTokens)
      .where(eq(calendarTokens.icalToken, token))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  }
  
  async regenerateCalendarToken(userId: string): Promise<CalendarToken> {
    const newToken = crypto.randomBytes(32).toString('hex');
    
    const [updated] = await db.update(calendarTokens)
      .set({ 
        icalToken: newToken,
        createdAt: new Date() 
      })
      .where(eq(calendarTokens.userId, userId))
      .returning();
    
    if (updated) {
      return updated;
    }
    
    return await this.getOrCreateCalendarToken(userId);
  }
  
  async getAllCalendarEvents(userId: string): Promise<any[]> {
    const [goals, tasks, activeHabits, challenges] = await Promise.all([
      this.getUserGoals(userId),
      this.getUserTasks(userId, { status: 'active' }),
      this.getUserHabits(userId, { isActive: true }),
      this.getUserChallenges(userId)
    ]);
    
    const events: any[] = [];
    
    goals.forEach(goal => {
      if (goal.targetDate) {
        events.push({
          id: `goal-${goal.id}`,
          title: `🎯 ${goal.title}`,
          description: goal.description || '',
          startDate: goal.targetDate,
          endDate: new Date(new Date(goal.targetDate).getTime() + 60 * 60 * 1000),
          category: `Goal: ${goal.category}`,
          recurring: false
        });
      }
    });
    
    tasks.forEach(task => {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: `✓ ${task.title}`,
          description: task.description || '',
          startDate: task.dueDate,
          endDate: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000),
          category: `Task: ${task.priority || 'normal'}`,
          recurring: false
        });
      }
    });
    
    activeHabits.forEach(habit => {
      const today = new Date();
      today.setHours(parseInt(habit.reminderTime?.split(':')[0] || '9'), 
                     parseInt(habit.reminderTime?.split(':')[1] || '0'), 0, 0);
      
      events.push({
        id: `habit-${habit.id}`,
        title: `🔄 ${habit.name}`,
        description: habit.description || '',
        startDate: today,
        endDate: new Date(today.getTime() + 30 * 60 * 1000),
        category: `Habit: ${habit.category}`,
        recurring: true,
        frequency: habit.frequency || 'daily'
      });
    });
    
    return events;
  }
  
  // ===== CONSENT MANAGEMENT =====
  
  async getUserConsent(userId: string): Promise<UserConsent | null> {
    const [consent] = await db.select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .limit(1);
    return consent || null;
  }
  
  async updateUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const existingConsent = await this.getUserConsent(consent.userId);
    
    if (existingConsent) {
      // Update existing consent
      const [updated] = await db.update(userConsents)
        .set({
          analytics: consent.analytics,
          behavioral: consent.behavioral,
          marketing: consent.marketing,
          consentVersion: consent.consentVersion || '1.0',
          updatedAt: new Date(),
          withdrawnAt: null,
          withdrawalReason: null
        })
        .where(eq(userConsents.userId, consent.userId))
        .returning();
      return updated;
    } else {
      // Create new consent record
      const [newConsent] = await db.insert(userConsents)
        .values({
          ...consent,
          consentVersion: consent.consentVersion || '1.0',
          consentedAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newConsent;
    }
  }
  
  async withdrawUserConsent(userId: string, reason?: string): Promise<UserConsent> {
    const existingConsent = await this.getUserConsent(userId);
    
    if (existingConsent) {
      // Update to withdraw consent
      const [withdrawn] = await db.update(userConsents)
        .set({
          analytics: false,
          behavioral: false,
          marketing: false,
          withdrawnAt: new Date(),
          withdrawalReason: reason || null,
          updatedAt: new Date()
        })
        .where(eq(userConsents.userId, userId))
        .returning();
      return withdrawn;
    } else {
      // Create withdrawn consent record
      const [newWithdrawn] = await db.insert(userConsents)
        .values({
          userId,
          analytics: false,
          behavioral: false,
          marketing: false,
          consentVersion: '1.0',
          withdrawnAt: new Date(),
          withdrawalReason: reason || null,
          consentedAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newWithdrawn;
    }
  }
  
  // ===== HABIT TRACKING SYSTEM =====
  
  async createHabit(habit: InsertHabit): Promise<Habit> {
    const [newHabit] = await db.insert(habits).values({
      ...habit,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return newHabit;
  }
  
  async getUserHabits(userId: string, options?: { category?: string; isActive?: boolean }): Promise<Habit[]> {
    const conditions = [eq(habits.userId, userId)];
    
    if (options?.category) {
      conditions.push(eq(habits.category, options.category));
    }
    
    if (options?.isActive !== undefined) {
      conditions.push(eq(habits.isActive, options.isActive));
    }
    
    return await db.select().from(habits)
      .where(and(...conditions))
      .orderBy(desc(habits.createdAt));
  }
  
  async getHabitById(habitId: string): Promise<Habit | null> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, habitId));
    return habit || null;
  }
  
  async updateHabit(habitId: string, updates: Partial<Habit>): Promise<void> {
    await db.update(habits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(habits.id, habitId));
  }
  
  async deleteHabit(habitId: string): Promise<void> {
    await db.delete(habits).where(eq(habits.id, habitId));
  }
  
  async checkHabit(habitId: string, userId: string, completion: InsertHabitCompletion): Promise<HabitCompletion> {
    const [newCompletion] = await db.insert(habitCompletions).values({
      ...completion,
      habitId,
      userId,
      completedAt: new Date(),
      createdAt: new Date(),
    }).returning();
    
    await this.updateHabitStreaks(habitId);
    
    const habit = await this.getHabitById(habitId);
    await db.update(habits)
      .set({ 
        totalCompletions: (habit?.totalCompletions || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(habits.id, habitId));
    
    if (newCompletion.xpAwarded && newCompletion.xpAwarded > 0) {
      await this.addXPTransaction({
        userId,
        amount: newCompletion.xpAwarded,
        source: 'habit_completion',
        referenceId: habitId,
        description: `Completed habit: ${habit?.title}`,
      });
    }
    
    return newCompletion;
  }
  
  async getHabitCompletions(habitId: string, startDate?: Date, endDate?: Date): Promise<HabitCompletion[]> {
    const conditions = [eq(habitCompletions.habitId, habitId)];
    
    if (startDate) conditions.push(gte(habitCompletions.completionDate, startDate));
    if (endDate) conditions.push(lte(habitCompletions.completionDate, endDate));
    
    return await db.select().from(habitCompletions)
      .where(and(...conditions))
      .orderBy(desc(habitCompletions.completionDate));
  }
  
  async getUserHabitCompletions(userId: string, date?: Date): Promise<HabitCompletion[]> {
    const conditions = [eq(habitCompletions.userId, userId)];
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      conditions.push(
        and(
          gte(habitCompletions.completionDate, startOfDay),
          lte(habitCompletions.completionDate, endOfDay)
        ) as any
      );
    }
    
    return await db.select().from(habitCompletions)
      .where(and(...conditions))
      .orderBy(desc(habitCompletions.completionDate));
  }
  
  async getHabitStats(habitId: string): Promise<any> {
    const habit = await this.getHabitById(habitId);
    if (!habit) return null;
    
    const completions = await this.getHabitCompletions(habitId);
    
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recent = await this.getHabitCompletions(habitId, last30Days);
    
    const completionRate = recent.length / 30;
    
    return {
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      totalCompletions: habit.totalCompletions,
      completionRate: Math.round(completionRate * 100),
      rhythmScore: habit.rhythmScore,
      last30DaysCompletions: recent.length,
      recentCompletions: completions.slice(0, 10),
    };
  }
  
  async calculateRhythmScore(userId: string): Promise<number> {
    const userHabits = await this.getUserHabits(userId, { isActive: true });
    
    if (userHabits.length === 0) return 0;
    
    const alpha = 2 / (14 + 1);
    let totalEma = 0;
    
    for (const habit of userHabits) {
      const last14Days = new Date();
      last14Days.setDate(last14Days.getDate() - 14);
      const completions = await this.getHabitCompletions(habit.id, last14Days);
      
      let ema = 0;
      for (let i = 0; i < 14; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);
        
        const hasCompletion = completions.some(c => {
          const cDate = new Date(c.completionDate);
          cDate.setHours(0, 0, 0, 0);
          return cDate.getTime() === targetDate.getTime();
        });
        
        const dayCompletion = hasCompletion ? 1 : 0;
        ema = alpha * dayCompletion + (1 - alpha) * ema;
      }
      
      totalEma += ema;
    }
    
    const avgEma = totalEma / userHabits.length;
    return Math.round(avgEma * 100);
  }
  
  async updateHabitStreaks(habitId: string): Promise<void> {
    const habit = await this.getHabitById(habitId);
    if (!habit) return;
    
    const completions = await this.getHabitCompletions(habitId);
    if (completions.length === 0) return;
    
    const tolerance = 3;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    
    const sortedCompletions = completions.sort((a, b) => 
      new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()
    );
    
    for (const completion of sortedCompletions) {
      const currentDate = new Date(completion.completionDate);
      currentDate.setHours(0, 0, 0, 0);
      
      if (!lastDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= tolerance) {
          tempStreak = 1;
          currentStreak = 1;
        }
        lastDate = currentDate;
      } else {
        const daysDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1 + tolerance) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        
        lastDate = currentDate;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak, habit.longestStreak || 0);
    
    await db.update(habits)
      .set({ 
        currentStreak,
        longestStreak,
        updatedAt: new Date()
      })
      .where(eq(habits.id, habitId));
  }
  
  // ===== LEAGUE SYSTEM =====
  
  async getAllLeagues(): Promise<League[]> {
    return await db.select().from(leagues).orderBy(asc(leagues.level));
  }
  
  async getLeagueById(leagueId: string): Promise<League | null> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
    return league || null;
  }
  
  async getUserCurrentLeague(userId: string): Promise<{ league: League; season: LeagueSeason; participant: LeagueParticipant } | null> {
    const [participant] = await db
      .select()
      .from(leagueParticipants)
      .where(eq(leagueParticipants.userId, userId))
      .orderBy(desc(leagueParticipants.joinedAt))
      .limit(1);
    
    if (!participant) return null;
    
    const [season] = await db.select().from(leagueSeasons).where(eq(leagueSeasons.id, participant.seasonId));
    const [league] = await db.select().from(leagues).where(eq(leagues.id, participant.leagueId));
    
    if (!season || !league) return null;
    
    return { league, season, participant };
  }
  
  async getActiveSeason(leagueId: string): Promise<LeagueSeason | null> {
    const [season] = await db
      .select()
      .from(leagueSeasons)
      .where(and(eq(leagueSeasons.leagueId, leagueId), eq(leagueSeasons.status, 'active')));
    
    return season || null;
  }
  
  async getAllActiveSeasons(): Promise<LeagueSeason[]> {
    return await db.select().from(leagueSeasons).where(eq(leagueSeasons.status, 'active'));
  }
  
  async createLeagueSeason(seasonData: InsertLeagueSeason): Promise<LeagueSeason> {
    const [season] = await db.insert(leagueSeasons).values(seasonData).returning();
    return season;
  }
  
  async joinLeague(participantData: InsertLeagueParticipant): Promise<LeagueParticipant> {
    const [participant] = await db.insert(leagueParticipants).values(participantData).returning();
    
    await db
      .update(leagueSeasons)
      .set({ currentParticipants: sql`${leagueSeasons.currentParticipants} + 1` })
      .where(eq(leagueSeasons.id, participantData.seasonId));
    
    return participant;
  }
  
  async getLeagueLeaderboard(seasonId: string, limit: number = 50): Promise<(LeagueParticipant & { user: User })[]> {
    const participants = await db
      .select({
        participant: leagueParticipants,
        user: users,
      })
      .from(leagueParticipants)
      .leftJoin(users, eq(leagueParticipants.userId, users.id))
      .where(eq(leagueParticipants.seasonId, seasonId))
      .orderBy(desc(leagueParticipants.weeklyXp))
      .limit(limit);
    
    return participants.map((p: any) => ({
      ...p.participant,
      user: p.user,
    }));
  }
  
  async updateParticipantXP(participantId: string, xpToAdd: number): Promise<void> {
    await db
      .update(leagueParticipants)
      .set({ weeklyXp: sql`${leagueParticipants.weeklyXp} + ${xpToAdd}` })
      .where(eq(leagueParticipants.id, participantId));
  }
  
  async updateLeagueRankings(seasonId: string): Promise<void> {
    const participants = await db
      .select()
      .from(leagueParticipants)
      .where(eq(leagueParticipants.seasonId, seasonId))
      .orderBy(desc(leagueParticipants.weeklyXp));
    
    for (let i = 0; i < participants.length; i++) {
      await db
        .update(leagueParticipants)
        .set({ rank: i + 1 })
        .where(eq(leagueParticipants.id, participants[i].id));
    }
  }
  
  async endLeagueSeason(seasonId: string): Promise<void> {
    await db
      .update(leagueSeasons)
      .set({ status: 'completed' })
      .where(eq(leagueSeasons.id, seasonId));
  }
  
  async distributeLeagueRewards(seasonId: string): Promise<void> {
    const participants = await db
      .select()
      .from(leagueParticipants)
      .where(eq(leagueParticipants.seasonId, seasonId))
      .orderBy(desc(leagueParticipants.weeklyXp));
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const rank = i + 1;
      let coinReward = 0;
      let xpReward = 0;
      
      if (rank === 1) {
        coinReward = 500;
        xpReward = 1000;
      } else if (rank <= 3) {
        coinReward = 300;
        xpReward = 500;
      } else if (rank <= 10) {
        coinReward = 100;
        xpReward = 200;
      }
      
      if (coinReward > 0) {
        await db
          .update(users)
          .set({ coinBalance: sql`${users.coinBalance} + ${coinReward}` })
          .where(eq(users.id, participant.userId));
        
        const currentBalance = await db.select({ balance: users.coinBalance })
          .from(users)
          .where(eq(users.id, participant.userId));
        
        await db.insert(coinTransactions).values({
          userId: participant.userId,
          type: 'earn',
          amount: coinReward,
          balance: currentBalance[0].balance,
          source: 'league_reward',
          sourceId: seasonId,
          description: `League season reward - Rank ${rank}`,
        });
      }
      
      if (xpReward > 0) {
        await this.addXPTransaction({
          userId: participant.userId,
          amount: xpReward,
          source: 'league_reward',
          sourceId: seasonId,
          description: `League season reward - Rank ${rank}`,
        });
      }
    }
  }
  
  async promoteAndRelegate(seasonId: string): Promise<void> {
    const [season] = await db.select().from(leagueSeasons).where(eq(leagueSeasons.id, seasonId));
    if (!season) return;
    
    const [currentLeague] = await db.select().from(leagues).where(eq(leagues.id, season.leagueId));
    if (!currentLeague) return;
    
    const participants = await db
      .select()
      .from(leagueParticipants)
      .where(eq(leagueParticipants.seasonId, seasonId))
      .orderBy(desc(leagueParticipants.weeklyXp));
    
    const promotionCount = currentLeague.promotionThreshold;
    const relegationCount = currentLeague.relegationThreshold;
    
    for (let i = 0; i < participants.length; i++) {
      const rank = i + 1;
      
      if (rank <= promotionCount && currentLeague.level < 6) {
        await db
          .update(leagueParticipants)
          .set({ promoted: true })
          .where(eq(leagueParticipants.id, participants[i].id));
      } else if (rank > participants.length - relegationCount && currentLeague.level > 1) {
        await db
          .update(leagueParticipants)
          .set({ relegated: true })
          .where(eq(leagueParticipants.id, participants[i].id));
      }
    }
  }
  
  async getUserLeagueHistory(userId: string, limit: number = 10): Promise<any[]> {
    const history = await db
      .select({
        participant: leagueParticipants,
        season: leagueSeasons,
        league: leagues,
      })
      .from(leagueParticipants)
      .leftJoin(leagueSeasons, eq(leagueParticipants.seasonId, leagueSeasons.id))
      .leftJoin(leagues, eq(leagueParticipants.leagueId, leagues.id))
      .where(eq(leagueParticipants.userId, userId))
      .orderBy(desc(leagueParticipants.joinedAt))
      .limit(limit);
    
    return history;
  }
  
  // ===== iOS IN-APP PURCHASE SYSTEM IMPLEMENTATION =====
  
  async recordIapPurchase(purchase: Partial<IapReceipt>): Promise<IapReceipt> {
    const [existingReceipt] = await db
      .select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, purchase.transactionId!));
    
    if (existingReceipt) {
      // Update existing receipt
      await db
        .update(iapReceipts)
        .set({ ...purchase, updatedAt: new Date() })
        .where(eq(iapReceipts.transactionId, purchase.transactionId!));
      
      return existingReceipt;
    }
    
    // Insert new receipt
    const [newReceipt] = await db
      .insert(iapReceipts)
      .values(purchase as any)
      .returning();
    
    return newReceipt;
  }
  
  async getUserIapReceipts(userId: string, limit: number = 50): Promise<IapReceipt[]> {
    const receipts = await db
      .select()
      .from(iapReceipts)
      .where(eq(iapReceipts.userId, userId))
      .orderBy(desc(iapReceipts.purchaseDate))
      .limit(limit);
    
    return receipts;
  }
  
  async getIapReceiptByTransaction(transactionId: string): Promise<IapReceipt | null> {
    const [receipt] = await db
      .select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId));
    
    return receipt || null;
  }
  
  async updateSubscriptionFromIap(data: { 
    userId: string; 
    productId: string; 
    expiresDate: Date | null; 
    isActive: boolean 
  }): Promise<void> {
    const { userId, productId, expiresDate, isActive } = data;
    
    // Determine subscription tier from product ID
    let subscriptionTier = 'free';
    if (productId.includes('yearly')) {
      subscriptionTier = 'pro';
    } else if (productId.includes('monthly')) {
      subscriptionTier = 'pro';
    }
    
    // Update user subscription
    await db
      .update(users)
      .set({
        subscriptionTier,
        subscriptionStatus: isActive ? 'active' : 'cancelled',
        subscriptionCurrentPeriodEnd: expiresDate || undefined,
        paymentProvider: 'apple',
      })
      .where(eq(users.id, userId));
    
    // Log security event
    await this.logSecurityEvent({
      userId,
      eventType: 'subscription_update',
      eventDescription: `iOS subscription updated: ${productId}`,
      ipAddress: '',
      userAgent: 'iOS App'
    });
  }
  
  async addCoinsFromIap(userId: string, coinAmount: number): Promise<void> {
    // Get current user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update coin balance
    const newBalance = (user.coinBalance || 0) + coinAmount;
    await db
      .update(users)
      .set({ coinBalance: newBalance })
      .where(eq(users.id, userId));
    
    // Record coin transaction
    await db.insert(coinTransactions).values({
      userId,
      delta: coinAmount,
      reason: 'iOS In-App Purchase',
      source: 'iap',
      balanceAfter: newBalance,
    });
    
    // Log security event
    await this.logSecurityEvent({
      userId,
      eventType: 'coin_purchase',
      eventDescription: `Coins added via iOS IAP: ${coinAmount}`,
      ipAddress: '',
      userAgent: 'iOS App'
    });
  }
  
  // ===== AVATAR & QUEST SYSTEM IMPLEMENTATION =====
  
  async getOrCreateAvatar(userId: string): Promise<Avatar> {
    const [existingAvatar] = await db.select().from(avatars).where(eq(avatars.userId, userId));
    
    if (existingAvatar) {
      return existingAvatar;
    }
    
    const [newAvatar] = await db.insert(avatars).values({
      userId,
      skinTone: 'light',
      hairStyle: 'short',
      hairColor: 'brown',
      faceType: 'happy',
      outfit: 'casual',
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
    }).returning();
    
    return newAvatar;
  }
  
  async updateAvatar(userId: string, updates: Partial<Avatar>): Promise<void> {
    await db
      .update(avatars)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(avatars.userId, userId));
  }
  
  async equipItem(userId: string, itemId: string): Promise<void> {
    const [item] = await db.select().from(avatarItems).where(eq(avatarItems.id, itemId));
    if (!item) throw new Error('Item not found');
    
    const [avatar] = await db.select().from(avatars).where(eq(avatars.userId, userId));
    if (!avatar) throw new Error('Avatar not found');
    
    const updates: any = {};
    
    if (item.category === 'weapon') {
      updates.weapon = itemId;
    } else if (item.category === 'armor') {
      updates.armor = itemId;
    } else if (item.category === 'helmet') {
      updates.helmet = itemId;
    } else if (item.category === 'shield') {
      updates.shield = itemId;
    } else if (item.category === 'hair') {
      updates.hairStyle = item.name;
    } else if (item.category === 'outfit') {
      updates.outfit = item.name;
    }
    
    if (item.statBonus) {
      if (item.statBonus.health) {
        updates.maxHealth = (avatar.maxHealth || 100) + (item.statBonus.health || 0);
        updates.health = Math.min((avatar.health || 100) + (item.statBonus.health || 0), updates.maxHealth);
      }
      if (item.statBonus.mana) {
        updates.maxMana = (avatar.maxMana || 50) + (item.statBonus.mana || 0);
        updates.mana = Math.min((avatar.mana || 50) + (item.statBonus.mana || 0), updates.maxMana);
      }
    }
    
    await db
      .update(avatars)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(avatars.userId, userId));
    
    await db
      .update(userAvatarItems)
      .set({ isEquipped: false })
      .where(and(
        eq(userAvatarItems.userId, userId),
        eq(userAvatarItems.itemId, itemId)
      ));
    
    const [userItem] = await db
      .select()
      .from(userAvatarItems)
      .where(and(
        eq(userAvatarItems.userId, userId),
        eq(userAvatarItems.itemId, itemId)
      ));
    
    if (userItem) {
      await db
        .update(userAvatarItems)
        .set({ isEquipped: true })
        .where(eq(userAvatarItems.id, userItem.id));
    }
  }
  
  async unequipItem(userId: string, category: string): Promise<void> {
    const updates: any = {};
    
    if (category === 'weapon') {
      updates.weapon = null;
    } else if (category === 'armor') {
      updates.armor = null;
    } else if (category === 'helmet') {
      updates.helmet = null;
    } else if (category === 'shield') {
      updates.shield = null;
    }
    
    await db
      .update(avatars)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(avatars.userId, userId));
  }
  
  async getAllQuests(filters?: { difficulty?: string; minLevel?: number }): Promise<Quest[]> {
    let query = db.select().from(quests).where(eq(quests.isActive, true));
    
    if (filters?.difficulty) {
      query = query.where(eq(quests.difficulty, filters.difficulty)) as any;
    }
    
    return await query;
  }
  
  async getQuestById(questId: string): Promise<Quest | null> {
    const [quest] = await db.select().from(quests).where(eq(quests.id, questId));
    return quest || null;
  }
  
  async getUserActiveQuests(userId: string): Promise<(UserQuest & { quest: Quest })[]> {
    const activeQuests = await db
      .select({
        userQuest: userQuests,
        quest: quests,
      })
      .from(userQuests)
      .leftJoin(quests, eq(userQuests.questId, quests.id))
      .where(and(
        eq(userQuests.userId, userId),
        eq(userQuests.status, 'active')
      ));
    
    return activeQuests.map((q: any) => ({
      ...q.userQuest,
      quest: q.quest,
    }));
  }
  
  async startQuest(userId: string, questId: string): Promise<UserQuest> {
    const [quest] = await db.select().from(quests).where(eq(quests.id, questId));
    if (!quest) throw new Error('Quest not found');
    
    const [existingUserQuest] = await db
      .select()
      .from(userQuests)
      .where(and(
        eq(userQuests.userId, userId),
        eq(userQuests.questId, questId)
      ));
    
    if (existingUserQuest) {
      throw new Error('Quest already started');
    }
    
    const initialProgress: Record<string, number> = {};
    quest.objectives.forEach((objective: any) => {
      initialProgress[objective.id] = 0;
    });
    
    const [userQuest] = await db.insert(userQuests).values({
      userId,
      questId,
      status: 'active',
      progress: initialProgress,
      bossHealthRemaining: quest.bossHealth || null,
    }).returning();
    
    return userQuest;
  }
  
  async updateQuestProgress(userQuestId: string, progress: Record<string, number>): Promise<void> {
    await db
      .update(userQuests)
      .set({ progress })
      .where(eq(userQuests.id, userQuestId));
  }
  
  async completeQuest(userQuestId: string): Promise<void> {
    const [userQuest] = await db.select().from(userQuests).where(eq(userQuests.id, userQuestId));
    if (!userQuest) return;
    
    const [quest] = await db.select().from(quests).where(eq(quests.id, userQuest.questId));
    if (!quest) return;
    
    await db
      .update(userQuests)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(userQuests.id, userQuestId));
    
    await db
      .update(users)
      .set({ coinBalance: sql`${users.coinBalance} + ${quest.coinReward}` })
      .where(eq(users.id, userQuest.userId));
    
    const [user] = await db.select().from(users).where(eq(users.id, userQuest.userId));
    
    await db.insert(coinTransactions).values({
      userId: userQuest.userId,
      type: 'earn',
      amount: quest.coinReward || 0,
      balance: user.coinBalance,
      source: 'quest_reward',
      sourceId: quest.id,
      description: `Quest completed: ${quest.title}`,
    });
    
    await this.addXPTransaction({
      userId: userQuest.userId,
      amount: quest.xpReward || 0,
      source: 'quest_reward',
      sourceId: quest.id,
      description: `Quest completed: ${quest.title}`,
    });
    
    if (quest.itemRewards && quest.itemRewards.length > 0) {
      for (const itemId of quest.itemRewards) {
        const [existing] = await db
          .select()
          .from(userAvatarItems)
          .where(and(
            eq(userAvatarItems.userId, userQuest.userId),
            eq(userAvatarItems.itemId, itemId)
          ));
        
        if (!existing) {
          await db.insert(userAvatarItems).values({
            userId: userQuest.userId,
            itemId,
            isEquipped: false,
          });
        }
      }
    }
  }
  
  async attackBoss(userQuestId: string, damage: number): Promise<{ defeated: boolean; remaining: number }> {
    const [userQuest] = await db.select().from(userQuests).where(eq(userQuests.id, userQuestId));
    if (!userQuest) throw new Error('Quest not found');
    
    const remaining = Math.max(0, (userQuest.bossHealthRemaining || 0) - damage);
    const defeated = remaining === 0;
    
    await db
      .update(userQuests)
      .set({ bossHealthRemaining: remaining })
      .where(eq(userQuests.id, userQuestId));
    
    if (defeated) {
      await this.completeQuest(userQuestId);
    }
    
    return { defeated, remaining };
  }
  
  async getAllAvatarItems(filters?: { category?: string; rarity?: string }): Promise<AvatarItem[]> {
    let query = db.select().from(avatarItems);
    
    if (filters?.category) {
      query = query.where(eq(avatarItems.category, filters.category)) as any;
    }
    
    if (filters?.rarity) {
      query = query.where(eq(avatarItems.rarity, filters.rarity)) as any;
    }
    
    return await query;
  }
  
  async getAvatarItemById(itemId: string): Promise<AvatarItem | null> {
    const [item] = await db.select().from(avatarItems).where(eq(avatarItems.id, itemId));
    return item || null;
  }
  
  async getUserAvatarItems(userId: string): Promise<(UserAvatarItem & { item: AvatarItem })[]> {
    const items = await db
      .select({
        userItem: userAvatarItems,
        item: avatarItems,
      })
      .from(userAvatarItems)
      .leftJoin(avatarItems, eq(userAvatarItems.itemId, avatarItems.id))
      .where(eq(userAvatarItems.userId, userId));
    
    return items.map((i: any) => ({
      ...i.userItem,
      item: i.item,
    }));
  }
  
  async purchaseAvatarItem(userId: string, itemId: string): Promise<UserAvatarItem> {
    const [item] = await db.select().from(avatarItems).where(eq(avatarItems.id, itemId));
    if (!item) throw new Error('Item not found');
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');
    
    if ((user.coinBalance || 0) < (item.coinCost || 0)) {
      throw new Error('Insufficient coins');
    }
    
    const [existing] = await db
      .select()
      .from(userAvatarItems)
      .where(and(
        eq(userAvatarItems.userId, userId),
        eq(userAvatarItems.itemId, itemId)
      ));
    
    if (existing) {
      throw new Error('Item already owned');
    }
    
    await db
      .update(users)
      .set({ coinBalance: sql`${users.coinBalance} - ${item.coinCost}` })
      .where(eq(users.id, userId));
    
    await db.insert(coinTransactions).values({
      userId,
      type: 'spend',
      amount: -(item.coinCost || 0),
      balance: (user.coinBalance || 0) - (item.coinCost || 0),
      source: 'shop_purchase',
      sourceId: itemId,
      description: `Purchased: ${item.name}`,
    });
    
    const [userItem] = await db.insert(userAvatarItems).values({
      userId,
      itemId,
      isEquipped: false,
    }).returning();
    
    return userItem;
  }
  
  async seedQuests(): Promise<void> {
    const existingQuests = await db.select().from(quests);
    if (existingQuests.length > 0) return;
    
    const questsData = [
      {
        title: 'The Procrastination Dragon',
        description: 'Defeat the mighty Procrastination Dragon by completing 5 tasks',
        story: 'The Procrastination Dragon has been terrorizing the kingdom, making everyone delay their important work. Only by completing your tasks can you defeat this fearsome beast!',
        difficulty: 'easy',
        minLevel: 1,
        objectives: [
          {
            id: 'complete_tasks',
            type: 'complete_tasks' as const,
            target: 5,
            description: 'Complete 5 tasks'
          }
        ],
        bossName: 'Procrastination Dragon',
        bossHealth: 100,
        xpReward: 150,
        coinReward: 100,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Streak Keeper',
        description: 'Maintain a 7-day login streak',
        story: 'Consistency is the key to mastery. Show your dedication by logging in for 7 consecutive days!',
        difficulty: 'medium',
        minLevel: 1,
        objectives: [
          {
            id: 'maintain_streak',
            type: 'earn_xp' as const,
            target: 7,
            description: 'Maintain 7-day streak'
          }
        ],
        xpReward: 200,
        coinReward: 150,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Knowledge Seeker',
        description: 'Earn 1000 XP through various activities',
        story: 'The path to wisdom is paved with experience. Accumulate 1000 XP to prove your dedication to growth!',
        difficulty: 'medium',
        minLevel: 3,
        objectives: [
          {
            id: 'earn_xp',
            type: 'earn_xp' as const,
            target: 1000,
            description: 'Earn 1000 XP'
          }
        ],
        xpReward: 250,
        coinReward: 200,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Habit Master',
        description: 'Complete 10 habit check-ins',
        story: 'Habits are the building blocks of a successful life. Master your habits by completing 10 check-ins!',
        difficulty: 'easy',
        minLevel: 1,
        objectives: [
          {
            id: 'complete_habits',
            type: 'complete_habits' as const,
            target: 10,
            description: 'Complete 10 habits'
          }
        ],
        xpReward: 180,
        coinReward: 120,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Level Up Champion',
        description: 'Reach level 10',
        story: 'Power comes from experience and dedication. Rise through the ranks and reach level 10!',
        difficulty: 'hard',
        minLevel: 1,
        objectives: [
          {
            id: 'reach_level',
            type: 'earn_xp' as const,
            target: 5000,
            description: 'Reach level 10'
          }
        ],
        xpReward: 500,
        coinReward: 400,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'The Boss Rush',
        description: 'Complete 3 quests in a single week',
        story: 'True heroes don\'t rest! Prove your mettle by completing 3 quests in one week.',
        difficulty: 'hard',
        minLevel: 5,
        objectives: [
          {
            id: 'complete_quests',
            type: 'complete_tasks' as const,
            target: 3,
            description: 'Complete 3 quests'
          }
        ],
        xpReward: 400,
        coinReward: 300,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Task Slayer',
        description: 'Complete 20 tasks',
        story: 'Become a master of productivity by conquering 20 tasks!',
        difficulty: 'medium',
        minLevel: 2,
        objectives: [
          {
            id: 'complete_many_tasks',
            type: 'complete_tasks' as const,
            target: 20,
            description: 'Complete 20 tasks'
          }
        ],
        xpReward: 300,
        coinReward: 200,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'The Grind',
        description: 'Earn 2500 XP',
        story: 'The path of mastery requires dedication. Push yourself to earn 2500 XP!',
        difficulty: 'hard',
        minLevel: 5,
        objectives: [
          {
            id: 'earn_lots_xp',
            type: 'earn_xp' as const,
            target: 2500,
            description: 'Earn 2500 XP'
          }
        ],
        bossName: 'Laziness Hydra',
        bossHealth: 250,
        xpReward: 600,
        coinReward: 500,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Habit Champion',
        description: 'Complete 25 habit check-ins',
        story: 'True mastery comes from consistent practice. Complete 25 habit check-ins to prove your discipline!',
        difficulty: 'hard',
        minLevel: 5,
        objectives: [
          {
            id: 'complete_many_habits',
            type: 'complete_habits' as const,
            target: 25,
            description: 'Complete 25 habits'
          }
        ],
        xpReward: 350,
        coinReward: 250,
        itemRewards: [],
        isActive: true
      },
      {
        title: 'Ultimate Quest',
        description: 'The ultimate challenge: Complete 50 tasks and earn 5000 XP',
        story: 'Only the bravest heroes dare to take on this quest. Complete both objectives to prove you are a true legend!',
        difficulty: 'legendary',
        minLevel: 10,
        objectives: [
          {
            id: 'complete_ultimate_tasks',
            type: 'complete_tasks' as const,
            target: 50,
            description: 'Complete 50 tasks'
          },
          {
            id: 'earn_ultimate_xp',
            type: 'earn_xp' as const,
            target: 5000,
            description: 'Earn 5000 XP'
          }
        ],
        bossName: 'Ancient Shadow Lord',
        bossHealth: 500,
        xpReward: 1000,
        coinReward: 800,
        itemRewards: [],
        isActive: true
      }
    ];
    
    await db.insert(quests).values(questsData);
  }
  
  async seedAvatarItems(): Promise<void> {
    const existingItems = await db.select().from(avatarItems);
    if (existingItems.length > 0) return;
    
    const itemsData: any[] = [];
    
    const hairStyles = ['Short', 'Long', 'Curly', 'Spiky', 'Bald'];
    const hairColors = ['Brown', 'Blonde', 'Black', 'Red', 'White'];
    
    hairStyles.forEach(style => {
      hairColors.forEach(color => {
        itemsData.push({
          name: `${color} ${style} Hair`,
          category: 'hair',
          rarity: 'common',
          coinCost: 100,
          minLevel: 1
        });
      });
    });
    
    const outfits = [
      { name: 'Casual Outfit', rarity: 'common', cost: 200, level: 1 },
      { name: 'Sport Outfit', rarity: 'common', cost: 250, level: 1 },
      { name: 'Formal Outfit', rarity: 'rare', cost: 400, level: 3 },
      { name: 'Hero Outfit', rarity: 'epic', cost: 800, level: 5 },
      { name: 'Wizard Robe', rarity: 'legendary', cost: 1500, level: 10 }
    ];
    
    outfits.forEach(outfit => {
      itemsData.push({
        name: outfit.name,
        category: 'outfit',
        rarity: outfit.rarity,
        coinCost: outfit.cost,
        minLevel: outfit.level
      });
    });
    
    const weapons = [
      { name: 'Wooden Sword', rarity: 'common', cost: 300, level: 1, health: 0, attack: 5 },
      { name: 'Iron Staff', rarity: 'common', cost: 350, level: 2, mana: 10, attack: 3 },
      { name: 'Steel Bow', rarity: 'rare', cost: 600, level: 5, attack: 10 },
      { name: 'War Hammer', rarity: 'epic', cost: 1000, level: 7, health: 20, attack: 15 }
    ];
    
    weapons.forEach(weapon => {
      itemsData.push({
        name: weapon.name,
        category: 'weapon',
        rarity: weapon.rarity,
        coinCost: weapon.cost,
        minLevel: weapon.level,
        statBonus: {
          health: weapon.health || 0,
          mana: weapon.mana || 0,
          attack: weapon.attack
        }
      });
    });
    
    const armors = [
      { name: 'Leather Armor', rarity: 'common', cost: 400, level: 1, health: 10, defense: 5 },
      { name: 'Chain Mail', rarity: 'rare', cost: 700, level: 4, health: 25, defense: 10 },
      { name: 'Plate Armor', rarity: 'epic', cost: 1200, level: 8, health: 50, defense: 20 },
      { name: 'Mystic Armor', rarity: 'legendary', cost: 2000, level: 12, health: 30, mana: 30, defense: 25 }
    ];
    
    armors.forEach(armor => {
      itemsData.push({
        name: armor.name,
        category: 'armor',
        rarity: armor.rarity,
        coinCost: armor.cost,
        minLevel: armor.level,
        statBonus: {
          health: armor.health,
          mana: armor.mana || 0,
          defense: armor.defense
        }
      });
    });
    
    await db.insert(avatarItems).values(itemsData);
  }
}

// Export storage instance
export const storage = new DatabaseStorage();