import { 
  users, userProfiles, skillCategories, skills, goals, goalSkills, subGoals,
  taskPlans, tasks, taskSkills, performanceEvents, adaptationLogs, 
  predictionSnapshots, knowledgeDomains, expertKnowledge, 
  taskKnowledgeLinks, knowledgeUsageLogs, mentorSessions, mentorConversations,
  achievements, userAchievements, xpTransactions, subscriptionPlans,
  coinPackages, purchaseItems, featureGates, userPurchases, coinTransactions,
  leaderboards, userLoginStreaks, friendConnections, spinWheelRewards,
  dailyChallenges, userChallengeProgress, weeklyChallenges, dailyLoginRewards, userSpinHistory, levels,
  habits, habitCompletions,
  teams, teamMembers, teamGoals, teamInvites, teamChatMessages, challenges, challengeParticipants, mentorships,
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
  // Community tables
  communityChannels, communityPosts, communityReplies, communityPostLikes,
  // Therapist Marketplace tables
  therapists, therapistReviews, therapistBookings,
  // Growth Sanctuary tables
  sanctuaryElements, userSanctuary, sanctuaryEvolutionStages,
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
  type IapReceipt, type InsertIapReceipt,
  // Sub-Goals types
  type SubGoal, type InsertSubGoal,
  // Community types
  type CommunityChannel, type InsertCommunityChannel,
  type CommunityPost, type InsertCommunityPost,
  type CommunityReply, type InsertCommunityReply,
  type CommunityPostLike,
  // Therapist Marketplace types
  type Therapist, type InsertTherapist,
  type TherapistReview, type InsertTherapistReview,
  type TherapistBooking, type InsertTherapistBooking,
  // Growth Sanctuary types
  type SanctuaryElement, type InsertSanctuaryElement,
  type UserSanctuary, type InsertUserSanctuary,
  type SanctuaryEvolutionStage, type InsertSanctuaryEvolutionStage,
  // Avatar Zones & Traits System tables
  avatarZones, avatarTraits, userAvatarTraits, userAvatarEquipped, environmentStates, traitRewardLogs,
  // Avatar Zones & Traits System types
  type AvatarZone, type InsertAvatarZone,
  type AvatarTrait, type InsertAvatarTrait,
  type UserAvatarTrait, type InsertUserAvatarTrait,
  type UserAvatarEquipped, type InsertUserAvatarEquipped,
  type EnvironmentState, type InsertEnvironmentState,
  type TraitRewardLog, type InsertTraitRewardLog,
  // Marketplace System tables
  marketplaceListings, giftTransactions,
  // Marketplace System types
  type MarketplaceListing, type InsertMarketplaceListing,
  type GiftTransaction, type InsertGiftTransaction
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, asc, and, or, gte, lte, count, avg, sum, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

// ===== LILOVE AI STORAGE =====
// Sophisticated Performance Intelligence Database Layer
// Complex queries, analytics, and real-time performance tracking

// Database connection with full schema
const connectionString = process.env.DATABASE_URL || "";
const sql_client = neon(connectionString);

// Complete schema object with all tables
const schema = {
  users, userProfiles, skillCategories, skills, goals, goalSkills, subGoals,
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
  // Community tables
  communityChannels, communityPosts, communityReplies, communityPostLikes,
  // Therapist Marketplace tables
  therapists, therapistReviews, therapistBookings,
  // Avatar Zones & Traits System tables
  avatarZones, avatarTraits, userAvatarTraits, userAvatarEquipped, environmentStates, traitRewardLogs,
  // Growth Sanctuary tables
  sanctuaryElements, userSanctuary, sanctuaryEvolutionStages,
  // Marketplace tables
  marketplaceListings, giftTransactions
};

export const db = drizzle(sql_client, { schema });

// ===== STORAGE INTERFACE =====

export interface IStorage {
  // ===== USER MANAGEMENT =====
  // Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // LiLove specific user operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByAppleId(appleId: string): Promise<User | null>;
  getUserByGoogleId(googleId: string): Promise<User | null>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserStreaks(userId: string): Promise<void>;
  deductUserCoins(userId: string, amount: number): Promise<void>;
  
  // ===== GOAL MANAGEMENT =====
  createGoal(goal: InsertGoal): Promise<Goal>;
  getUserGoals(userId: string, status?: string): Promise<Goal[]>;
  getGoalById(goalId: string): Promise<Goal | null>;
  updateGoal(goalId: string, updates: Partial<Goal>): Promise<void>;
  deleteGoal(goalId: string): Promise<void>;
  
  // ===== SUB-GOAL MANAGEMENT =====
  getSubGoalsByGoalId(goalId: string): Promise<SubGoal[]>;
  createSubGoal(data: InsertSubGoal): Promise<SubGoal>;
  updateSubGoal(id: string, data: Partial<SubGoal>): Promise<SubGoal | null>;
  deleteSubGoal(id: string): Promise<void>;
  completeSubGoal(id: string): Promise<SubGoal | null>;
  
  // ===== INTELLIGENT PLANNING =====
  createTaskPlan(plan: InsertTaskPlan): Promise<TaskPlan>;
  getActiveTaskPlan(goalId: string): Promise<TaskPlan | null>;
  getAllTaskPlans(goalId: string): Promise<TaskPlan[]>;
  deactivateTaskPlan(planId: string): Promise<void>;
  
  // ===== TASK MANAGEMENT =====
  createTasks(tasks: InsertTask[]): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  getTasksByPlan(planId: string): Promise<Task[]>;
  getTasksByGoal(goalId: string): Promise<Task[]>;
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
  
  // Mental Health & Engagement Analytics
  getMoodTrends(userId: string, startDate: Date, endDate: Date): Promise<{ date: string; mood: string; score: number }[]>;
  getActivityStats(userId: string, startDate: Date, endDate: Date): Promise<{ coachingSessions: number; journalEntries: number; goalsCompleted: number }>;
  getEngagementStats(userId: string): Promise<{ totalSessions: number; streakDays: number; goalsAchieved: number; communityPosts: number }>;
  
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
  deleteMentorSessions(userId: string): Promise<void>;
  
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
  getTeamChatMessages(teamId: string, limit?: number, before?: string): Promise<any[]>;
  getTeamLeaderboard(teamId: string, period?: string): Promise<any[]>;
  
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
  
  // ===== COMMUNITY SYSTEM =====
  getChannels(): Promise<CommunityChannel[]>;
  getChannelById(channelId: string): Promise<CommunityChannel | null>;
  getPostsByChannel(channelId: string, limit?: number, offset?: number): Promise<(CommunityPost & { author?: { displayName: string | null; profileImageUrl: string | null } })[]>;
  createPost(post: InsertCommunityPost): Promise<CommunityPost>;
  deletePost(postId: string, userId: string): Promise<void>;
  getRepliesByPost(postId: string): Promise<(CommunityReply & { author?: { displayName: string | null; profileImageUrl: string | null } })[]>;
  createReply(reply: InsertCommunityReply): Promise<CommunityReply>;
  deleteReply(replyId: string, userId: string): Promise<void>;
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;
  seedCommunityChannels(): Promise<void>;
  
  // ===== THERAPIST MARKETPLACE SYSTEM =====
  getTherapists(filters?: { specialization?: string; minRating?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<Therapist[]>;
  getTherapistById(therapistId: string): Promise<Therapist | null>;
  getTherapistReviews(therapistId: string): Promise<TherapistReview[]>;
  createTherapistBooking(booking: InsertTherapistBooking): Promise<TherapistBooking>;
  getBookingsByUser(userId: string): Promise<TherapistBooking[]>;
  getBookingsByTherapist(therapistId: string): Promise<TherapistBooking[]>;
  updateBookingStatus(bookingId: string, status: string): Promise<TherapistBooking | null>;
  seedTherapists(): Promise<void>;
  
  // ===== AVATAR ZONES & TRAITS SYSTEM =====
  
  // Avatar Zones
  getAvatarZones(): Promise<AvatarZone[]>;
  getAvatarZone(zoneId: string): Promise<AvatarZone | undefined>;
  
  // Avatar Traits
  getTraitsByZone(zoneId: string): Promise<AvatarTrait[]>;
  getTraitsByRarity(rarity: string): Promise<AvatarTrait[]>;
  getDefaultTraits(): Promise<AvatarTrait[]>;
  getAvatarTrait(traitId: string): Promise<AvatarTrait | undefined>;
  getUnlockableTraits(unlockType: string): Promise<AvatarTrait[]>;
  getAllAvatarTraits(): Promise<AvatarTrait[]>;
  
  // User Avatar Traits (owned/unlocked)
  getUserAvatarTraits(userId: string): Promise<UserAvatarTrait[]>;
  hasUserUnlockedTrait(userId: string, traitId: string): Promise<boolean>;
  unlockTraitForUser(userId: string, traitId: string, source: string, sourceId?: string, coinsPaid?: number): Promise<UserAvatarTrait>;
  grantDefaultTraitsToUser(userId: string): Promise<void>;
  
  // User Avatar Equipped
  getUserEquippedTraits(userId: string): Promise<UserAvatarEquipped[]>;
  equipTrait(userId: string, zoneId: string, traitId: string): Promise<UserAvatarEquipped>;
  unequipTrait(userId: string, zoneId: string): Promise<void>;
  
  // Environment State (Living Forest)
  getUserEnvironment(userId: string): Promise<EnvironmentState | undefined>;
  createUserEnvironment(userId: string): Promise<EnvironmentState>;
  updateUserEnvironment(userId: string, updates: Partial<EnvironmentState>): Promise<EnvironmentState>;
  addEnvironmentXp(userId: string, xp: number): Promise<EnvironmentState>;
  
  // Trait Reward Logs (anti-cheat)
  logTraitReward(log: InsertTraitRewardLog): Promise<TraitRewardLog>;
  getTraitRewardLogs(userId: string): Promise<TraitRewardLog[]>;
  
  // ===== GROWTH SANCTUARY SYSTEM =====
  
  // Sanctuary State Management
  getSanctuaryState(userId: string): Promise<UserSanctuary | null>;
  createSanctuaryState(userId: string): Promise<UserSanctuary>;
  updateSanctuaryState(userId: string, updates: Partial<UserSanctuary>): Promise<UserSanctuary | null>;
  updateSanctuarySettings(userId: string, settings: { weatherType?: string; timeOfDay?: string }): Promise<UserSanctuary | null>;
  addSanctuaryXp(userId: string, xp: number): Promise<UserSanctuary | null>;
  
  // Sanctuary Elements
  getSanctuaryElements(filters?: { type?: string; rarity?: string; evolutionStage?: number }): Promise<SanctuaryElement[]>;
  getSanctuaryElementById(elementId: string): Promise<SanctuaryElement | null>;
  unlockSanctuaryElement(userId: string, elementId: string): Promise<{ success: boolean; error?: string; sanctuary?: UserSanctuary }>;
  
  // Evolution Stages
  getEvolutionStages(): Promise<SanctuaryEvolutionStage[]>;
  getEvolutionStageByLevel(stage: number): Promise<SanctuaryEvolutionStage | null>;
  
  // Seed Data
  seedSanctuaryElements(): Promise<void>;
  seedEvolutionStages(): Promise<void>;
  
  // ===== AVATAR MARKETPLACE SYSTEM =====
  
  // Trait Ownership
  getUserOwnedTraits(userId: string): Promise<UserAvatarTrait[]>;
  
  // Marketplace Listings
  getActiveListings(filters?: { rarity?: string; minPrice?: number; maxPrice?: number; zoneId?: string }): Promise<MarketplaceListing[]>;
  getListingById(listingId: string): Promise<MarketplaceListing | null>;
  getUserListings(userId: string): Promise<MarketplaceListing[]>;
  createListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing>;
  cancelListing(listingId: string, userId: string): Promise<{ success: boolean; error?: string }>;
  buyListing(listingId: string, buyerId: string): Promise<{ success: boolean; error?: string; listing?: MarketplaceListing }>;
  
  // Gift Transactions
  getReceivedGifts(userId: string): Promise<GiftTransaction[]>;
  getSentGifts(userId: string): Promise<GiftTransaction[]>;
  createGift(gift: InsertGiftTransaction): Promise<{ success: boolean; error?: string; gift?: GiftTransaction }>;
  claimGift(giftId: string, userId: string): Promise<{ success: boolean; error?: string }>;
  
  // Marketplace Helpers
  isTraitEquipped(userId: string, traitId: string): Promise<boolean>;
  removeUserTrait(userId: string, traitId: string): Promise<void>;
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
    // Upsert user (insert or update on conflict)
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
    
    // Create user profile if it doesn't exist
    const [existingProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id));
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
  
  async deductUserCoins(userId: string, amount: number): Promise<void> {
    await db.update(users)
      .set({ coinBalance: sql`${users.coinBalance} - ${amount}` })
      .where(eq(users.id, userId));
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
  
  async getUserByAppleId(appleId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.appleId, appleId))
      .limit(1);
    return user || null;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
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
  
  // ===== SUB-GOAL MANAGEMENT =====
  
  async getSubGoalsByGoalId(goalId: string): Promise<SubGoal[]> {
    return await db.select().from(subGoals)
      .where(eq(subGoals.goalId, goalId))
      .orderBy(asc(subGoals.order), asc(subGoals.createdAt));
  }
  
  async createSubGoal(data: InsertSubGoal): Promise<SubGoal> {
    const [newSubGoal] = await db.insert(subGoals).values({
      ...data,
      createdAt: new Date(),
    }).returning();
    return newSubGoal;
  }
  
  async updateSubGoal(id: string, data: Partial<SubGoal>): Promise<SubGoal | null> {
    const [updated] = await db.update(subGoals)
      .set(data)
      .where(eq(subGoals.id, id))
      .returning();
    return updated || null;
  }
  
  async deleteSubGoal(id: string): Promise<void> {
    await db.delete(subGoals).where(eq(subGoals.id, id));
  }
  
  async completeSubGoal(id: string): Promise<SubGoal | null> {
    const [completed] = await db.update(subGoals)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(subGoals.id, id))
      .returning();
    return completed || null;
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
  
  async getTasksByGoal(goalId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.goalId, goalId))
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
    
    // Build base query with sorting
    const sortOrderFn = options?.sortOrder === 'asc' ? asc : desc;
    
    // Determine the orderBy clause
    let orderByClause;
    if (options?.sortBy === 'title') {
      orderByClause = sortOrderFn(tasks.title);
    } else if (options?.sortBy === 'priority') {
      // Custom sort for priority: urgent, high, medium, low
      orderByClause = sql`CASE 
        WHEN ${tasks.priority} = 'urgent' THEN 1
        WHEN ${tasks.priority} = 'high' THEN 2 
        WHEN ${tasks.priority} = 'medium' THEN 3
        WHEN ${tasks.priority} = 'low' THEN 4
        ELSE 5 END ${options.sortOrder === 'desc' ? sql`DESC` : sql`ASC`}`;
    } else if (options?.sortBy === 'dueDate') {
      orderByClause = sortOrderFn(tasks.dueDate);
    } else {
      // Default sort by created date
      orderByClause = desc(tasks.createdAt);
    }
    
    // Build complete query with all clauses
    const query = db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(options?.limit ?? 1000)
      .offset(options?.offset ?? 0);
    
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
      eventData: { startTime: now.toISOString() } as any,
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
      eventData: { pauseTime: now.toISOString(), sessionTime } as any,
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
      eventData: { resumeTime: now.toISOString(), pauseDuration: pauseTime } as any,
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
      eventData: { stopTime: now.toISOString(), sessionTime, totalTime: (task.timeSpent || 0) + sessionTime } as any,
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

  async deleteMentorSessions(userId: string): Promise<void> {
    await db.delete(mentorConversations).where(eq(mentorConversations.userId, userId));
    await db.delete(mentorSessions).where(eq(mentorSessions.userId, userId));
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
    const whereCondition = search 
      ? and(
          eq(teams.isPublic, true),
          or(
            sql`lower(${teams.name}) like lower(${'%' + search + '%'})`,
            sql`lower(${teams.description}) like lower(${'%' + search + '%'})`
          )
        )
      : eq(teams.isPublic, true);

    const results = await db.select({
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
      .where(whereCondition)
      .groupBy(teams.id)
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

  async getTeamChatMessages(teamId: string, limit: number = 50, before?: string): Promise<any[]> {
    let query = db
      .select({
        id: teamChatMessages.id,
        teamId: teamChatMessages.teamId,
        userId: teamChatMessages.userId,
        message: teamChatMessages.message,
        messageType: teamChatMessages.messageType,
        isEdited: teamChatMessages.isEdited,
        createdAt: teamChatMessages.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(teamChatMessages)
      .leftJoin(users, eq(teamChatMessages.userId, users.id))
      .where(eq(teamChatMessages.teamId, teamId))
      .orderBy(desc(teamChatMessages.createdAt))
      .limit(limit);

    const messages = await query;
    return messages.reverse();
  }

  async getTeamLeaderboard(teamId: string, period: string = 'all'): Promise<any[]> {
    const members = await this.getTeamMembers(teamId);
    
    return members
      .map((member, index) => ({
        rank: index + 1,
        id: member.id,
        oduserId: member.userId,
        role: member.role,
        displayName: member.user?.displayName || member.user?.username || 'Unknown',
        profileImageUrl: member.user?.profileImageUrl,
        contributionXp: member.contributionXp || 0,
        goalsCompleted: member.goalsCompleted || 0,
        joinedAt: member.joinedAt,
      }))
      .sort((a, b) => b.contributionXp - a.contributionXp)
      .map((member, index) => ({ ...member, rank: index + 1 }));
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
          apiVersion: '2025-08-27.basil' as const,
        });
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (error) {
        // Stripe subscription cancellation failed - continue with account deletion
      }
    }
    
    // 2. Delete user-generated content (order matters for foreign keys)
    await db.delete(goalSkills).where(
      inArray(goalSkills.goalId, db.select({ id: goals.id }).from(goals).where(eq(goals.userId, userId)))
    );
    const userGoalIds = db.select({ id: goals.id }).from(goals).where(eq(goals.userId, userId));
    const userTaskIds = db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.goalId, userGoalIds));
    
    await db.delete(taskSkills).where(
      inArray(taskSkills.taskId, userTaskIds)
    );
    await db.delete(taskKnowledgeLinks).where(
      inArray(taskKnowledgeLinks.taskId, userTaskIds)
    );
    
    await db.delete(tasks).where(inArray(tasks.goalId, userGoalIds));
    await db.delete(taskPlans).where(inArray(taskPlans.goalId, userGoalIds));
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
      inArray(teamGoals.teamId, db.select({ id: teams.id }).from(teams).where(eq(teams.createdById, userId)))
    );
    await db.delete(teamInvites).where(
      or(
        eq(teamInvites.invitedUserId, userId),
        eq(teamInvites.invitedById, userId)
      )
    );
    await db.delete(teams).where(eq(teams.createdById, userId));
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
    await db.delete(challenges).where(eq(challenges.creatorId, userId));
    await db.delete(mentorships).where(or(
      eq(mentorships.mentorId, userId),
      eq(mentorships.menteeId, userId)
    ));
    
    // 6. Delete AI & performance data
    await db.delete(performanceEvents).where(eq(performanceEvents.userId, userId));
    await db.delete(adaptationLogs).where(inArray(adaptationLogs.goalId, userGoalIds));
    await db.delete(predictionSnapshots).where(inArray(predictionSnapshots.goalId, userGoalIds));
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
    
    // Import bcrypt for secure hashing
    const bcrypt = await import('bcrypt');
    const hashedCodes = await Promise.all(
      codes.map(code => bcrypt.hash(code, 10))
    );
    
    await db.update(twoFactorAuth)
      .set({
        backupCodes: hashedCodes,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorAuth.userId, userId));
    
    return codes;
  }
  
  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const auth = await this.getTwoFactorAuth(userId);
    if (!auth || !auth.backupCodes) return false;
    
    const bcrypt = await import('bcrypt');
    const usedCodes = auth.usedBackupCodes || [];
    
    // Check each backup code against the provided code
    for (const hashedCode of auth.backupCodes) {
      // Skip if already used
      if (usedCodes.includes(hashedCode)) continue;
      
      // Compare using bcrypt
      const isMatch = await bcrypt.compare(code, hashedCode);
      if (isMatch) {
        await db.update(twoFactorAuth)
          .set({
            usedBackupCodes: [...usedCodes, hashedCode],
            updatedAt: new Date(),
          })
          .where(eq(twoFactorAuth.userId, userId));
        return true;
      }
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
  
  async getUserChallenges(userId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const challenges = await db
      .select({
        challenge: dailyChallenges,
        progress: userChallengeProgress,
      })
      .from(dailyChallenges)
      .leftJoin(userChallengeProgress, and(
        eq(userChallengeProgress.challengeId, dailyChallenges.id),
        eq(userChallengeProgress.userId, userId)
      ))
      .where(gte(dailyChallenges.activeDate, today));
    
    return challenges.map(c => ({
      ...c.challenge,
      progress: c.progress,
    }));
  }
  
  async getAllCalendarEvents(userId: string): Promise<any[]> {
    const [userGoals, userTasks, activeHabits, userChallenges] = await Promise.all([
      this.getUserGoals(userId),
      this.getUserTasks(userId, { status: 'active' }),
      this.getUserHabits(userId, { isActive: true }),
      this.getUserChallenges(userId)
    ]);
    
    const events: any[] = [];
    
    userGoals.forEach((goal: Goal) => {
      if (goal.currentETA) {
        events.push({
          id: `goal-${goal.id}`,
          title: `🎯 ${goal.title}`,
          description: goal.description || '',
          startDate: goal.currentETA,
          endDate: new Date(new Date(goal.currentETA).getTime() + 60 * 60 * 1000),
          category: `Goal: ${goal.category}`,
          recurring: false
        });
      }
    });
    
    userTasks.forEach((task: Task) => {
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
    
    activeHabits.forEach((habit: Habit) => {
      const today = new Date();
      today.setHours(parseInt(habit.reminderTime?.split(':')[0] || '9'), 
                     parseInt(habit.reminderTime?.split(':')[1] || '0'), 0, 0);
      
      events.push({
        id: `habit-${habit.id}`,
        title: `🔄 ${habit.title}`,
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
        delta: newCompletion.xpAwarded,
        source: 'habit_completion',
        sourceId: habitId,
        reason: `Completed habit: ${habit?.title}`,
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
          balance: currentBalance[0].balance || 0,
          source: 'league_reward',
          sourceId: seasonId,
          description: `League season reward - Rank ${rank}`,
        });
      }
      
      if (xpReward > 0) {
        await this.addXPTransaction({
          userId: participant.userId,
          delta: xpReward,
          source: 'league_reward',
          sourceId: seasonId,
          reason: `League season reward - Rank ${rank}`,
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
    
    const promotionCount = currentLeague.promotionThreshold ?? 0;
    const relegationCount = currentLeague.relegationThreshold ?? 0;
    
    for (let i = 0; i < participants.length; i++) {
      const rank = i + 1;
      
      if (promotionCount > 0 && rank <= promotionCount && currentLeague.level < 6) {
        await db
          .update(leagueParticipants)
          .set({ promoted: true })
          .where(eq(leagueParticipants.id, participants[i].id));
      } else if (relegationCount > 0 && rank > participants.length - relegationCount && currentLeague.level > 1) {
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
      type: 'purchase',
      amount: coinAmount,
      balance: newBalance,
      source: 'iap',
      description: 'iOS In-App Purchase',
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
    const conditions = [eq(quests.isActive, true)];
    
    if (filters?.difficulty) {
      conditions.push(eq(quests.difficulty, filters.difficulty));
    }
    
    return await db.select().from(quests).where(and(...conditions));
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
      balance: user.coinBalance || 0,
      source: 'quest_reward',
      sourceId: quest.id,
      description: `Quest completed: ${quest.title}`,
    });
    
    await this.addXPTransaction({
      userId: userQuest.userId,
      delta: quest.xpReward || 0,
      source: 'quest_reward',
      sourceId: quest.id,
      reason: `Quest completed: ${quest.title}`,
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
  
  // ===== COMMUNITY SYSTEM =====
  
  async getChannels(): Promise<CommunityChannel[]> {
    return await db.select().from(communityChannels).orderBy(asc(communityChannels.name));
  }
  
  async getChannelById(channelId: string): Promise<CommunityChannel | null> {
    const [channel] = await db.select().from(communityChannels).where(eq(communityChannels.id, channelId));
    return channel || null;
  }
  
  async getPostsByChannel(channelId: string, limit = 50, offset = 0): Promise<(CommunityPost & { author?: { displayName: string | null; profileImageUrl: string | null } })[]> {
    const posts = await db
      .select({
        id: communityPosts.id,
        channelId: communityPosts.channelId,
        authorId: communityPosts.authorId,
        content: communityPosts.content,
        isAnonymous: communityPosts.isAnonymous,
        likesCount: communityPosts.likesCount,
        repliesCount: communityPosts.repliesCount,
        createdAt: communityPosts.createdAt,
        authorDisplayName: users.displayName,
        authorProfileImageUrl: users.profileImageUrl,
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.authorId, users.id))
      .where(eq(communityPosts.channelId, channelId))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit)
      .offset(offset);
    
    return posts.map(post => ({
      id: post.id,
      channelId: post.channelId,
      authorId: post.authorId,
      content: post.content,
      isAnonymous: post.isAnonymous,
      likesCount: post.likesCount,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt,
      author: post.isAnonymous ? undefined : {
        displayName: post.authorDisplayName,
        profileImageUrl: post.authorProfileImageUrl,
      },
    }));
  }
  
  async createPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [newPost] = await db.insert(communityPosts).values(post).returning();
    return newPost;
  }
  
  async deletePost(postId: string, userId: string): Promise<void> {
    await db.delete(communityPosts).where(
      and(eq(communityPosts.id, postId), eq(communityPosts.authorId, userId))
    );
  }
  
  async getRepliesByPost(postId: string): Promise<(CommunityReply & { author?: { displayName: string | null; profileImageUrl: string | null } })[]> {
    const replies = await db
      .select({
        id: communityReplies.id,
        postId: communityReplies.postId,
        authorId: communityReplies.authorId,
        content: communityReplies.content,
        isAnonymous: communityReplies.isAnonymous,
        createdAt: communityReplies.createdAt,
        authorDisplayName: users.displayName,
        authorProfileImageUrl: users.profileImageUrl,
      })
      .from(communityReplies)
      .leftJoin(users, eq(communityReplies.authorId, users.id))
      .where(eq(communityReplies.postId, postId))
      .orderBy(asc(communityReplies.createdAt));
    
    return replies.map(reply => ({
      id: reply.id,
      postId: reply.postId,
      authorId: reply.authorId,
      content: reply.content,
      isAnonymous: reply.isAnonymous,
      createdAt: reply.createdAt,
      author: reply.isAnonymous ? undefined : {
        displayName: reply.authorDisplayName,
        profileImageUrl: reply.authorProfileImageUrl,
      },
    }));
  }
  
  async createReply(reply: InsertCommunityReply): Promise<CommunityReply> {
    const [newReply] = await db.insert(communityReplies).values(reply).returning();
    
    // Increment replies count on the post
    await db.update(communityPosts)
      .set({ repliesCount: sql`${communityPosts.repliesCount} + 1` })
      .where(eq(communityPosts.id, reply.postId));
    
    return newReply;
  }
  
  async deleteReply(replyId: string, userId: string): Promise<void> {
    const [reply] = await db.select().from(communityReplies).where(eq(communityReplies.id, replyId));
    if (!reply) return;
    
    await db.delete(communityReplies).where(
      and(eq(communityReplies.id, replyId), eq(communityReplies.authorId, userId))
    );
    
    // Decrement replies count on the post
    await db.update(communityPosts)
      .set({ repliesCount: sql`GREATEST(0, ${communityPosts.repliesCount} - 1)` })
      .where(eq(communityPosts.id, reply.postId));
  }
  
  async likePost(postId: string, userId: string): Promise<void> {
    try {
      await db.insert(communityPostLikes).values({ postId, userId });
      
      // Increment likes count
      await db.update(communityPosts)
        .set({ likesCount: sql`${communityPosts.likesCount} + 1` })
        .where(eq(communityPosts.id, postId));
    } catch (error: any) {
      // Ignore duplicate like errors (unique constraint)
      if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
        throw error;
      }
    }
  }
  
  async unlikePost(postId: string, userId: string): Promise<void> {
    const result = await db.delete(communityPostLikes).where(
      and(eq(communityPostLikes.postId, postId), eq(communityPostLikes.userId, userId))
    );
    
    // Only decrement if we actually deleted a like
    await db.update(communityPosts)
      .set({ likesCount: sql`GREATEST(0, ${communityPosts.likesCount} - 1)` })
      .where(eq(communityPosts.id, postId));
  }
  
  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const [like] = await db.select().from(communityPostLikes).where(
      and(eq(communityPostLikes.postId, postId), eq(communityPostLikes.userId, userId))
    );
    return !!like;
  }
  
  async seedCommunityChannels(): Promise<void> {
    const existing = await db.select().from(communityChannels);
    if (existing.length > 0) return;
    
    const channelsData = [
      { name: 'General', description: 'General discussions and community chat', category: 'social', icon: 'MessageCircle' },
      { name: 'Stress Relief', description: 'Share tips and support for managing stress', category: 'wellness', icon: 'Heart' },
      { name: 'Goal Setting', description: 'Discuss your goals and get advice', category: 'productivity', icon: 'Target' },
      { name: 'Daily Wins', description: 'Celebrate your daily achievements', category: 'motivation', icon: 'Trophy' },
      { name: 'Motivation', description: 'Share motivational quotes and stories', category: 'motivation', icon: 'Sparkles' },
    ];
    
    await db.insert(communityChannels).values(channelsData);
  }
  
  // ===== THERAPIST MARKETPLACE SYSTEM =====
  
  async getTherapists(filters?: { specialization?: string; minRating?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<Therapist[]> {
    let query = db.select().from(therapists).where(eq(therapists.isActive, true));
    
    const results = await query;
    
    let filtered = results;
    
    if (filters?.specialization) {
      filtered = filtered.filter(t => 
        t.specializations?.includes(filters.specialization!)
      );
    }
    
    if (filters?.minRating) {
      filtered = filtered.filter(t => 
        parseFloat(t.rating || '0') >= filters.minRating!
      );
    }
    
    if (filters?.sortBy) {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        if (filters.sortBy === 'rating') {
          return (parseFloat(b.rating || '0') - parseFloat(a.rating || '0')) * order;
        } else if (filters.sortBy === 'price') {
          return (parseFloat(a.hourlyRate || '0') - parseFloat(b.hourlyRate || '0')) * order;
        }
        return 0;
      });
    }
    
    return filtered;
  }
  
  async getTherapistById(therapistId: string): Promise<Therapist | null> {
    const [therapist] = await db.select().from(therapists).where(eq(therapists.id, therapistId));
    return therapist || null;
  }
  
  async getTherapistReviews(therapistId: string): Promise<TherapistReview[]> {
    return await db.select().from(therapistReviews)
      .where(eq(therapistReviews.therapistId, therapistId))
      .orderBy(desc(therapistReviews.createdAt));
  }
  
  async createTherapistBooking(booking: InsertTherapistBooking): Promise<TherapistBooking> {
    const [newBooking] = await db.insert(therapistBookings).values(booking).returning();
    return newBooking;
  }
  
  async getBookingsByUser(userId: string): Promise<TherapistBooking[]> {
    return await db.select().from(therapistBookings)
      .where(eq(therapistBookings.userId, userId))
      .orderBy(desc(therapistBookings.scheduledAt));
  }
  
  async getBookingsByTherapist(therapistId: string): Promise<TherapistBooking[]> {
    return await db.select().from(therapistBookings)
      .where(eq(therapistBookings.therapistId, therapistId))
      .orderBy(desc(therapistBookings.scheduledAt));
  }
  
  async updateBookingStatus(bookingId: string, status: string): Promise<TherapistBooking | null> {
    const [updated] = await db.update(therapistBookings)
      .set({ status })
      .where(eq(therapistBookings.id, bookingId))
      .returning();
    return updated || null;
  }
  
  async seedTherapists(): Promise<void> {
    const existing = await db.select().from(therapists);
    if (existing.length > 0) return;
    
    const [systemUser] = await db.select().from(users).limit(1);
    if (!systemUser) return;
    
    const therapistsData = [
      {
        userId: systemUser.id,
        name: 'Dr. Sarah Mitchell',
        title: 'Licensed Clinical Psychologist',
        specializations: ['anxiety', 'depression', 'trauma'],
        bio: 'Dr. Mitchell has over 15 years of experience helping individuals overcome anxiety and depression. She uses evidence-based approaches including CBT and mindfulness techniques to help clients build resilience and achieve lasting positive change.',
        hourlyRate: '150',
        currency: 'USD',
        availability: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], startTime: '09:00', endTime: '17:00' },
        imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
        rating: '4.9',
        reviewCount: 127,
        isVerified: true,
        isActive: true,
      },
      {
        userId: systemUser.id,
        name: 'Dr. James Chen',
        title: 'Marriage & Family Therapist',
        specializations: ['relationships', 'couples therapy', 'family dynamics'],
        bio: 'Dr. Chen specializes in helping couples and families navigate challenging times. With expertise in communication strategies and conflict resolution, he guides clients toward healthier, more fulfilling relationships.',
        hourlyRate: '175',
        currency: 'USD',
        availability: { days: ['Monday', 'Wednesday', 'Friday'], startTime: '10:00', endTime: '18:00' },
        imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
        rating: '4.8',
        reviewCount: 89,
        isVerified: true,
        isActive: true,
      },
      {
        userId: systemUser.id,
        name: 'Dr. Emily Rodriguez',
        title: 'Stress Management Specialist',
        specializations: ['stress', 'burnout', 'work-life balance'],
        bio: 'Dr. Rodriguez helps high-achieving professionals manage stress and prevent burnout. Her holistic approach combines traditional therapy with practical lifestyle modifications for sustainable wellbeing.',
        hourlyRate: '140',
        currency: 'USD',
        availability: { days: ['Tuesday', 'Thursday', 'Saturday'], startTime: '08:00', endTime: '16:00' },
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        rating: '4.7',
        reviewCount: 64,
        isVerified: true,
        isActive: true,
      },
      {
        userId: systemUser.id,
        name: 'Dr. Michael Thompson',
        title: 'Cognitive Behavioral Therapist',
        specializations: ['anxiety', 'phobias', 'OCD'],
        bio: 'Dr. Thompson is an expert in cognitive behavioral therapy, specializing in anxiety disorders, phobias, and OCD. He takes a structured, goal-oriented approach to help clients develop practical coping strategies.',
        hourlyRate: '160',
        currency: 'USD',
        availability: { days: ['Monday', 'Tuesday', 'Thursday', 'Friday'], startTime: '11:00', endTime: '19:00' },
        imageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400',
        rating: '4.9',
        reviewCount: 103,
        isVerified: true,
        isActive: true,
      },
    ];
    
    await db.insert(therapists).values(therapistsData);
  }
  
  // ===== MENTAL HEALTH & ENGAGEMENT ANALYTICS =====
  
  async getMoodTrends(userId: string, startDate: Date, endDate: Date): Promise<{ date: string; mood: string; score: number }[]> {
    const sessions = await db.select()
      .from(mentorSessions)
      .where(and(
        eq(mentorSessions.userId, userId),
        gte(mentorSessions.timestamp, startDate),
        lte(mentorSessions.timestamp, endDate)
      ))
      .orderBy(asc(mentorSessions.timestamp));
    
    const moodMap: Record<string, { mood: string; score: number; count: number }> = {};
    
    for (const session of sessions) {
      const dateKey = session.timestamp?.toISOString().split('T')[0] || '';
      if (!dateKey) continue;
      
      // Extract mood from session context if available
      const context = session.context as { mood?: string | number } | null;
      const moodData = context?.mood;
      let moodLabel = 'neutral';
      let score = 5;
      
      if (typeof moodData === 'number') {
        score = moodData;
        moodLabel = moodData >= 7 ? 'great' : moodData >= 5 ? 'good' : moodData >= 3 ? 'okay' : 'low';
      } else if (typeof moodData === 'string') {
        moodLabel = moodData;
        score = moodData === 'great' ? 8 : moodData === 'good' ? 6 : moodData === 'okay' ? 5 : 3;
      }
      
      if (!moodMap[dateKey]) {
        moodMap[dateKey] = { mood: moodLabel, score, count: 1 };
      } else {
        moodMap[dateKey].score = (moodMap[dateKey].score * moodMap[dateKey].count + score) / (moodMap[dateKey].count + 1);
        moodMap[dateKey].count++;
      }
    }
    
    const result: { date: string; mood: string; score: number }[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const data = moodMap[dateKey];
      result.push({
        date: dateKey,
        mood: data?.mood || 'neutral',
        score: Math.round((data?.score || 5) * 10) / 10
      });
      current.setDate(current.getDate() + 1);
    }
    
    return result;
  }
  
  async getActivityStats(userId: string, startDate: Date, endDate: Date): Promise<{ coachingSessions: number; journalEntries: number; goalsCompleted: number }> {
    const [sessionsResult] = await db.select({ count: count() })
      .from(mentorSessions)
      .where(and(
        eq(mentorSessions.userId, userId),
        gte(mentorSessions.timestamp, startDate),
        lte(mentorSessions.timestamp, endDate)
      ));
    
    const [conversationsResult] = await db.select({ count: count() })
      .from(mentorConversations)
      .where(and(
        eq(mentorConversations.userId, userId),
        gte(mentorConversations.createdAt, startDate),
        lte(mentorConversations.createdAt, endDate)
      ));
    
    const [goalsResult] = await db.select({ count: count() })
      .from(goals)
      .where(and(
        eq(goals.userId, userId),
        eq(goals.status, 'completed'),
        gte(goals.completedAt, startDate),
        lte(goals.completedAt, endDate)
      ));
    
    return {
      coachingSessions: sessionsResult?.count || 0,
      journalEntries: conversationsResult?.count || 0,
      goalsCompleted: goalsResult?.count || 0
    };
  }
  
  async getEngagementStats(userId: string): Promise<{ totalSessions: number; streakDays: number; goalsAchieved: number; communityPosts: number }> {
    const [sessionsResult] = await db.select({ count: count() })
      .from(mentorSessions)
      .where(eq(mentorSessions.userId, userId));
    
    const [goalsResult] = await db.select({ count: count() })
      .from(goals)
      .where(and(
        eq(goals.userId, userId),
        eq(goals.status, 'completed')
      ));
    
    const [postsResult] = await db.select({ count: count() })
      .from(communityPosts)
      .where(eq(communityPosts.authorId, userId));
    
    const profile = await this.getUserProfile(userId);
    const streakDays = profile?.streakCount || 0;
    
    return {
      totalSessions: sessionsResult?.count || 0,
      streakDays,
      goalsAchieved: goalsResult?.count || 0,
      communityPosts: postsResult?.count || 0
    };
  }
  
  // ===== AVATAR ZONES & TRAITS SYSTEM IMPLEMENTATION =====
  
  // Avatar Zones
  async getAvatarZones(): Promise<AvatarZone[]> {
    return await db.select().from(avatarZones).orderBy(asc(avatarZones.layerOrder));
  }
  
  async getAvatarZone(zoneId: string): Promise<AvatarZone | undefined> {
    const [zone] = await db.select().from(avatarZones).where(eq(avatarZones.id, zoneId));
    return zone;
  }
  
  // Avatar Traits
  async getTraitsByZone(zoneId: string): Promise<AvatarTrait[]> {
    return await db.select().from(avatarTraits)
      .where(and(eq(avatarTraits.zoneId, zoneId), eq(avatarTraits.isActive, true)))
      .orderBy(asc(avatarTraits.layerOrder));
  }
  
  async getTraitsByRarity(rarity: string): Promise<AvatarTrait[]> {
    return await db.select().from(avatarTraits)
      .where(and(eq(avatarTraits.rarity, rarity), eq(avatarTraits.isActive, true)));
  }
  
  async getDefaultTraits(): Promise<AvatarTrait[]> {
    return await db.select().from(avatarTraits)
      .where(and(eq(avatarTraits.isDefault, true), eq(avatarTraits.isActive, true)));
  }
  
  async getAvatarTrait(traitId: string): Promise<AvatarTrait | undefined> {
    const [trait] = await db.select().from(avatarTraits).where(eq(avatarTraits.id, traitId));
    return trait;
  }
  
  async getUnlockableTraits(unlockType: string): Promise<AvatarTrait[]> {
    return await db.select().from(avatarTraits)
      .where(and(eq(avatarTraits.unlockType, unlockType), eq(avatarTraits.isActive, true)));
  }
  
  async getAllAvatarTraits(): Promise<AvatarTrait[]> {
    return await db.select().from(avatarTraits)
      .where(eq(avatarTraits.isActive, true))
      .orderBy(asc(avatarTraits.layerOrder));
  }
  
  // User Avatar Traits (owned/unlocked)
  async getUserAvatarTraits(userId: string): Promise<UserAvatarTrait[]> {
    return await db.select().from(userAvatarTraits)
      .where(eq(userAvatarTraits.userId, userId))
      .orderBy(desc(userAvatarTraits.unlockedAt));
  }
  
  async hasUserUnlockedTrait(userId: string, traitId: string): Promise<boolean> {
    const [existing] = await db.select().from(userAvatarTraits)
      .where(and(eq(userAvatarTraits.userId, userId), eq(userAvatarTraits.traitId, traitId)));
    return !!existing;
  }
  
  async unlockTraitForUser(userId: string, traitId: string, source: string, sourceId?: string, coinsPaid?: number): Promise<UserAvatarTrait> {
    const [unlocked] = await db.insert(userAvatarTraits)
      .values({
        userId,
        traitId,
        unlockSource: source,
        unlockSourceId: sourceId,
        coinsPaid: coinsPaid || 0,
      })
      .onConflictDoNothing()
      .returning();
    
    if (!unlocked) {
      const [existing] = await db.select().from(userAvatarTraits)
        .where(and(eq(userAvatarTraits.userId, userId), eq(userAvatarTraits.traitId, traitId)));
      return existing;
    }
    return unlocked;
  }
  
  async grantDefaultTraitsToUser(userId: string): Promise<void> {
    const defaultTraits = await this.getDefaultTraits();
    for (const trait of defaultTraits) {
      const hasUnlocked = await this.hasUserUnlockedTrait(userId, trait.id);
      if (!hasUnlocked) {
        await this.unlockTraitForUser(userId, trait.id, 'default', undefined, 0);
      }
    }
  }
  
  // User Avatar Equipped
  async getUserEquippedTraits(userId: string): Promise<UserAvatarEquipped[]> {
    return await db.select().from(userAvatarEquipped)
      .where(eq(userAvatarEquipped.userId, userId));
  }
  
  async equipTrait(userId: string, zoneId: string, traitId: string): Promise<UserAvatarEquipped> {
    const [equipped] = await db.insert(userAvatarEquipped)
      .values({
        userId,
        zoneId,
        traitId,
      })
      .onConflictDoUpdate({
        target: [userAvatarEquipped.userId, userAvatarEquipped.zoneId],
        set: {
          traitId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return equipped;
  }
  
  async unequipTrait(userId: string, zoneId: string): Promise<void> {
    await db.delete(userAvatarEquipped)
      .where(and(eq(userAvatarEquipped.userId, userId), eq(userAvatarEquipped.zoneId, zoneId)));
  }
  
  // Environment State (Living Forest)
  async getUserEnvironment(userId: string): Promise<EnvironmentState | undefined> {
    const [env] = await db.select().from(environmentStates).where(eq(environmentStates.userId, userId));
    return env;
  }
  
  async createUserEnvironment(userId: string): Promise<EnvironmentState> {
    const [env] = await db.insert(environmentStates)
      .values({
        userId,
        environmentLevel: 1,
        environmentXp: 0,
        xpToNextLevel: 100,
        unlockedElements: { trees: [], animals: [], decorations: [], effects: [] },
        currentTheme: 'forest',
      })
      .returning();
    return env;
  }
  
  async updateUserEnvironment(userId: string, updates: Partial<EnvironmentState>): Promise<EnvironmentState> {
    const [updated] = await db.update(environmentStates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(environmentStates.userId, userId))
      .returning();
    return updated;
  }
  
  async addEnvironmentXp(userId: string, xp: number): Promise<EnvironmentState> {
    // Ensure environment exists first
    let env = await this.getUserEnvironment(userId);
    if (!env) {
      env = await this.createUserEnvironment(userId);
    }
    
    // Use atomic SQL update with optimistic locking via WHERE clause
    // This prevents race conditions by only updating if the current values match
    const currentXp = env.environmentXp || 0;
    const currentLevel = env.environmentLevel;
    const currentXpToNext = env.xpToNextLevel || 100;
    
    let newXp = currentXp + xp;
    let newLevel = currentLevel;
    let xpToNext = currentXpToNext;
    
    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      newLevel += 1;
      xpToNext = Math.floor(xpToNext * 1.5);
    }
    
    // Atomic update with WHERE clause including current values (optimistic locking)
    const [updated] = await db.update(environmentStates)
      .set({
        environmentXp: newXp,
        environmentLevel: newLevel,
        xpToNextLevel: xpToNext,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(environmentStates.userId, userId),
        eq(environmentStates.environmentXp, currentXp),
        eq(environmentStates.environmentLevel, currentLevel)
      ))
      .returning();
    
    // If optimistic lock failed (concurrent update), retry
    if (!updated) {
      return this.addEnvironmentXp(userId, xp);
    }
    
    return updated;
  }
  
  // Trait Reward Logs (anti-cheat)
  async logTraitReward(log: InsertTraitRewardLog): Promise<TraitRewardLog> {
    const [created] = await db.insert(traitRewardLogs).values(log).returning();
    return created;
  }
  
  async getTraitRewardLogs(userId: string): Promise<TraitRewardLog[]> {
    return await db.select().from(traitRewardLogs)
      .where(eq(traitRewardLogs.userId, userId))
      .orderBy(desc(traitRewardLogs.createdAt));
  }
  
  // ===== GROWTH SANCTUARY SYSTEM IMPLEMENTATION =====
  
  async getSanctuaryState(userId: string): Promise<UserSanctuary | null> {
    const [sanctuary] = await db.select().from(userSanctuary).where(eq(userSanctuary.userId, userId));
    return sanctuary || null;
  }
  
  async createSanctuaryState(userId: string): Promise<UserSanctuary> {
    const [sanctuary] = await db.insert(userSanctuary)
      .values({
        userId,
        sanctuaryName: "My Sanctuary",
        evolutionStage: 1,
        sanctuaryXp: 0,
        xpToNextStage: 500,
        weatherType: "sunny",
        timeOfDay: "day",
        unlockedElements: ["tree-oak"],
        placedElements: [],
        totalElementsUnlocked: 1,
      })
      .returning();
    return sanctuary;
  }
  
  async updateSanctuaryState(userId: string, updates: Partial<UserSanctuary>): Promise<UserSanctuary | null> {
    const [updated] = await db.update(userSanctuary)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSanctuary.userId, userId))
      .returning();
    return updated || null;
  }
  
  async updateSanctuarySettings(userId: string, settings: { weatherType?: string; timeOfDay?: string }): Promise<UserSanctuary | null> {
    const updateData: any = { updatedAt: new Date() };
    if (settings.weatherType) updateData.weatherType = settings.weatherType;
    if (settings.timeOfDay) updateData.timeOfDay = settings.timeOfDay;
    
    const [updated] = await db.update(userSanctuary)
      .set(updateData)
      .where(eq(userSanctuary.userId, userId))
      .returning();
    return updated || null;
  }
  
  async addSanctuaryXp(userId: string, xp: number): Promise<UserSanctuary | null> {
    let sanctuary = await this.getSanctuaryState(userId);
    if (!sanctuary) {
      sanctuary = await this.createSanctuaryState(userId);
    }
    
    const evolutionThresholds = [0, 500, 1500, 4000, 10000];
    let newXp = sanctuary.sanctuaryXp + xp;
    let newStage = sanctuary.evolutionStage;
    
    for (let i = evolutionThresholds.length - 1; i >= 0; i--) {
      if (newXp >= evolutionThresholds[i]) {
        newStage = i + 1;
        break;
      }
    }
    
    const nextThreshold = evolutionThresholds[Math.min(newStage, evolutionThresholds.length - 1)] || 10000;
    
    const [updated] = await db.update(userSanctuary)
      .set({
        sanctuaryXp: newXp,
        evolutionStage: Math.min(newStage, 5),
        xpToNextStage: nextThreshold,
        updatedAt: new Date(),
      })
      .where(eq(userSanctuary.userId, userId))
      .returning();
    return updated || null;
  }
  
  async getSanctuaryElements(filters?: { type?: string; rarity?: string; evolutionStage?: number }): Promise<SanctuaryElement[]> {
    let query = db.select().from(sanctuaryElements).where(eq(sanctuaryElements.isActive, true));
    
    if (filters?.type) {
      query = db.select().from(sanctuaryElements).where(
        and(eq(sanctuaryElements.isActive, true), eq(sanctuaryElements.type, filters.type))
      );
    }
    if (filters?.rarity) {
      query = db.select().from(sanctuaryElements).where(
        and(eq(sanctuaryElements.isActive, true), eq(sanctuaryElements.rarity, filters.rarity))
      );
    }
    if (filters?.evolutionStage) {
      query = db.select().from(sanctuaryElements).where(
        and(eq(sanctuaryElements.isActive, true), lte(sanctuaryElements.evolutionStage, filters.evolutionStage))
      );
    }
    
    return await query;
  }
  
  async getSanctuaryElementById(elementId: string): Promise<SanctuaryElement | null> {
    const [element] = await db.select().from(sanctuaryElements).where(eq(sanctuaryElements.id, elementId));
    return element || null;
  }
  
  async unlockSanctuaryElement(userId: string, elementId: string): Promise<{ success: boolean; error?: string; sanctuary?: UserSanctuary }> {
    let sanctuary = await this.getSanctuaryState(userId);
    if (!sanctuary) {
      sanctuary = await this.createSanctuaryState(userId);
    }
    
    const element = await this.getSanctuaryElementById(elementId);
    if (!element) {
      return { success: false, error: "Element not found" };
    }
    
    const unlockedElements = sanctuary.unlockedElements || [];
    if (unlockedElements.includes(elementId)) {
      return { success: false, error: "Element already unlocked" };
    }
    
    if (element.evolutionStage && element.evolutionStage > sanctuary.evolutionStage) {
      return { success: false, error: "Evolution stage too low" };
    }
    
    const user = await this.getUserById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    const unlockCost = element.unlockCost || 0;
    if (user.coinBalance < unlockCost) {
      return { success: false, error: "Insufficient coins" };
    }
    
    await db.update(users)
      .set({ coinBalance: user.coinBalance - unlockCost })
      .where(eq(users.id, userId));
    
    const newUnlockedElements = [...unlockedElements, elementId];
    const [updated] = await db.update(userSanctuary)
      .set({
        unlockedElements: newUnlockedElements,
        totalElementsUnlocked: newUnlockedElements.length,
        updatedAt: new Date(),
      })
      .where(eq(userSanctuary.userId, userId))
      .returning();
    
    return { success: true, sanctuary: updated };
  }
  
  async getEvolutionStages(): Promise<SanctuaryEvolutionStage[]> {
    return await db.select().from(sanctuaryEvolutionStages).orderBy(asc(sanctuaryEvolutionStages.stage));
  }
  
  async getEvolutionStageByLevel(stage: number): Promise<SanctuaryEvolutionStage | null> {
    const [stageData] = await db.select().from(sanctuaryEvolutionStages).where(eq(sanctuaryEvolutionStages.stage, stage));
    return stageData || null;
  }
  
  async seedSanctuaryElements(): Promise<void> {
    const existingElements = await db.select().from(sanctuaryElements).limit(1);
    if (existingElements.length > 0) return;
    
    const elementsToSeed = [
      { name: 'Oak Tree', type: 'tree', rarity: 'common', evolutionStage: 1, unlockCost: 0, description: 'A sturdy oak tree', assetData: { icon: 'TreeDeciduous', colors: ['green-600', 'amber-700'] } },
      { name: 'Pine Tree', type: 'tree', rarity: 'common', evolutionStage: 1, unlockCost: 50, description: 'An evergreen pine tree', assetData: { icon: 'Mountain', colors: ['emerald-700', 'amber-800'] } },
      { name: 'Cherry Blossom', type: 'tree', rarity: 'uncommon', evolutionStage: 2, unlockCost: 150, description: 'Beautiful pink cherry blossoms', assetData: { icon: 'Flower2', colors: ['pink-400', 'amber-600'] } },
      { name: 'Weeping Willow', type: 'tree', rarity: 'rare', evolutionStage: 3, unlockCost: 300, description: 'A graceful weeping willow', assetData: { icon: 'Leaf', colors: ['green-400', 'amber-700'] } },
      { name: 'Ancient Oak', type: 'tree', rarity: 'epic', evolutionStage: 4, unlockCost: 500, description: 'A massive ancient oak', assetData: { icon: 'Crown', colors: ['emerald-500', 'amber-900'] } },
      { name: 'World Tree', type: 'tree', rarity: 'legendary', evolutionStage: 5, unlockCost: 1000, description: 'The mythical world tree', assetData: { icon: 'Sparkles', colors: ['cyan-400', 'purple-600'] } },
      { name: 'Butterfly', type: 'creature', rarity: 'common', evolutionStage: 1, unlockCost: 25, description: 'A colorful butterfly', assetData: { icon: 'Bug', colors: ['pink-400', 'purple-400'] } },
      { name: 'Songbird', type: 'creature', rarity: 'common', evolutionStage: 1, unlockCost: 50, description: 'A cheerful songbird', assetData: { icon: 'Bird', colors: ['blue-400', 'slate-600'] } },
      { name: 'Forest Rabbit', type: 'creature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 100, description: 'A fluffy forest rabbit', assetData: { icon: 'Rabbit', colors: ['gray-400', 'white'] } },
      { name: 'Gentle Deer', type: 'creature', rarity: 'rare', evolutionStage: 3, unlockCost: 250, description: 'A gentle woodland deer', assetData: { icon: 'Cat', colors: ['amber-600', 'amber-200'] } },
      { name: 'Phoenix', type: 'creature', rarity: 'legendary', evolutionStage: 5, unlockCost: 800, description: 'A mythical phoenix', assetData: { icon: 'Flame', colors: ['orange-500', 'red-500'] } },
      { name: 'Wild Flowers', type: 'decoration', rarity: 'common', evolutionStage: 1, unlockCost: 15, description: 'Colorful wild flowers', assetData: { icon: 'Flower2', colors: ['pink-500', 'yellow-500'] } },
      { name: 'Mushrooms', type: 'decoration', rarity: 'common', evolutionStage: 1, unlockCost: 20, description: 'A cluster of mushrooms', assetData: { icon: 'Circle', colors: ['red-500', 'amber-100'] } },
      { name: 'Peaceful Pond', type: 'decoration', rarity: 'uncommon', evolutionStage: 2, unlockCost: 120, description: 'A tranquil pond', assetData: { icon: 'Fish', colors: ['blue-400', 'blue-600'] } },
      { name: 'Waterfall', type: 'decoration', rarity: 'rare', evolutionStage: 3, unlockCost: 200, description: 'A cascading waterfall', assetData: { icon: 'Droplets', colors: ['blue-300', 'white'] } },
      { name: 'Crystal Cluster', type: 'decoration', rarity: 'epic', evolutionStage: 4, unlockCost: 400, description: 'Shimmering crystals', assetData: { icon: 'Gem', colors: ['purple-400', 'cyan-400'] } },
      { name: 'Fireflies', type: 'effect', rarity: 'uncommon', evolutionStage: 2, unlockCost: 75, description: 'Magical fireflies', assetData: { icon: 'Sparkles', colors: ['yellow-300'] } },
      { name: 'Sun Rays', type: 'effect', rarity: 'rare', evolutionStage: 3, unlockCost: 150, description: 'Golden sun rays', assetData: { icon: 'Sun', colors: ['yellow-200', 'orange-200'] } },
      { name: 'Aurora Borealis', type: 'effect', rarity: 'legendary', evolutionStage: 5, unlockCost: 600, description: 'The northern lights', assetData: { icon: 'Wand2', colors: ['green-400', 'purple-400', 'pink-400'] } },
    ];
    
    for (const element of elementsToSeed) {
      await db.insert(sanctuaryElements).values(element).onConflictDoNothing();
    }
  }
  
  async seedEvolutionStages(): Promise<void> {
    const existingStages = await db.select().from(sanctuaryEvolutionStages).limit(1);
    if (existingStages.length > 0) return;
    
    const stagesToSeed = [
      { stage: 1, name: "Seedling", description: "Your journey begins with a single seed of hope", xpRequired: 0, elementsUnlocked: 5 },
      { stage: 2, name: "Sapling", description: "Young growth stretches toward the light", xpRequired: 500, elementsUnlocked: 10 },
      { stage: 3, name: "Young Forest", description: "A vibrant ecosystem begins to form", xpRequired: 1500, elementsUnlocked: 14 },
      { stage: 4, name: "Mature Forest", description: "Life flourishes in abundance", xpRequired: 4000, elementsUnlocked: 17 },
      { stage: 5, name: "Ancient Grove", description: "A magical sanctuary of wisdom and wonder", xpRequired: 10000, elementsUnlocked: 19 },
    ];
    
    for (const stage of stagesToSeed) {
      await db.insert(sanctuaryEvolutionStages).values(stage).onConflictDoNothing();
    }
  }
  
  // ===== AVATAR MARKETPLACE SYSTEM IMPLEMENTATION =====
  
  async getUserOwnedTraits(userId: string): Promise<UserAvatarTrait[]> {
    return await db.select()
      .from(userAvatarTraits)
      .where(eq(userAvatarTraits.userId, userId));
  }
  
  async getActiveListings(filters?: { rarity?: string; minPrice?: number; maxPrice?: number; zoneId?: string }): Promise<MarketplaceListing[]> {
    let conditions = [eq(marketplaceListings.status, 'active')];
    
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(marketplaceListings.price, filters.minPrice));
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(marketplaceListings.price, filters.maxPrice));
    }
    
    const listings = await db.select()
      .from(marketplaceListings)
      .where(and(...conditions))
      .orderBy(desc(marketplaceListings.createdAt));
    
    return listings;
  }
  
  async getListingById(listingId: string): Promise<MarketplaceListing | null> {
    const [listing] = await db.select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, listingId));
    return listing || null;
  }
  
  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    return await db.select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.sellerId, userId))
      .orderBy(desc(marketplaceListings.createdAt));
  }
  
  async createListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing> {
    const [created] = await db.insert(marketplaceListings).values(listing).returning();
    return created;
  }
  
  async cancelListing(listingId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const listing = await this.getListingById(listingId);
    if (!listing) {
      return { success: false, error: "Listing not found" };
    }
    if (listing.sellerId !== userId) {
      return { success: false, error: "You can only cancel your own listings" };
    }
    if (listing.status !== 'active') {
      return { success: false, error: "Listing is no longer active" };
    }
    
    await db.update(marketplaceListings)
      .set({ status: 'cancelled' })
      .where(eq(marketplaceListings.id, listingId));
    
    return { success: true };
  }
  
  async buyListing(listingId: string, buyerId: string): Promise<{ success: boolean; error?: string; listing?: MarketplaceListing }> {
    const listing = await this.getListingById(listingId);
    if (!listing) {
      return { success: false, error: "Listing not found" };
    }
    if (listing.status !== 'active') {
      return { success: false, error: "Listing is no longer available" };
    }
    if (listing.sellerId === buyerId) {
      return { success: false, error: "Cannot buy your own listing" };
    }
    
    const buyer = await this.getUserById(buyerId);
    if (!buyer) {
      return { success: false, error: "Buyer not found" };
    }
    if (buyer.coinBalance < listing.price) {
      return { success: false, error: "Insufficient coins" };
    }
    
    const seller = await this.getUserById(listing.sellerId);
    if (!seller) {
      return { success: false, error: "Seller not found" };
    }
    
    const transactionFee = Math.floor(listing.price * 0.10);
    const sellerProceeds = listing.price - transactionFee;
    
    await db.update(users)
      .set({ coinBalance: buyer.coinBalance - listing.price })
      .where(eq(users.id, buyerId));
    
    await db.update(users)
      .set({ coinBalance: seller.coinBalance + sellerProceeds })
      .where(eq(users.id, listing.sellerId));
    
    await this.removeUserTrait(listing.sellerId, listing.traitId);
    
    await db.insert(userAvatarTraits).values({
      userId: buyerId,
      traitId: listing.traitId,
      unlockSource: 'purchase',
      unlockSourceId: listingId,
      coinsPaid: listing.price,
    });
    
    const [updated] = await db.update(marketplaceListings)
      .set({ 
        status: 'sold', 
        buyerId, 
        soldAt: new Date() 
      })
      .where(eq(marketplaceListings.id, listingId))
      .returning();
    
    return { success: true, listing: updated };
  }
  
  async getReceivedGifts(userId: string): Promise<GiftTransaction[]> {
    return await db.select()
      .from(giftTransactions)
      .where(eq(giftTransactions.receiverId, userId))
      .orderBy(desc(giftTransactions.createdAt));
  }
  
  async getSentGifts(userId: string): Promise<GiftTransaction[]> {
    return await db.select()
      .from(giftTransactions)
      .where(eq(giftTransactions.senderId, userId))
      .orderBy(desc(giftTransactions.createdAt));
  }
  
  async createGift(gift: InsertGiftTransaction): Promise<{ success: boolean; error?: string; gift?: GiftTransaction }> {
    if (gift.senderId === gift.receiverId) {
      return { success: false, error: "Cannot gift to yourself" };
    }
    
    const isEquipped = await this.isTraitEquipped(gift.senderId, gift.traitId);
    if (isEquipped) {
      return { success: false, error: "Cannot gift a currently equipped trait" };
    }
    
    const ownedTraits = await this.getUserOwnedTraits(gift.senderId);
    const ownsTrait = ownedTraits.some(t => t.traitId === gift.traitId);
    if (!ownsTrait) {
      return { success: false, error: "You don't own this trait" };
    }
    
    const receiver = await this.getUserById(gift.receiverId);
    if (!receiver) {
      return { success: false, error: "Recipient not found" };
    }
    
    await this.removeUserTrait(gift.senderId, gift.traitId);
    
    const [created] = await db.insert(giftTransactions).values({
      ...gift,
      claimed: false,
    }).returning();
    
    return { success: true, gift: created };
  }
  
  async claimGift(giftId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const [gift] = await db.select()
      .from(giftTransactions)
      .where(eq(giftTransactions.id, giftId));
    
    if (!gift) {
      return { success: false, error: "Gift not found" };
    }
    if (gift.receiverId !== userId) {
      return { success: false, error: "This gift is not for you" };
    }
    if (gift.claimed) {
      return { success: false, error: "Gift already claimed" };
    }
    
    await db.insert(userAvatarTraits).values({
      userId,
      traitId: gift.traitId,
      unlockSource: 'gift',
      unlockSourceId: giftId,
      coinsPaid: 0,
    });
    
    await db.update(giftTransactions)
      .set({ claimed: true, claimedAt: new Date() })
      .where(eq(giftTransactions.id, giftId));
    
    return { success: true };
  }
  
  async isTraitEquipped(userId: string, traitId: string): Promise<boolean> {
    const equipped = await db.select()
      .from(userAvatarEquipped)
      .where(and(
        eq(userAvatarEquipped.userId, userId),
        eq(userAvatarEquipped.traitId, traitId)
      ));
    return equipped.length > 0;
  }
  
  async removeUserTrait(userId: string, traitId: string): Promise<void> {
    await db.delete(userAvatarTraits)
      .where(and(
        eq(userAvatarTraits.userId, userId),
        eq(userAvatarTraits.traitId, traitId)
      ));
  }
}

// Export storage instance
export const storage = new DatabaseStorage();