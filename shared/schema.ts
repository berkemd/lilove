import { pgTable, varchar, text, integer, timestamp, boolean, json, jsonb, decimal, unique, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

// ===== MASTERMIND AI SCHEMA =====
// Adaptive Performance Intelligence Platform
// Complete system for goal planning, performance tracking, and AI coaching

// ===== CORE ENTITIES =====

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users & Authentication - Modified for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep default for Replit Auth
  email: varchar("email").unique(),
  password: varchar("password"), // Nullable to support OAuth-only users
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Additional fields for MasterMind AI
  username: varchar("username"),
  displayName: varchar("display_name"),
  timezone: varchar("timezone").default("UTC"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  
  // Profile Information
  bio: text("bio"),
  phoneNumber: varchar("phone_number"),
  website: varchar("website"),
  location: varchar("location"),
  company: varchar("company"),
  jobTitle: varchar("job_title"),
  
  // Social Media Links
  socialLinks: json("social_links").$type<{
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    portfolio?: string;
  }>().default({}),
  
  // Privacy Settings
  profileVisibility: varchar("profile_visibility").default("public"), // public, private, friends
  showEmail: boolean("show_email").default(false),
  showActivity: boolean("show_activity").default(true),
  showAchievements: boolean("show_achievements").default(true),
  showStats: boolean("show_stats").default(true),
  dataSharing: boolean("data_sharing").default(true),
  analyticsOptOut: boolean("analytics_opt_out").default(false),
  
  // Engagement tracking
  lastLoginAt: timestamp("last_login_at"),
  streakStartDate: timestamp("streak_start_date"),
  
  // Preferences
  theme: varchar("theme").default("system"), // light, dark, system
  language: varchar("language").default("en"), // Language preference
  notificationsEnabled: boolean("notifications_enabled").default(true),
  motivationalQuotes: boolean("motivational_quotes").default(true),
  celebrationsEnabled: boolean("celebrations_enabled").default(true),
  
  // Notification Preferences
  emailNotifications: json("email_notifications").$type<{
    goalReminders?: boolean;
    achievements?: boolean;
    weeklyReports?: boolean;
    friendActivity?: boolean;
    systemUpdates?: boolean;
    marketing?: boolean;
  }>().default({
    goalReminders: true,
    achievements: true,
    weeklyReports: true,
    friendActivity: true,
    systemUpdates: true,
    marketing: false
  }),
  
  pushNotifications: json("push_notifications").$type<{
    goals?: boolean;
    achievements?: boolean;
    friends?: boolean;
    reminders?: boolean;
  }>().default({
    goals: true,
    achievements: true,
    friends: true,
    reminders: true
  }),
  
  // Security Settings
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  lastPasswordChange: timestamp("last_password_change"),
  sessionTimeout: integer("session_timeout").default(30), // minutes
  loginNotifications: boolean("login_notifications").default(true),
  
  // Stripe Integration
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  
  // Paddle Integration
  paddleSubscriptionId: varchar("paddle_subscription_id"),
  paddleCustomerId: varchar("paddle_customer_id"),
  paymentProvider: varchar("payment_provider").default("stripe"), // stripe or paddle
  
  // Subscription Status
  subscriptionTier: varchar("subscription_tier").default("free"), // free, pro, team, enterprise
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, past_due, trialing
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  
  // Coins Balance - New users get 1000 welcome bonus coins
  coinBalance: integer("coin_balance").default(1000),
  
  // Voice AI Preferences
  voicePreferences: json("voice_preferences").$type<{
    model?: string; // alloy, echo, fable, onyx, nova, shimmer
    autoPlay?: boolean;
    speed?: number; // 0.75 - 1.5
  }>().default({ model: 'alloy', autoPlay: false, speed: 1.0 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username),
}));

// User Performance Profile  
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Learning & Performance Characteristics
  learningStyle: varchar("learning_style"), // visual, auditory, kinesthetic, mixed
  preferredPace: varchar("preferred_pace"), // slow, medium, fast, adaptive
  difficultyPreference: varchar("difficulty_preference"), // incremental, challenge, mixed
  workingHours: json("working_hours").$type<{start: string, end: string, timezone: string}>(),
  
  // Performance Analytics - Computed from transactions
  overallPerformanceScore: decimal("overall_performance_score").default("0"),
  consistencyRating: decimal("consistency_rating").default("0"),
  adaptabilityScore: decimal("adaptability_score").default("0"),
  
  // Engagement Metrics - Computed from XP transactions
  currentLevel: integer("current_level").default(1),
  streakCount: integer("streak_count").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalXp: integer("total_xp").default(0),
  
  // Onboarding preferences
  goalCategories: json("goal_categories").$type<string[]>().default([]),
  dailyTimeCommitment: integer("daily_time_commitment"), // minutes per day
  preferredCoachingStyle: varchar("preferred_coaching_style"), // supportive, challenging, balanced
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_profiles_user_id_idx").on(table.userId),
}));

// ===== ADVANCED PROFILE & SETTINGS FEATURES =====

// Security Logs for tracking important security events
export const securityLogs = pgTable("security_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Event Information
  eventType: varchar("event_type").notNull(), // login, logout, password_change, 2fa_enabled, 2fa_disabled, profile_update, settings_change
  eventDescription: text("event_description").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  location: varchar("location"),
  
  // Risk Assessment
  riskLevel: varchar("risk_level").default("low"), // low, medium, high, critical
  flagged: boolean("flagged").default(false),
  
  // Metadata
  eventData: json("event_data").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("security_logs_user_id_idx").on(table.userId),
  eventTypeIdx: index("security_logs_event_type_idx").on(table.eventType),
  createdAtIdx: index("security_logs_created_at_idx").on(table.createdAt),
  flaggedIdx: index("security_logs_flagged_idx").on(table.flagged),
}));

// Connected Accounts/Integrations Management
export const connectedAccounts = pgTable("connected_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Account Information
  provider: varchar("provider").notNull(), // google, github, linkedin, twitter, etc.
  providerAccountId: varchar("provider_account_id").notNull(),
  displayName: varchar("display_name"),
  email: varchar("email"),
  avatarUrl: varchar("avatar_url"),
  
  // Integration Settings
  isActive: boolean("is_active").default(true),
  permissions: json("permissions").$type<string[]>().default([]), // list of granted permissions
  syncEnabled: boolean("sync_enabled").default(false),
  
  // OAuth Data (encrypted)
  accessToken: text("access_token"), // Should be encrypted in production
  refreshToken: text("refresh_token"), // Should be encrypted in production
  expiresAt: timestamp("expires_at"),
  
  // Metadata
  connectedAt: timestamp("connected_at").defaultNow(),
  lastSyncAt: timestamp("last_sync_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("connected_accounts_user_id_idx").on(table.userId),
  providerIdx: index("connected_accounts_provider_idx").on(table.provider),
  uniqueConnection: unique().on(table.userId, table.provider, table.providerAccountId),
}));

// Data Export Tracking
export const dataExports = pgTable("data_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Export Information
  exportType: varchar("export_type").notNull(), // full, profile, goals, tasks, achievements, social
  format: varchar("format").notNull(), // json, csv, xml
  status: varchar("status").default("pending"), // pending, processing, completed, failed, expired
  
  // File Information
  fileName: varchar("file_name"),
  filePath: varchar("file_path"),
  fileSize: integer("file_size"), // bytes
  downloadCount: integer("download_count").default(0),
  
  // Progress and Metadata
  progress: integer("progress").default(0), // 0-100
  errorMessage: text("error_message"),
  expiresAt: timestamp("expires_at"), // Export files expire after some time
  
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  lastDownloadedAt: timestamp("last_downloaded_at"),
}, (table) => ({
  userIdIdx: index("data_exports_user_id_idx").on(table.userId),
  statusIdx: index("data_exports_status_idx").on(table.status),
  createdAtIdx: index("data_exports_created_at_idx").on(table.requestedAt),
}));

// Account Deletion Tracking
export const accountDeletions = pgTable("account_deletions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Deletion Information
  reason: varchar("reason"), // user_request, policy_violation, inactivity, etc.
  additionalReason: text("additional_reason"), // User's explanation
  status: varchar("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  
  // Timeline
  scheduledFor: timestamp("scheduled_for").notNull(), // Usually 30 days from request
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  
  // Data Retention
  dataRetentionDays: integer("data_retention_days").default(30), // Legal requirement
  backupPath: varchar("backup_path"), // For legal/compliance purposes
  
  // Metadata
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  confirmationToken: varchar("confirmation_token"),
}, (table) => ({
  userIdIdx: index("account_deletions_user_id_idx").on(table.userId),
  statusIdx: index("account_deletions_status_idx").on(table.status),
  scheduledIdx: index("account_deletions_scheduled_idx").on(table.scheduledFor),
}));

// Two-Factor Authentication
export const twoFactorAuth = pgTable("two_factor_auth", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // TOTP Settings
  secret: varchar("secret").notNull(), // Base32 encoded secret (should be encrypted)
  backupCodes: json("backup_codes").$type<string[]>(), // Hashed backup codes
  usedBackupCodes: json("used_backup_codes").$type<string[]>().default([]),
  
  // Configuration
  algorithm: varchar("algorithm").default("SHA1"), // SHA1, SHA256, SHA512
  digits: integer("digits").default(6), // Usually 6 or 8
  period: integer("period").default(30), // Time step in seconds
  
  // Status
  isEnabled: boolean("is_enabled").default(false),
  isVerified: boolean("is_verified").default(false), // User has successfully verified setup
  
  // Usage Tracking
  lastUsedAt: timestamp("last_used_at"),
  failedAttempts: integer("failed_attempts").default(0),
  lastFailedAttempt: timestamp("last_failed_attempt"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("two_factor_auth_user_id_idx").on(table.userId),
}));

// Profile Picture Metadata and Upload Tracking
export const profilePictures = pgTable("profile_pictures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // File Information
  originalName: varchar("original_name").notNull(),
  fileName: varchar("file_name").notNull(), // Generated filename
  filePath: varchar("file_path").notNull(), // Storage path
  fileSize: integer("file_size").notNull(), // bytes
  mimeType: varchar("mime_type").notNull(),
  
  // Image Properties
  width: integer("width"),
  height: integer("height"),
  
  // Processing Information
  isProcessed: boolean("is_processed").default(false),
  thumbnailPath: varchar("thumbnail_path"), // Path to generated thumbnail
  
  // Status
  isActive: boolean("is_active").default(false), // Only one active picture per user
  
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("profile_pictures_user_id_idx").on(table.userId),
  isActiveIdx: index("profile_pictures_is_active_idx").on(table.isActive),
  uploadedAtIdx: index("profile_pictures_uploaded_at_idx").on(table.uploadedAt),
}));

// Usage Analytics and Insights
export const usageStatistics = pgTable("usage_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Time Period
  date: timestamp("date").notNull(), // Daily aggregation
  
  // Usage Metrics
  sessionCount: integer("session_count").default(0),
  totalSessionTime: integer("total_session_time").default(0), // minutes
  goalsWorkedOn: integer("goals_worked_on").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  xpEarned: integer("xp_earned").default(0),
  
  // Feature Usage
  featuresUsed: json("features_used").$type<string[]>().default([]), // List of features/pages visited
  
  // Device/Platform Info
  deviceType: varchar("device_type"), // desktop, mobile, tablet
  browserInfo: varchar("browser_info"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("usage_statistics_user_id_idx").on(table.userId),
  dateIdx: index("usage_statistics_date_idx").on(table.date),
  uniqueUserDate: unique().on(table.userId, table.date),
}));

// Calendar Integration Tokens for iCal feeds
export const calendarTokens = pgTable("calendar_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  icalToken: varchar("ical_token").notNull().unique(), // Random token for feed security
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("calendar_tokens_user_id_idx").on(table.userId),
  tokenIdx: index("calendar_tokens_ical_token_idx").on(table.icalToken),
}));

// ===== SKILLS TAXONOMY SYSTEM =====

export const skillCategories = pgTable("skill_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  parentCategoryId: varchar("parent_category_id").references((): any => skillCategories.id),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => skillCategories.id).notNull(),
  difficultyLevel: integer("difficulty_level").notNull(), // 1-10
  prerequisiteIds: json("prerequisite_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: index("skills_name_idx").on(table.name),
  categoryIdx: index("skills_category_idx").on(table.categoryId),
}));

// ===== GOALS & PLANNING =====

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Goal Definition
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // tech, career, health, creative, business
  targetOutcome: text("target_outcome").notNull(),
  
  // Intelligent Planning
  estimatedDuration: integer("estimated_duration"), // days
  difficultyLevel: integer("difficulty_level"), // 1-10
  
  // Status & Tracking
  status: varchar("status").default("active"), // active, paused, completed, abandoned
  progress: decimal("progress").default("0"), // 0-100
  originalETA: timestamp("original_eta"),
  currentETA: timestamp("current_eta"),
  
  // Performance Analytics
  performanceScore: decimal("performance_score").default("0"),
  adaptationCount: integer("adaptation_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("goals_user_id_idx").on(table.userId),
  statusIdx: index("goals_status_idx").on(table.status),
  categoryIdx: index("goals_category_idx").on(table.category),
}));

// Goal-Skills Junction  
export const goalSkills = pgTable("goal_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }).notNull(),
  skillId: varchar("skill_id").references(() => skills.id, { onDelete: 'cascade' }).notNull(),
  relationship: varchar("relationship").notNull(), // required, target, bonus
  proficiencyLevel: integer("proficiency_level"), // 1-10
}, (table) => ({
  uniqueGoalSkill: unique().on(table.goalId, table.skillId),
  goalIdx: index("goal_skills_goal_idx").on(table.goalId),
  skillIdx: index("goal_skills_skill_idx").on(table.skillId),
}));

// AI-Generated Task Plans
export const taskPlans = pgTable("task_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }).notNull(),
  
  // Plan Metadata
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  planType: varchar("plan_type").default("adaptive"), // template, custom, adaptive
  
  // AI Planning Data
  totalTasks: integer("total_tasks"),
  estimatedHours: decimal("estimated_hours"),
  complexityScore: decimal("complexity_score"),
  
  // Adaptation Tracking
  originalStructure: json("original_structure").$type<any>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  lastAdaptedAt: timestamp("last_adapted_at"),
}, (table) => ({
  goalIdx: index("task_plans_goal_idx").on(table.goalId),
  activeIdx: index("task_plans_active_idx").on(table.isActive),
  // Note: Unique active plan per goal enforced at application level
}));

// Individual Tasks within Plans
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => taskPlans.id, { onDelete: 'cascade' }).notNull(),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }).notNull(),
  
  // Task Definition
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // learning, practice, project, assessment, milestone
  
  // Hierarchy & Dependencies
  parentTaskId: varchar("parent_task_id"),
  orderIndex: integer("order_index").notNull(),
  depth: integer("depth").default(0),
  
  // Intelligent Attributes
  estimatedDuration: integer("estimated_duration"), // minutes
  difficultyRating: integer("difficulty_rating"), // 1-10
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  
  // Performance Tracking
  status: varchar("status").default("pending"), // pending, active, completed, skipped, blocked, cancelled
  timeSpent: integer("time_spent").default(0), // minutes
  attemptCount: integer("attempt_count").default(0),
  successRate: decimal("success_rate"),
  
  // Timer Management
  isTimerRunning: boolean("is_timer_running").default(false),
  pausedAt: timestamp("paused_at"),
  totalPauseTime: integer("total_pause_time").default(0), // minutes
  
  // Adaptive Learning
  personalizedInstructions: text("personalized_instructions"),
  adaptedDifficulty: integer("adapted_difficulty"),
  adaptationReason: text("adaptation_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
}, (table) => ({
  planIdx: index("tasks_plan_idx").on(table.planId),
  goalIdx: index("tasks_goal_idx").on(table.goalId),
  statusIdx: index("tasks_status_idx").on(table.status),
  parentIdx: index("tasks_parent_idx").on(table.parentTaskId),
  // Ensure unique order within plan
  uniquePlanOrder: unique().on(table.planId, table.orderIndex),
}));

// Add self-reference after table definition
export const tasksRelations = {
  parentTask: tasks.parentTaskId,
};

// Task-Skills Junction
export const taskSkills = pgTable("task_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  skillId: varchar("skill_id").references(() => skills.id, { onDelete: 'cascade' }).notNull(),
  relationship: varchar("relationship").notNull(), // required, learned, practiced
  proficiencyGain: integer("proficiency_gain"), // 1-10
}, (table) => ({
  uniqueTaskSkill: unique().on(table.taskId, table.skillId, table.relationship),
  taskIdx: index("task_skills_task_idx").on(table.taskId),
  skillIdx: index("task_skills_skill_idx").on(table.skillId),
}));

// ===== PERFORMANCE & ANALYTICS =====

export const performanceEvents = pgTable("performance_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Event Data
  eventType: varchar("event_type").notNull(), // task_start, task_complete, milestone, struggle, breakthrough
  eventData: json("event_data").$type<any>(),
  
  // Performance Metrics
  focusTime: integer("focus_time"), // minutes of focused work
  distractionCount: integer("distraction_count"),
  qualityScore: decimal("quality_score"), // 0-10
  confidenceLevel: decimal("confidence_level"), // 0-10
  
  // Context
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  deviceType: varchar("device_type"),
  timeOfDay: varchar("time_of_day"),
}, (table) => ({
  userIdx: index("performance_events_user_idx").on(table.userId),
  goalIdx: index("performance_events_goal_idx").on(table.goalId),
  taskIdx: index("performance_events_task_idx").on(table.taskId),
  timestampIdx: index("performance_events_timestamp_idx").on(table.timestamp),
  sessionIdx: index("performance_events_session_idx").on(table.sessionId),
}));

// ===== ADAPTATION & PREDICTION SYSTEM =====

export const adaptationLogs = pgTable("adaptation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }).notNull(),
  planId: varchar("plan_id").references(() => taskPlans.id, { onDelete: 'cascade' }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Adaptation Context
  triggerType: varchar("trigger_type").notNull(), // performance, time, difficulty, motivation
  triggerReason: text("trigger_reason").notNull(),
  metricsSnapshot: json("metrics_snapshot").$type<any>(),
  
  // Changes Applied
  suggestedChanges: json("suggested_changes").$type<any>(),
  appliedChanges: json("applied_changes").$type<any>(),
  impact: varchar("impact").notNull(), // minor, moderate, major
  
  // Metadata
  modelVersion: varchar("model_version").default("v1.0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  goalIdx: index("adaptation_logs_goal_idx").on(table.goalId),
  timestampIdx: index("adaptation_logs_timestamp_idx").on(table.createdAt),
}));

export const predictionSnapshots = pgTable("prediction_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }).notNull(),
  planId: varchar("plan_id").references(() => taskPlans.id, { onDelete: 'cascade' }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Prediction Data
  predictedSuccess: decimal("predicted_success"), // 0-100%
  predictedETA: timestamp("predicted_eta"),
  predictionHorizon: integer("prediction_horizon"), // days
  inputsHash: varchar("inputs_hash").notNull(),
  
  // Model Info
  modelVersion: varchar("model_version").default("v1.0"),
  confidence: decimal("confidence"), // 0-100%
  
  // Resolution Tracking
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  outcomeSuccess: boolean("outcome_success"),
  actualETA: timestamp("actual_eta"),
}, (table) => ({
  goalIdx: index("prediction_snapshots_goal_idx").on(table.goalId),
  createdIdx: index("prediction_snapshots_created_idx").on(table.createdAt),
}));

// ===== KNOWLEDGE BASE SYSTEM =====

export const knowledgeDomains = pgTable("knowledge_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Domain Info
  name: varchar("name").notNull().unique(),
  category: varchar("category").notNull(),
  description: text("description"),
  
  // Metadata
  expertiseLevel: integer("expertise_level"), // 1-10 depth of knowledge
  popularityScore: decimal("popularity_score").default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("knowledge_domains_name_idx").on(table.name),
  categoryIdx: index("knowledge_domains_category_idx").on(table.category),
}));

export const expertKnowledge = pgTable("expert_knowledge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainId: varchar("domain_id").references(() => knowledgeDomains.id, { onDelete: 'cascade' }).notNull(),
  
  // Knowledge Entry
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull(), // concept, technique, pitfall, shortcut, resource
  
  // Learning Path Integration
  difficulty: integer("difficulty"), // 1-10
  relatedConceptIds: json("related_concept_ids").$type<string[]>().default([]),
  
  // Quality & Usage
  accuracyScore: decimal("accuracy_score").default("10"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  domainIdx: index("expert_knowledge_domain_idx").on(table.domainId),
  typeIdx: index("expert_knowledge_type_idx").on(table.type),
}));

// Task-Knowledge Linkage
export const taskKnowledgeLinks = pgTable("task_knowledge_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  knowledgeId: varchar("knowledge_id").references(() => expertKnowledge.id, { onDelete: 'cascade' }).notNull(),
  role: varchar("role").notNull(), // prerequisite, recommended, support
  importance: integer("importance").default(5), // 1-10
}, (table) => ({
  uniqueTaskKnowledge: unique().on(table.taskId, table.knowledgeId),
  taskIdx: index("task_knowledge_task_idx").on(table.taskId),
  knowledgeIdx: index("task_knowledge_knowledge_idx").on(table.knowledgeId),
}));

// Knowledge Usage Tracking
export const knowledgeUsageLogs = pgTable("knowledge_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  knowledgeId: varchar("knowledge_id").references(() => expertKnowledge.id, { onDelete: 'cascade' }).notNull(),
  
  // Usage Context
  event: varchar("event").notNull(), // viewed, applied, helpful, unhelpful
  dwellTime: integer("dwell_time"), // seconds
  wasHelpful: boolean("was_helpful"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("knowledge_usage_user_idx").on(table.userId),
  knowledgeIdx: index("knowledge_usage_knowledge_idx").on(table.knowledgeId),
  timestampIdx: index("knowledge_usage_timestamp_idx").on(table.createdAt),
}));

// ===== AI MENTOR SYSTEM =====

// AI Mentor Conversations for maintaining context
export const mentorConversations = pgTable("mentor_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Conversation Context
  title: text("title"),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  category: varchar("category"), // goal-planning, daily-coaching, task-help, motivation
  
  // Conversation State
  messages: json("messages").$type<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    context?: any;
  }>>().default([]),
  
  // AI Memory
  contextSummary: text("context_summary"), // AI-generated summary for long-term memory
  userCharacteristics: json("user_characteristics").$type<{
    learningStyle?: string;
    motivationTriggers?: string[];
    strengthsIdentified?: string[];
    challengesIdentified?: string[];
  }>(),
  
  // Metadata
  isActive: boolean("is_active").default(true),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  messageCount: integer("message_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("mentor_conversations_user_idx").on(table.userId),
  activeIdx: index("mentor_conversations_active_idx").on(table.isActive),
  lastActiveIdx: index("mentor_conversations_last_active_idx").on(table.lastActiveAt),
}));

export const mentorSessions = pgTable("mentor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  
  // Session Info
  sessionType: varchar("session_type").notNull(), // guidance, motivation, debugging, planning
  context: json("context").$type<any>(),
  
  // AI Response
  query: text("query").notNull(),
  response: text("response").notNull(),
  confidence: decimal("confidence"),
  
  // Effectiveness Tracking
  wasHelpful: boolean("was_helpful"),
  userRating: integer("user_rating"), // 1-5
  followupNeeded: boolean("followup_needed").default(false),
  
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  userIdx: index("mentor_sessions_user_idx").on(table.userId),
  goalIdx: index("mentor_sessions_goal_idx").on(table.goalId),
  timestampIdx: index("mentor_sessions_timestamp_idx").on(table.timestamp),
}));

// ===== COMPREHENSIVE GAMIFICATION SYSTEM =====

// Level System Configuration
export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  xpRequired: integer("xp_required").notNull(),
  title: varchar("title").notNull(), // Novice, Apprentice, Journeyman, Expert, Master, Grandmaster, Legend
  perks: json("perks").$type<string[]>().default([]), // Unlocked features/benefits
  badgeUrl: varchar("badge_url"), // URL to level badge image
});

// Enhanced Achievements System
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Achievement Definition
  key: varchar("key").notNull().unique(), // Unique identifier for programmatic use
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // productivity, consistency, learning, social, special
  
  // Requirements & Rewards
  criteria: json("criteria").$type<any>(),
  xpReward: integer("xp_reward").default(0),
  coinReward: integer("coin_reward").default(0),
  
  // Tier System (Bronze, Silver, Gold, Diamond)
  tier: integer("tier").default(1), // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
  requiredForNextTier: integer("required_for_next_tier"), // Count needed for next tier
  
  // Metadata
  rarity: varchar("rarity").default("common"), // common, uncommon, rare, epic, legendary
  iconUrl: text("icon_url"),
  hidden: boolean("hidden").default(false), // Hidden until unlocked
  seasonal: boolean("seasonal").default(false), // Limited time achievement
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: index("achievements_name_idx").on(table.name),
  categoryIdx: index("achievements_category_idx").on(table.category),
  keyIdx: index("achievements_key_idx").on(table.key),
}));

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id, { onDelete: 'cascade' }).notNull(),
  
  // Achievement Context
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  progress: decimal("progress").default("0"), // 0-100
  currentTier: integer("current_tier").default(1), // For tiered achievements
  showcased: boolean("showcased").default(false), // Display on profile
  
  unlockedAt: timestamp("unlocked_at").defaultNow(),
}, (table) => ({
  uniqueUserAchievement: unique().on(table.userId, table.achievementId),
  userIdx: index("user_achievements_user_idx").on(table.userId),
  achievementIdx: index("user_achievements_achievement_idx").on(table.achievementId),
}));

// Enhanced XP Transaction Ledger
export const xpTransactions = pgTable("xp_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Transaction Details
  source: varchar("source").notNull(), // task, goal, achievement, daily_login, streak, challenge, spin
  sourceId: varchar("source_id"), // Reference to the source item
  delta: integer("delta").notNull(), // +/- XP amount
  reason: text("reason").notNull(),
  multiplier: decimal("multiplier").default("1.0"), // Premium multiplier
  
  // Context
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("xp_transactions_user_idx").on(table.userId),
  sourceIdx: index("xp_transactions_source_idx").on(table.source, table.sourceId),
  timestampIdx: index("xp_transactions_timestamp_idx").on(table.createdAt),
}));

// Daily Challenges
export const dailyChallenges = pgTable("daily_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // productivity, learning, social, mixed
  challengeType: varchar("challenge_type").notNull(), // task_count, time_logged, streak_maintain
  targetValue: integer("target_value").notNull(),
  xpReward: integer("xp_reward").default(50),
  coinReward: integer("coin_reward").default(10),
  difficulty: varchar("difficulty").default("medium"), // easy, medium, hard
  activeDate: timestamp("active_date").notNull(), // Date this challenge is active
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activeDateIdx: index("daily_challenges_active_date_idx").on(table.activeDate),
}));

// User Daily Challenge Progress
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  challengeId: varchar("challenge_id").references(() => dailyChallenges.id, { onDelete: 'cascade' }).notNull(),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  claimedReward: boolean("claimed_reward").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userChallengeIdx: unique("user_challenge_unique").on(table.userId, table.challengeId),
  userIdIdx: index("user_challenge_progress_user_id_idx").on(table.userId),
}));

// Weekly Challenges
export const weeklyChallenges = pgTable("weekly_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  challengeType: varchar("challenge_type").notNull(),
  targetValue: integer("target_value").notNull(),
  xpReward: integer("xp_reward").default(500),
  coinReward: integer("coin_reward").default(100),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  weekStartIdx: index("weekly_challenges_week_start_idx").on(table.weekStart),
}));

// Leaderboards
export const leaderboards = pgTable("leaderboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: varchar("category").default("global"), // global, tech, fitness, business, creative
  timeframe: varchar("timeframe").notNull(), // weekly, monthly, all_time
  score: integer("score").notNull(), // XP earned in timeframe
  rank: integer("rank"), // Computed rank
  previousRank: integer("previous_rank"), // For showing rank changes
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userCategoryTimeframeIdx: unique("user_category_timeframe_unique").on(table.userId, table.category, table.timeframe),
  categoryTimeframeScoreIdx: index("leaderboard_category_timeframe_score_idx").on(table.category, table.timeframe, table.score),
}));

// ===== LEAGUE/DIVISION SYSTEM =====

export const leagues = pgTable("leagues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // Bronze, Silver, Gold, Platinum, Diamond, Legend
  level: integer("level").notNull(), // 1-6
  minXpRequired: integer("min_xp_required").default(0),
  promotionThreshold: integer("promotion_threshold").default(10), // Top 10 promote
  relegationThreshold: integer("relegation_threshold").default(5), // Bottom 5 relegate
  iconUrl: varchar("icon_url"),
  color: varchar("color"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  levelIdx: index("leagues_level_idx").on(table.level),
}));

export const leagueSeasons = pgTable("league_seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seasonNumber: integer("season_number").notNull(),
  leagueId: varchar("league_id").references(() => leagues.id).notNull(),
  
  // Timing
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status").default("upcoming"), // upcoming, active, completed
  
  // Config
  maxParticipants: integer("max_participants").default(50),
  currentParticipants: integer("current_participants").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  leagueIdx: index("league_seasons_league_id_idx").on(table.leagueId),
  statusIdx: index("league_seasons_status_idx").on(table.status),
}));

export const leagueParticipants = pgTable("league_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seasonId: varchar("season_id").references(() => leagueSeasons.id, { onDelete: 'cascade' }).notNull(),
  leagueId: varchar("league_id").references(() => leagues.id).notNull(),
  
  // Performance
  weeklyXp: integer("weekly_xp").default(0),
  rank: integer("rank").default(0),
  
  // Outcome
  promoted: boolean("promoted").default(false),
  relegated: boolean("relegated").default(false),
  rewardClaimed: boolean("reward_claimed").default(false),
  
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("league_participants_user_id_idx").on(table.userId),
  seasonIdx: index("league_participants_season_idx").on(table.seasonId),
  uniqueParticipant: unique().on(table.userId, table.seasonId),
}));

// ===== HABIT TRACKING SYSTEM =====

export const habits = pgTable("habits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  title: text("title").notNull(),
  description: text("description"),
  icon: varchar("icon").default("🎯"),
  color: varchar("color").default("#3B82F6"),
  
  frequency: varchar("frequency").notNull().default("daily"),
  targetDays: json("target_days").$type<number[]>().default([1,2,3,4,5,6,7]),
  targetCount: integer("target_count").default(1),
  
  reminderTime: varchar("reminder_time"),
  reminderEnabled: boolean("reminder_enabled").default(false),
  
  category: varchar("category").notNull(),
  tags: json("tags").$type<string[]>().default([]),
  
  difficulty: varchar("difficulty").default("medium"),
  xpReward: integer("xp_reward").default(10),
  
  isActive: boolean("is_active").default(true),
  isPaused: boolean("is_paused").default(false),
  
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalCompletions: integer("total_completions").default(0),
  rhythmScore: decimal("rhythm_score").default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("habits_user_id_idx").on(table.userId),
  categoryIdx: index("habits_category_idx").on(table.category),
  activeIdx: index("habits_is_active_idx").on(table.isActive),
}));

export const habitCompletions = pgTable("habit_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  habitId: varchar("habit_id").references(() => habits.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  completedAt: timestamp("completed_at").defaultNow(),
  completionDate: timestamp("completion_date").notNull(),
  
  notes: text("notes"),
  mood: varchar("mood"),
  effort: integer("effort"),
  
  xpAwarded: integer("xp_awarded").default(10),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  habitIdIdx: index("habit_completions_habit_id_idx").on(table.habitId),
  userIdIdx: index("habit_completions_user_id_idx").on(table.userId),
  dateIdx: index("habit_completions_date_idx").on(table.completionDate),
  uniqueCompletion: unique().on(table.habitId, table.completionDate),
}));

// ===== COMPREHENSIVE SOCIAL FEATURES =====

// Teams & Groups
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  
  // Team Settings
  maxMembers: integer("max_members").default(20),
  isPublic: boolean("is_public").default(true), // Can be discovered/joined publicly
  requiresApproval: boolean("requires_approval").default(false),
  
  // Team Stats
  totalXp: integer("total_xp").default(0),
  teamLevel: integer("team_level").default(1),
  winStreak: integer("win_streak").default(0),
  challengesWon: integer("challenges_won").default(0),
  
  // Creator and dates
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("teams_name_idx").on(table.name),
  publicIdx: index("teams_public_idx").on(table.isPublic),
}));

// Team Members
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  role: varchar("role").default("member"), // owner, admin, member
  contributionXp: integer("contribution_xp").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  uniqueMembership: unique().on(table.teamId, table.userId),
  teamIdx: index("team_members_team_idx").on(table.teamId),
  userIdx: index("team_members_user_idx").on(table.userId),
}));

// Team Goals
export const teamGoals = pgTable("team_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  
  title: varchar("title").notNull(),
  description: text("description"),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  
  goalType: varchar("goal_type").notNull(), // collective_xp, tasks_completed, streak_days, challenge_wins
  deadline: timestamp("deadline"),
  status: varchar("status").default("active"), // active, completed, failed
  
  xpReward: integer("xp_reward").default(1000),
  coinReward: integer("coin_reward").default(100),
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  teamIdx: index("team_goals_team_idx").on(table.teamId),
  statusIdx: index("team_goals_status_idx").on(table.status),
}));

// Team Chat Messages
export const teamChatMessages = pgTable("team_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  message: text("message").notNull(),
  messageType: varchar("message_type").default("text"), // text, achievement, system
  isEdited: boolean("is_edited").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
}, (table) => ({
  teamTimeIdx: index("team_chat_team_time_idx").on(table.teamId, table.createdAt),
  userIdx: index("team_chat_user_idx").on(table.userId),
}));

// Team Invites
export const teamInvites = pgTable("team_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  invitedById: varchar("invited_by_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  invitedUserId: varchar("invited_user_id").references(() => users.id, { onDelete: 'cascade' }),
  inviteCode: varchar("invite_code").unique(), // For sharing via link
  inviteEmail: varchar("invite_email"), // For email invites
  
  status: varchar("status").default("pending"), // pending, accepted, declined, expired
  referralXpReward: integer("referral_xp_reward").default(100),
  
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
}, (table) => ({
  teamIdx: index("team_invites_team_idx").on(table.teamId),
  inviteCodeIdx: index("team_invites_code_idx").on(table.inviteCode),
  invitedUserIdx: index("team_invites_invited_user_idx").on(table.invitedUserId),
}));

// Challenges & Competitions
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").references(() => users.id, { onDelete: 'cascade' }),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: 'cascade' }), // For team challenges
  
  // Challenge Details
  title: varchar("title").notNull(),
  description: text("description"),
  bannerImageUrl: text("banner_image_url"),
  
  // Challenge Type & Scope
  challengeType: varchar("challenge_type").notNull(), // xp_race, task_count, streak_battle, goal_completion
  visibility: varchar("visibility").default("public"), // public, private, friends_only, team_only
  
  // Competition Rules
  targetMetric: varchar("target_metric").notNull(), // most_xp, tasks_completed, longest_streak
  targetValue: integer("target_value"), // Optional target to reach
  maxParticipants: integer("max_participants"),
  minLevel: integer("min_level"), // Minimum level to participate
  
  // Timeline
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  registrationDeadline: timestamp("registration_deadline"),
  
  // Rewards
  prizePool: json("prize_pool").$type<{
    coins?: number;
    xp?: number;
    badges?: string[];
    premiumDays?: number;
    customRewards?: { name: string; description: string }[];
  }>(),
  
  // Prize Distribution
  prizeDistribution: json("prize_distribution").$type<{
    first: number; // percentage
    second?: number;
    third?: number;
    participation?: number;
  }>(),
  
  status: varchar("status").default("upcoming"), // upcoming, active, completed, cancelled
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  creatorIdx: index("challenges_creator_idx").on(table.creatorId),
  statusIdx: index("challenges_status_idx").on(table.status),
  visibilityIdx: index("challenges_visibility_idx").on(table.visibility),
  dateIdx: index("challenges_date_idx").on(table.startDate, table.endDate),
}));

// Challenge Participants
export const challengeParticipants = pgTable("challenge_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: 'cascade' }),
  
  // Progress Tracking
  currentScore: integer("current_score").default(0),
  currentRank: integer("current_rank"),
  previousRank: integer("previous_rank"),
  bestScore: integer("best_score").default(0),
  
  // Status
  status: varchar("status").default("active"), // active, completed, disqualified
  
  joinedAt: timestamp("joined_at").defaultNow(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
}, (table) => ({
  uniqueParticipant: unique().on(table.challengeId, table.userId, table.teamId),
  challengeIdx: index("challenge_participants_challenge_idx").on(table.challengeId),
  userIdx: index("challenge_participants_user_idx").on(table.userId),
  teamIdx: index("challenge_participants_team_idx").on(table.teamId),
  rankIdx: index("challenge_participants_rank_idx").on(table.challengeId, table.currentRank),
}));

// Challenge Winners
export const challengeWinners = pgTable("challenge_winners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: 'cascade' }).notNull(),
  participantId: varchar("participant_id").references(() => challengeParticipants.id, { onDelete: 'cascade' }).notNull(),
  
  placement: integer("placement").notNull(), // 1, 2, 3, etc.
  finalScore: integer("final_score").notNull(),
  
  // Rewards Given
  xpAwarded: integer("xp_awarded").default(0),
  coinsAwarded: integer("coins_awarded").default(0),
  badgesAwarded: json("badges_awarded").$type<string[]>(),
  otherRewards: json("other_rewards").$type<{ name: string; value: any }[]>(),
  
  awardedAt: timestamp("awarded_at").defaultNow(),
}, (table) => ({
  challengePlacementIdx: unique().on(table.challengeId, table.placement),
  challengeIdx: index("challenge_winners_challenge_idx").on(table.challengeId),
}));

// Mentorship System
export const mentorships = pgTable("mentorships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorId: varchar("mentor_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  menteeId: varchar("mentee_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Matching Details
  goalCategory: varchar("goal_category"), // What area the mentorship focuses on
  matchingScore: decimal("matching_score"), // How well matched (0-100)
  
  // Status
  status: varchar("status").default("active"), // pending, active, completed, cancelled
  
  // Mentorship Progress
  sessionsCompleted: integer("sessions_completed").default(0),
  menteeProgress: decimal("mentee_progress").default("0"), // 0-100
  
  // Mentor Rewards
  xpEarnedByMentor: integer("xp_earned_by_mentor").default(0),
  coinsEarnedByMentor: integer("coins_earned_by_mentor").default(0),
  
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  uniqueMentorship: unique().on(table.mentorId, table.menteeId),
  mentorIdx: index("mentorships_mentor_idx").on(table.mentorId),
  menteeIdx: index("mentorships_mentee_idx").on(table.menteeId),
  statusIdx: index("mentorships_status_idx").on(table.status),
}));

// Mentorship Reviews
export const mentorshipReviews = pgTable("mentorship_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorshipId: varchar("mentorship_id").references(() => mentorships.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // The mentee
  
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  
  // Detailed Ratings
  knowledgeRating: integer("knowledge_rating"), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  supportivenessRating: integer("supportiveness_rating"), // 1-5
  
  isFeatured: boolean("is_featured").default(false), // Featured on mentor profile
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  mentorshipIdx: unique().on(table.mentorshipId), // One review per mentorship
  reviewerIdx: index("mentorship_reviews_reviewer_idx").on(table.reviewerId),
}));

// Social Feed Posts
export const socialFeedPosts = pgTable("social_feed_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Post Type & Content
  postType: varchar("post_type").notNull(), // achievement, goal_complete, milestone, streak, challenge_win, level_up
  content: text("content"), // Optional text content
  
  // Related Entities
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  achievementId: varchar("achievement_id").references(() => achievements.id),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: 'cascade' }),
  
  // Metadata
  metadata: json("metadata").$type<{
    level?: number;
    xpGained?: number;
    streakDays?: number;
    placement?: number;
    customData?: any;
  }>(),
  
  // Engagement Metrics
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  
  // Visibility
  visibility: varchar("visibility").default("friends"), // public, friends, private
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("social_feed_posts_user_idx").on(table.userId),
  createdAtIdx: index("social_feed_posts_created_idx").on(table.createdAt),
  typeIdx: index("social_feed_posts_type_idx").on(table.postType),
}));

// Social Feed Comments
export const socialFeedComments = pgTable("social_feed_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => socialFeedPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  comment: text("comment").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
}, (table) => ({
  postIdx: index("social_feed_comments_post_idx").on(table.postId),
  userIdx: index("social_feed_comments_user_idx").on(table.userId),
}));

// Social Feed Likes
export const socialFeedLikes = pgTable("social_feed_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => socialFeedPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueLike: unique().on(table.postId, table.userId),
  postIdx: index("social_feed_likes_post_idx").on(table.postId),
  userIdx: index("social_feed_likes_user_idx").on(table.userId),
}));

// Direct Messages
export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdx: index("direct_messages_conversation_idx").on(table.senderId, table.receiverId),
  receiverIdx: index("direct_messages_receiver_idx").on(table.receiverId, table.isRead),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Notification Details
  type: varchar("type").notNull(), // task_reminder, goal_checkin, achievement, friend_request, team_invite, challenge_update, streak_warning, mentor_insight, level_up, new_message, daily_digest, weekly_report
  title: varchar("title").notNull(),
  message: text("message"),
  
  // Priority & Category
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  category: varchar("category").notNull(), // social, achievements, reminders, system, engagement
  
  // Related Entities
  relatedUserId: varchar("related_user_id").references(() => users.id, { onDelete: 'cascade' }),
  relatedTeamId: varchar("related_team_id").references(() => teams.id, { onDelete: 'cascade' }),
  relatedChallengeId: varchar("related_challenge_id").references(() => challenges.id, { onDelete: 'cascade' }),
  relatedPostId: varchar("related_post_id").references(() => socialFeedPosts.id, { onDelete: 'cascade' }),
  relatedGoalId: varchar("related_goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  relatedTaskId: varchar("related_task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Action URL
  actionUrl: varchar("action_url"), // Where to navigate when clicked
  
  // Status
  isRead: boolean("is_read").default(false),
  isArchived: boolean("is_archived").default(false),
  isEmail: boolean("is_email").default(false), // Was this also sent as email
  isPush: boolean("is_push").default(false), // Was this sent as push notification
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for"), // When to send the notification
  sentAt: timestamp("sent_at"), // When actually sent
  
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => ({
  userUnreadIdx: index("notifications_user_unread_idx").on(table.userId, table.isRead),
  createdAtIdx: index("notifications_created_idx").on(table.createdAt),
  categoryIdx: index("notifications_category_idx").on(table.category),
  scheduledIdx: index("notifications_scheduled_idx").on(table.scheduledFor),
}));

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Channel Preferences (global toggles)
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  pushEnabled: boolean("push_enabled").default(false),
  
  // Notification Type Settings (JSON for flexibility)
  typeSettings: json("type_settings").$type<{
    task_reminder: { inApp: boolean; email: boolean; push: boolean; };
    goal_checkin: { inApp: boolean; email: boolean; push: boolean; };
    achievement: { inApp: boolean; email: boolean; push: boolean; };
    friend_request: { inApp: boolean; email: boolean; push: boolean; };
    team_invite: { inApp: boolean; email: boolean; push: boolean; };
    challenge_update: { inApp: boolean; email: boolean; push: boolean; };
    streak_warning: { inApp: boolean; email: boolean; push: boolean; };
    mentor_insight: { inApp: boolean; email: boolean; push: boolean; };
    level_up: { inApp: boolean; email: boolean; push: boolean; };
    new_message: { inApp: boolean; email: boolean; push: boolean; };
    daily_digest: { inApp: boolean; email: boolean; push: boolean; };
    weekly_report: { inApp: boolean; email: boolean; push: boolean; };
  }>().default({
    task_reminder: { inApp: true, email: true, push: false },
    goal_checkin: { inApp: true, email: false, push: false },
    achievement: { inApp: true, email: true, push: true },
    friend_request: { inApp: true, email: true, push: false },
    team_invite: { inApp: true, email: true, push: false },
    challenge_update: { inApp: true, email: false, push: false },
    streak_warning: { inApp: true, email: true, push: true },
    mentor_insight: { inApp: true, email: false, push: false },
    level_up: { inApp: true, email: false, push: true },
    new_message: { inApp: true, email: false, push: true },
    daily_digest: { inApp: false, email: true, push: false },
    weekly_report: { inApp: false, email: true, push: false },
  }),
  
  // Email Frequency Settings  
  emailFrequency: varchar("email_frequency").default("realtime"), // realtime, daily, weekly
  emailDigestTime: varchar("email_digest_time").default("09:00"), // HH:MM format
  
  // Quiet Hours (Do Not Disturb)
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start").default("22:00"), // HH:MM format
  quietHoursEnd: varchar("quiet_hours_end").default("08:00"), // HH:MM format
  
  // Batching Settings
  batchingEnabled: boolean("batching_enabled").default(true),
  batchingInterval: integer("batching_interval").default(15), // minutes
  
  // Smart Settings
  smartTimingEnabled: boolean("smart_timing_enabled").default(true), // AI-optimized send times
  priorityOnly: boolean("priority_only").default(false), // Only high/urgent notifications
  
  // Push Notification Settings
  pushSubscription: json("push_subscription").$type<{
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>(),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("notification_preferences_user_idx").on(table.userId),
}));

// Friends/Social Connections (Enhanced)
export const friendConnections = pgTable("friend_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  friendId: varchar("friend_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  status: varchar("status").default("pending"), // pending, accepted, blocked
  
  // Friend Interaction Metrics
  sharedChallenges: integer("shared_challenges").default(0),
  mutualSupport: integer("mutual_support").default(0), // Likes/comments exchanged
  
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => ({
  userFriendIdx: unique("user_friend_unique").on(table.userId, table.friendId),
  userIdIdx: index("friend_connections_user_id_idx").on(table.userId),
  friendIdIdx: index("friend_connections_friend_id_idx").on(table.friendId),
  statusIdx: index("friend_connections_status_idx").on(table.status),
}));

// Daily Login Rewards
export const dailyLoginRewards = pgTable("daily_login_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayNumber: integer("day_number").notNull().unique(), // 1-7 for weekly cycle
  xpReward: integer("xp_reward").notNull(),
  coinReward: integer("coin_reward").notNull(),
  bonusType: varchar("bonus_type"), // multiplier, extra_spin, achievement_boost
  bonusValue: integer("bonus_value"),
});

// User Login Streaks
export const userLoginStreaks = pgTable("user_login_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastLoginDate: timestamp("last_login_date"),
  totalLogins: integer("total_logins").default(0),
  currentCycleDay: integer("current_cycle_day").default(1), // 1-7 for reward cycle
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_login_streaks_user_id_idx").on(table.userId),
}));

// Spin Wheel Rewards
export const spinWheelRewards = pgTable("spin_wheel_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rewardType: varchar("reward_type").notNull(), // xp, coins, multiplier, achievement_progress
  rewardValue: integer("reward_value").notNull(),
  probability: decimal("probability").notNull(), // 0-1 probability weight
  rarity: varchar("rarity").default("common"),
  displayName: varchar("display_name").notNull(),
  iconName: varchar("icon_name"),
});

// User Spin History
export const userSpinHistory = pgTable("user_spin_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rewardId: varchar("reward_id").references(() => spinWheelRewards.id),
  spunAt: timestamp("spun_at").defaultNow(),
  freeSpins: integer("free_spins").default(0), // Remaining free spins
  lastFreeSpinDate: timestamp("last_free_spin_date"),
}, (table) => ({
  userIdIdx: index("user_spin_history_user_id_idx").on(table.userId),
  spunAtIdx: index("user_spin_history_spun_at_idx").on(table.spunAt),
}));

// Seasonal Events
export const seasonalEvents = pgTable("seasonal_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  themeColors: json("theme_colors").$type<{primary: string, secondary: string}>(),
  specialRewards: json("special_rewards").$type<{type: string, value: number}[]>(),
  active: boolean("active").default(false),
});

// ===== REVENUE MODEL SYSTEM =====

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Plan Information
  name: varchar("name").notNull().unique(), // free, pro, team, enterprise
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  
  // Pricing
  monthlyPrice: decimal("monthly_price").notNull(), // in dollars
  yearlyPrice: decimal("yearly_price"), // discounted yearly price
  stripePriceIdMonthly: varchar("stripe_price_id_monthly"),
  stripePriceIdYearly: varchar("stripe_price_id_yearly"),
  
  // Features & Limits
  maxGoals: integer("max_goals").notNull(), // -1 for unlimited
  maxTasksPerGoal: integer("max_tasks_per_goal").notNull(), // -1 for unlimited
  aiCoachingLevel: varchar("ai_coaching_level").notNull(), // basic, advanced, premium
  analyticsLevel: varchar("analytics_level").notNull(), // limited, full, advanced
  supportLevel: varchar("support_level").notNull(), // community, standard, priority, dedicated
  
  // Feature Flags
  features: json("features").$type<{
    advancedAI: boolean;
    teamCollaboration: boolean;
    customThemes: boolean;
    exportData: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    priorityProcessing: boolean;
    unlimitedStorage: boolean;
  }>().notNull(),
  
  // Metadata
  orderIndex: integer("order_index").default(0), // for display ordering
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("subscription_plans_name_idx").on(table.name),
  activeIdx: index("subscription_plans_active_idx").on(table.isActive),
}));

// User Subscriptions History
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id).notNull(),
  
  // Stripe Data (deprecated, keeping for migration)
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripePaymentMethodId: varchar("stripe_payment_method_id"),
  
  // PayGate.to Data
  paygateTransactionId: varchar("paygate_transaction_id").unique(),
  paygateIpnToken: varchar("paygate_ipn_token"),
  
  // Apple IAP Data
  appleTransactionId: varchar("apple_transaction_id"),
  appleOriginalTransactionId: varchar("apple_original_transaction_id").unique(),
  appleProductId: varchar("apple_product_id"),
  
  // Subscription Status
  status: varchar("status").notNull(), // active, cancelled, past_due, trialing, expired
  billingCycle: varchar("billing_cycle").notNull(), // monthly, yearly
  
  // Dates
  startedAt: timestamp("started_at").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  endedAt: timestamp("ended_at"),
  
  // Trial Information
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_subscriptions_user_idx").on(table.userId),
  stripeSubIdx: index("user_subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
  statusIdx: index("user_subscriptions_status_idx").on(table.status),
}));

// Payment Transactions
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Transaction Type
  type: varchar("type").notNull(), // subscription, one_time, coins
  description: text("description").notNull(),
  
  // Amount
  amount: decimal("amount").notNull(), // in dollars
  currency: varchar("currency").default("usd"),
  
  // Stripe Data (deprecated, keeping for migration)
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(),
  stripeChargeId: varchar("stripe_charge_id"),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  paymentMethod: varchar("payment_method"), // card, bank, etc
  
  // PayGate.to Data
  paygateTransactionId: varchar("paygate_transaction_id").unique(),
  paygateIpnToken: varchar("paygate_ipn_token"),
  paygateUsdcReceived: varchar("paygate_usdc_received"), // Amount received in USDC
  
  // Apple IAP Data
  appleTransactionId: varchar("apple_transaction_id").unique(),
  appleOriginalTransactionId: varchar("apple_original_transaction_id"),
  
  // Provider
  provider: varchar("provider"), // stripe, apple, paygate, paddle
  
  // Status
  status: varchar("status").notNull(), // pending, processing, succeeded, failed, refunded
  failureReason: text("failure_reason"),
  
  // References
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id),
  purchaseId: varchar("purchase_id"), // for one-time purchases
  
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
}, (table) => ({
  userIdx: index("payment_transactions_user_idx").on(table.userId),
  stripePaymentIdx: index("payment_transactions_stripe_payment_idx").on(table.stripePaymentIntentId),
  statusIdx: index("payment_transactions_status_idx").on(table.status),
  createdIdx: index("payment_transactions_created_idx").on(table.createdAt),
}));

// Coin Packages
export const coinPackages = pgTable("coin_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: varchar("name").notNull(),
  description: text("description"),
  coinAmount: integer("coin_amount").notNull(),
  price: decimal("price").notNull(), // in dollars
  bonusCoins: integer("bonus_coins").default(0), // extra coins for larger packages
  
  stripePriceId: varchar("stripe_price_id"),
  
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activeIdx: index("coin_packages_active_idx").on(table.isActive),
}));

// Coin Transactions
export const coinTransactions = pgTable("coin_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Transaction Info
  type: varchar("type").notNull(), // purchase, spend, earn, refund, adjustment
  amount: integer("amount").notNull(), // positive for credit, negative for debit
  balance: integer("balance").notNull(), // balance after transaction
  
  // Source/Reason
  source: varchar("source").notNull(), // purchase, daily_login, goal_complete, streak_bonus, etc
  sourceId: varchar("source_id"), // reference to purchase, goal, etc
  description: text("description").notNull(),
  
  // Payment Reference (for purchases)
  paymentTransactionId: varchar("payment_transaction_id").references(() => paymentTransactions.id),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("coin_transactions_user_idx").on(table.userId),
  typeIdx: index("coin_transactions_type_idx").on(table.type),
  createdIdx: index("coin_transactions_created_idx").on(table.createdAt),
}));

// One-Time Purchase Items
export const purchaseItems = pgTable("purchase_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Item Information
  type: varchar("type").notNull(), // template, power_up, theme, coaching_session
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Pricing
  price: decimal("price").notNull(), // in dollars
  coinPrice: integer("coin_price"), // alternative coin price
  stripePriceId: varchar("stripe_price_id"),
  
  // Item Data
  data: json("data").$type<any>(), // template content, theme config, etc
  
  // Availability
  isActive: boolean("is_active").default(true),
  availableFrom: timestamp("available_from"),
  availableUntil: timestamp("available_until"),
  maxPurchases: integer("max_purchases"), // limit per user, null for unlimited
  
  // Metadata
  category: varchar("category"),
  tags: json("tags").$type<string[]>().default([]),
  previewImageUrl: varchar("preview_image_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("purchase_items_type_idx").on(table.type),
  activeIdx: index("purchase_items_active_idx").on(table.isActive),
  categoryIdx: index("purchase_items_category_idx").on(table.category),
}));

// User Purchases
export const userPurchases = pgTable("user_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemId: varchar("item_id").references(() => purchaseItems.id).notNull(),
  
  // Purchase Details
  purchaseType: varchar("purchase_type").notNull(), // money, coins
  amount: decimal("amount"), // money amount
  coinAmount: integer("coin_amount"), // coin amount
  
  // Payment Reference
  paymentTransactionId: varchar("payment_transaction_id").references(() => paymentTransactions.id),
  coinTransactionId: varchar("coin_transaction_id").references(() => coinTransactions.id),
  
  // Usage
  expiresAt: timestamp("expires_at"), // for time-limited items like power-ups
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  
  purchasedAt: timestamp("purchased_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_purchases_user_idx").on(table.userId),
  itemIdx: index("user_purchases_item_idx").on(table.itemId),
  activeIdx: index("user_purchases_active_idx").on(table.isActive),
}));

// Feature Gates
export const featureGates = pgTable("feature_gates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Feature Information
  featureKey: varchar("feature_key").notNull().unique(), // unique identifier for the feature
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Access Rules
  requiredTier: varchar("required_tier"), // minimum subscription tier
  requiredPurchase: varchar("required_purchase"), // specific purchase item needed
  requiredCoins: integer("required_coins"), // coin cost to access
  
  // Limits
  usageLimit: json("usage_limit").$type<{
    free: number;
    pro: number;
    team: number;
    enterprise: number;
  }>(), // usage limits per tier
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  keyIdx: index("feature_gates_key_idx").on(table.featureKey),
  activeIdx: index("feature_gates_active_idx").on(table.isActive),
}));

// ===== AVATAR & QUEST SYSTEM (HABITICA-STYLE RPG) =====

// Avatars - User's RPG character
export const avatars = pgTable("avatars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Avatar customization
  skinTone: varchar("skin_tone").default("light"),
  hairStyle: varchar("hair_style").default("short"),
  hairColor: varchar("hair_color").default("brown"),
  faceType: varchar("face_type").default("happy"),
  outfit: varchar("outfit").default("casual"),
  accessory: varchar("accessory"),
  
  // RPG stats
  health: integer("health").default(100),
  maxHealth: integer("max_health").default(100),
  mana: integer("mana").default(50),
  maxMana: integer("max_mana").default(50),
  
  // Equipment
  weapon: varchar("weapon"),
  armor: varchar("armor"),
  helmet: varchar("helmet"),
  shield: varchar("shield"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("avatars_user_id_idx").on(table.userId),
}));

// Quests - RPG quests for users to complete
export const quests = pgTable("quests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Quest details
  title: text("title").notNull(),
  description: text("description").notNull(),
  story: text("story"),
  
  // Difficulty and requirements
  difficulty: varchar("difficulty").notNull(), // easy, medium, hard, epic, legendary
  minLevel: integer("min_level").default(1),
  requiredQuests: json("required_quests").$type<string[]>().default([]),
  
  // Objectives
  objectives: json("objectives").$type<{
    id: string;
    type: 'complete_tasks' | 'earn_xp' | 'complete_habits' | 'defeat_boss';
    target: number;
    description: string;
  }[]>().notNull(),
  
  // Boss (optional)
  bossName: varchar("boss_name"),
  bossHealth: integer("boss_health"),
  bossImage: varchar("boss_image"),
  
  // Rewards
  xpReward: integer("xp_reward").default(100),
  coinReward: integer("coin_reward").default(50),
  itemRewards: json("item_rewards").$type<string[]>().default([]),
  
  // Availability
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  difficultyIdx: index("quests_difficulty_idx").on(table.difficulty),
  activeIdx: index("quests_is_active_idx").on(table.isActive),
}));

// User Quests - Tracking user progress on quests
export const userQuests = pgTable("user_quests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  questId: varchar("quest_id").references(() => quests.id, { onDelete: 'cascade' }).notNull(),
  
  // Progress
  status: varchar("status").default("active"), // active, completed, failed, abandoned
  progress: json("progress").$type<Record<string, number>>().default({}),
  bossHealthRemaining: integer("boss_health_remaining"),
  
  // Timestamps
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_quests_user_id_idx").on(table.userId),
  questIdx: index("user_quests_quest_idx").on(table.questId),
  statusIdx: index("user_quests_status_idx").on(table.status),
  uniqueUserQuest: unique().on(table.userId, table.questId),
}));

// Avatar Items - Shop items for avatar customization and equipment
export const avatarItems = pgTable("avatar_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Item details
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // hair, outfit, weapon, armor, accessory, helmet, shield
  rarity: varchar("rarity").default("common"), // common, rare, epic, legendary
  
  // Visual
  imageUrl: varchar("image_url"),
  previewUrl: varchar("preview_url"),
  
  // Requirements
  minLevel: integer("min_level").default(1),
  coinCost: integer("coin_cost").default(0),
  
  // Stats (for equipment)
  statBonus: json("stat_bonus").$type<{
    health?: number;
    mana?: number;
    attack?: number;
    defense?: number;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("avatar_items_category_idx").on(table.category),
  rarityIdx: index("avatar_items_rarity_idx").on(table.rarity),
}));

// User Avatar Items - User's owned avatar items
export const userAvatarItems = pgTable("user_avatar_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemId: varchar("item_id").references(() => avatarItems.id, { onDelete: 'cascade' }).notNull(),
  
  // Ownership
  purchasedAt: timestamp("purchased_at").defaultNow(),
  isEquipped: boolean("is_equipped").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_avatar_items_user_id_idx").on(table.userId),
  itemIdx: index("user_avatar_items_item_idx").on(table.itemId),
  equippedIdx: index("user_avatar_items_equipped_idx").on(table.isEquipped),
  uniqueUserItem: unique().on(table.userId, table.itemId),
}));

// ===== ZOD SCHEMAS =====

// Types for Replit Auth
export type UpsertUser = typeof users.$inferInsert;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true,
});

export const insertSkillCategorySchema = createInsertSchema(skillCategories).omit({
  id: true,
  createdAt: true,
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  updatedAt: true,
});

export const insertGoalSkillSchema = createInsertSchema(goalSkills).omit({
  id: true,
});

export const insertTaskPlanSchema = createInsertSchema(taskPlans).omit({
  id: true,
  createdAt: true,
  lastAdaptedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertTaskSkillSchema = createInsertSchema(taskSkills).omit({
  id: true,
});

export const insertPerformanceEventSchema = createInsertSchema(performanceEvents).omit({
  id: true,
  timestamp: true,
});

export const insertAdaptationLogSchema = createInsertSchema(adaptationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPredictionSnapshotSchema = createInsertSchema(predictionSnapshots).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertKnowledgeDomainSchema = createInsertSchema(knowledgeDomains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpertKnowledgeSchema = createInsertSchema(expertKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskKnowledgeLinkSchema = createInsertSchema(taskKnowledgeLinks).omit({
  id: true,
});

export const insertKnowledgeUsageLogSchema = createInsertSchema(knowledgeUsageLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMentorConversationSchema = createInsertSchema(mentorConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
});

export const insertMentorSessionSchema = createInsertSchema(mentorSessions).omit({
  id: true,
  timestamp: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertXpTransactionSchema = createInsertSchema(xpTransactions).omit({
  id: true,
  createdAt: true,
});

// ===== SOCIAL FEATURE SCHEMAS =====

// Teams Schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalXp: true,
  teamLevel: true,
  winStreak: true,
  challengesWon: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
  contributionXp: true,
});

export const insertTeamGoalSchema = createInsertSchema(teamGoals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  currentValue: true,
});

export const insertTeamChatMessageSchema = createInsertSchema(teamChatMessages).omit({
  id: true,
  createdAt: true,
  editedAt: true,
});

export const insertTeamInviteSchema = createInsertSchema(teamInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

// Challenges Schemas
export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertChallengeParticipantSchema = createInsertSchema(challengeParticipants).omit({
  id: true,
  joinedAt: true,
  lastUpdatedAt: true,
  currentRank: true,
  previousRank: true,
});

export const insertChallengeWinnerSchema = createInsertSchema(challengeWinners).omit({
  id: true,
  awardedAt: true,
});

// Mentorship Schemas
export const insertMentorshipSchema = createInsertSchema(mentorships).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  xpEarnedByMentor: true,
  coinsEarnedByMentor: true,
});

export const insertMentorshipReviewSchema = createInsertSchema(mentorshipReviews).omit({
  id: true,
  createdAt: true,
});

// Social Feed Schemas
export const insertSocialFeedPostSchema = createInsertSchema(socialFeedPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
});

export const insertSocialFeedCommentSchema = createInsertSchema(socialFeedComments).omit({
  id: true,
  createdAt: true,
  editedAt: true,
});

export const insertSocialFeedLikeSchema = createInsertSchema(socialFeedLikes).omit({
  id: true,
  createdAt: true,
});

// Direct Messages Schema
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
});

// Notifications Schema
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
  sentAt: true,
});

// Notification Preferences Schema
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  updatedAt: true,
});

// Friends Schema
export const insertFriendConnectionSchema = createInsertSchema(friendConnections).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  sharedChallenges: true,
  mutualSupport: true,
});

// Revenue Model Schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertCoinPackageSchema = createInsertSchema(coinPackages).omit({
  id: true,
  createdAt: true,
});

export const insertCoinTransactionSchema = createInsertSchema(coinTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPurchaseSchema = createInsertSchema(userPurchases).omit({
  id: true,
  purchasedAt: true,
});

export const insertFeatureGateSchema = createInsertSchema(featureGates).omit({
  id: true,
  createdAt: true,
});

// Habit Schemas
export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentStreak: true,
  longestStreak: true,
  totalCompletions: true,
  rhythmScore: true,
});

export const insertHabitCompletionSchema = createInsertSchema(habitCompletions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// ===== TYPES =====

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type SkillCategory = typeof skillCategories.$inferSelect;
export type InsertSkillCategory = z.infer<typeof insertSkillCategorySchema>;

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type GoalSkill = typeof goalSkills.$inferSelect;
export type InsertGoalSkill = z.infer<typeof insertGoalSkillSchema>;

export type TaskPlan = typeof taskPlans.$inferSelect;
export type InsertTaskPlan = z.infer<typeof insertTaskPlanSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskSkill = typeof taskSkills.$inferSelect;
export type InsertTaskSkill = z.infer<typeof insertTaskSkillSchema>;

export type PerformanceEvent = typeof performanceEvents.$inferSelect;
export type InsertPerformanceEvent = z.infer<typeof insertPerformanceEventSchema>;

export type AdaptationLog = typeof adaptationLogs.$inferSelect;
export type InsertAdaptationLog = z.infer<typeof insertAdaptationLogSchema>;

export type PredictionSnapshot = typeof predictionSnapshots.$inferSelect;
export type InsertPredictionSnapshot = z.infer<typeof insertPredictionSnapshotSchema>;

export type KnowledgeDomain = typeof knowledgeDomains.$inferSelect;
export type InsertKnowledgeDomain = z.infer<typeof insertKnowledgeDomainSchema>;

export type ExpertKnowledge = typeof expertKnowledge.$inferSelect;
export type InsertExpertKnowledge = z.infer<typeof insertExpertKnowledgeSchema>;

export type TaskKnowledgeLink = typeof taskKnowledgeLinks.$inferSelect;
export type InsertTaskKnowledgeLink = z.infer<typeof insertTaskKnowledgeLinkSchema>;

export type KnowledgeUsageLog = typeof knowledgeUsageLogs.$inferSelect;
export type InsertKnowledgeUsageLog = z.infer<typeof insertKnowledgeUsageLogSchema>;

export type MentorConversation = typeof mentorConversations.$inferSelect;
export type InsertMentorConversation = z.infer<typeof insertMentorConversationSchema>;

export type MentorSession = typeof mentorSessions.$inferSelect;
export type InsertMentorSession = z.infer<typeof insertMentorSessionSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type XpTransaction = typeof xpTransactions.$inferSelect;
export type InsertXpTransaction = z.infer<typeof insertXpTransactionSchema>;

// Revenue Model Types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export type CoinPackage = typeof coinPackages.$inferSelect;
export type InsertCoinPackage = z.infer<typeof insertCoinPackageSchema>;

export type CoinTransaction = typeof coinTransactions.$inferSelect;
export type InsertCoinTransaction = z.infer<typeof insertCoinTransactionSchema>;

export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;

export type UserPurchase = typeof userPurchases.$inferSelect;
export type InsertUserPurchase = z.infer<typeof insertUserPurchaseSchema>;

export type FeatureGate = typeof featureGates.$inferSelect;
export type InsertFeatureGate = z.infer<typeof insertFeatureGateSchema>;

// Habit Types
export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = z.infer<typeof insertHabitCompletionSchema>;

// ===== SOCIAL FEATURE TYPES =====

// Teams Types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type TeamGoal = typeof teamGoals.$inferSelect;
export type InsertTeamGoal = z.infer<typeof insertTeamGoalSchema>;

export type TeamChatMessage = typeof teamChatMessages.$inferSelect;
export type InsertTeamChatMessage = z.infer<typeof insertTeamChatMessageSchema>;

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = z.infer<typeof insertTeamInviteSchema>;

// Challenges Types
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type InsertChallengeParticipant = z.infer<typeof insertChallengeParticipantSchema>;

export type ChallengeWinner = typeof challengeWinners.$inferSelect;
export type InsertChallengeWinner = z.infer<typeof insertChallengeWinnerSchema>;

// Mentorship Types
export type Mentorship = typeof mentorships.$inferSelect;
export type InsertMentorship = z.infer<typeof insertMentorshipSchema>;

export type MentorshipReview = typeof mentorshipReviews.$inferSelect;
export type InsertMentorshipReview = z.infer<typeof insertMentorshipReviewSchema>;

// Social Feed Types
export type SocialFeedPost = typeof socialFeedPosts.$inferSelect;
export type InsertSocialFeedPost = z.infer<typeof insertSocialFeedPostSchema>;

export type SocialFeedComment = typeof socialFeedComments.$inferSelect;
export type InsertSocialFeedComment = z.infer<typeof insertSocialFeedCommentSchema>;

export type SocialFeedLike = typeof socialFeedLikes.$inferSelect;
export type InsertSocialFeedLike = z.infer<typeof insertSocialFeedLikeSchema>;

// Direct Messages Type
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;

// Notifications Type
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Notification Preferences Type  
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

// Friend Connection Type
export type FriendConnection = typeof friendConnections.$inferSelect;
export type InsertFriendConnection = z.infer<typeof insertFriendConnectionSchema>;

// ===== ADVANCED PROFILE & SETTINGS SCHEMAS =====

// Security Logs Schema
export const insertSecurityLogSchema = createInsertSchema(securityLogs).omit({
  id: true,
  createdAt: true,
});

// Connected Accounts Schema
export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({
  id: true,
  connectedAt: true,
  lastSyncAt: true,
  updatedAt: true,
});

// Data Exports Schema
export const insertDataExportSchema = createInsertSchema(dataExports).omit({
  id: true,
  requestedAt: true,
  completedAt: true,
  lastDownloadedAt: true,
});

// Account Deletions Schema
export const insertAccountDeletionSchema = createInsertSchema(accountDeletions).omit({
  id: true,
  requestedAt: true,
  completedAt: true,
  cancelledAt: true,
});

// Two Factor Auth Schema
export const insertTwoFactorAuthSchema = createInsertSchema(twoFactorAuth).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  lastFailedAttempt: true,
});

// Profile Pictures Schema
export const insertProfilePictureSchema = createInsertSchema(profilePictures).omit({
  id: true,
  uploadedAt: true,
});

// Usage Statistics Schema
export const insertUsageStatisticsSchema = createInsertSchema(usageStatistics).omit({
  id: true,
  createdAt: true,
});

// Calendar Tokens Schema
export const insertCalendarTokenSchema = createInsertSchema(calendarTokens).omit({
  id: true,
  createdAt: true,
});

// League Schemas
export const insertLeagueSchema = createInsertSchema(leagues).omit({
  id: true,
  createdAt: true,
});

export const insertLeagueSeasonSchema = createInsertSchema(leagueSeasons).omit({
  id: true,
  createdAt: true,
});

export const insertLeagueParticipantSchema = createInsertSchema(leagueParticipants).omit({
  id: true,
  joinedAt: true,
});

// ===== ADVANCED PROFILE & SETTINGS TYPES =====

// Security Logs Types
export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;

// Connected Accounts Types
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;

// Data Exports Types
export type DataExport = typeof dataExports.$inferSelect;
export type InsertDataExport = z.infer<typeof insertDataExportSchema>;

// Account Deletions Types
export type AccountDeletion = typeof accountDeletions.$inferSelect;
export type InsertAccountDeletion = z.infer<typeof insertAccountDeletionSchema>;

// Two Factor Auth Types
export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;
export type InsertTwoFactorAuth = z.infer<typeof insertTwoFactorAuthSchema>;

// Profile Pictures Types
export type ProfilePicture = typeof profilePictures.$inferSelect;
export type InsertProfilePicture = z.infer<typeof insertProfilePictureSchema>;

// Usage Statistics Types
export type UsageStatistics = typeof usageStatistics.$inferSelect;
export type InsertUsageStatistics = z.infer<typeof insertUsageStatisticsSchema>;

// Calendar Tokens Types
export type CalendarToken = typeof calendarTokens.$inferSelect;
export type InsertCalendarToken = z.infer<typeof insertCalendarTokenSchema>;

// League Types
export type League = typeof leagues.$inferSelect;
export type InsertLeague = z.infer<typeof insertLeagueSchema>;

export type LeagueSeason = typeof leagueSeasons.$inferSelect;
export type InsertLeagueSeason = z.infer<typeof insertLeagueSeasonSchema>;

export type LeagueParticipant = typeof leagueParticipants.$inferSelect;
export type InsertLeagueParticipant = z.infer<typeof insertLeagueParticipantSchema>;

// ===== iOS IN-APP PURCHASE SYSTEM =====

export const iapReceipts = pgTable("iap_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Receipt Information
  productId: varchar("product_id").notNull(), // org.lilove.sub.monthly, org.lilove.coins.100, etc.
  transactionId: varchar("transaction_id").notNull().unique(),
  originalTransactionId: varchar("original_transaction_id"), // For subscription renewals
  
  // Purchase Details
  productType: varchar("product_type").notNull(), // subscription, consumable
  receiptData: text("receipt_data").notNull(), // Base64 encoded receipt
  environment: varchar("environment").default("sandbox"), // sandbox or production
  
  // Subscription-specific fields
  expiresDate: timestamp("expires_date"), // For auto-renewable subscriptions
  isTrialPeriod: boolean("is_trial_period").default(false),
  cancellationDate: timestamp("cancellation_date"), // If subscription was cancelled
  
  // Consumable-specific fields
  quantity: integer("quantity").default(1),
  coinsAwarded: integer("coins_awarded").default(0),
  
  // Verification Status
  verified: boolean("verified").default(false),
  verifiedAt: timestamp("verified_at"),
  validationResponse: json("validation_response").$type<any>(),
  
  // Metadata
  purchaseDate: timestamp("purchase_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("iap_receipts_user_idx").on(table.userId),
  productIdx: index("iap_receipts_product_idx").on(table.productId),
  transactionIdx: index("iap_receipts_transaction_idx").on(table.transactionId),
  verifiedIdx: index("iap_receipts_verified_idx").on(table.verified),
}));

// IAP Schemas
export const insertIapReceiptSchema = createInsertSchema(iapReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IAP Types
export type IapReceipt = typeof iapReceipts.$inferSelect;
export type InsertIapReceipt = z.infer<typeof insertIapReceiptSchema>;

// ===== AI SYSTEM TYPES =====

export interface GoalAnalysis {
  complexity: number; // 1-10
  estimatedDuration: number; // days
  skillGaps: string[];
  prerequisites: string[];
  milestones: string[];
  riskFactors: string[];
  confidenceScore: number; // 0-100%
}

export interface TaskGenerationContext {
  goal: Goal;
  userProfile: UserProfile;
  knowledgeDomain: string;
  currentSkills: Skill[];
  preferredLearningStyle: string;
  performanceHistory: PerformanceEvent[];
}

export interface PerformanceInsights {
  currentTrend: 'improving' | 'stable' | 'declining';
  strongAreas: string[];
  improvementAreas: string[];
  recommendedActions: string[];
  predictedSuccess: number; // 0-100%
  riskLevel: 'low' | 'medium' | 'high';
  motivationLevel: number; // 1-10
}

export interface AdaptationTrigger {
  type: 'performance' | 'time' | 'difficulty' | 'motivation';
  reason: string;
  suggestedChanges: any;
  impact: 'minor' | 'moderate' | 'major';
  confidence: number; // 0-100%
}

export interface MentorContext {
  currentGoal?: Goal;
  recentTasks: Task[];
  performanceHistory: PerformanceEvent[];
  strugglingAreas: string[];
  motivationLevel: number; // 1-10
  knowledgeGaps: string[];
}

export interface PredictionModel {
  modelVersion: string;
  features: string[];
  accuracy: number; // 0-100%
  lastTrained: Date;
}

// Performance Intelligence Computed Views
export interface UserPerformanceMetrics {
  totalXP: number;
  currentLevel: number;
  goalsCompleted: number;
  averageTaskTime: number;
  successRate: number;
  consistencyScore: number;
  adaptabilityScore: number;
  knowledgeAcquisitionRate: number;
}

export interface GoalProgressAnalytics {
  currentProgress: number; // 0-100%
  tasksCompleted: number;
  totalTasks: number;
  timeSpent: number; // hours
  estimatedTimeRemaining: number; // hours
  performanceTrend: 'ahead' | 'on_track' | 'behind';
  riskFactors: string[];
  recommendedActions: string[];
}

// ===== AVATAR & QUEST SYSTEM SCHEMAS & TYPES =====

// Avatar Schemas
export const insertAvatarSchema = createInsertSchema(avatars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvatarItemSchema = createInsertSchema(avatarItems).omit({
  id: true,
  createdAt: true,
});

export const insertUserAvatarItemSchema = createInsertSchema(userAvatarItems).omit({
  id: true,
  purchasedAt: true,
  createdAt: true,
});

// Quest Schemas
export const insertQuestSchema = createInsertSchema(quests).omit({
  id: true,
  createdAt: true,
});

export const insertUserQuestSchema = createInsertSchema(userQuests).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
});

// Avatar Types
export type Avatar = typeof avatars.$inferSelect;
export type InsertAvatar = z.infer<typeof insertAvatarSchema>;

export type AvatarItem = typeof avatarItems.$inferSelect;
export type InsertAvatarItem = z.infer<typeof insertAvatarItemSchema>;

export type UserAvatarItem = typeof userAvatarItems.$inferSelect;
export type InsertUserAvatarItem = z.infer<typeof insertUserAvatarItemSchema>;

// Quest Types
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;

export type UserQuest = typeof userQuests.$inferSelect;
export type InsertUserQuest = z.infer<typeof insertUserQuestSchema>;

// ===== BEHAVIORAL SCIENCE ENGINE SCHEMA =====

// Behavioral Assessments - Store Fogg, SDT, and COM-B analysis results
export const behavioralAssessments = pgTable("behavioral_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Fogg Behavior Model (B=MAP)
  foggScore: integer("fogg_score").notNull(), // 0-100, B=MAP score
  motivationScore: integer("motivation_score").notNull(), // 0-100
  abilityScore: integer("ability_score").notNull(), // 0-100
  promptType: varchar("prompt_type").notNull(), // spark, facilitator, signal, notification
  
  // Self-Determination Theory
  sdtAutonomy: integer("sdt_autonomy").notNull(), // 0-100
  sdtCompetence: integer("sdt_competence").notNull(), // 0-100
  sdtRelatedness: integer("sdt_relatedness").notNull(), // 0-100
  sdtWellbeing: integer("sdt_wellbeing").notNull(), // 0-100, overall
  motivationType: varchar("motivation_type").notNull(), // intrinsic, extrinsic, amotivated, balanced
  
  // COM-B Model
  combCapability: json("comb_capability").$type<{
    physical: any[];
    psychological: any[];
    score: number;
  }>().notNull(),
  combOpportunity: json("comb_opportunity").$type<{
    social: any[];
    physical: any[];
    score: number;
  }>().notNull(),
  combMotivation: json("comb_motivation").$type<{
    reflective: any[];
    automatic: any[];
    score: number;
  }>().notNull(),
  combReadiness: integer("comb_readiness").notNull(), // 0-100, overall
  
  // Barriers and Interventions
  barriers: json("barriers").$type<any[]>().default([]),
  interventions: json("interventions").$type<any[]>().default([]),
  
  // Overall assessment
  overallReadiness: integer("overall_readiness").notNull(), // 0-100
  topRecommendations: json("top_recommendations").$type<string[]>().default([]),
  criticalActions: json("critical_actions").$type<string[]>().default([]),
}, (table) => ({
  userIdIdx: index("behavioral_assessments_user_id_idx").on(table.userId),
  goalIdIdx: index("behavioral_assessments_goal_id_idx").on(table.goalId),
  timestampIdx: index("behavioral_assessments_timestamp_idx").on(table.timestamp),
}));

// Micro Steps - Tiny habits generated from Fogg model
export const microSteps = pgTable("micro_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: 'cascade' }),
  assessmentId: varchar("assessment_id").references(() => behavioralAssessments.id, { onDelete: 'cascade' }),
  
  step: text("step").notNull(),
  difficulty: varchar("difficulty").notNull(), // tiny, small, medium
  estimatedTime: integer("estimated_time").notNull(), // minutes
  trigger: varchar("trigger").notNull(), // when to do it
  
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("micro_steps_user_id_idx").on(table.userId),
  goalIdIdx: index("micro_steps_goal_id_idx").on(table.goalId),
  completedIdx: index("micro_steps_completed_idx").on(table.completed),
}));

// Weekly Reports - Behavioral science insights and progress
export const weeklyReports = pgTable("weekly_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  
  // Trigger effectiveness heatmap
  triggerHeatmap: json("trigger_heatmap").$type<{
    timeOfDay: { [key: string]: number };
    dayOfWeek: { [key: string]: number };
    promptType: { [key: string]: number };
  }>().notNull(),
  
  // Barrier analysis
  barrierAnalysis: json("barrier_analysis").$type<{
    mostCommon: string[];
    resolved: string[];
    persistent: string[];
    newBarriers: string[];
  }>().notNull(),
  
  // Behavior change score
  behaviorChangeScore: integer("behavior_change_score").notNull(), // 0-100
  
  // SDT trends
  sdtTrends: json("sdt_trends").$type<{
    autonomy: { start: number; end: number; change: number };
    competence: { start: number; end: number; change: number };
    relatedness: { start: number; end: number; change: number };
  }>().notNull(),
  
  // Recommendations
  recommendations: json("recommendations").$type<{
    continue: string[];
    adjust: string[];
    add: string[];
  }>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("weekly_reports_user_id_idx").on(table.userId),
  weekStartIdx: index("weekly_reports_week_start_idx").on(table.weekStart),
}));

// Behavioral Assessment Schemas
export const insertBehavioralAssessmentSchema = createInsertSchema(behavioralAssessments).omit({
  id: true,
  timestamp: true,
});

export const insertMicroStepSchema = createInsertSchema(microSteps).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertWeeklyReportSchema = createInsertSchema(weeklyReports).omit({
  id: true,
  createdAt: true,
});

// Behavioral Types
export type BehavioralAssessment = typeof behavioralAssessments.$inferSelect;
export type InsertBehavioralAssessment = z.infer<typeof insertBehavioralAssessmentSchema>;

export type MicroStep = typeof microSteps.$inferSelect;
export type InsertMicroStep = z.infer<typeof insertMicroStepSchema>;

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;

// ===== CONSENT MANAGEMENT =====

// User Consents - GDPR/Privacy compliance
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Consent types
  analytics: boolean("analytics").default(false).notNull(), // PostHog tracking
  behavioral: boolean("behavioral").default(false).notNull(), // Behavioral engine data collection
  marketing: boolean("marketing").default(false).notNull(), // Marketing communications
  
  // Metadata
  consentVersion: varchar("consent_version").default("1.0").notNull(), // Track consent policy version
  consentedAt: timestamp("consented_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Withdrawal tracking
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawalReason: text("withdrawal_reason"),
}, (table) => ({
  userIdIdx: index("user_consents_user_id_idx").on(table.userId),
}));

// Consent Schemas
export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
  consentedAt: true,
  updatedAt: true,
});

export const updateUserConsentSchema = z.object({
  analytics: z.boolean().optional(),
  behavioral: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

// Consent Types
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UpdateUserConsent = z.infer<typeof updateUserConsentSchema>;

// ===== MONETIZATION & ENTITLEMENTS =====

// Entitlements - Unified subscription tracking for Paddle and Apple IAP
export const entitlements = pgTable("entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Source tracking
  source: varchar("source").notNull(), // 'apple' | 'paddle'
  productId: varchar("product_id").notNull(), // Product/Price ID from provider
  
  // Status tracking
  status: varchar("status"), // 'active', 'canceled', 'expired', 'past_due'
  expiresAt: timestamp("expires_at"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("entitlements_user_id_idx").on(table.userId),
  sourceIdx: index("entitlements_source_idx").on(table.source),
  statusIdx: index("entitlements_status_idx").on(table.status),
}));

// Simple weekly report storage for behavioral insights
export const reportWeekly = pgTable("report_weekly", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Report data (flexible JSON storage)
  data: json("data").$type<{
    weekStart: string;
    metrics?: any;
    insights?: any;
    recommendations?: any;
  }>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("report_weekly_user_id_idx").on(table.userId),
  createdAtIdx: index("report_weekly_created_at_idx").on(table.createdAt),
}));

// Entitlement Schemas
export const insertEntitlementSchema = createInsertSchema(entitlements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportWeeklySchema = createInsertSchema(reportWeekly).omit({
  id: true,
  createdAt: true,
});

// Entitlement Types
export type Entitlement = typeof entitlements.$inferSelect;
export type InsertEntitlement = z.infer<typeof insertEntitlementSchema>;

export type ReportWeekly = typeof reportWeekly.$inferSelect;
export type InsertReportWeekly = z.infer<typeof insertReportWeeklySchema>;