import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { initializeOAuth, generateOAuthState, verifyOAuthState, getUserConnectedAccounts, unlinkAccount, requireAuth } from "./auth/oauth";
import passport from 'passport';
import { z } from "zod";
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { aiMentor } from "./aiMentor";
import { aiMentorEnhanced } from "./aiEnhanced";
import { paymentService } from "./payments";
import { socialService } from "./social";
import { analyticsService } from "./analytics";
import { notificationService } from "./notifications";
import { createPaddleCheckout, createPaddleCoinCheckout, getPaddleSubscription, cancelPaddleSubscription } from "./payments/paddle";
import { handlePaddleWebhook } from "./payments/paddleWebhook";
import { appleIAPService } from "./payments/apple";
import rateLimit from "express-rate-limit";
import { registerBehavioralRoutes } from "./behavioralRoutes";
import { getPostHogClient } from "./analytics/posthog";

// Import new auth middleware and JWT functions
import { 
  authenticate, 
  generateToken, 
  generateRefreshToken, 
  hashPassword, 
  comparePassword,
  authRateLimit as jwtAuthRateLimit,
  apiRateLimit,
  uploadRateLimit as jwtUploadRateLimit,
  requirePremium,
  requireAdmin 
} from "./middleware/auth";

// Import Paddle routes
import paddleRoutes from "./routes/paddle";
import { 
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertTeamGoalSchema,
  insertTeamInviteSchema,
  insertProfilePictureSchema,
  insertSecurityLogSchema,
  insertConnectedAccountSchema,
  insertDataExportSchema,
  insertAccountDeletionSchema,
  insertTwoFactorAuthSchema,
  insertUsageStatisticsSchema
} from "@shared/schema";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Stripe from "stripe";
import { db } from "./storage";
import { 
  subscriptionPlans, 
  coinPackages, 
  purchaseItems,
  featureGates,
  userPurchases,
  coinTransactions,
  paymentTransactions,
  achievements,
  userAchievements,
  xpTransactions,
  leaderboards,
  userLoginStreaks,
  friendConnections,
  spinWheelRewards,
  users,
  userProfiles,
  teams,
  teamMembers,
  challenges,
  challengeParticipants,
  mentorships,
  socialFeedPosts,
  notifications,
  connectedAccounts
} from "@shared/schema";
import { eq, and, gte, desc, or, sql } from "drizzle-orm";
import { differenceInDays, subDays } from "date-fns";

// Validation schemas for MasterMind AI operations
const goalSchema = z.object({
  title: z.string().min(1, 'Goal title required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category required'),
  priority: z.enum(['low', 'medium', 'high']),
  targetDate: z.string().transform(str => new Date(str)),
  estimatedDuration: z.number().positive().optional() // days, consistent with schema
});

// SECURITY: Whitelisted schemas for user updates to prevent mass-assignment
const userPreferencesUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  notificationsEnabled: z.boolean().optional(),
  motivationalQuotes: z.boolean().optional(),
  celebrationsEnabled: z.boolean().optional(),
  displayName: z.string().max(100).optional(),
  username: z.string().max(50).optional(),
  emailNotifications: z.object({
    goalReminders: z.boolean().optional(),
    achievements: z.boolean().optional(),
    weeklyReports: z.boolean().optional(),
    friendActivity: z.boolean().optional(),
    systemUpdates: z.boolean().optional(),
    marketing: z.boolean().optional()
  }).optional(),
  pushNotifications: z.object({
    goals: z.boolean().optional(),
    achievements: z.boolean().optional(),
    friends: z.boolean().optional(),
    reminders: z.boolean().optional()
  }).optional(),
  profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
  showEmail: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showStats: z.boolean().optional(),
  dataSharing: z.boolean().optional(),
  analyticsOptOut: z.boolean().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  phoneNumber: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  socialLinks: z.object({
    twitter: z.string().max(100).optional(),
    linkedin: z.string().max(100).optional(),
    github: z.string().max(100).optional(),
    instagram: z.string().max(100).optional(),
    facebook: z.string().max(100).optional(),
    youtube: z.string().max(100).optional(),
    portfolio: z.string().max(200).optional()
  }).optional()
});

const userProfileUpdateSchema = z.object({
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']).optional(),
  preferredPace: z.enum(['slow', 'medium', 'fast', 'adaptive']).optional(),
  difficultyPreference: z.enum(['incremental', 'challenge', 'mixed']).optional(),
  goalCategories: z.array(z.string()).max(10).optional(),
  dailyTimeCommitment: z.number().min(5).max(480).optional(), // 5 minutes to 8 hours
  preferredCoachingStyle: z.enum(['supportive', 'challenging', 'balanced']).optional(),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string()
  }).optional()
});

// Email/Password Authentication Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// ===== ICAL GENERATOR UTILITY FUNCTIONS =====

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICalText(text: string): string {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function generateICalFeed(userId: string, events: any[]): string {
  const icalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LiLove//lilove.org//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LiLove - Personal Growth',
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALDESC:Your goals, tasks, and habits from LiLove'
  ];
  
  for (const event of events) {
    icalLines.push('BEGIN:VEVENT');
    icalLines.push(`UID:${event.id}@lilove.org`);
    icalLines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    icalLines.push(`DTSTART:${formatICalDate(new Date(event.startDate))}`);
    icalLines.push(`DTEND:${formatICalDate(new Date(event.endDate))}`);
    icalLines.push(`SUMMARY:${escapeICalText(event.title)}`);
    icalLines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    icalLines.push(`LOCATION:lilove.org`);
    icalLines.push(`STATUS:CONFIRMED`);
    icalLines.push(`CATEGORIES:${escapeICalText(event.category)}`);
    
    if (event.recurring) {
      const freq = event.frequency === 'weekly' ? 'WEEKLY' : 'DAILY';
      icalLines.push(`RRULE:FREQ=${freq};INTERVAL=1`);
    }
    
    icalLines.push('END:VEVENT');
  }
  
  icalLines.push('END:VCALENDAR');
  return icalLines.join('\r\n');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoints - MUST be before auth middleware
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'healthy' });
  });
  
  // API health check (JSON response)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // Set up Replit Auth middleware
  await setupAuth(app);

  // SECURITY FIX: Serve static files for profile pictures with access control
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    index: false, // Disable directory listing
    dotfiles: 'deny' // Deny access to dotfiles
  }));

  // Rate limiting for sensitive endpoints
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const uploadRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit file uploads
    message: { message: 'Too many file uploads, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const sensitiveRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Lower limit for sensitive operations
    message: { message: 'Too many requests for this operation, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // SECURITY: Rate limiting for webhook endpoints to prevent brute force attacks
  const webhookRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 webhook requests per 15 minutes
    message: { message: 'Too many webhook requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests, not just failed ones
  });

  // ===== AUTH ROUTES =====
  
  // Get current user (works for both Replit Auth and email/password)
  app.get('/api/auth/me', async (req: any, res) => {
    try {
      // Check if user is authenticated (works for both Replit Auth and email/password)
      if (!req.isAuthenticated() || !req.user || !req.user.claims?.sub) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get user profile
      const profile = await storage.getUserProfile(userId);
      
      res.json({
        ...user,
        profile
      });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });
  
  // Get current user with Replit Auth (legacy - use /api/auth/me instead)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user profile for additional data
      const profile = await storage.getUserProfile(userId);
      
      res.json({
        ...user,
        profile
      });
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/Password Registration - Enhanced with JWT
  app.post('/api/auth/register', jwtAuthRateLimit, async (req: any, res) => {
    try {
      // Validate input
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password with secure bcrypt function
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user
      const newUser = await storage.upsertUser({
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        displayName: validatedData.displayName || validatedData.username || validatedData.firstName,
        coinBalance: 1000 // Welcome bonus
      });
      
      // Create user profile
      await storage.updateUserProfile(newUser.id, {});
      
      // Generate JWT tokens (handle null email case)
      const accessToken = generateToken(newUser.id, newUser.email || '');
      const refreshToken = generateRefreshToken(newUser.id);
      
      // Create session using req.login with expires_at for compatibility
      const sessionExpiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
      req.login({ 
        claims: { 
          sub: newUser.id,
          email: newUser.email
        },
        expires_at: sessionExpiry,
        access_token: accessToken,
        refresh_token: refreshToken
      }, (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          // Still return JWT tokens even if session fails
        }
        
        // Log security event
        storage.logSecurityEvent({
          userId: newUser.id,
          eventType: 'registration',
          eventDescription: 'User registered with email/password',
          ipAddress: req.ip || '',
          userAgent: req.get('User-Agent') || ''
        }).catch(console.error);
        
        // Return user data with JWT tokens
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json({
          ...userWithoutPassword,
          accessToken,
          refreshToken
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email/Password Login - Enhanced with JWT
  app.post('/api/auth/login', jwtAuthRateLimit, async (req: any, res) => {
    try {
      // Validate input
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const userResults = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
      if (userResults.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const user = userResults[0];
      
      // Check if user has a password (OAuth users won't have one)
      if (!user.password) {
        return res.status(401).json({ message: "Please use OAuth to login with this account" });
      }
      
      // Compare password using secure function
      const isPasswordValid = await comparePassword(validatedData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Update last login
      await storage.upsertUser({
        id: user.id,
        lastLoginAt: new Date()
      });
      
      // Generate JWT tokens (handle null email case)
      const accessToken = generateToken(user.id, user.email || '');
      const refreshToken = generateRefreshToken(user.id);
      
      // Create session using req.login with expires_at for compatibility
      const sessionExpiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
      req.login({ 
        claims: { 
          sub: user.id,
          email: user.email
        },
        expires_at: sessionExpiry,
        access_token: accessToken,
        refresh_token: refreshToken
      }, (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          // Still return JWT tokens even if session fails
        }
        
        // Log security event
        storage.logSecurityEvent({
          userId: user.id,
          eventType: 'login',
          eventDescription: 'User logged in with email/password',
          ipAddress: req.ip || '',
          userAgent: req.get('User-Agent') || ''
        }).catch(console.error);
        
        // Return user data with JWT tokens
        const { password, ...userWithoutPassword } = user;
        res.json({
          ...userWithoutPassword,
          accessToken,
          refreshToken
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Update user preferences - FIXED: Mass-assignment vulnerability
  app.patch('/api/auth/user/preferences', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // SECURITY: Validate and whitelist allowed fields only
      const validatedUpdates = userPreferencesUpdateSchema.parse(req.body);
      
      // Update user preferences with validated data only
      await storage.upsertUser({
        id: userId,
        ...validatedUpdates
      });
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'settings_change',
        eventDescription: 'User preferences updated',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: "Preferences updated successfully" });
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Update user profile (onboarding data) - FIXED: Mass-assignment vulnerability
  app.patch('/api/auth/user/profile', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // SECURITY: Validate and whitelist allowed fields only
      const validatedProfileData = userProfileUpdateSchema.parse(req.body);
      
      await storage.updateUserProfile(userId, validatedProfileData);
      
      // Mark onboarding as complete if relevant
      if (validatedProfileData.goalCategories || validatedProfileData.dailyTimeCommitment) {
        await storage.upsertUser({
          id: userId,
          onboardingCompleted: true
        });
      }
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'profile_update',
        eventDescription: 'User profile updated',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: "Profile updated successfully" });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Complete onboarding - Create avatar and mark onboarding complete
  app.post('/api/user/complete-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { displayName, primaryGoal, motivation, avatarPreset } = req.body;
      
      // Update user with display name
      await storage.upsertUser({
        id: userId,
        displayName: displayName || 'User',
        onboardingCompleted: true
      });

      // Create user profile with initial goal
      await storage.updateUserProfile(userId, {
        goalCategories: primaryGoal ? [primaryGoal] : [],
        dailyTimeCommitment: 30, // Default 30 minutes
        preferredCoachingStyle: 'balanced'
      });

      // Get or create avatar and customize based on preset
      const avatar = await storage.getOrCreateAvatar(userId);
      
      const avatarDefaults: Record<string, any> = {
        warrior: { outfit: 'knight', hairStyle: 'short', skinTone: 'medium' },
        sage: { outfit: 'wizard', hairStyle: 'long', skinTone: 'light' },
        explorer: { outfit: 'sporty', hairStyle: 'curly', skinTone: 'tan' },
        innovator: { outfit: 'casual', hairStyle: 'spiky', skinTone: 'medium' }
      };

      const preset = avatarDefaults[avatarPreset] || avatarDefaults.warrior;
      
      // Update avatar with preset settings
      await storage.updateAvatar(userId, {
        skinTone: preset.skinTone || 'light',
        hairStyle: preset.hairStyle || 'short',
        hairColor: 'brown',
        faceType: 'happy',
        outfit: preset.outfit || 'casual',
        accessory: 'none'
      });

      // Award welcome bonus (1000 coins already set in user default)
      // Award welcome XP
      await gamificationService.awardXP(userId, 100, 'onboarding_complete');

      res.json({ 
        message: "Onboarding completed successfully",
        welcomeBonus: 1000
      });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Get user stats (for profile page)
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [goals, profile, achievements, xp] = await Promise.all([
        storage.getUserGoals(userId),
        storage.getUserProfile(userId),
        storage.getUserAchievements(userId),
        storage.getUserXP(userId)
      ]);
      
      const activeGoals = goals.filter(g => g.status === 'active').length;
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      
      res.json({
        activeGoals,
        completedGoals,
        totalGoals: goals.length,
        streakCount: profile?.streakCount || 0,
        longestStreak: profile?.longestStreak || 0,
        currentLevel: profile?.currentLevel || 1,
        totalXp: xp || 0,
        achievementsUnlocked: achievements.length,
        performanceScore: profile?.overallPerformanceScore || 0
      });
    } catch (error: any) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // ===== ADVANCED PROFILE & SETTINGS ROUTES =====
  
  // Configure multer for profile picture uploads
  const uploadDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const profilePictureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `profile-${uniqueSuffix}${ext}`);
    }
  });
  
  const uploadProfilePicture = multer({
    storage: profilePictureStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
      }
    }
  });

  // Profile Picture Management Routes
  app.post('/api/profile/picture', isAuthenticated, uploadRateLimit, uploadProfilePicture.single('picture'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const filePath = `/uploads/profile-pictures/${file.filename}`;
      
      const pictureData = {
        userId,
        fileName: file.filename,
        originalName: file.originalname,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype
      };
      
      const newPicture = await storage.uploadProfilePicture(pictureData);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'profile_picture_upload',
        eventDescription: 'Profile picture uploaded successfully',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ 
        message: 'Profile picture uploaded successfully', 
        picture: newPicture 
      });
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ message: error.message || 'Failed to upload profile picture' });
    }
  });
  
  app.get('/api/profile/pictures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pictures = await storage.getProfilePictures(userId);
      res.json(pictures);
    } catch (error: any) {
      console.error('Error fetching profile pictures:', error);
      res.status(500).json({ message: 'Failed to fetch profile pictures' });
    }
  });
  
  app.put('/api/profile/picture/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pictureId = req.params.id;
      
      await storage.setActiveProfilePicture(userId, pictureId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'profile_picture_change',
        eventDescription: 'Active profile picture changed',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: 'Profile picture activated successfully' });
    } catch (error: any) {
      console.error('Error activating profile picture:', error);
      res.status(500).json({ message: 'Failed to activate profile picture' });
    }
  });
  
  app.delete('/api/profile/picture/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pictureId = req.params.id;
      
      await storage.deleteProfilePicture(pictureId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'profile_picture_delete',
        eventDescription: 'Profile picture deleted',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: 'Profile picture deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting profile picture:', error);
      res.status(500).json({ message: 'Failed to delete profile picture' });
    }
  });

  // Enhanced Profile Management Routes
  app.get('/api/profile/extended', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const profile = await storage.getUserProfile(userId);
      const activePicture = await storage.getActiveProfilePicture(userId);
      
      res.json({
        ...user,
        profile,
        activePicture
      });
    } catch (error: any) {
      console.error('Error fetching extended profile:', error);
      res.status(500).json({ message: 'Failed to fetch extended profile' });
    }
  });
  
  app.patch('/api/profile/extended', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { profile: profileData, user: userData, ...otherData } = req.body;
      
      // Update user data if provided
      if (userData) {
        await storage.upsertUser({ id: userId, ...userData });
      }
      
      // Update profile data if provided
      if (profileData) {
        await storage.updateUserProfile(userId, profileData);
      }
      
      // Log security event for profile changes
      await storage.logSecurityEvent({
        userId,
        eventType: 'profile_update',
        eventDescription: 'Profile information updated',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: 'Extended profile updated successfully' });
    } catch (error: any) {
      console.error('Error updating extended profile:', error);
      res.status(500).json({ message: 'Failed to update extended profile' });
    }
  });

  // Security Logs Routes
  app.get('/api/security/logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getUserSecurityLogs(userId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching security logs:', error);
      res.status(500).json({ message: 'Failed to fetch security logs' });
    }
  });
  
  app.get('/api/security/events/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventTypes = (req.query.eventTypes as string)?.split(',') || ['login', 'logout', 'password_change'];
      const limit = parseInt(req.query.limit as string) || 10;
      
      const events = await storage.getRecentSecurityEvents(userId, eventTypes, limit);
      res.json(events);
    } catch (error: any) {
      console.error('Error fetching recent security events:', error);
      res.status(500).json({ message: 'Failed to fetch recent security events' });
    }
  });

  // Connected Accounts Management Routes
  app.get('/api/connected-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getConnectedAccounts(userId);
      res.json(accounts);
    } catch (error: any) {
      console.error('Error fetching connected accounts:', error);
      res.status(500).json({ message: 'Failed to fetch connected accounts' });
    }
  });
  
  app.post('/api/connected-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountData = { ...req.body, userId };
      
      // Validate with schema
      const validatedData = insertConnectedAccountSchema.parse(accountData);
      
      const newAccount = await storage.connectAccount(validatedData);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'account_connection',
        eventDescription: `Connected ${accountData.provider} account`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json(newAccount);
    } catch (error: any) {
      console.error('Error connecting account:', error);
      res.status(500).json({ message: error.message || 'Failed to connect account' });
    }
  });
  
  app.patch('/api/connected-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountId = req.params.id;
      const updates = req.body;
      
      await storage.updateConnectedAccount(accountId, updates);
      
      res.json({ message: 'Connected account updated successfully' });
    } catch (error: any) {
      console.error('Error updating connected account:', error);
      res.status(500).json({ message: 'Failed to update connected account' });
    }
  });
  
  app.delete('/api/connected-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountId = req.params.id;
      
      await storage.disconnectAccount(accountId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'account_disconnection',
        eventDescription: 'Account disconnected',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: 'Account disconnected successfully' });
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      res.status(500).json({ message: 'Failed to disconnect account' });
    }
  });

  // Data Export Functionality Routes
  app.post('/api/data-export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { format = 'json', includePersonalData = true, includeActivityData = true } = req.body;
      
      const exportData = {
        userId,
        exportType: 'full',
        format,
        includePersonalData,
        includeActivityData,
        status: 'pending',
        progress: 0
      };
      
      const newExport = await storage.createDataExport(exportData);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'data_export_request',
        eventDescription: `Data export requested in ${format} format`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      // In a real implementation, you'd trigger background processing here
      // For now, we'll simulate completion
      setTimeout(async () => {
        try {
          await storage.updateDataExportStatus(newExport.id, 'completed', 100, '/exports/dummy-file.json');
        } catch (error) {
          console.error('Error updating export status:', error);
        }
      }, 5000);
      
      res.json({ 
        message: 'Data export request created successfully', 
        export: newExport 
      });
    } catch (error: any) {
      console.error('Error creating data export:', error);
      res.status(500).json({ message: 'Failed to create data export' });
    }
  });
  
  app.get('/api/data-exports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const exports = await storage.getDataExports(userId);
      res.json(exports);
    } catch (error: any) {
      console.error('Error fetching data exports:', error);
      res.status(500).json({ message: 'Failed to fetch data exports' });
    }
  });
  
  app.get('/api/data-export/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const exportId = req.params.id;
      
      const exportRecord = await storage.getDataExportById(exportId);
      
      if (!exportRecord || exportRecord.userId !== userId) {
        return res.status(404).json({ message: 'Data export not found' });
      }
      
      if (exportRecord.status !== 'completed') {
        return res.status(400).json({ message: 'Data export not ready for download' });
      }
      
      await storage.markDataExportDownloaded(exportId);
      
      // In a real implementation, you'd serve the actual file
      res.json({ 
        message: 'Download ready', 
        downloadUrl: exportRecord.filePath,
        filename: `user-data-${exportId}.${exportRecord.format}`
      });
    } catch (error: any) {
      console.error('Error downloading data export:', error);
      res.status(500).json({ message: 'Failed to download data export' });
    }
  });

  // Account Deletion Management Routes
  app.post('/api/account/deletion/request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reason, feedback } = req.body;
      
      // Check if there's already a pending deletion request
      const existingDeletion = await storage.getAccountDeletion(userId);
      if (existingDeletion) {
        return res.status(400).json({ message: 'Account deletion already requested' });
      }
      
      const deletionData = {
        userId,
        reason: reason || 'User requested',
        additionalReason: feedback || '',
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
      
      const newDeletion = await storage.requestAccountDeletion(deletionData);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'account_deletion_request',
        eventDescription: 'Account deletion requested',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ 
        message: 'Account deletion requested. Your account will be deleted in 30 days.', 
        deletion: newDeletion 
      });
    } catch (error: any) {
      console.error('Error requesting account deletion:', error);
      res.status(500).json({ message: 'Failed to request account deletion' });
    }
  });
  
  app.get('/api/account/deletion/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deletion = await storage.getAccountDeletion(userId);
      res.json({ deletion });
    } catch (error: any) {
      console.error('Error fetching account deletion status:', error);
      res.status(500).json({ message: 'Failed to fetch account deletion status' });
    }
  });
  
  app.delete('/api/account/deletion/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deletion = await storage.getAccountDeletion(userId);
      
      if (!deletion) {
        return res.status(404).json({ message: 'No pending account deletion found' });
      }
      
      await storage.cancelAccountDeletion(deletion.id);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'account_deletion_cancelled',
        eventDescription: 'Account deletion cancelled',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: 'Account deletion cancelled successfully' });
    } catch (error: any) {
      console.error('Error cancelling account deletion:', error);
      res.status(500).json({ message: 'Failed to cancel account deletion' });
    }
  });

  // Two-Factor Authentication Routes (Basic Implementation)
  app.post('/api/2fa/setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Generate a basic secret (in production, use a proper TOTP library)
      const secret = Math.random().toString(36).substring(2, 15);
      
      const twoFactorAuth = await storage.setupTwoFactorAuth(userId, secret);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: '2fa_setup_initiated',
        eventDescription: '2FA setup initiated',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ 
        message: '2FA setup initiated', 
        secret,
        qrCode: `otpauth://totp/MasterMind:${userId}?secret=${secret}&issuer=MasterMind`
      });
    } catch (error: any) {
      console.error('Error setting up 2FA:', error);
      res.status(500).json({ message: 'Failed to setup 2FA' });
    }
  });
  
  app.post('/api/2fa/enable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.body;
      
      // In a real implementation, verify the TOTP token
      await storage.enableTwoFactorAuth(userId);
      
      // Generate backup codes
      const backupCodes = await storage.generateBackupCodes(userId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: '2fa_enabled',
        eventDescription: '2FA enabled successfully',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ 
        message: '2FA enabled successfully', 
        backupCodes
      });
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({ message: 'Failed to enable 2FA' });
    }
  });
  
  app.post('/api/2fa/disable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { password, token } = req.body;
      
      // In a real implementation, verify password and/or TOTP token
      await storage.disableTwoFactorAuth(userId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: '2fa_disabled',
        eventDescription: '2FA disabled',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ message: '2FA disabled successfully' });
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ message: 'Failed to disable 2FA' });
    }
  });
  
  app.get('/api/2fa/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const twoFactorAuth = await storage.getTwoFactorAuth(userId);
      
      res.json({
        enabled: twoFactorAuth?.isEnabled || false,
        verified: twoFactorAuth?.isVerified || false,
        hasBackupCodes: (twoFactorAuth?.backupCodes?.length || 0) > 0
      });
    } catch (error: any) {
      console.error('Error fetching 2FA status:', error);
      res.status(500).json({ message: 'Failed to fetch 2FA status' });
    }
  });

  // Usage Statistics Routes
  app.get('/api/usage-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, period = 'month' } = req.query;
      
      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      }
      
      const stats = await storage.getUserUsageStatistics(userId, start, end);
      const insights = await storage.getUsageInsights(userId, period as 'week' | 'month' | 'year');
      
      res.json({ stats, insights });
    } catch (error: any) {
      console.error('Error fetching usage statistics:', error);
      res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
  });
  
  app.get('/api/usage-stats/devices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceStats = await storage.getUserDeviceStats(userId);
      res.json(deviceStats);
    } catch (error: any) {
      console.error('Error fetching device statistics:', error);
      res.status(500).json({ message: 'Failed to fetch device statistics' });
    }
  });
  
  app.get('/api/usage-stats/features', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const featureStats = await storage.getFeatureUsageStats(userId);
      res.json(featureStats);
    } catch (error: any) {
      console.error('Error fetching feature usage statistics:', error);
      res.status(500).json({ message: 'Failed to fetch feature usage statistics' });
    }
  });
  
  app.post('/api/usage-stats/record', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const statsData = { ...req.body, userId };
      
      await storage.recordUsageStatistics(statsData);
      res.json({ message: 'Usage statistics recorded successfully' });
    } catch (error: any) {
      console.error('Error recording usage statistics:', error);
      res.status(500).json({ message: 'Failed to record usage statistics' });
    }
  });

  // ===== CONSENT MANAGEMENT ROUTES =====
  
  // GET /api/consent - Get user's consent status
  app.get('/api/consent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const consent = await storage.getUserConsent(userId);
      
      if (!consent) {
        // Return default consent (all false - opt-in required)
        return res.json({
          analytics: false,
          behavioral: false,
          marketing: false,
          consentVersion: '1.0',
          consentedAt: null,
          updatedAt: null
        });
      }
      
      res.json(consent);
    } catch (error: any) {
      console.error('Error fetching consent:', error);
      res.status(500).json({ message: 'Failed to fetch consent status' });
    }
  });
  
  // POST /api/consent - Update consent preferences
  app.post('/api/consent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { analytics, behavioral, marketing } = req.body;
      
      // Validate input
      if (
        typeof analytics !== 'boolean' ||
        typeof behavioral !== 'boolean' ||
        typeof marketing !== 'boolean'
      ) {
        return res.status(400).json({ 
          message: 'Invalid consent data. All fields must be boolean.' 
        });
      }
      
      // SECURITY FIX: Check if behavioral feature is enabled before allowing consent
      if (behavioral) {
        const [behavioralFeature] = await db
          .select()
          .from(featureGates)
          .where(and(
            eq(featureGates.featureKey, 'coach_engine_v1'),
            eq(featureGates.isActive, true)
          ))
          .limit(1);
        
        if (!behavioralFeature) {
          return res.status(403).json({ 
            message: 'Behavioral research feature is not available',
            error: 'This feature is currently disabled. Contact support for access.'
          });
        }
      }
      
      const consentData = {
        userId,
        analytics,
        behavioral,
        marketing,
        consentVersion: '1.0'
      };
      
      const updatedConsent = await storage.updateUserConsent(consentData);
      
      // Update PostHog user properties with consent status
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.identify({
          distinctId: userId,
          properties: {
            consent_analytics: analytics,
            consent_behavioral: behavioral,
            consent_marketing: marketing,
            consent_updated_at: new Date().toISOString()
          }
        });
      }
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'consent_updated',
        eventDescription: `Consent updated: analytics=${analytics}, behavioral=${behavioral}, marketing=${marketing}`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ 
        message: 'Consent preferences updated successfully',
        consent: updatedConsent
      });
    } catch (error: any) {
      console.error('Error updating consent:', error);
      res.status(500).json({ message: 'Failed to update consent preferences' });
    }
  });
  
  // POST /api/consent/withdraw - Withdraw all consent
  app.post('/api/consent/withdraw', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      const withdrawnConsent = await storage.withdrawUserConsent(userId, reason);
      
      // Update PostHog to stop tracking
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.identify({
          distinctId: userId,
          properties: {
            consent_analytics: false,
            consent_behavioral: false,
            consent_marketing: false,
            consent_withdrawn: true,
            consent_withdrawn_at: new Date().toISOString()
          }
        });
      }
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'consent_withdrawn',
        eventDescription: `All consent withdrawn. Reason: ${reason || 'Not provided'}`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({ 
        message: 'All consent withdrawn successfully',
        consent: withdrawnConsent
      });
    } catch (error: any) {
      console.error('Error withdrawing consent:', error);
      res.status(500).json({ message: 'Failed to withdraw consent' });
    }
  });

  // ===== PAYMENT ROUTES =====
  
  // Mount Paddle payment routes
  app.use('/api/paddle', paddleRoutes);

  // Refresh Token Endpoint for JWT
  app.post('/api/auth/refresh', async (req: any, res) => {
    try {
      const { refreshToken: token } = req.body;
      
      if (!token) {
        return res.status(401).json({ message: 'Refresh token required' });
      }
      
      // Import verifyToken from auth middleware
      const { verifyToken } = await import('./middleware/auth');
      
      try {
        const decoded = verifyToken(token);
        
        if (decoded.type !== 'refresh') {
          return res.status(401).json({ message: 'Invalid token type' });
        }
        
        // Get user from database
        const userResults = await db.select().from(users)
          .where(eq(users.id, decoded.sub))
          .limit(1);
          
        if (userResults.length === 0) {
          return res.status(401).json({ message: 'User not found' });
        }
        
        const user = userResults[0];
        
        // Generate new tokens (handle null email case)
        const newAccessToken = generateToken(user.id, user.email || '');
        const newRefreshToken = generateRefreshToken(user.id);
        
        res.json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            email: user.email,
            subscriptionTier: user.subscriptionTier
          }
        });
      } catch (error: any) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(500).json({ message: 'Failed to refresh token' });
    }
  });

  // ===== OAUTH ROUTES =====
  
  // Initialize OAuth strategies
  initializeOAuth(app);

  // Google OAuth - Initialize
  app.get('/api/auth/google', (req: any, res, next) => {
    const isPopup = req.query.popup === '1';
    const state = generateOAuthState(req.user?.claims?.sub, isPopup);
    const authenticator = passport.authenticate('google-oauth', {
      scope: ['profile', 'email'],
      state,
    });
    authenticator(req, res, next);
  });

  // Google OAuth - Callback
  app.get('/api/auth/google/callback', (req, res, next) => {
    passport.authenticate('google-oauth', async (err: any, user: any, info: any) => {
      console.log('[Google OAuth Callback] Started');
      console.log('[Google OAuth Callback] User:', user ? `ID: ${user.id}, Email: ${user.email}, OnboardingCompleted: ${user.onboardingCompleted}` : 'null');
      
      // Check state first to get popup flag
      const state = req.query.state as string;
      let isPopup = req.query.popup === '1';
      let stateData = null;
      
      if (state) {
        stateData = verifyOAuthState(state);
        if (stateData) {
          isPopup = stateData.popup || isPopup;
        }
      }

      if (err) {
        console.error('[Google OAuth Callback] Error:', err);
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Error</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-error', error: 'oauth_failed' }, window.location.origin);
                  // Parent window will close the popup after receiving message
                </script>
              </body>
            </html>
          `);
        }
        return res.redirect('/auth?error=oauth_failed');
      }

      if (!user) {
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Failed</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-error', error: 'oauth_failed' }, window.location.origin);
                  // Parent window will close the popup after receiving message
                </script>
              </body>
            </html>
          `);
        }
        return res.redirect('/auth?error=oauth_failed');
      }

      // Verify state was valid (already checked above)
      if (state && !stateData) {
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Invalid State</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-error', error: 'invalid_state' }, window.location.origin);
                  // Parent window will close the popup after receiving message
                </script>
              </body>
            </html>
          `);
        }
        return res.redirect('/auth?error=invalid_state');
      }

      // Create Replit Auth compatible user session
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        access_token: null,
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      console.log('[OAuth] Creating session for user:', user.id, 'onboardingCompleted:', user.onboardingCompleted);

      // Establish session for both popup and non-popup modes
      req.login(sessionUser, (loginErr) => {
        if (loginErr) {
          console.error('[OAuth] Login error:', loginErr);
          if (isPopup) {
            return res.send(`
              <!DOCTYPE html>
              <html>
                <head><title>Authentication Error</title></head>
                <body>
                  <script>
                    window.opener.postMessage({ type: 'auth-error', error: 'login_failed' }, window.location.origin);
                    // Parent window will close the popup after receiving message
                  </script>
                </body>
              </html>
            `);
          }
          return res.redirect('/auth?error=login_failed');
        }
        
        // For popup mode, send postMessage and let parent close the popup
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Successful</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-success', user: ${JSON.stringify(user)} }, window.location.origin);
                  // Don't close here - parent window will close after receiving message
                </script>
              </body>
            </html>
          `);
        }

        // For non-popup, redirect to dashboard
        return res.redirect('/dashboard?oauth=success');
      });
    })(req, res, next);
  });

  // Apple OAuth - Initialize
  app.get('/api/auth/apple', (req: any, res, next) => {
    const isPopup = req.query.popup === '1';
    const state = generateOAuthState(req.user?.claims?.sub, isPopup);
    const authenticator = passport.authenticate('apple-oauth', {
      scope: ['name', 'email'],
      state,
    });
    authenticator(req, res, next);
  });

  // Apple OAuth - Callback
  app.post('/api/auth/apple/callback', (req, res, next) => {
    passport.authenticate('apple-oauth', async (err: any, user: any, info: any) => {
      console.log('[Apple OAuth Callback] Started');
      console.log('[Apple OAuth Callback] User:', user ? `ID: ${user.id}, Email: ${user.email}, OnboardingCompleted: ${user.onboardingCompleted}` : 'null');
      
      // Check state first to get popup flag
      const state = req.body.state as string;
      let isPopup = req.query.popup === '1' || req.body.popup === '1';
      let stateData = null;
      
      if (state) {
        stateData = verifyOAuthState(state);
        if (stateData) {
          isPopup = stateData.popup || isPopup;
        }
      }

      if (err) {
        console.error('[Apple OAuth Callback] Error:', err);
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Error</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-error', error: 'oauth_failed' }, window.location.origin);
                  // Parent window will close the popup after receiving message
                </script>
              </body>
            </html>
          `);
        }
        return res.redirect('/auth?error=oauth_failed');
      }

      if (!user) {
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Failed</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-error', error: 'oauth_failed' }, window.location.origin);
                  // Parent window will close the popup after receiving message
                </script>
              </body>
            </html>
          `);
        }
        return res.redirect('/auth?error=oauth_failed');
      }

      // Verify state was valid (already checked above)
      if (state && !stateData) {
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Invalid State</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-error', error: 'invalid_state' }, window.location.origin);
                  // Parent window will close the popup after receiving message
                </script>
              </body>
            </html>
          `);
        }
        return res.redirect('/auth?error=invalid_state');
      }

      // Create Replit Auth compatible user session
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        access_token: null,
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      console.log('[OAuth] Creating session for user:', user.id, 'onboardingCompleted:', user.onboardingCompleted);

      // Establish session for both popup and non-popup modes
      req.login(sessionUser, (loginErr) => {
        if (loginErr) {
          console.error('[OAuth] Login error:', loginErr);
          if (isPopup) {
            return res.send(`
              <!DOCTYPE html>
              <html>
                <head><title>Authentication Error</title></head>
                <body>
                  <script>
                    window.opener.postMessage({ type: 'auth-error', error: 'login_failed' }, window.location.origin);
                    // Parent window will close the popup after receiving message
                  </script>
                </body>
              </html>
            `);
          }
          return res.redirect('/auth?error=login_failed');
        }
        
        // For popup mode, send postMessage and let parent close the popup
        if (isPopup) {
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Successful</title></head>
              <body>
                <script>
                  window.opener.postMessage({ type: 'auth-success', user: ${JSON.stringify(user)} }, window.location.origin);
                  // Don't close here - parent window will close after receiving message
                </script>
              </body>
            </html>
          `);
        }

        // For non-popup, redirect to dashboard
        return res.redirect('/dashboard?oauth=success');
      });
    })(req, res, next);
  });

  // Link Google account to existing user
  app.post('/api/auth/link/google', isAuthenticated, (req: any, res, next) => {
    const userId = req.user.claims.sub;
    const state = generateOAuthState(userId);
    
    const authenticator = passport.authenticate('google-oauth', {
      scope: ['profile', 'email'],
      state,
    });
    authenticator(req, res, next);
  });

  // Link Apple account to existing user
  app.post('/api/auth/link/apple', isAuthenticated, (req: any, res, next) => {
    const userId = req.user.claims.sub;
    const state = generateOAuthState(userId);
    
    const authenticator = passport.authenticate('apple-oauth', {
      scope: ['name', 'email'],
      state,
    });
    authenticator(req, res, next);
  });

  // Get connected accounts
  app.get('/api/auth/connected-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await getUserConnectedAccounts(userId);
      
      // Remove sensitive data before sending to client
      const safeAccounts = accounts.map(account => ({
        id: account.id,
        provider: account.provider,
        displayName: account.displayName,
        email: account.email,
        avatarUrl: account.avatarUrl,
        isActive: account.isActive,
        connectedAt: account.connectedAt,
        lastSyncAt: account.lastSyncAt,
      }));
      
      res.json(safeAccounts);
    } catch (error: any) {
      console.error('Error fetching connected accounts:', error);
      res.status(500).json({ message: 'Failed to fetch connected accounts' });
    }
  });

  // Unlink account
  app.delete('/api/auth/unlink/:provider', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = req.params.provider;
      
      const success = await unlinkAccount(userId, provider);
      
      if (!success) {
        return res.status(404).json({ message: 'Connected account not found' });
      }
      
      res.json({ message: 'Account unlinked successfully' });
    } catch (error: any) {
      console.error('Error unlinking account:', error);
      res.status(500).json({ message: 'Failed to unlink account' });
    }
  });

  // ===== GOALS ROUTES =====
  
  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = goalSchema.parse(req.body);
      
      const goal = await storage.createGoal({
        ...validatedData,
        userId,
        targetOutcome: validatedData.description || validatedData.title,
        status: 'active',
        progress: '0'
      });

      // Send goal creation notification
      const { notificationService } = await import('./notifications');
      await notificationService.createNotification({
        userId,
        type: 'goal_checkin',
        title: 'New Goal Created! 🎯',
        message: `You've created "${goal.title}". Let's make it happen!`,
        category: 'goals',
        priority: 'medium',
        relatedEntityIds: { goalId: goal.id },
        actionUrl: `/goals/${goal.id}`
      });
      
      res.json(goal);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error("Error creating goal:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error: any) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  // Get goal categories
  app.get('/api/goals/categories', async (req, res) => {
    try {
      const categories = [
        { id: 'tech', name: 'Technology', description: 'Programming, software development, and technical skills' },
        { id: 'data_science', name: 'Data Science', description: 'Analytics, machine learning, and data analysis' },
        { id: 'ai_ml', name: 'AI & Machine Learning', description: 'Artificial intelligence and machine learning projects' },
        { id: 'business', name: 'Business', description: 'Entrepreneurship, strategy, and business development' },
        { id: 'design', name: 'Design', description: 'UI/UX, graphic design, and creative projects' },
        { id: 'health', name: 'Health & Fitness', description: 'Physical wellness, nutrition, and healthy habits' },
        { id: 'career', name: 'Career', description: 'Professional development and career advancement' },
        { id: 'personal', name: 'Personal Development', description: 'Self-improvement and life skills' },
        { id: 'creative', name: 'Creative', description: 'Art, writing, music, and creative pursuits' },
        { id: 'finance', name: 'Finance', description: 'Financial planning, investing, and money management' }
      ];
      
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching goal categories:", error);
      res.status(500).json({ message: "Failed to fetch goal categories" });
    }
  });

  // Get goal templates
  app.get('/api/goals/templates', async (req, res) => {
    try {
      const { category } = req.query;
      
      const allTemplates = {
        tech: [
          {
            id: 'learn-react',
            title: 'Master React & TypeScript',
            description: 'Build advanced frontend skills with modern React patterns and TypeScript integration',
            category: 'tech',
            priority: 'high',
            estimatedDuration: 90,
            difficultyLevel: 7,
            estimatedHours: 120
          },
          {
            id: 'fullstack-app',
            title: 'Build Full-Stack Application',
            description: 'Create a complete web application with frontend, backend, and database',
            category: 'tech',
            priority: 'high',
            estimatedDuration: 120,
            difficultyLevel: 8,
            estimatedHours: 200
          }
        ],
        career: [
          {
            id: 'build-portfolio',
            title: 'Build Professional Portfolio',
            description: 'Create a professional portfolio showcasing best projects and technical skills',
            category: 'career',
            priority: 'medium',
            estimatedDuration: 60,
            difficultyLevel: 5,
            estimatedHours: 80
          },
          {
            id: 'job-search',
            title: 'Land Dream Job',
            description: 'Complete job search strategy including resume, networking, and interview prep',
            category: 'career',
            priority: 'high',
            estimatedDuration: 90,
            difficultyLevel: 6,
            estimatedHours: 100
          }
        ],
        health: [
          {
            id: 'fitness-routine',
            title: 'Establish Fitness Routine',
            description: 'Build a consistent workout routine and achieve target fitness metrics',
            category: 'health',
            priority: 'medium',
            estimatedDuration: 180,
            difficultyLevel: 4,
            estimatedHours: 150
          },
          {
            id: 'healthy-diet',
            title: 'Develop Healthy Eating Habits',
            description: 'Learn nutrition basics and establish sustainable healthy eating patterns',
            category: 'health',
            priority: 'medium',
            estimatedDuration: 120,
            difficultyLevel: 5,
            estimatedHours: 60
          }
        ],
        personal: [
          {
            id: 'read-books',
            title: 'Read 12 Books This Year',
            description: 'Expand knowledge and develop reading habit with diverse book selection',
            category: 'personal',
            priority: 'low',
            estimatedDuration: 365,
            difficultyLevel: 3,
            estimatedHours: 120
          },
          {
            id: 'learn-language',
            title: 'Learn a New Language',
            description: 'Achieve conversational fluency in a foreign language',
            category: 'personal',
            priority: 'medium',
            estimatedDuration: 365,
            difficultyLevel: 6,
            estimatedHours: 200
          }
        ],
        business: [
          {
            id: 'side-project',
            title: 'Launch Side Project',
            description: 'Build and deploy a meaningful SaaS application from concept to production',
            category: 'business',
            priority: 'high',
            estimatedDuration: 180,
            difficultyLevel: 8,
            estimatedHours: 300
          }
        ]
      };

      const templates = category ? (allTemplates as any)[category as string] || [] : Object.values(allTemplates).flat();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching goal templates:", error);
      res.status(500).json({ message: "Failed to fetch goal templates" });
    }
  });

  app.get('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = req.params.id;
      const goal = await storage.getGoalById(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Verify user owns this goal
      const userId = req.user.claims.sub;
      if (goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(goal);
    } catch (error: any) {
      console.error("Error fetching goal:", error);
      res.status(500).json({ message: "Failed to fetch goal" });
    }
  });

  // Update goal
  app.patch('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = req.params.id;
      const updates = req.body;
      
      // Verify goal exists and user owns it
      const goal = await storage.getGoalById(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const userId = req.user.claims.sub;
      if (goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update goal
      await storage.updateGoal(goalId, updates);
      
      // Get updated goal
      const updatedGoal = await storage.getGoalById(goalId);
      res.json(updatedGoal);
    } catch (error: any) {
      console.error("Error updating goal:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  // Delete goal
  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = req.params.id;
      
      // Verify goal exists and user owns it
      const goal = await storage.getGoalById(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const userId = req.user.claims.sub;
      if (goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Delete goal
      await storage.deleteGoal(goalId);
      res.json({ message: "Goal deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Complete goal
  app.post('/api/goals/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = req.params.id;
      
      // Verify goal exists and user owns it
      const goal = await storage.getGoalById(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const userId = req.user.claims.sub;
      if (goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Mark goal as completed
      await storage.updateGoal(goalId, {
        status: 'completed',
        progress: '100',
        completedAt: new Date()
      });
      
      // Award XP for goal completion
      const { gamificationService } = await import('./gamification');
      await gamificationService.awardXP(
        userId,
        100, // Base XP for goal completion
        'goal_completion',
        `Completed goal: ${goal.title}`,
        goalId
      );
      
      // Check for achievements
      await gamificationService.checkAchievements(userId, {
        type: 'goal_completed',
        value: 1
      });

      // Send goal completion notification
      const { notificationService } = await import('./notifications');
      await notificationService.createNotification({
        userId,
        type: 'goal_checkin',
        title: 'Goal Completed! 🏆',
        message: `Congratulations! You've successfully completed "${goal.title}".`,
        category: 'goals',
        priority: 'high',
        relatedEntityIds: { goalId: goal.id },
        actionUrl: `/goals/${goal.id}`
      });
      
      // Get updated goal
      const updatedGoal = await storage.getGoalById(goalId);
      res.json(updatedGoal);
    } catch (error: any) {
      console.error("Error completing goal:", error);
      res.status(500).json({ message: "Failed to complete goal" });
    }
  });

  // Update goal progress
  app.patch('/api/goals/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = req.params.id;
      const { progress } = req.body;
      
      // Validate progress value
      const progressValue = parseFloat(progress);
      if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
        return res.status(400).json({ message: "Progress must be a number between 0 and 100" });
      }
      
      // Verify goal exists and user owns it
      const goal = await storage.getGoalById(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const userId = req.user.claims.sub;
      if (goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update progress
      await storage.updateGoal(goalId, { progress: progressValue.toString() });
      
      // Award XP for progress milestones
      const oldProgress = parseFloat(goal.progress || '0');
      const milestones = [25, 50, 75];
      
      for (const milestone of milestones) {
        if (oldProgress < milestone && progressValue >= milestone) {
          const { gamificationService } = await import('./gamification');
          await gamificationService.awardXP(
            userId,
            20, // XP for milestone
            'goal_progress',
            `${milestone}% progress on goal: ${goal.title}`,
            goalId
          );

          // Send milestone notification
          const { notificationService } = await import('./notifications');
          await notificationService.createNotification({
            userId,
            type: 'goal_checkin',
            title: `${milestone}% Progress Milestone! 🎯`,
            message: `Great progress! You've reached ${milestone}% completion on "${goal.title}".`,
            category: 'goals',
            priority: milestone >= 75 ? 'high' : 'medium',
            relatedEntityIds: { goalId: goal.id },
            actionUrl: `/goals/${goal.id}`
          });
        }
      }
      
      // Get updated goal
      const updatedGoal = await storage.getGoalById(goalId);
      res.json(updatedGoal);
    } catch (error: any) {
      console.error("Error updating goal progress:", error);
      res.status(500).json({ message: "Failed to update goal progress" });
    }
  });

  // ===== TASKS ROUTES =====
  
  // Get next tasks
  app.get('/api/tasks/next', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 5;
      const tasks = await storage.getNextTasks(userId, limit);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching next tasks:", error);
      res.status(500).json({ message: "Failed to fetch next tasks" });
    }
  });

  // Create new task
  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskData = req.body;
      
      // Validate required fields
      if (!taskData.title || !taskData.goalId) {
        return res.status(400).json({ message: "Title and goal ID are required" });
      }
      
      // Verify user owns the goal
      const goal = await storage.getGoalById(taskData.goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized - invalid goal" });
      }
      
      // Get or create active task plan for this goal
      let activePlan = await storage.getActiveTaskPlan(taskData.goalId);
      if (!activePlan) {
        // Create a new task plan for this goal
        activePlan = await storage.createTaskPlan({
          goalId: taskData.goalId,
          planType: 'custom',
          totalTasks: 1,
          estimatedHours: Math.round(parseInt(taskData.estimatedDuration || '60') / 60).toString(), // convert minutes to hours
          complexityScore: taskData.difficultyRating || 5
        });
      }
      
      // Create the task
      const task = await storage.createTask({
        ...taskData,
        planId: activePlan.id,
        orderIndex: await storage.getUserTasksCount(userId) + 1,
        estimatedDuration: taskData.estimatedDuration || 60, // minutes
        priority: taskData.priority || 'medium',
        type: taskData.type || 'project'
      });
      
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Get all tasks for a user with enhanced filtering
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        goalId, 
        status, 
        priority, 
        limit = 50, 
        offset = 0, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;
      
      const options = {
        status: status as string,
        priority: priority as string,
        goalId: goalId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };
      
      const tasks = await storage.getUserTasks(userId, options);
      const totalCount = await storage.getUserTasksCount(userId, status as string);
      
      res.json({
        tasks,
        totalCount,
        currentPage: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get single task
  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const task = await storage.getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Verify user owns this task by checking the goal
      const goals = await storage.getUserGoals(req.user.claims.sub);
      const taskGoal = goals.find(goal => goal.id === task.planId);
      
      if (!taskGoal) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(task);
    } catch (error: any) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Update task
  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const updates = req.body;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const goals = await storage.getUserGoals(req.user.claims.sub);
      const taskGoal = goals.find(goal => goal.id === task.planId);
      
      if (!taskGoal) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update task
      await storage.updateTask(taskId, updates);
      
      // Get updated task
      const updatedTask = await storage.getTaskById(taskId);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Delete task
  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const goals = await storage.getUserGoals(req.user.claims.sub);
      const taskGoal = goals.find(goal => goal.id === task.planId);
      
      if (!taskGoal) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Delete task properly
      await storage.deleteTask(taskId);
      res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Complete task
  app.post('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const userId = req.user.claims.sub;
      const goals = await storage.getUserGoals(userId);
      const taskGoal = goals.find(goal => goal.id === task.planId);
      
      if (!taskGoal) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Mark task as completed
      await storage.updateTask(taskId, {
        status: 'completed',
        completedAt: new Date()
      });
      
      // Award XP for task completion
      const { gamificationService } = await import('./gamification');
      const xpAmount = Math.round((parseFloat(task.estimatedDuration?.toString() || '60') / 60) * 10); // 10 XP per estimated hour
      
      await gamificationService.awardXP(
        userId,
        xpAmount,
        'task_completion',
        `Completed task: ${task.title}`,
        taskId
      );
      
      // Check for achievements
      await gamificationService.checkAchievements(userId, {
        type: 'task_completed',
        value: 1
      });

      // Send task completion notification
      const { notificationService } = await import('./notifications');
      await notificationService.createNotification({
        userId,
        type: 'task_reminder',
        title: 'Task Completed! ✅',
        message: `Great job! You've completed "${task.title}" and earned ${xpAmount} XP.`,
        category: 'tasks',
        priority: 'medium',
        relatedEntityIds: { taskId: task.id, goalId: taskGoal.id },
        actionUrl: `/goals/${taskGoal.id}`
      });
      
      // Get updated task
      const updatedTask = await storage.getTaskById(taskId);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // ===== TASK TIMER MANAGEMENT =====
  
  // Start task timer
  app.post('/api/tasks/:id/timer/start', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Verify ownership through goal
      const goal = await storage.getGoalById(task.goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.startTaskTimer(taskId, userId);
      
      // Get updated task
      const updatedTask = await storage.getTaskById(taskId);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error starting task timer:", error);
      res.status(500).json({ message: "Failed to start task timer" });
    }
  });

  // Pause task timer
  app.post('/api/tasks/:id/timer/pause', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const goal = await storage.getGoalById(task.goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.pauseTaskTimer(taskId, userId);
      
      const updatedTask = await storage.getTaskById(taskId);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error pausing task timer:", error);
      res.status(500).json({ message: "Failed to pause task timer" });
    }
  });

  // Resume task timer
  app.post('/api/tasks/:id/timer/resume', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const goal = await storage.getGoalById(task.goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.resumeTaskTimer(taskId, userId);
      
      const updatedTask = await storage.getTaskById(taskId);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error resuming task timer:", error);
      res.status(500).json({ message: "Failed to resume task timer" });
    }
  });

  // Stop task timer
  app.post('/api/tasks/:id/timer/stop', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify task exists and user owns it
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const goal = await storage.getGoalById(task.goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.stopTaskTimer(taskId, userId);
      
      const updatedTask = await storage.getTaskById(taskId);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error stopping task timer:", error);
      res.status(500).json({ message: "Failed to stop task timer" });
    }
  });

  // Get active timer
  app.get('/api/tasks/timer/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activeTask = await storage.getActiveTimer(userId);
      res.json(activeTask);
    } catch (error: any) {
      console.error("Error fetching active timer:", error);
      res.status(500).json({ message: "Failed to fetch active timer" });
    }
  });

  // ===== BULK TASK OPERATIONS =====
  
  // Bulk update tasks
  app.patch('/api/tasks/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskIds, updates } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }
      
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ message: "Updates object is required" });
      }
      
      // Verify user owns all tasks
      for (const taskId of taskIds) {
        const task = await storage.getTaskById(taskId);
        if (!task) {
          return res.status(404).json({ message: `Task ${taskId} not found` });
        }
        
        const goal = await storage.getGoalById(task.goalId);
        if (!goal || goal.userId !== userId) {
          return res.status(403).json({ message: `Unauthorized for task ${taskId}` });
        }
      }
      
      await storage.bulkUpdateTasks(taskIds, updates);
      
      // If completing tasks, award XP
      if (updates.status === 'completed') {
        const { gamificationService } = await import('./gamification');
        
        for (const taskId of taskIds) {
          const task = await storage.getTaskById(taskId);
          if (task) {
            const xpAmount = Math.round((parseFloat(task.estimatedDuration?.toString() || '60') / 60) * 10);
            await gamificationService.awardXP(
              userId,
              xpAmount,
              'task_completion',
              `Completed task: ${task.title}`,
              taskId
            );
          }
        }
        
        await gamificationService.checkAchievements(userId, {
          type: 'task_completed',
          value: taskIds.length
        });
      }
      
      res.json({ message: `Successfully updated ${taskIds.length} tasks` });
    } catch (error: any) {
      console.error("Error bulk updating tasks:", error);
      res.status(500).json({ message: "Failed to bulk update tasks" });
    }
  });

  // Bulk delete tasks
  app.delete('/api/tasks/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskIds } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }
      
      await storage.bulkDeleteTasks(taskIds, userId);
      res.json({ message: `Successfully deleted ${taskIds.length} tasks` });
    } catch (error: any) {
      console.error("Error bulk deleting tasks:", error);
      res.status(500).json({ message: "Failed to bulk delete tasks" });
    }
  });

  // ===== TASK ANALYTICS =====
  
  // Get task analytics
  app.get('/api/tasks/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { period = '30d' } = req.query;
      
      const analytics = await storage.getTaskAnalytics(userId, period as string);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching task analytics:", error);
      res.status(500).json({ message: "Failed to fetch task analytics" });
    }
  });

  // Get task time logs
  app.get('/api/tasks/time-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 50 } = req.query;
      
      const timeLogs = await storage.getTaskTimeLogsForUser(userId, parseInt(limit as string));
      res.json(timeLogs);
    } catch (error: any) {
      console.error("Error fetching task time logs:", error);
      res.status(500).json({ message: "Failed to fetch task time logs" });
    }
  });

  // ===== TEAM MANAGEMENT ROUTES (Note: Main team endpoints moved to socialService implementation below) =====
  
  // Get user's teams
  app.get('/api/teams/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userTeams = await storage.getUserTeams(userId);
      
      // Format response to match frontend expectations
      const formattedTeams = userTeams.map(team => ({
        team: {
          id: team.teamId,
          name: team.teamName,
          description: team.teamDescription,
          avatarUrl: team.teamAvatarUrl,
          maxMembers: team.teamMaxMembers,
          isPublic: team.teamIsPublic,
          requiresApproval: team.teamRequiresApproval,
          totalXp: team.teamTotalXp,
          teamLevel: team.teamLevel,
          winStreak: team.teamWinStreak,
          challengesWon: team.teamChallengesWon,
          createdById: team.teamCreatedById,
          createdAt: team.teamCreatedAt,
          updatedAt: team.teamUpdatedAt
        },
        membership: {
          id: team.membershipId,
          userId: team.membershipUserId,
          teamId: team.membershipTeamId,
          role: team.membershipRole,
          contributionXp: team.membershipContributionXp,
          joinedAt: team.membershipJoinedAt
        }
      }));
      
      res.json(formattedTeams);
    } catch (error: any) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });
  
  // Get public teams for discovery
  app.get('/api/teams/public', isAuthenticated, async (req: any, res) => {
    try {
      const { limit = 20, search } = req.query;
      const publicTeams = await storage.getPublicTeams(parseInt(limit as string), search as string);
      res.json(publicTeams);
    } catch (error: any) {
      console.error("Error fetching public teams:", error);
      res.status(500).json({ message: "Failed to fetch public teams" });
    }
  });
  
  // Get team details
  app.get('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if user is a member of this team
      const userTeams = await storage.getUserTeams(userId);
      const isMember = userTeams.some(team => team.id === teamId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view this team" });
      }
      
      const team = await storage.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Get team members
      const members = await storage.getTeamMembers(teamId);
      
      // Format response to match frontend expectations
      const response = {
        team,
        members: members.map(member => ({
          user: {
            id: member.userId,
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            displayName: member.displayName,
            username: member.username,
            profileImageUrl: member.profileImageUrl
          },
          member: {
            id: member.id,
            userId: member.userId,
            role: member.role,
            contributionXp: member.contributionXp,
            joinedAt: member.joinedAt
          }
        }))
      };
      
      res.json(response);
    } catch (error: any) {
      console.error("Error fetching team details:", error);
      res.status(500).json({ message: "Failed to fetch team details" });
    }
  });
  
  // Update team
  app.put('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      // Check if user is owner or admin
      const userTeams = await storage.getUserTeams(userId);
      const userTeam = userTeams.find(team => team.id === teamId);
      
      if (!userTeam || (userTeam.role !== 'owner' && userTeam.role !== 'admin')) {
        return res.status(403).json({ message: "Not authorized to update this team" });
      }
      
      await storage.updateTeam(teamId, updates);
      
      const updatedTeam = await storage.getTeamById(teamId);
      res.json(updatedTeam);
    } catch (error: any) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });
  
  // Delete team
  app.delete('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if user is owner
      const userTeams = await storage.getUserTeams(userId);
      const userTeam = userTeams.find(team => team.id === teamId);
      
      if (!userTeam || userTeam.role !== 'owner') {
        return res.status(403).json({ message: "Only team owner can delete the team" });
      }
      
      await storage.deleteTeam(teamId);
      res.json({ message: "Team deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });
  
  // ===== TEAM MEMBER MANAGEMENT =====
  
  // Get team members
  app.get('/api/teams/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if user is a member
      const userTeams = await storage.getUserTeams(userId);
      const isMember = userTeams.some(team => team.teamId === teamId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view team members" });
      }
      
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });
  
  // Invite user to team
  app.post('/api/teams/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      const { inviteUserId, inviteEmail, role = 'member' } = req.body;
      
      // Check if user is owner or admin
      const userTeams = await storage.getUserTeams(userId);
      const userTeam = userTeams.find(team => team.teamId === teamId);
      
      if (!userTeam || (userTeam.membershipRole !== 'owner' && userTeam.membershipRole !== 'admin')) {
        return res.status(403).json({ message: "Not authorized to invite members" });
      }
      
      // Use social service to send invite with invite code generation
      const inviteCode = await socialService.sendTeamInvite(
        teamId,
        userId,
        inviteUserId,
        inviteEmail
      );
      
      res.json({ inviteCode });
    } catch (error: any) {
      console.error("Error inviting to team:", error);
      res.status(500).json({ message: "Failed to invite member" });
    }
  });
  
  // Accept team invitation / Join team
  app.post('/api/teams/:id/join', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      const { inviteCode } = req.body;
      
      // Use social service for proper team joining
      const member = await socialService.joinTeam(teamId, userId);
      
      // Award XP for joining team
      const { gamificationService } = await import('./gamification');
      await gamificationService.awardXP(
        userId,
        25, // XP for joining team
        'team_joined',
        `Joined a team`,
        teamId
      );
      
      res.json(member);
    } catch (error: any) {
      console.error("Error joining team:", error);
      res.status(500).json({ message: error.message || "Failed to join team" });
    }
  });
  
  // Update member role
  app.put('/api/teams/:id/member/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const targetUserId = req.params.userId;
      const currentUserId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!['owner', 'admin', 'member'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Check if current user is owner or admin
      const userTeams = await storage.getUserTeams(currentUserId);
      const userTeam = userTeams.find(team => team.id === teamId);
      
      if (!userTeam || (userTeam.role !== 'owner' && userTeam.role !== 'admin')) {
        return res.status(403).json({ message: "Not authorized to change member roles" });
      }
      
      // Owners can't be demoted by non-owners
      const members = await storage.getTeamMembers(teamId);
      const targetMember = members.find(member => member.userId === targetUserId);
      
      if (targetMember?.role === 'owner' && userTeam.role !== 'owner') {
        return res.status(403).json({ message: "Cannot change owner role" });
      }
      
      await storage.updateMemberRole(teamId, targetUserId, role);
      
      res.json({ message: "Member role updated successfully" });
    } catch (error: any) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });
  
  // Remove team member
  app.delete('/api/teams/:id/member/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const targetUserId = req.params.userId;
      const currentUserId = req.user.claims.sub;
      
      // Check if current user is owner or admin, or removing themselves
      const userTeams = await storage.getUserTeams(currentUserId);
      const userTeam = userTeams.find(team => team.id === teamId);
      
      const isOwnerOrAdmin = userTeam && (userTeam.role === 'owner' || userTeam.role === 'admin');
      const isRemovingSelf = currentUserId === targetUserId;
      
      if (!isOwnerOrAdmin && !isRemovingSelf) {
        return res.status(403).json({ message: "Not authorized to remove this member" });
      }
      
      // Can't remove team owner (unless they're removing themselves)
      const members = await storage.getTeamMembers(teamId);
      const targetMember = members.find(member => member.userId === targetUserId);
      
      if (targetMember?.role === 'owner' && !isRemovingSelf) {
        return res.status(403).json({ message: "Cannot remove team owner" });
      }
      
      await storage.removeTeamMember(teamId, targetUserId);
      
      res.json({ message: "Member removed successfully" });
    } catch (error: any) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });
  
  // ===== TEAM GOALS AND COLLABORATION =====
  
  // Create team goal
  app.post('/api/teams/:id/goals', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Validate request body with Zod
      const validatedData = insertTeamGoalSchema.parse({
        ...req.body,
        teamId
      });
      
      // Check if user has permission to create team goals
      const userTeams = await storage.getUserTeams(userId);
      const userTeam = userTeams.find(team => team.teamId === teamId);
      
      if (!userTeam) {
        return res.status(403).json({ message: "Not authorized to create team goals" });
      }
      
      // Only owners and admins can create team goals
      if (userTeam.membershipRole !== 'owner' && userTeam.membershipRole !== 'admin') {
        return res.status(403).json({ message: "Only team owners and admins can create goals" });
      }
      
      const teamGoal = await storage.createTeamGoal(validatedData);
      
      // Integrate with gamification - award XP for goal creation
      const { gamificationService } = await import('./gamification');
      await gamificationService.awardXP(
        userId,
        50, // XP for creating team goal
        'team_goal_created',
        `Created team goal: ${validatedData.title}`,
        teamGoal.id
      );
      
      res.json(teamGoal);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error("Error creating team goal:", error);
      res.status(500).json({ message: "Failed to create team goal" });
    }
  });
  
  // Get team goals
  app.get('/api/teams/:id/goals', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if user is a member
      const userTeams = await storage.getUserTeams(userId);
      const isMember = userTeams.some(team => team.teamId === teamId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view team goals" });
      }
      
      const goals = await storage.getTeamGoals(teamId);
      res.json(goals);
    } catch (error: any) {
      console.error("Error fetching team goals:", error);
      res.status(500).json({ message: "Failed to fetch team goals" });
    }
  });
  
  // Get team analytics
  app.get('/api/teams/:id/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if user is a member
      const userTeams = await storage.getUserTeams(userId);
      const isMember = userTeams.some(team => team.teamId === teamId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view team analytics" });
      }
      
      const analytics = await storage.getTeamAnalytics(teamId);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching team analytics:", error);
      res.status(500).json({ message: "Failed to fetch team analytics" });
    }
  });

  // ===== GAMIFICATION ROUTES =====
  

  // ===== ANALYTICS ROUTES =====
  
  // Get comprehensive performance metrics
  app.get('/api/analytics/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const metrics = await analyticsService.getPerformanceMetrics(userId, dateRange);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });
  
  // Get chart data for visualizations
  app.get('/api/analytics/charts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const chartData = await analyticsService.getChartData(userId, dateRange);
      res.json(chartData);
    } catch (error: any) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });
  
  // Get detailed analytics
  app.get('/api/analytics/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const detailed = await analyticsService.getDetailedAnalytics(userId, dateRange);
      res.json(detailed);
    } catch (error: any) {
      console.error("Error fetching detailed analytics:", error);
      res.status(500).json({ message: "Failed to fetch detailed analytics" });
    }
  });
  
  // Get AI-powered insights
  app.get('/api/analytics/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const insights = await analyticsService.generateAIInsights(userId, dateRange);
      res.json(insights);
    } catch (error: any) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });
  
  // ===== TEAM ANALYTICS ROUTES =====
  
  // Helper function to verify team membership
  const verifyTeamMembership = async (userId: string, teamId: string) => {
    const membership = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.teamId, teamId)
      ))
      .limit(1);
    
    return membership.length > 0 ? membership[0] : null;
  };

  // Get team analytics overview
  app.get('/api/analytics/team/overview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, range } = req.query;
      
      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
      }
      
      // Verify team membership
      const membership = await verifyTeamMembership(userId, teamId as string);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const teamAnalytics = await analyticsService.getTeamAnalytics(teamId as string, dateRange);
      res.json(teamAnalytics);
    } catch (error: any) {
      console.error("Error fetching team analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch team analytics overview" });
    }
  });

  // Get team performance metrics
  app.get('/api/analytics/team/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, range } = req.query;
      
      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
      }
      
      // Verify team membership
      const membership = await verifyTeamMembership(userId, teamId as string);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const teamPerformance = await analyticsService.getTeamPerformanceMetrics(teamId as string, dateRange);
      res.json(teamPerformance);
    } catch (error: any) {
      console.error("Error fetching team performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch team performance metrics" });
    }
  });

  // Get team member contributions
  app.get('/api/analytics/team/contributions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, range } = req.query;
      
      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
      }
      
      // Verify team membership
      const membership = await verifyTeamMembership(userId, teamId as string);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const teamContributions = await analyticsService.getTeamMemberContributions(teamId as string, dateRange);
      res.json(teamContributions);
    } catch (error: any) {
      console.error("Error fetching team contributions:", error);
      res.status(500).json({ message: "Failed to fetch team contributions" });
    }
  });

  // Export analytics data as CSV
  app.get('/api/analytics/export/csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      // Get all analytics data
      const [metrics, charts, detailed] = await Promise.all([
        analyticsService.getPerformanceMetrics(userId, dateRange),
        analyticsService.getChartData(userId, dateRange),
        analyticsService.getDetailedAnalytics(userId, dateRange)
      ]);
      
      // Convert to CSV format
      const csvData = [
        ['MasterMind AI Analytics Report'],
        ['Generated:', new Date().toISOString()],
        [''],
        ['Performance Metrics'],
        ['Goal Completion Rate', metrics.goalCompletionRate + '%'],
        ['Tasks Per Day', metrics.taskProductivity.tasksPerDay],
        ['Average Task Time', metrics.taskProductivity.averageCompletionTime + ' hours'],
        ['Overall Score', metrics.overallPerformanceScore],
        ['Current Streak', metrics.streakData.currentStreak + ' days'],
        [''],
        ['Time Tracking'],
        ['Hours Today', metrics.timeTracking.hoursToday],
        ['Hours This Week', metrics.timeTracking.hoursThisWeek],
        ['Hours This Month', metrics.timeTracking.hoursThisMonth],
        ['Daily Average', metrics.timeTracking.dailyAverage.toFixed(1) + ' hours'],
        [''],
        ['Goal Analytics'],
        ['Success Rate', detailed.goalAnalytics.successRate + '%'],
        ['Average Completion Time', detailed.goalAnalytics.averageTimeToComplete + ' days'],
        [''],
        ['Task Analytics'],
        ['Average Task Duration', detailed.taskAnalytics.averageTaskDuration + ' hours'],
        ['Overdue Tasks', detailed.taskAnalytics.overdueTasks],
        [''],
        ['Social Analytics'],
        ['Team Contribution', detailed.socialAnalytics.teamContribution],
        ['Challenge Performance', detailed.socialAnalytics.challengePerformance],
        ['Posts Shared', detailed.socialAnalytics.postsShared]
      ];
      
      const csv = csvData.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Failed to export analytics" });
    }
  });
  
  // Generate analytics PDF report
  app.get('/api/analytics/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      // For PDF generation, we would typically use a library like puppeteer or pdfkit
      // For now, return a structured JSON that could be converted to PDF on the frontend
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const [metrics, charts, detailed, insights] = await Promise.all([
        analyticsService.getPerformanceMetrics(userId, dateRange),
        analyticsService.getChartData(userId, dateRange),
        analyticsService.getDetailedAnalytics(userId, dateRange),
        analyticsService.generateAIInsights(userId, dateRange)
      ]);
      
      const report = {
        title: 'MasterMind AI Analytics Report',
        generatedAt: new Date().toISOString(),
        dateRange: dateRange?.label || 'Last 30 Days',
        metrics,
        charts,
        detailed,
        insights
      };
      
      res.json(report);
    } catch (error: any) {
      console.error("Error generating PDF report:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // ===== ADDITIONAL ANALYTICS ENDPOINTS =====
  
  // Analytics overview - Key metrics summary
  app.get('/api/analytics/overview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const [metrics, profile] = await Promise.all([
        analyticsService.getPerformanceMetrics(userId, dateRange),
        storage.getUserProfile(userId)
      ]);
      
      const overview = {
        performanceScore: metrics.overallPerformanceScore,
        goalCompletionRate: metrics.goalCompletionRate,
        tasksCompletedToday: Math.round(metrics.taskProductivity.tasksPerDay),
        currentStreak: metrics.streakData.currentStreak,
        totalXP: profile?.totalXp || 0,
        currentLevel: profile?.currentLevel || 1,
        hoursThisWeek: metrics.timeTracking.hoursThisWeek,
        consistencyScore: metrics.streakData.consistencyScore,
        peakHours: metrics.taskProductivity.peakHours,
        lastUpdated: new Date().toISOString()
      };
      
      res.json(overview);
    } catch (error: any) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });
  
  // Goals progress analytics
  app.get('/api/analytics/goals-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range, category } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const detailed = await analyticsService.getDetailedAnalytics(userId, dateRange);
      const chartData = await analyticsService.getChartData(userId, dateRange);
      
      // Get active goals for progress tracking
      const activeGoals = await storage.getUserGoals(userId, 'active');
      const completedGoals = await storage.getUserGoals(userId, 'completed');
      
      const goalsProgress = {
        overview: {
          totalGoals: activeGoals.length + completedGoals.length,
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          successRate: detailed.goalAnalytics.successRate,
          averageCompletionTime: detailed.goalAnalytics.averageTimeToComplete
        },
        progressData: chartData.goalProgress,
        progressOverTime: chartData.progressOverTime.goals,
        difficultyBreakdown: detailed.goalAnalytics.difficultyBreakdown,
        completionByCategory: detailed.goalAnalytics.completionByCategory,
        categoryPerformance: chartData.categoryPerformance,
        predictions: detailed.goalAnalytics.predictionAccuracy
      };
      
      res.json(goalsProgress);
    } catch (error: any) {
      console.error("Error fetching goals progress analytics:", error);
      res.status(500).json({ message: "Failed to fetch goals progress analytics" });
    }
  });
  
  // Tasks performance analytics
  app.get('/api/analytics/tasks-performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range, priority, status } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const [detailed, chartData, metrics] = await Promise.all([
        analyticsService.getDetailedAnalytics(userId, dateRange),
        analyticsService.getChartData(userId, dateRange),
        analyticsService.getPerformanceMetrics(userId, dateRange)
      ]);
      
      // Get tasks for additional analysis
      const userTasks = await storage.getUserTasks(userId, {
        priority: priority as string,
        status: status as string,
        limit: 100
      });
      
      const tasksPerformance = {
        overview: {
          tasksPerDay: metrics.taskProductivity.tasksPerDay,
          averageCompletionTime: metrics.taskProductivity.averageCompletionTime,
          peakHours: metrics.taskProductivity.peakHours,
          totalTasks: userTasks.length,
          overdueTasks: detailed.taskAnalytics.overdueTasks
        },
        completionPatterns: detailed.taskAnalytics.completionPatterns,
        peakProductivityHours: detailed.taskAnalytics.peakProductivityHours,
        taskTypeDistribution: detailed.taskAnalytics.taskTypeDistribution,
        progressOverTime: chartData.progressOverTime.tasks,
        velocityTrend: chartData.progressOverTime.tasks.map((item, index, arr) => ({
          date: item.date,
          velocity: index > 0 ? item.completed - arr[index - 1].completed : item.completed
        })),
        productivityByDay: detailed.timeAnalytics.productivityByDayOfWeek
      };
      
      res.json(tasksPerformance);
    } catch (error: any) {
      console.error("Error fetching tasks performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch tasks performance analytics" });
    }
  });
  
  // Time tracking analytics
  app.get('/api/analytics/time-tracking', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      const [metrics, detailed, chartData] = await Promise.all([
        analyticsService.getPerformanceMetrics(userId, dateRange),
        analyticsService.getDetailedAnalytics(userId, dateRange),
        analyticsService.getChartData(userId, dateRange)
      ]);
      
      const timeTracking = {
        overview: {
          hoursToday: metrics.timeTracking.hoursToday,
          hoursThisWeek: metrics.timeTracking.hoursThisWeek,
          hoursThisMonth: metrics.timeTracking.hoursThisMonth,
          dailyAverage: metrics.timeTracking.dailyAverage,
          optimalSessionLength: detailed.timeAnalytics.optimalSessionLength
        },
        dailyPattern: detailed.timeAnalytics.focusTimePerDay,
        weeklyPattern: detailed.timeAnalytics.productivityByDayOfWeek,
        breakPatterns: detailed.timeAnalytics.breakPatterns,
        timeDistribution: chartData.timeDistribution,
        dailyActivity: chartData.dailyActivity,
        focusVsBreakRatio: {
          focusTime: detailed.timeAnalytics.focusTimePerDay.reduce((sum, day) => sum + day.hours, 0),
          breakTime: detailed.timeAnalytics.breakPatterns.reduce((sum, pattern) => sum + pattern.duration, 0)
        },
        peakProductivityWindows: metrics.taskProductivity.peakHours.map(hour => ({
          hour,
          label: `${hour}:00 - ${hour + 1}:00`
        }))
      };
      
      res.json(timeTracking);
    } catch (error: any) {
      console.error("Error fetching time tracking analytics:", error);
      res.status(500).json({ message: "Failed to fetch time tracking analytics" });
    }
  });
  
  // Achievements timeline analytics
  app.get('/api/analytics/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range } = req.query;
      
      let dateRange: { start: Date; end: Date; label: string } | undefined;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      // Get user achievements and XP transactions
      const [userAchievements, xpHistory, profile] = await Promise.all([
        storage.getUserAchievements(userId),
        storage.getXPTransactionHistory(userId, 50),
        storage.getUserProfile(userId)
      ]);
      
      // Filter achievements by date range if specified
      const filteredAchievements = dateRange 
        ? userAchievements.filter(a => a.unlockedAt && new Date(a.unlockedAt) >= dateRange.start && new Date(a.unlockedAt) <= dateRange.end)
        : userAchievements;
      
      // Create achievement timeline
      const achievementTimeline = filteredAchievements
        .sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime())
        .map(achievement => ({
          id: achievement.id,
          title: achievement.achievementId || 'Achievement',
          description: '',
          category: 'general',
          earnedAt: achievement.unlockedAt,
          xpAwarded: 0,
          badge: '🏆'
        }));
      
      // Create XP growth timeline
      const xpTimeline = xpHistory
        .filter(tx => !dateRange || (tx.createdAt && new Date(tx.createdAt) >= dateRange.start && new Date(tx.createdAt) <= dateRange.end))
        .map(tx => ({
          date: tx.createdAt,
          xpGained: tx.delta,
          source: tx.source,
          description: tx.reason,
          relatedId: tx.sourceId
        }))
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      
      // Calculate milestones
      const milestones = [];
      const currentXP = profile?.totalXp || 0;
      const currentLevel = profile?.currentLevel || 1;
      
      // Add level milestones
      for (let level = 1; level <= currentLevel; level++) {
        const xpRequired = level * 1000; // Simple level calculation
        const levelAchievement = xpHistory.find(tx => 
          tx.source === 'level_up' && tx.reason?.includes(`Level ${level}`)
        );
        
        if (levelAchievement) {
          milestones.push({
            type: 'level',
            level,
            xpRequired,
            achievedAt: levelAchievement.createdAt,
            title: `Reached Level ${level}`,
            badge: '⭐'
          });
        }
      }
      
      const achievementsAnalytics = {
        overview: {
          totalAchievements: userAchievements.length,
          achievementsThisPeriod: filteredAchievements.length,
          totalXP: currentXP,
          currentLevel,
          xpThisPeriod: xpTimeline.reduce((sum, tx) => sum + tx.xpGained, 0),
          averageXpPerDay: xpTimeline.length > 0 ? Math.round(xpTimeline.reduce((sum, tx) => sum + tx.xpGained, 0) / Math.max(1, differenceInDays(dateRange?.end || new Date(), dateRange?.start || subDays(new Date(), 30)))) : 0
        },
        achievementTimeline,
        xpTimeline: xpTimeline.slice(0, 20), // Last 20 XP transactions
        milestones,
        categoryBreakdown: achievementTimeline.reduce((acc, achievement) => {
          acc[achievement.category] = (acc[achievement.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentUnlocks: achievementTimeline.slice(0, 5),
        progressToNextLevel: {
          currentLevel,
          nextLevel: currentLevel + 1,
          currentXP,
          xpForNextLevel: (currentLevel + 1) * 1000,
          xpNeeded: Math.max(0, (currentLevel + 1) * 1000 - currentXP),
          progress: Math.min(100, (currentXP / ((currentLevel + 1) * 1000)) * 100)
        }
      };
      
      res.json(achievementsAnalytics);
    } catch (error: any) {
      console.error("Error fetching achievements analytics:", error);
      res.status(500).json({ message: "Failed to fetch achievements analytics" });
    }
  });
  
  // General export endpoint with format selection
  app.get('/api/analytics/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { range, format = 'json', sections } = req.query;
      
      let dateRange: { start: Date; end: Date; label: string } | undefined;
      if (range) {
        const days = parseInt(range as string);
        dateRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: `Last ${days} Days`
        };
      }
      
      // Determine which sections to include
      const includeSections = sections ? (sections as string).split(',') : ['overview', 'goals', 'tasks', 'time', 'achievements'];
      
      const exportData: any = {
        generatedAt: new Date().toISOString(),
        userId,
        dateRange: dateRange?.label || 'All time',
        format
      };
      
      // Collect requested data sections using direct service calls
      const [metrics, detailed, chartData] = await Promise.all([
        analyticsService.getPerformanceMetrics(userId, dateRange),
        analyticsService.getDetailedAnalytics(userId, dateRange),
        analyticsService.getChartData(userId, dateRange)
      ]);
      
      if (includeSections.includes('overview')) {
        const profile = await storage.getUserProfile(userId);
        exportData.overview = {
          performanceScore: metrics.overallPerformanceScore,
          goalCompletionRate: metrics.goalCompletionRate,
          tasksCompletedToday: Math.round(metrics.taskProductivity.tasksPerDay),
          currentStreak: metrics.streakData.currentStreak,
          totalXP: profile?.totalXp || 0,
          currentLevel: profile?.currentLevel || 1,
          hoursThisWeek: metrics.timeTracking.hoursThisWeek,
          consistencyScore: metrics.streakData.consistencyScore,
          peakHours: metrics.taskProductivity.peakHours,
          lastUpdated: new Date().toISOString()
        };
      }
      
      if (includeSections.includes('goals')) {
        const [activeGoals, completedGoals] = await Promise.all([
          storage.getUserGoals(userId, 'active'),
          storage.getUserGoals(userId, 'completed')
        ]);
        
        exportData.goalsProgress = {
          overview: {
            totalGoals: activeGoals.length + completedGoals.length,
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            successRate: detailed.goalAnalytics.successRate,
            averageCompletionTime: detailed.goalAnalytics.averageTimeToComplete
          },
          progressData: chartData.goalProgress,
          progressOverTime: chartData.progressOverTime.goals,
          difficultyBreakdown: detailed.goalAnalytics.difficultyBreakdown,
          completionByCategory: detailed.goalAnalytics.completionByCategory,
          categoryPerformance: chartData.categoryPerformance,
          predictions: detailed.goalAnalytics.predictionAccuracy
        };
      }
      
      if (includeSections.includes('tasks')) {
        const userTasks = await storage.getUserTasks(userId, { limit: 100 });
        
        exportData.tasksPerformance = {
          overview: {
            tasksPerDay: metrics.taskProductivity.tasksPerDay,
            averageCompletionTime: metrics.taskProductivity.averageCompletionTime,
            peakHours: metrics.taskProductivity.peakHours,
            totalTasks: userTasks.length,
            overdueTasks: detailed.taskAnalytics.overdueTasks
          },
          completionPatterns: detailed.taskAnalytics.completionPatterns,
          peakProductivityHours: detailed.taskAnalytics.peakProductivityHours,
          taskTypeDistribution: detailed.taskAnalytics.taskTypeDistribution,
          progressOverTime: chartData.progressOverTime.tasks,
          velocityTrend: chartData.progressOverTime.tasks.map((item, index, arr) => ({
            date: item.date,
            velocity: index > 0 ? item.completed - arr[index - 1].completed : item.completed
          })),
          productivityByDay: detailed.timeAnalytics.productivityByDayOfWeek
        };
      }
      
      if (includeSections.includes('time')) {
        exportData.timeTracking = {
          overview: {
            hoursToday: metrics.timeTracking.hoursToday,
            hoursThisWeek: metrics.timeTracking.hoursThisWeek,
            hoursThisMonth: metrics.timeTracking.hoursThisMonth,
            dailyAverage: metrics.timeTracking.dailyAverage,
            optimalSessionLength: detailed.timeAnalytics.optimalSessionLength
          },
          dailyPattern: detailed.timeAnalytics.focusTimePerDay,
          weeklyPattern: detailed.timeAnalytics.productivityByDayOfWeek,
          breakPatterns: detailed.timeAnalytics.breakPatterns,
          timeDistribution: chartData.timeDistribution,
          dailyActivity: chartData.dailyActivity,
          focusVsBreakRatio: {
            focusTime: detailed.timeAnalytics.focusTimePerDay.reduce((sum, day) => sum + day.hours, 0),
            breakTime: detailed.timeAnalytics.breakPatterns.reduce((sum, pattern) => sum + pattern.duration, 0)
          },
          peakProductivityWindows: metrics.taskProductivity.peakHours.map(hour => ({
            hour,
            label: `${hour}:00 - ${hour + 1}:00`
          }))
        };
      }
      
      if (includeSections.includes('achievements')) {
        const [userAchievements, xpHistory, profile] = await Promise.all([
          storage.getUserAchievements(userId),
          storage.getXPTransactionHistory(userId, 50),
          storage.getUserProfile(userId)
        ]);
        
        const filteredAchievements = dateRange 
          ? userAchievements.filter(a => a.unlockedAt && new Date(a.unlockedAt) >= dateRange.start && new Date(a.unlockedAt) <= dateRange.end)
          : userAchievements;
        
        const achievementTimeline = filteredAchievements
          .sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime())
          .map(achievement => ({
            id: achievement.id,
            title: achievement.achievementId || 'Achievement',
            description: '',
            category: 'general',
            earnedAt: achievement.unlockedAt,
            xpAwarded: 0,
            badge: '🏆'
          }));
        
        const xpTimeline = xpHistory
          .filter(tx => !dateRange || (tx.createdAt && new Date(tx.createdAt) >= dateRange.start && new Date(tx.createdAt) <= dateRange.end))
          .map(tx => ({
            date: tx.createdAt,
            xpGained: tx.delta,
            source: tx.source,
            description: tx.reason,
            relatedId: tx.sourceId
          }))
          .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        
        exportData.achievements = {
          overview: {
            totalAchievements: userAchievements.length,
            achievementsThisPeriod: filteredAchievements.length,
            totalXP: profile?.totalXp || 0,
            currentLevel: profile?.currentLevel || 1,
            xpThisPeriod: xpTimeline.reduce((sum, tx) => sum + tx.xpGained, 0),
            averageXpPerDay: xpTimeline.length > 0 ? Math.round(xpTimeline.reduce((sum, tx) => sum + tx.xpGained, 0) / Math.max(1, differenceInDays(dateRange?.end || new Date(), dateRange?.start || subDays(new Date(), 30)))) : 0
          },
          achievementTimeline,
          xpTimeline: xpTimeline.slice(0, 20),
          categoryBreakdown: achievementTimeline.reduce((acc, achievement) => {
            acc[achievement.category] = (acc[achievement.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          recentUnlocks: achievementTimeline.slice(0, 5)
        };
      }
      
      // Return in requested format
      if (format === 'csv') {
        // Convert to CSV format
        const csvLines = [
          ['Analytics Export Report'],
          ['Generated:', exportData.generatedAt],
          ['Date Range:', exportData.dateRange],
          [''],
        ];
        
        // Add overview data
        if (exportData.overview) {
          csvLines.push(['Overview']);
          Object.entries(exportData.overview).forEach(([key, value]) => {
            csvLines.push([key, String(value)]);
          });
          csvLines.push(['']);
        }
        
        const csv = csvLines.map(row => row.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        // Return as JSON
        res.setHeader('Content-Type', 'application/json');
        if (format === 'download') {
          res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.json"`);
        }
        res.json(exportData);
      }
    } catch (error: any) {
      console.error("Error exporting analytics data:", error);
      res.status(500).json({ message: "Failed to export analytics data" });
    }
  });

  // ===== AI MENTOR ROUTES =====
  
  // Interactive AI mentor chat with context awareness
  app.post('/api/ai-mentor/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, goalId, context } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const result = await aiMentor.chat(userId, message, goalId, context);
      res.json(result);
    } catch (error: any) {
      console.error("Error in AI mentor chat:", error);
      res.status(500).json({ 
        response: "I'm here to help! Let me know what you're working on.",
        suggestions: ["Tell me about your goals", "What challenges are you facing?", "How can I help?"]
      });
    }
  });
  
  // AI-powered goal planning and breakdown
  app.post('/api/ai-mentor/goal-planning', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, targetDate } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Goal title is required' });
      }
      
      const plan = await aiMentor.planGoal(userId, title, description, targetDate);
      res.json(plan);
    } catch (error: any) {
      console.error("Error in goal planning:", error);
      res.status(500).json({ message: "Failed to generate goal plan" });
    }
  });
  
  // Get personalized daily insights  
  app.get('/api/ai-mentor/daily-insight', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const insight = await aiMentor.getDailyInsight(userId);
      res.json(insight);
    } catch (error: any) {
      console.error("Error getting daily insight:", error);
      res.status(500).json({ 
        insight: "Every expert was once a beginner. Keep pushing forward!",
        motivation: "You're on the right track. Today is a new opportunity to make progress.",
        focusArea: "Complete one task that moves you closer to your goal",
        challenge: "Work for 25 focused minutes without distractions"
      });
    }
  });
  
  // Get AI advice for specific tasks
  app.post('/api/ai-mentor/task-advice', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskTitle, taskDescription, context } = req.body;
      
      if (!taskTitle) {
        return res.status(400).json({ error: 'Task title is required' });
      }
      
      const advice = await aiMentor.getTaskAdvice(userId, taskTitle, taskDescription, context);
      res.json(advice);
    } catch (error: any) {
      console.error("Error getting task advice:", error);
      res.status(500).json({ message: "Failed to get task advice" });
    }
  });
  
  // Analyze user performance
  app.get('/api/ai-mentor/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysis = await aiMentor.analyzePerformance(userId);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing performance:", error);
      res.status(500).json({ message: "Failed to analyze performance" });
    }
  });
  
  // Legacy mentor endpoint for backward compatibility
  app.post('/api/mentor/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { query, goalId, sessionType } = req.body;
      
      // Redirect to new AI mentor endpoint
      const result = await aiMentor.chat(userId, query, goalId, { sessionType });
      res.json({ response: result.response });
    } catch (error: any) {
      console.error("Error in mentor chat:", error);
      res.status(500).json({ message: "Failed to process mentor chat" });
    }
  });
  
  // ===== AI COACH ROUTES =====
  
  // AI Coach - Enhanced coaching system with new endpoints
  // GET /api/ai-coach/daily-insight - Daily AI-powered insights and coaching messages
  app.get('/api/ai-coach/daily-insight', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const insight = await aiMentor.getDailyInsight(userId);
      res.json(insight);
    } catch (error: any) {
      console.error("Error getting AI coach daily insight:", error);
      res.status(500).json({ 
        insight: "Every expert was once a beginner. Keep pushing forward!",
        motivation: "You're on the right track. Today is a new opportunity to make progress.",
        focusArea: "Complete one task that moves you closer to your goal",
        challenge: "Work for 25 focused minutes without distractions"
      });
    }
  });

  // GET /api/ai-coach/recommendations - Personalized goal and performance recommendations
  app.get('/api/ai-coach/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendations = await aiMentor.getRecommendations(userId);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error getting AI coach recommendations:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  // POST /api/ai-coach/chat - Interactive AI coaching chat
  app.post('/api/ai-coach/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, goalId, context } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const result = await aiMentor.chat(userId, message, goalId, context);
      res.json(result);
    } catch (error: any) {
      console.error("Error in AI coach chat:", error);
      res.status(500).json({ 
        response: "I'm here to help! Let me know what you're working on.",
        suggestions: ["Tell me about your goals", "What challenges are you facing?", "How can I help?"]
      });
    }
  });

  // GET /api/ai-coach/performance-analysis - Advanced performance analysis and insights
  app.get('/api/ai-coach/performance-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get both performance analysis and pattern analysis
      const [analysis, patterns] = await Promise.all([
        aiMentor.analyzePerformance(userId),
        aiMentor.analyzeUserPatterns(userId)
      ]);
      
      res.json({
        ...analysis,
        patterns,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error analyzing performance:", error);
      res.status(500).json({ message: "Failed to analyze performance" });
    }
  });

  // POST /api/ai-coach/replan-goals - Smart goal replanning based on performance
  app.post('/api/ai-coach/replan-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goalIds, reason } = req.body;
      
      if (!goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
        return res.status(400).json({ error: 'goalIds array is required' });
      }
      
      const replanResults = await aiMentor.replanGoals(userId, goalIds, reason);
      res.json(replanResults);
    } catch (error: any) {
      console.error("Error replanning goals:", error);
      res.status(500).json({ message: "Failed to replan goals" });
    }
  });

  // GET /api/ai-coach/conversation-history - Coaching conversation history and logs
  app.get('/api/ai-coach/conversation-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 10 } = req.query;
      
      const history = await aiMentor.getConversationHistory(userId, parseInt(limit as string));
      res.json(history);
    } catch (error: any) {
      console.error("Error getting conversation history:", error);
      res.status(500).json({ message: "Failed to get conversation history" });
    }
  });

  // ===== ENHANCED AI ROUTES =====
  // New optimized AI routes using free APIs and intelligent caching
  
  // POST /api/ai/enhanced-chat - Enhanced AI chat with free APIs and fallbacks
  app.post('/api/ai/enhanced-chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, type = 'chat' } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const result = await aiMentorEnhanced.chat(userId, message, type);
      res.json(result);
    } catch (error: any) {
      console.error("Error in enhanced AI chat:", error);
      res.status(500).json({ 
        response: "I'm here to help you grow! What would you like to work on?",
        source: 'fallback',
        cached: false
      });
    }
  });
  
  // GET /api/ai/insights - Get AI-powered personalized insights
  app.get('/api/ai/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await aiMentorEnhanced.getInsights(userId);
      res.json({ insights, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error("Error getting AI insights:", error);
      res.status(500).json({ 
        insights: [
          "💪 Focus on consistency over intensity.",
          "🎯 Small daily actions lead to big results.",
          "✨ You're capable of more than you think!"
        ]
      });
    }
  });
  
  // GET /api/ai/motivational-quote - Get a random motivational quote
  app.get('/api/ai/motivational-quote', isAuthenticated, async (req: any, res) => {
    try {
      const quote = aiMentorEnhanced.getQuote();
      res.json({ quote, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error("Error getting motivational quote:", error);
      res.status(500).json({ 
        quote: "The secret of getting ahead is getting started. - Mark Twain"
      });
    }
  });
  
  // GET /api/ai/smart-suggestions - Get AI-powered suggestions based on context
  app.get('/api/ai/smart-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.query;
      const suggestions = await aiMentorEnhanced.getSuggestions(userId, category as string);
      res.json({ suggestions, category, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error("Error getting smart suggestions:", error);
      res.status(500).json({ 
        suggestions: [
          "Set one small, achievable goal for today",
          "Take 10 minutes for self-reflection",
          "Celebrate a recent win, no matter how small"
        ]
      });
    }
  });
  
  // POST /api/ai/motivation - Get AI-powered motivation
  app.post('/api/ai/motivation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await aiMentorEnhanced.chat(
        userId, 
        "Give me motivation to keep going", 
        'motivation'
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error getting AI motivation:", error);
      res.status(500).json({ 
        response: "You're doing amazing! Every step forward, no matter how small, is progress. Keep believing in yourself! 💪✨",
        source: 'fallback',
        cached: false
      });
    }
  });

  // ===== VOICE AI ROUTES =====
  
  // Configure multer for audio uploads
  const audioUploadDir = path.join(process.cwd(), 'uploads', 'voice-recordings');
  if (!fs.existsSync(audioUploadDir)) {
    fs.mkdirSync(audioUploadDir, { recursive: true });
  }
  
  const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, audioUploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (OpenAI limit)
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio format. Allowed: webm, mp4, wav, mpeg, ogg'));
      }
    }
  });

  // POST /api/coach/voice/transcribe - Speech-to-Text using OpenAI Whisper
  app.post('/api/coach/voice/transcribe', isAuthenticated, uploadRateLimit, uploadAudio.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Import OpenAI from aiMentor
      const { default: OpenAI } = await import('openai');
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'sk-dummy-key-for-development') {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(503).json({ 
          error: 'Voice transcription unavailable',
          message: 'OpenAI API key not configured' 
        });
      }

      const openai = new OpenAI({ apiKey });
      const audioFilePath = req.file.path;

      try {
        // Transcribe audio using Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(audioFilePath),
          model: 'whisper-1',
          language: 'tr', // Turkish language
          response_format: 'verbose_json'
        });

        // Clean up uploaded file
        fs.unlinkSync(audioFilePath);

        res.json({
          transcript: transcription.text,
          confidence: 1.0, // Whisper doesn't provide confidence, using 1.0 as default
          language: transcription.language || 'tr',
          duration: transcription.duration
        });
      } catch (transcriptionError: any) {
        // Clean up uploaded file on error
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
        console.error("Transcription error:", transcriptionError);
        res.status(500).json({ 
          error: 'Transcription failed',
          message: transcriptionError.message 
        });
      }
    } catch (error: any) {
      console.error("Voice transcribe error:", error);
      res.status(500).json({ 
        error: 'Failed to process audio',
        message: error.message 
      });
    }
  });

  // POST /api/coach/voice/speak - Text-to-Speech using OpenAI TTS
  app.post('/api/coach/voice/speak', isAuthenticated, async (req: any, res) => {
    try {
      const { text, voice = 'alloy', speed = 1.0 } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (text.length > 4096) {
        return res.status(400).json({ error: 'Text too long (max 4096 characters)' });
      }

      // Import OpenAI
      const { default: OpenAI } = await import('openai');
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'sk-dummy-key-for-development') {
        return res.status(503).json({ 
          error: 'Text-to-speech unavailable',
          message: 'OpenAI API key not configured' 
        });
      }

      const openai = new OpenAI({ apiKey });

      // Validate voice model
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

      // Validate speed (0.25 to 4.0 according to OpenAI docs)
      const validSpeed = Math.max(0.25, Math.min(4.0, speed));

      // Generate speech
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: selectedVoice as any,
        input: text,
        speed: validSpeed
      });

      // Convert response to buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Set headers for audio streaming
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
        'Cache-Control': 'no-cache'
      });

      res.send(buffer);
    } catch (error: any) {
      console.error("Text-to-speech error:", error);
      res.status(500).json({ 
        error: 'Failed to generate speech',
        message: error.message 
      });
    }
  });
  
  // ===== GAMIFICATION ROUTES =====
  
  // Import gamification service
  const { gamificationService } = await import('./gamification');
  
  // Initialize gamification data
  app.post('/api/gamification/initialize', async (req, res) => {
    try {
      // Use the comprehensive system initialization
      await gamificationService.initializeSystem();
      await gamificationService.initializeDailyChallenges();
      res.json({ message: "Gamification system initialized successfully" });
    } catch (error: any) {
      console.error("Error initializing gamification:", error);
      res.status(500).json({ message: "Failed to initialize gamification" });
    }
  });
  
  // Get user's gamification profile
  app.get('/api/gamification/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Use the comprehensive profile method
      const profile = await gamificationService.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "User profile not found" });
      }
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error fetching gamification profile:", error);
      res.status(500).json({ message: "Failed to fetch gamification profile" });
    }
  });
  
  // Process daily login and streaks with rate limiting
  app.post('/api/gamification/daily-login', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check idempotency - can user do daily login?
      const canLogin = await gamificationService.canDoDailyLogin(userId);
      if (!canLogin) {
        return res.status(400).json({ 
          message: "Daily login already claimed today",
          rewardClaimed: false
        });
      }
      
      const result = await gamificationService.updateLoginStreak(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error processing daily login:", error);
      res.status(500).json({ message: "Failed to process daily login" });
    }
  });
  
  // Get recent achievements for dashboard
  app.get('/api/gamification/achievements/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 5 } = req.query;
      
      // Use the comprehensive recent achievements method
      const recentAchievements = await gamificationService.getRecentAchievements(
        userId, 
        parseInt(limit as string)
      );
      
      res.json(recentAchievements);
    } catch (error: any) {
      console.error("Error fetching recent achievements:", error);
      res.status(500).json({ message: "Failed to fetch recent achievements" });
    }
  });

  // Get all achievements with user progress
  app.get('/api/gamification/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Use the comprehensive all achievements method
      const userAchievements = await gamificationService.getAllUserAchievements(userId);
      
      res.json(userAchievements);
    } catch (error: any) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });
  
  // Toggle achievement showcase
  app.patch('/api/gamification/achievements/:achievementId/showcase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { achievementId } = req.params;
      const { showcased } = req.body;
      
      await db.update(userAchievements)
        .set({ showcased })
        .where(and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId)
        ));
      
      res.json({ message: "Showcase status updated" });
    } catch (error: any) {
      console.error("Error updating showcase:", error);
      res.status(500).json({ message: "Failed to update showcase" });
    }
  });
  
  // Get daily challenges
  app.get('/api/gamification/challenges/daily', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Use the comprehensive daily challenges with progress method
      const challengesWithProgress = await gamificationService.getDailyChallengesWithProgress(userId);
      
      res.json(challengesWithProgress);
    } catch (error: any) {
      console.error("Error fetching daily challenges:", error);
      res.status(500).json({ message: "Failed to fetch daily challenges" });
    }
  });
  
  // Update challenge progress
  app.post('/api/gamification/challenges/:challengeId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { challengeId } = req.params;
      const { increment } = req.body;
      
      const progress = await gamificationService.updateChallengeProgress(userId, challengeId, increment || 1);
      res.json(progress);
    } catch (error: any) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Failed to update challenge progress" });
    }
  });
  
  // Get global leaderboard for dashboard
  app.get('/api/gamification/leaderboard/global', isAuthenticated, async (req: any, res) => {
    try {
      const { limit = 10 } = req.query;
      
      // Get global leaderboard (top performers)
      const leaderboard = await db.select({
        rank: leaderboards.rank,
        userId: leaderboards.userId,
        score: leaderboards.score,
        previousRank: leaderboards.previousRank,
        username: users.username,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        level: userProfiles.currentLevel,
      })
      .from(leaderboards)
      .leftJoin(users, eq(leaderboards.userId, users.id))
      .leftJoin(userProfiles, eq(leaderboards.userId, userProfiles.userId))
      .where(and(
        eq(leaderboards.category, 'global'),
        eq(leaderboards.timeframe, 'weekly')
      ))
      .orderBy(leaderboards.rank)
      .limit(parseInt(limit as string));
      
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching global leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch global leaderboard" });
    }
  });

  // Get leaderboards
  app.get('/api/gamification/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { category = 'global', timeframe = 'weekly' } = req.query;
      const leaderboard = await gamificationService.getLeaderboard(
        category as string,
        timeframe as string,
        100
      );
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  
  // Get friends leaderboard
  app.get('/api/gamification/leaderboard/friends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's friends
      const friendships = await db.query.friendConnections.findMany({
        where: and(
          or(
            eq(friendConnections.userId, userId),
            eq(friendConnections.friendId, userId)
          ),
          eq(friendConnections.status, 'accepted')
        )
      });
      
      const friendIds = friendships.map(f => 
        f.userId === userId ? f.friendId : f.userId
      );
      friendIds.push(userId); // Include self
      
      // Get leaderboard entries for friends
      const leaderboard = await db.select({
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
        eq(leaderboards.category, 'global'),
        eq(leaderboards.timeframe, 'weekly'),
        sql`${leaderboards.userId} IN (${sql.join(friendIds, sql`, `)})`
      ))
      .orderBy(leaderboards.score);
      
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching friends leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch friends leaderboard" });
    }
  });
  
  // Spin reward wheel with anti-abuse checks
  app.post('/api/gamification/spin-wheel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user can spin (rate limiting)
      const canSpin = await gamificationService.canSpinWheel(userId);
      if (!canSpin.canSpin) {
        return res.status(400).json({ 
          message: canSpin.reason || "Cannot spin wheel",
          canSpin: false
        });
      }
      
      const reward = await gamificationService.spinWheel(userId);
      res.json({
        ...reward,
        canSpin: true
      });
    } catch (error: any) {
      console.error("Error spinning wheel:", error);
      res.status(400).json({ message: error.message || "Failed to spin wheel" });
    }
  });
  
  // Get spin wheel configuration
  app.get('/api/gamification/spin-wheel/config', async (req, res) => {
    try {
      const rewards = await db.query.spinWheelRewards.findMany();
      res.json(rewards);
    } catch (error: any) {
      console.error("Error fetching spin wheel config:", error);
      res.status(500).json({ message: "Failed to fetch spin wheel configuration" });
    }
  });
  
  // Get gamification stats for dashboard
  app.get('/api/gamification/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user stats from different sources
      const [goals, tasks, profile] = await Promise.all([
        storage.getUserGoals(userId),
        // Get user tasks through goals
        Promise.all((await storage.getUserGoals(userId)).map(goal => 
          storage.getGoalById(goal.id).then(g => g ? storage.getTasksByPlan(g.id) : [])
        )).then(taskArrays => taskArrays.flat()),
        storage.getUserProfile(userId)
      ]);
      
      // Calculate stats
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalHours = tasks.reduce((sum, task) => sum + (parseFloat(task.estimatedDuration?.toString() || '0') / 60), 0);
      
      // Performance score calculation (simplified)
      const goalCompletionRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;
      const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
      const performanceScore = Math.round((goalCompletionRate + taskCompletionRate) / 2);
      
      res.json({
        tasksCompleted: completedTasks,
        goalsAchieved: completedGoals,
        hoursLogged: Math.round(totalHours),
        productivityScore: performanceScore,
        streakCount: profile?.streakCount || 0,
        totalXp: profile?.totalXp || 0,
        level: profile?.currentLevel || 1
      });
    } catch (error: any) {
      console.error("Error fetching gamification stats:", error);
      res.status(500).json({ message: "Failed to fetch gamification stats" });
    }
  });

  // Award XP (for task/goal completion)
  app.post('/api/gamification/award-xp', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, source, reason, sourceId, multiplier } = req.body;
      
      const result = await gamificationService.awardXP(
        userId,
        amount,
        source,
        reason,
        sourceId,
        multiplier
      );
      
      // Update leaderboards
      await gamificationService.updateLeaderboard(userId, 'global', amount);
      
      // Check for achievements based on source
      const unlockedAchievements = [];
      if (source === 'task') {
        const taskCount = await db.query.xpTransactions.findMany({
          where: and(
            eq(xpTransactions.userId, userId),
            eq(xpTransactions.source, 'task')
          )
        });
        const achievements = await gamificationService.checkAchievements(userId, { 
          type: 'task_count', 
          value: taskCount.length 
        });
        unlockedAchievements.push(...achievements);
      }
      
      res.json({ ...result, unlockedAchievements });
    } catch (error: any) {
      console.error("Error awarding XP:", error);
      res.status(500).json({ message: "Failed to award XP" });
    }
  });
  
  // ===== PAYMENT & BILLING ROUTES =====
  
  // Initialize Stripe only if API key is available
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  let stripe: Stripe | null = null;
  
  if (stripeKey) {
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  
  // Get subscription plans
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true));
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });
  
  // Get user's current subscription
  app.get('/api/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscriptionInfo = await paymentService.getUserSubscription(userId);
      
      res.json(subscriptionInfo);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });
  
  // Create a new subscription with PayGate.to
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planId, email, billingCycle = 'monthly', currency = 'USD', provider = 'multi' } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required for PayGate.to payment" });
      }
      
      const result = await paymentService.createSubscription(
        userId, 
        planId, 
        email,
        billingCycle,
        currency,
        provider
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: error.message || "Failed to create subscription" });
    }
  });
  
  // Cancel subscription
  app.post('/api/cancel-subscription', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await paymentService.cancelSubscription(userId);
      res.json({ message: "Subscription cancelled", subscription: result });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });
  
  // Resume cancelled subscription with PayGate.to
  app.post('/api/resume-subscription', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, currency = 'USD' } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required for PayGate.to payment" });
      }
      
      const result = await paymentService.resumeSubscription(userId, email, currency);
      res.json({ message: "Subscription resumed", subscription: result });
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      res.status(500).json({ message: error.message || "Failed to resume subscription" });
    }
  });
  
  // Change subscription plan with PayGate.to
  app.post('/api/change-subscription-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { newPlanId, email, currency = 'USD' } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required for PayGate.to payment" });
      }
      
      const result = await paymentService.changeSubscriptionPlan(userId, newPlanId, email, currency);
      res.json({ message: "Subscription plan changed", subscription: result });
    } catch (error: any) {
      console.error("Error changing subscription plan:", error);
      res.status(500).json({ message: error.message || "Failed to change subscription plan" });
    }
  });
  
  // ===== COIN SYSTEM ROUTES =====
  
  // Get coin packages
  app.get('/api/coin-packages', async (req, res) => {
    try {
      const packages = await db.select().from(coinPackages)
        .where(eq(coinPackages.isActive, true));
      res.json(packages);
    } catch (error: any) {
      console.error("Error fetching coin packages:", error);
      res.status(500).json({ message: "Failed to fetch coin packages" });
    }
  });
  
  // Get user's coin balance
  app.get('/api/coin-balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ balance: user?.coinBalance || 0 });
    } catch (error: any) {
      console.error("Error fetching coin balance:", error);
      res.status(500).json({ message: "Failed to fetch coin balance" });
    }
  });
  
  // Get coin transaction history
  app.get('/api/coin-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const transactions = await db.select().from(coinTransactions)
        .where(eq(coinTransactions.userId, userId))
        .orderBy(desc(coinTransactions.createdAt))
        .limit(limit);
      
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching coin transactions:", error);
      res.status(500).json({ message: "Failed to fetch coin transactions" });
    }
  });
  
  // Purchase coins
  app.post('/api/purchase-coins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId, email, currency = 'USD', provider = 'multi' } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required for PayGate.to payment" });
      }
      
      const result = await paymentService.purchaseCoins(userId, packageId, email, currency, provider);
      res.json(result);
    } catch (error: any) {
      console.error("Error purchasing coins:", error);
      res.status(500).json({ message: error.message || "Failed to purchase coins" });
    }
  });
  
  // Spend coins
  app.post('/api/spend-coins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, purpose, sourceId } = req.body;
      
      const newBalance = await paymentService.spendCoins(userId, amount, purpose, sourceId);
      res.json({ balance: newBalance });
    } catch (error: any) {
      console.error("Error spending coins:", error);
      res.status(500).json({ message: error.message || "Failed to spend coins" });
    }
  });
  
  // Award free coins (daily login, achievements, etc.)
  app.post('/api/award-coins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, reason } = req.body;
      
      const newBalance = await paymentService.awardCoins(userId, amount, reason);
      res.json({ balance: newBalance });
    } catch (error: any) {
      console.error("Error awarding coins:", error);
      res.status(500).json({ message: "Failed to award coins" });
    }
  });
  
  // ===== ONE-TIME PURCHASES =====
  
  // Get purchaseable items
  app.get('/api/purchase-items', async (req, res) => {
    try {
      const { type, category } = req.query;
      const whereConditions = [eq(purchaseItems.isActive, true)];
      
      // Add filters if provided
      if (type) {
        whereConditions.push(eq(purchaseItems.type, type as string));
      }
      if (category) {
        whereConditions.push(eq(purchaseItems.category, category as string));
      }
      
      const query = db.select().from(purchaseItems)
        .where(and(...whereConditions));
      
      const items = await query;
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching purchase items:", error);
      res.status(500).json({ message: "Failed to fetch purchase items" });
    }
  });
  
  // Get user's purchases
  app.get('/api/user-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const purchases = await db.select().from(userPurchases)
        .where(and(
          eq(userPurchases.userId, userId),
          eq(userPurchases.isActive, true)
        ));
      
      res.json(purchases);
    } catch (error: any) {
      console.error("Error fetching user purchases:", error);
      res.status(500).json({ message: "Failed to fetch user purchases" });
    }
  });
  
  // Purchase an item
  app.post('/api/purchase-item', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId, paymentMethod } = req.body;
      
      const result = await paymentService.purchaseItem(userId, itemId, paymentMethod);
      res.json(result);
    } catch (error: any) {
      console.error("Error purchasing item:", error);
      res.status(500).json({ message: error.message || "Failed to purchase item" });
    }
  });
  
  // ===== PAYMENT PROCESSING =====
  
  // Create payment intent for one-time payments (DEPRECATED - use PayGate.to)
  app.post('/api/create-payment-intent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, description } = req.body;
      
      // PayGate.to integration - redirect to coin purchase or subscription
      res.status(410).json({ 
        message: "Stripe payments deprecated. Use PayGate.to for payments.",
        alternatives: {
          coins: "/api/payments/purchase-coins",
          subscription: "/api/payments/subscribe"
        }
      });
    } catch (error: any) {
      console.error("Error with deprecated payment intent:", error);
      res.status(500).json({ message: "Payment method deprecated" });
    }
  });
  
  // Confirm payment completion
  app.post('/api/confirm-payment', isAuthenticated, async (req: any, res) => {
    try {
      const { paymentIntentId } = req.body;
      await paymentService.confirmPayment(paymentIntentId);
      res.json({ message: "Payment confirmed" });
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });
  
  // ===== FEATURE GATING =====
  
  // Check feature access
  app.post('/api/check-feature-access', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { featureKey } = req.body;
      
      const hasAccess = await paymentService.checkFeatureAccess(userId, featureKey);
      const limitOk = await paymentService.checkFeatureLimit(userId, featureKey);
      
      res.json({ 
        hasAccess,
        limitOk,
        canUseFeature: hasAccess && limitOk
      });
    } catch (error: any) {
      console.error("Error checking feature access:", error);
      res.status(500).json({ message: "Failed to check feature access" });
    }
  });
  
  // Get feature gates
  app.get('/api/feature-gates', async (req, res) => {
    try {
      const gates = await db.select().from(featureGates)
        .where(eq(featureGates.isActive, true));
      res.json(gates);
    } catch (error: any) {
      console.error("Error fetching feature gates:", error);
      res.status(500).json({ message: "Failed to fetch feature gates" });
    }
  });
  
  // ===== PADDLE PAYMENT ROUTES =====
  
  // Get Paddle configuration for frontend
  app.get('/api/payments/paddle/config', async (req, res) => {
    try {
      const { PADDLE_CLIENT_TOKEN, IS_PRODUCTION, PADDLE_ENVIRONMENT } = await import('./payments/paddle');
      
      res.json({
        clientToken: PADDLE_CLIENT_TOKEN,
        environment: IS_PRODUCTION ? 'production' : 'sandbox',
      });
    } catch (error: any) {
      console.error("Error fetching Paddle config:", error);
      res.status(500).json({ message: "Failed to fetch Paddle configuration" });
    }
  });
  
  // Create Paddle checkout session for subscription
  app.post('/api/payments/paddle/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, billingCycle } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user?.email) {
        return res.status(400).json({ message: "User email not found" });
      }
      
      if (!tier || !['pro', 'team'].includes(tier)) {
        return res.status(400).json({ message: "Valid tier (pro or team) is required" });
      }
      
      if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({ message: "Valid billing cycle (monthly or yearly) is required" });
      }
      
      const successUrl = `${req.protocol}://${req.get('host')}/payment-success?provider=paddle`;
      const cancelUrl = `${req.protocol}://${req.get('host')}/pricing?cancelled=true`;
      
      const checkoutUrl = await createPaddleCheckout({
        userId,
        email: user.email,
        tier: tier as 'pro' | 'team',
        billingCycle: billingCycle as 'monthly' | 'yearly',
        successUrl,
        cancelUrl,
      });
      
      res.json({ checkoutUrl });
    } catch (error: any) {
      console.error("Error creating Paddle checkout:", error);
      res.status(500).json({ message: error.message || "Failed to create Paddle checkout" });
    }
  });
  
  // Create Paddle checkout session for coin packages (simplified endpoint)
  app.post('/api/payments/coins/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageType } = req.body;
      
      if (!packageType || !['starter', 'value', 'power', 'ultimate'].includes(packageType)) {
        return res.status(400).json({ message: "Valid packageType (starter, value, power, ultimate) is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email not found" });
      }
      
      const { getCoinPackagePriceId } = await import('./payments/paddle');
      const priceId = getCoinPackagePriceId(packageType as 'starter' | 'value' | 'power' | 'ultimate');
      
      const successUrl = `${req.protocol}://${req.get('host')}/payment-success?provider=paddle&type=coins&package=${packageType}`;
      const cancelUrl = `${req.protocol}://${req.get('host')}/pricing?cancelled=true&tab=coins`;
      
      const checkoutUrl = await createPaddleCoinCheckout({
        userId,
        email: user.email,
        packageId: packageType,
        priceId,
        successUrl,
        cancelUrl,
      });
      
      res.json({ checkoutUrl });
    } catch (error: any) {
      console.error("Error creating Paddle coin checkout:", error);
      res.status(500).json({ message: error.message || "Failed to create Paddle coin checkout" });
    }
  });
  
  // Create Paddle checkout session for coin packages (legacy endpoint)
  app.post('/api/payments/paddle/coins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId, priceId, email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      if (!packageId || !priceId) {
        return res.status(400).json({ message: "Package ID and price ID are required" });
      }
      
      const successUrl = `${req.protocol}://${req.get('host')}/payment-success?provider=paddle&type=coins`;
      const cancelUrl = `${req.protocol}://${req.get('host')}/pricing?cancelled=true`;
      
      const checkoutUrl = await createPaddleCoinCheckout({
        userId,
        email,
        packageId,
        priceId,
        successUrl,
        cancelUrl,
      });
      
      res.json({ paymentUrl: checkoutUrl });
    } catch (error: any) {
      console.error("Error creating Paddle coin checkout:", error);
      res.status(500).json({ message: error.message || "Failed to create Paddle coin checkout" });
    }
  });
  
  // Get Paddle subscription status
  app.get('/api/payments/paddle/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.paddleSubscriptionId) {
        return res.status(404).json({ message: "No Paddle subscription found" });
      }
      
      const subscription = await getPaddleSubscription(user.paddleSubscriptionId);
      res.json(subscription);
    } catch (error: any) {
      console.error("Error fetching Paddle subscription:", error);
      res.status(500).json({ message: error.message || "Failed to fetch Paddle subscription" });
    }
  });
  
  // Cancel Paddle subscription
  app.post('/api/payments/paddle/cancel', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.paddleSubscriptionId) {
        return res.status(404).json({ message: "No Paddle subscription found" });
      }
      
      const result = await cancelPaddleSubscription(user.paddleSubscriptionId);
      
      // Update user status locally
      await db.update(users)
        .set({
          subscriptionStatus: 'cancelled',
        })
        .where(eq(users.id, userId));
      
      res.json({ message: "Paddle subscription cancelled", subscription: result });
    } catch (error: any) {
      console.error("Error cancelling Paddle subscription:", error);
      res.status(500).json({ message: error.message || "Failed to cancel Paddle subscription" });
    }
  });
  
  // SECURITY: Paddle webhook handler with signature verification and rate limiting
  app.post('/api/webhooks/paddle', webhookRateLimit, express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      await handlePaddleWebhook(req);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("❌ Paddle webhook error:", error);
      // SECURITY FIX: Return 400 for signature verification errors, 500 for other errors
      if (error.message && (error.message.includes('signature') || error.message.includes('Missing webhook signature') || error.message.includes('Invalid webhook signature'))) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      res.status(500).json({ message: error.message || "Webhook handling failed" });
    }
  });
  
  // ===== APPLE IN-APP PURCHASE ROUTES (App Store Server API) =====
  
  // Validation schema for Apple receipt verification
  const appleReceiptSchema = z.object({
    receiptData: z.string().optional(),
    transactionId: z.string().min(1, 'Transaction ID is required'),
  });
  
  // POST /api/payments/apple/verify - Verify Apple receipt with App Store Server API
  app.post('/api/payments/apple/verify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = appleReceiptSchema.parse(req.body);
      
      console.log(`Apple receipt verification request from user ${userId}`);
      
      // Verify receipt with App Store Server API
      const receipt = await appleIAPService.verifyReceipt(
        userId,
        validation.receiptData || '',
        validation.transactionId
      );
      
      res.json({
        success: true,
        receipt: {
          transactionId: receipt.transactionId,
          originalTransactionId: receipt.originalTransactionId,
          productId: receipt.productId,
          purchaseDate: receipt.purchaseDate,
          expiresDate: receipt.expiresDate,
          isTrialPeriod: receipt.isTrialPeriod,
          environment: receipt.environment,
        }
      });
    } catch (error: any) {
      console.error('Apple receipt verification error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Receipt verification failed',
      });
    }
  });
  
  // GET /api/payments/apple/status - Get current Apple subscription status
  app.get('/api/payments/apple/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      console.log(`Fetching Apple subscription status for user ${userId}`);
      
      const status = await appleIAPService.getSubscriptionStatus(userId);
      
      res.json({
        success: true,
        subscription: status,
      });
    } catch (error: any) {
      console.error('Failed to get Apple subscription status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch subscription status',
      });
    }
  });
  
  // SECURITY: Apple webhook handler with JWT signature verification and rate limiting
  app.post('/api/webhooks/apple', webhookRateLimit, express.json(), async (req, res) => {
    try {
      const payload = req.body;
      const signedPayload = req.headers['x-apple-signature'] as string;
      
      console.log('🔒 Apple webhook received:', {
        notificationType: payload.notificationType,
        hasSignature: !!signedPayload,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.socket.remoteAddress,
      });
      
      // SECURITY: Verify webhook signature
      const verificationResult = await appleIAPService.verifyWebhookSignature(payload, signedPayload);
      
      if (verificationResult.status === 'dev-mode') {
        // DEV MODE: Allow webhook processing without signature verification
        console.log('⚠️ Apple webhook in dev-mode:', verificationResult.reason);
      } else if (verificationResult.status === 'error') {
        // PRODUCTION FAILURE: Configuration issue or invalid signature
        console.error('❌ Apple webhook rejected:', verificationResult.reason);
        return res.status(400).json({
          success: false,
          message: verificationResult.reason || 'Webhook verification failed',
        });
      } else {
        // PRODUCTION SUCCESS: Signature verified
        console.log('✅ Apple webhook signature verified');
      }
      
      // Process webhook (processWebhook handles dev-mode gracefully, throws in production failures)
      await appleIAPService.processWebhook(payload);
      
      res.status(200).json({ 
        success: true,
        message: 'Webhook processed successfully' 
      });
    } catch (error: any) {
      console.error('❌ Apple webhook error:', error);
      
      // Return 400 for processing errors
      res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed',
      });
    }
  });
  
  // DEPRECATED: Old iOS endpoint - Use /api/payments/apple/verify-receipt instead
  app.post('/api/payments/ios/verify-receipt', isAuthenticated, async (req: any, res) => {
    res.status(410).json({ 
      message: "This endpoint is deprecated. Use /api/payments/apple/verify-receipt instead",
      newEndpoint: "/api/payments/apple/verify-receipt"
    });
  });
  
  /*
  // OLD IMPLEMENTATION - Commented out
  app.post('/api/payments/ios/verify-receipt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validatedData = iosReceiptSchema.parse(req.body);
      const { receiptData, productId } = validatedData;
      
      // Verify receipt with Apple
      const verificationResult = await verifyAppleReceipt(receiptData);
      
      // Check verification status
      if (verificationResult.status !== 0) {
        const errorMessages: { [key: number]: string } = {
          21000: 'The App Store could not read the JSON object you provided',
          21002: 'The data in the receipt-data property was malformed or missing',
          21003: 'The receipt could not be authenticated',
          21004: 'The shared secret you provided does not match the shared secret on file',
          21005: 'The receipt server is not currently available',
          21006: 'This receipt is valid but the subscription has expired',
          21007: 'This receipt is from the test environment',
          21008: 'This receipt is from the production environment',
          21010: 'This receipt could not be authorized'
        };
        
        return res.status(400).json({
          message: 'Invalid receipt',
          error: errorMessages[verificationResult.status] || `Unknown error (status: ${verificationResult.status})`
        });
      }
      
      // Determine if this is a subscription or coin purchase
      const isSubscription = productId?.toLowerCase().includes('subscription') || 
                            productId?.toLowerCase().includes('sub') ||
                            productId?.toLowerCase().includes('pro') ||
                            productId?.toLowerCase().includes('team') ||
                            productId?.toLowerCase().includes('enterprise');
      
      let result;
      if (isSubscription) {
        result = await processAppleSubscription(userId, verificationResult);
      } else {
        result = await processAppleCoins(userId, verificationResult);
      }
      
      res.json({
        message: 'Receipt verified successfully',
        ...result,
        receiptStatus: verificationResult.status
      });
      
    } catch (error: any) {
      console.error('Error verifying iOS receipt:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request data',
          errors: error.errors
        });
      }
      
      res.status(500).json({
        message: 'Failed to verify receipt',
        error: error.message
      });
    }
  });
  
  // POST /api/payments/ios/subscription-status - Get iOS subscription status
  app.post('/api/payments/ios/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user from database
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has an active subscription from Apple
      const hasAppleSubscription = user.paymentProvider === 'apple';
      const isActive = user.subscriptionStatus === 'active' && 
                      user.subscriptionCurrentPeriodEnd && 
                      user.subscriptionCurrentPeriodEnd > new Date();
      
      if (!hasAppleSubscription || !isActive) {
        return res.json({
          hasActiveSubscription: false,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus
        });
      }
      
      res.json({
        hasActiveSubscription: true,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
        paymentProvider: user.paymentProvider
      });
      
    } catch (error: any) {
      console.error('Error checking iOS subscription status:', error);
      res.status(500).json({
        message: 'Failed to check subscription status',
        error: error.message
      });
    }
  });
  
  // POST /api/payments/ios/restore - Restore previous iOS purchases
  app.post('/api/payments/ios/restore', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validatedData = iosReceiptSchema.parse(req.body);
      const { receiptData } = validatedData;
      
      // Verify receipt with Apple
      const verificationResult = await verifyAppleReceipt(receiptData);
      
      // Check verification status
      if (verificationResult.status !== 0) {
        return res.status(400).json({
          message: 'Invalid receipt',
          error: `Receipt verification failed (status: ${verificationResult.status})`
        });
      }
      
      const restoredItems: any[] = [];
      
      // Process all subscriptions from receipt
      if (verificationResult.latest_receipt_info || verificationResult.receipt?.in_app) {
        const subscriptionResult = await processAppleSubscription(userId, verificationResult);
        restoredItems.push({
          type: 'subscription',
          ...subscriptionResult
        });
      }
      
      // Process all coin purchases from receipt
      const inAppPurchases = verificationResult.receipt?.in_app || [];
      for (const purchase of inAppPurchases) {
        if (purchase.product_id?.toLowerCase().includes('coin')) {
          try {
            const coinResult = await processAppleCoins(userId, { receipt: { in_app: [purchase] } });
            restoredItems.push({
              type: 'coins',
              ...coinResult
            });
          } catch (error) {
            console.error('Error restoring coin purchase:', error);
          }
        }
      }
      
      // Get updated user data
      const [updatedUser] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      
      res.json({
        message: 'Purchases restored successfully',
        restoredItems,
        currentCoinBalance: updatedUser?.coinBalance || 0,
        subscriptionTier: updatedUser?.subscriptionTier || 'free',
        subscriptionStatus: updatedUser?.subscriptionStatus || 'inactive'
      });
      
    } catch (error: any) {
      console.error('Error restoring iOS purchases:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request data',
          errors: error.errors
        });
      }
      
      res.status(500).json({
        message: 'Failed to restore purchases',
        error: error.message
      });
    }
  });
  */
  
  // ===== STRIPE WEBHOOK (DEPRECATED) =====
  
  // Handle Stripe webhooks (DEPRECATED - Stripe integration removed)
  app.post('/api/stripe-webhook', async (req, res) => {
    console.warn("Stripe webhook received but Stripe integration has been removed in favor of PayGate.to");
    res.status(410).json({ 
      message: "Stripe webhooks deprecated. All payments now handled by PayGate.to",
      alternatives: {
        webhook: "/api/payments/paygate/webhook"
      }
    });
  });
  
  // ===== PAYGATE.TO WEBHOOK =====
  
  // Enhanced PayGate.to webhook endpoint with validation and security
  app.get('/api/payments/paygate/webhook', async (req, res) => {
    const startTime = Date.now();
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Extract all query parameters and body data
      const queryParams = req.query;
      const headers = req.headers;
      const clientIp = req.ip || req.connection.remoteAddress;
      
      // Enhanced logging for debugging
      console.log('=== PayGate.to Webhook Received ===', {
        id: webhookId,
        timestamp: new Date().toISOString(),
        clientIp,
        headers: {
          'user-agent': headers['user-agent'],
          'x-forwarded-for': headers['x-forwarded-for'],
          'x-hmac-hash': headers['x-hmac-hash'], // PayGate.to security header
          'content-type': headers['content-type'],
        },
        query: queryParams,
        method: req.method,
      });
      
      // Extract required parameters
      const { 
        type, 
        userId, 
        transactionId, 
        value_coin, 
        planId, 
        packageId, 
        billingCycle,
        // PayGate.to specific parameters
        address_in,
        polygon_address_in,
        callback_url,
        ipn_token,
        // Transaction status parameters
        status,
        tx_hash,
        block_number,
        confirmation_count
      } = queryParams;
      
      // Comprehensive parameter validation
      const validationErrors: string[] = [];
      
      if (!type) validationErrors.push('Missing payment type');
      if (!userId) validationErrors.push('Missing user ID');
      if (!transactionId) validationErrors.push('Missing transaction ID');
      if (!value_coin) validationErrors.push('Missing value_coin');
      
      // Validate payment type
      if (type && !['subscription', 'coins'].includes(type as string)) {
        validationErrors.push('Invalid payment type');
      }
      
      // Validate value_coin format
      let valueCoin = 0;
      if (value_coin) {
        const parsed = parseFloat(value_coin as string);
        if (isNaN(parsed) || parsed <= 0) {
          validationErrors.push('Invalid value_coin format');
        } else {
          valueCoin = parsed;
        }
      }
      
      // Type-specific validation
      if (type === 'subscription') {
        if (!planId) validationErrors.push('Missing subscription plan ID');
        if (!billingCycle) validationErrors.push('Missing billing cycle');
        if (billingCycle && !['monthly', 'yearly'].includes(billingCycle as string)) {
          validationErrors.push('Invalid billing cycle');
        }
      } else if (type === 'coins') {
        if (!packageId) validationErrors.push('Missing coin package ID');
      }
      
      if (validationErrors.length > 0) {
        console.error('PayGate.to webhook validation failed:', {
          id: webhookId,
          errors: validationErrors,
          params: queryParams
        });
        return res.status(400).json({ 
          error: 'Validation failed',
          details: validationErrors,
          webhookId
        });
      }
      
      // Security validation with PayGate.to HMAC
      const hmacHash = headers['x-hmac-hash'] as string;
      const isSecurityValid = await paymentService.validatePayGateWebhookSecurity(
        req.url,
        hmacHash,
        ipn_token as string
      );
      
      if (!isSecurityValid) {
        console.warn('PayGate.to webhook security validation failed:', {
          id: webhookId,
          clientIp,
          hmacHash: hmacHash ? 'present' : 'missing',
          ipnToken: ipn_token ? 'present' : 'missing'
        });
        // Don't block webhook for now, just log the warning
      }
      
      // Additional parameters for payment processing
      const additionalParams: any = {
        webhookId,
        clientIp,
        addressIn: address_in,
        polygonAddressIn: polygon_address_in,
        ipnToken: ipn_token,
        txHash: tx_hash,
        blockNumber: block_number,
        confirmationCount: confirmation_count,
        status: status || 'completed'
      };
      
      if (type === 'subscription') {
        additionalParams.planId = planId;
        additionalParams.billingCycle = billingCycle;
      } else if (type === 'coins') {
        additionalParams.packageId = packageId;
      }
      
      // Process the webhook with enhanced error handling
      const result = await paymentService.processPayGateWebhook(
        type as 'subscription' | 'coins',
        userId as string,
        transactionId as string,
        valueCoin,
        additionalParams
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log('PayGate.to webhook processed successfully:', {
        id: webhookId,
        type,
        userId,
        transactionId,
        valueCoin,
        processingTime: `${processingTime}ms`,
        result
      });
      
      // Return success response
      res.json({
        webhookId,
        processingTime,
        ...result
      });
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('PayGate.to webhook processing error:', {
        id: webhookId,
        error: error.message,
        stack: error.stack,
        params: req.query,
        processingTime: `${processingTime}ms`
      });
      
      // Detailed error response for debugging
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error.message,
        webhookId,
        processingTime,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get billing history
  app.get('/api/billing-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.json([]);
      }
      
      if (!stripe) {
        return res.json([]);
      }
      
      // Get invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 20,
      });
      
      res.json(invoices.data.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000),
        amount: invoice.amount_paid / 100,
        status: invoice.status,
        description: invoice.description || 'Subscription payment',
        invoiceUrl: invoice.hosted_invoice_url,
      })));
    } catch (error: any) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // ===== COMPREHENSIVE SOCIAL FEATURES =====

  // --- TEAMS ---
  
  // Create a new team
  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body with Zod
      const validatedData = insertTeamSchema.parse({
        ...req.body,
        createdById: userId
      });
      
      const team = await socialService.createTeam(validatedData);
      
      // Award XP for creating team
      const { gamificationService } = await import('./gamification');
      await gamificationService.awardXP(
        userId,
        100, // XP for creating team
        'team_created',
        `Created team: ${validatedData.name}`,
        team.id
      );
      
      res.json(team);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error("Error creating team:", error);
      res.status(500).json({ message: error.message || "Failed to create team" });
    }
  });
  
  // Get user's teams
  app.get('/api/teams/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await socialService.getUserTeams(userId);
      res.json(teams);
    } catch (error: any) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });
  
  // Get team details
  app.get('/api/teams/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const team = await socialService.getTeam(req.params.teamId);
      const members = await socialService.getTeamMembers(req.params.teamId);
      res.json({ team, members });
    } catch (error: any) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });
  
  // Join team
  app.post('/api/teams/:teamId/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const member = await socialService.joinTeam(req.params.teamId, userId);
      res.json(member);
    } catch (error: any) {
      console.error("Error joining team:", error);
      res.status(500).json({ message: error.message || "Failed to join team" });
    }
  });
  
  // Send team invite
  app.post('/api/teams/:teamId/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { invitedUserId, inviteEmail } = req.body;
      const inviteCode = await socialService.sendTeamInvite(
        req.params.teamId,
        userId,
        invitedUserId,
        inviteEmail
      );
      res.json({ inviteCode });
    } catch (error: any) {
      console.error("Error sending invite:", error);
      res.status(500).json({ message: "Failed to send invite" });
    }
  });
  
  // Create team goal
  app.post('/api/teams/:teamId/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body with Zod
      const validatedData = insertTeamGoalSchema.parse({
        ...req.body,
        teamId: req.params.teamId
      });
      
      // Check authorization - only team members can create goals
      const userTeams = await socialService.getUserTeams(userId);
      const userTeam = userTeams.find(membership => membership.team.id === req.params.teamId);
      
      if (!userTeam) {
        return res.status(403).json({ message: "Not authorized to create team goals" });
      }
      
      // Only owners and admins can create team goals
      if (userTeam.membership.role !== 'owner' && userTeam.membership.role !== 'admin') {
        return res.status(403).json({ message: "Only team owners and admins can create goals" });
      }
      
      const goal = await socialService.createTeamGoal(validatedData);
      
      // Award XP for creating team goal
      const { gamificationService } = await import('./gamification');
      await gamificationService.awardXP(
        userId,
        50, // XP for creating team goal
        'team_goal_created',
        `Created team goal: ${validatedData.title}`,
        goal.id
      );
      
      res.json(goal);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error("Error creating team goal:", error);
      res.status(500).json({ message: "Failed to create team goal" });
    }
  });
  
  // --- CHALLENGES ---
  
  // Create challenge
  app.post('/api/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challenge = await socialService.createChallenge({
        ...req.body,
        creatorId: userId
      });
      res.json(challenge);
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });
  
  // Get active challenges
  app.get('/api/challenges/active', async (req, res) => {
    try {
      const challenges = await socialService.getActiveChallenges();
      res.json(challenges);
    } catch (error: any) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });
  
  // Get upcoming challenges
  app.get('/api/challenges/upcoming', async (req, res) => {
    try {
      const challenges = await socialService.getUpcomingChallenges();
      res.json(challenges);
    } catch (error: any) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });
  
  // Get challenge details
  app.get('/api/challenges/:challengeId', async (req, res) => {
    try {
      const challenge = await socialService.getChallenge(req.params.challengeId);
      const leaderboard = await socialService.getChallengeLeaderboard(req.params.challengeId);
      res.json({ challenge, leaderboard });
    } catch (error: any) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ message: "Failed to fetch challenge" });
    }
  });
  
  // Join challenge
  app.post('/api/challenges/:challengeId/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const participant = await socialService.joinChallenge(
        req.params.challengeId,
        userId,
        req.body.teamId
      );
      res.json(participant);
    } catch (error: any) {
      console.error("Error joining challenge:", error);
      res.status(500).json({ message: error.message || "Failed to join challenge" });
    }
  });
  
  // Update challenge progress
  app.post('/api/challenges/:challengeId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { participantId, score } = req.body;
      await socialService.updateChallengeProgress(
        req.params.challengeId,
        participantId,
        score
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });
  
  // Get challenge leaderboard
  app.get('/api/challenges/:challengeId/leaderboard', async (req, res) => {
    try {
      const leaderboard = await socialService.getChallengeLeaderboard(req.params.challengeId);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  
  // --- FRIENDS ---
  
  // Send friend request
  app.post('/api/friends/request', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { friendId } = req.body;
      await socialService.sendFriendRequest(userId, friendId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ message: error.message || "Failed to send friend request" });
    }
  });
  
  // Accept friend request
  app.post('/api/friends/accept', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { friendId } = req.body;
      await socialService.acceptFriendRequest(userId, friendId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });
  
  // Get friends list
  app.get('/api/friends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const friends = await socialService.getFriends(userId);
      
      // Get friend details
      const friendDetails = await Promise.all(
        friends.map(async (f) => {
          const user = await storage.getUser(f.friendId);
          return {
            ...f,
            friend: user
          };
        })
      );
      
      res.json(friendDetails);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });
  
  // Get friend requests
  app.get('/api/friends/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await socialService.getFriendRequests(userId);
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });
  
  // Search users for friend requests
  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.query;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const results = await db.select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        username: users.username,
        profileImageUrl: users.profileImageUrl
      })
      .from(users)
      .where(
        or(
          sql`${users.email} ILIKE ${`%${query}%`}`,
          sql`${users.displayName} ILIKE ${`%${query}%`}`,
          sql`${users.username} ILIKE ${`%${query}%`}`
        )
      )
      .limit(10);
      
      res.json(results);
    } catch (error: any) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });
  
  // --- SOCIAL FEED ---
  
  // Get friends feed
  app.get('/api/feed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const feed = await socialService.getFriendsFeed(userId, limit);
      res.json(feed);
    } catch (error: any) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });
  
  // Create social post
  app.post('/api/feed/post', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const post = await socialService.createSocialPost({
        ...req.body,
        userId
      });
      res.json(post);
    } catch (error: any) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });
  
  // Like a post
  app.post('/api/feed/posts/:postId/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await socialService.likePost(req.params.postId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });
  
  // Comment on a post
  app.post('/api/feed/posts/:postId/comment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { comment } = req.body;
      await socialService.commentOnPost(req.params.postId, userId, comment);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error commenting on post:", error);
      res.status(500).json({ message: "Failed to comment on post" });
    }
  });
  
  // Get post comments
  app.get('/api/feed/posts/:postId/comments', async (req, res) => {
    try {
      const comments = await db.select({
        comment: socialFeedPosts,
        user: users
      })
      .from(socialFeedPosts)
      .innerJoin(users, eq(socialFeedPosts.userId, users.id))
      .where(eq(socialFeedPosts.id, req.params.postId))
      .orderBy(desc(socialFeedPosts.createdAt));
      
      res.json(comments);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  // --- MENTORSHIP ---
  
  // Create mentorship
  app.post('/api/mentorship/request', isAuthenticated, async (req: any, res) => {
    try {
      const menteeId = req.user.claims.sub;
      const { mentorId, goalCategory } = req.body;
      const mentorship = await socialService.createMentorship(
        mentorId,
        menteeId,
        goalCategory
      );
      res.json(mentorship);
    } catch (error: any) {
      console.error("Error creating mentorship:", error);
      res.status(500).json({ message: error.message || "Failed to create mentorship" });
    }
  });
  
  // Update mentorship progress
  app.post('/api/mentorship/:mentorshipId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { progressDelta } = req.body;
      await socialService.updateMentorshipProgress(
        req.params.mentorshipId,
        progressDelta
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating mentorship:", error);
      res.status(500).json({ message: "Failed to update mentorship" });
    }
  });
  
  // Rate mentor
  app.post('/api/mentorship/:mentorshipId/review', isAuthenticated, async (req: any, res) => {
    try {
      const reviewerId = req.user.claims.sub;
      const { rating, review, detailedRatings } = req.body;
      await socialService.rateMentor(
        req.params.mentorshipId,
        reviewerId,
        rating,
        review,
        detailedRatings
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error rating mentor:", error);
      res.status(500).json({ message: "Failed to rate mentor" });
    }
  });
  
  // Get available mentors
  app.get('/api/mentors', async (req, res) => {
    try {
      const { category } = req.query;
      
      let query = db.select({
        user: users,
        profile: userProfiles,
        mentorshipCount: sql<number>`COUNT(DISTINCT ${mentorships.id})`
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(mentorships, eq(users.id, mentorships.mentorId))
      .where(gte(userProfiles.currentLevel, 20))
      .groupBy(users.id, userProfiles.id);
      
      const mentors = await query;
      res.json(mentors);
    } catch (error: any) {
      console.error("Error fetching mentors:", error);
      res.status(500).json({ message: "Failed to fetch mentors" });
    }
  });
  
  // --- NOTIFICATIONS ---
  
  // Rate limiting for notification endpoints
  const notificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each user to 100 notification requests per window
    message: {
      message: 'Too many notification requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Get notifications with filtering
  app.get('/api/notifications', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit = 50, offset = 0, category, unreadOnly } = req.query;
      
      const notifications = await notificationService.getUserNotifications(userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        category: category as any,
        unreadOnly: unreadOnly === 'true',
        includeArchived: false,
      });
      
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });
  
  // Get notification preferences
  app.get('/api/notifications/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await notificationService.getUserPreferences(userId);
      res.json(preferences || {});
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });
  
  // Update notification preferences
  app.put('/api/notifications/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await notificationService.updateUserPreferences(userId, req.body);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  
  // Mark notification as read
  app.post('/api/notifications/:notificationId/read', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await notificationService.markAsRead(req.params.notificationId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification:", error);
      res.status(500).json({ message: "Failed to mark notification" });
    }
  });
  
  // Mark all notifications as read
  app.post('/api/notifications/read-all', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notifications:", error);
      res.status(500).json({ message: "Failed to mark notifications" });
    }
  });
  
  // Clear (archive) a notification
  app.delete('/api/notifications/:notificationId', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await notificationService.clearNotification(req.params.notificationId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing notification:", error);
      res.status(500).json({ message: "Failed to clear notification" });
    }
  });
  
  // Clear all notifications
  app.delete('/api/notifications', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await notificationService.clearAll(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({ message: "Failed to clear notifications" });
    }
  });
  
  // Register push subscription
  app.post('/api/notifications/push-subscription', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscription } = req.body;
      
      await notificationService.updateUserPreferences(userId, {
        pushSubscription: subscription,
        pushEnabled: true,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error registering push subscription:", error);
      res.status(500).json({ message: "Failed to register push subscription" });
    }
  });
  
  // Test notification (for development/debugging)
  app.post('/api/notifications/test', isAuthenticated, notificationLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type = 'achievement', channels } = req.body;
      
      await notificationService.createNotification({
        userId,
        type: type as any,
        title: 'Test Notification',
        message: 'This is a test notification to verify your notification settings are working correctly.',
        category: 'system',
        priority: 'medium',
        channels: channels || undefined,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });
  
  // --- DIRECT MESSAGES ---
  
  // Send direct message
  app.post('/api/messages/send', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const { receiverId, message } = req.body;
      await socialService.sendDirectMessage(senderId, receiverId, message);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: error.message || "Failed to send message" });
    }
  });
  
  // Get conversation
  app.get('/api/messages/:friendId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await socialService.getConversation(userId, req.params.friendId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // ===== HABIT TRACKING SYSTEM =====
  
  // Create new habit
  app.post('/api/habits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const habitData = {
        ...req.body,
        userId
      };
      
      const newHabit = await storage.createHabit(habitData);
      res.status(201).json(newHabit);
    } catch (error: any) {
      console.error("Error creating habit:", error);
      res.status(500).json({ message: "Failed to create habit" });
    }
  });
  
  // Get all user habits
  app.get('/api/habits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category, isActive } = req.query;
      
      const options: any = {};
      if (category) options.category = category;
      if (isActive !== undefined) options.isActive = isActive === 'true';
      
      const habits = await storage.getUserHabits(userId, options);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCompletions = await storage.getUserHabitCompletions(userId, today);
      const completedHabitIds = new Set(todayCompletions.map(c => c.habitId));
      
      const habitsWithStatus = habits.map(habit => ({
        ...habit,
        completedToday: completedHabitIds.has(habit.id)
      }));
      
      res.json(habitsWithStatus);
    } catch (error: any) {
      console.error("Error fetching habits:", error);
      res.status(500).json({ message: "Failed to fetch habits" });
    }
  });
  
  // Get single habit by ID
  app.get('/api/habits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const habit = await storage.getHabitById(req.params.id);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      res.json(habit);
    } catch (error: any) {
      console.error("Error fetching habit:", error);
      res.status(500).json({ message: "Failed to fetch habit" });
    }
  });
  
  // Update habit
  app.patch('/api/habits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const habit = await storage.getHabitById(req.params.id);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this habit" });
      }
      
      await storage.updateHabit(req.params.id, req.body);
      const updatedHabit = await storage.getHabitById(req.params.id);
      
      res.json(updatedHabit);
    } catch (error: any) {
      console.error("Error updating habit:", error);
      res.status(500).json({ message: "Failed to update habit" });
    }
  });
  
  // Delete habit
  app.delete('/api/habits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const habit = await storage.getHabitById(req.params.id);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this habit" });
      }
      
      await storage.deleteHabit(req.params.id);
      res.json({ message: "Habit deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting habit:", error);
      res.status(500).json({ message: "Failed to delete habit" });
    }
  });
  
  // Check habit (mark as completed for today)
  app.post('/api/habits/:id/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const habitId = req.params.id;
      
      const habit = await storage.getHabitById(habitId);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completion = {
        userId,
        habitId,
        completionDate: today,
        xpAwarded: habit.xpReward || 10,
        notes: req.body.notes,
        mood: req.body.mood,
        effort: req.body.effort
      };
      
      const newCompletion = await storage.checkHabit(habitId, userId, completion);
      
      const updatedHabit = await storage.getHabitById(habitId);
      
      res.json({
        completion: newCompletion,
        habit: updatedHabit
      });
    } catch (error: any) {
      console.error("Error checking habit:", error);
      
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(400).json({ message: "Habit already completed today" });
      }
      
      res.status(500).json({ message: "Failed to check habit" });
    }
  });
  
  // Get habit statistics
  app.get('/api/habits/:id/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const habitId = req.params.id;
      
      const habit = await storage.getHabitById(habitId);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const stats = await storage.getHabitStats(habitId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching habit stats:", error);
      res.status(500).json({ message: "Failed to fetch habit statistics" });
    }
  });
  
  // Get user's rhythm score
  app.get('/api/habits/rhythm-score', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rhythmScore = await storage.calculateRhythmScore(userId);
      
      res.json({ rhythmScore });
    } catch (error: any) {
      console.error("Error calculating rhythm score:", error);
      res.status(500).json({ message: "Failed to calculate rhythm score" });
    }
  });
  
  // Get habit completions for a date range
  app.get('/api/habits/:id/completions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const habitId = req.params.id;
      const { startDate, endDate } = req.query;
      
      const habit = await storage.getHabitById(habitId);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const completions = await storage.getHabitCompletions(habitId, start, end);
      res.json(completions);
    } catch (error: any) {
      console.error("Error fetching habit completions:", error);
      res.status(500).json({ message: "Failed to fetch habit completions" });
    }
  });

  // ===== CALENDAR INTEGRATION & ICAL FEED =====
  
  // Get or create calendar token for authenticated user
  app.get('/api/calendar/token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const token = await storage.getOrCreateCalendarToken(userId);
      res.json(token);
    } catch (error: any) {
      console.error("Error getting calendar token:", error);
      res.status(500).json({ message: "Failed to get calendar token" });
    }
  });
  
  // Regenerate calendar token
  app.post('/api/calendar/token/regenerate', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newToken = await storage.regenerateCalendarToken(userId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'settings_change',
        eventDescription: 'Calendar token regenerated',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json(newToken);
    } catch (error: any) {
      console.error("Error regenerating calendar token:", error);
      res.status(500).json({ message: "Failed to regenerate calendar token" });
    }
  });
  
  // Get all calendar events for authenticated user
  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getAllCalendarEvents(userId);
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });
  
  // iCal Feed Endpoint - Public with token authentication
  app.get('/api/ical/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(401).json({ message: "Token required" });
      }
      
      // Verify token
      const calendarToken = await storage.getCalendarTokenByToken(token);
      if (!calendarToken || calendarToken.userId !== userId) {
        return res.status(403).json({ message: "Invalid token" });
      }
      
      // Get all calendar events
      const events = await storage.getAllCalendarEvents(userId);
      
      // Generate iCal feed
      const icalFeed = generateICalFeed(userId, events);
      
      // Set proper headers for iCal format
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="lilove-calendar.ics"');
      res.send(icalFeed);
    } catch (error: any) {
      console.error("Error generating iCal feed:", error);
      res.status(500).json({ message: "Failed to generate iCal feed" });
    }
  });
  
  // Import iCal data (basic implementation)
  app.post('/api/calendar/import', isAuthenticated, uploadRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { icalData } = req.body;
      
      if (!icalData) {
        return res.status(400).json({ message: "iCal data required" });
      }
      
      // Basic validation - check if it's valid iCal format
      if (!icalData.includes('BEGIN:VCALENDAR') || !icalData.includes('END:VCALENDAR')) {
        return res.status(400).json({ message: "Invalid iCal format" });
      }
      
      // TODO: Implement full iCal parsing and event import
      // For now, just acknowledge receipt
      res.json({ 
        message: "iCal import initiated", 
        status: "processing",
        note: "Full iCal import functionality coming soon"
      });
    } catch (error: any) {
      console.error("Error importing iCal:", error);
      res.status(500).json({ message: "Failed to import iCal data" });
    }
  });

  // ===== DATA EXPORT SYSTEM (GDPR COMPLIANT) =====
  
  // Request data export
  app.post('/api/export/request', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { exportType, format } = req.body;
      
      // Validate export type
      const validTypes = ['full', 'profile', 'goals', 'tasks', 'habits', 'achievements', 'social'];
      if (!validTypes.includes(exportType)) {
        return res.status(400).json({ message: "Invalid export type" });
      }
      
      // Validate format
      const validFormats = ['json', 'csv'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ message: "Invalid format" });
      }
      
      // Create export request
      const exportRequest = await storage.createDataExport({
        userId,
        exportType,
        format,
        status: 'pending',
        progress: 0
      });
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'data_export',
        eventDescription: `Data export requested: ${exportType} (${format})`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      // Start async export processing (non-blocking)
      const { exportProcessor } = await import('./exportProcessor');
      setTimeout(() => {
        exportProcessor.processExport({
          userId,
          exportId: exportRequest.id,
          exportType,
          format
        });
      }, 100);
      
      res.json({
        id: exportRequest.id,
        status: exportRequest.status,
        progress: exportRequest.progress,
        message: "Export request created successfully"
      });
    } catch (error: any) {
      console.error("Error requesting export:", error);
      res.status(500).json({ message: "Failed to request export" });
    }
  });
  
  // Get export status
  app.get('/api/export/status/:exportId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { exportId } = req.params;
      
      const exportRecord = await storage.getDataExportById(exportId);
      
      if (!exportRecord) {
        return res.status(404).json({ message: "Export not found" });
      }
      
      if (exportRecord.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      res.json({
        id: exportRecord.id,
        status: exportRecord.status,
        progress: exportRecord.progress,
        exportType: exportRecord.exportType,
        format: exportRecord.format,
        fileName: exportRecord.fileName,
        fileSize: exportRecord.fileSize,
        requestedAt: exportRecord.requestedAt,
        completedAt: exportRecord.completedAt,
        expiresAt: exportRecord.expiresAt,
        errorMessage: exportRecord.errorMessage
      });
    } catch (error: any) {
      console.error("Error getting export status:", error);
      res.status(500).json({ message: "Failed to get export status" });
    }
  });
  
  // Download export file
  app.get('/api/export/download/:exportId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { exportId } = req.params;
      
      const exportRecord = await storage.getDataExportById(exportId);
      
      if (!exportRecord) {
        return res.status(404).json({ message: "Export not found" });
      }
      
      if (exportRecord.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      if (exportRecord.status !== 'completed') {
        return res.status(400).json({ message: "Export not completed yet" });
      }
      
      if (!exportRecord.filePath || !fs.existsSync(exportRecord.filePath)) {
        return res.status(404).json({ message: "Export file not found" });
      }
      
      // Check if expired
      if (exportRecord.expiresAt && new Date() > exportRecord.expiresAt) {
        return res.status(410).json({ message: "Export has expired" });
      }
      
      // Mark as downloaded
      await storage.markDataExportDownloaded(exportId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'data_export_download',
        eventDescription: `Data export downloaded: ${exportRecord.exportType}`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || ''
      });
      
      // Send file
      const fileName = exportRecord.fileName || `export_${exportId}.${exportRecord.format}`;
      res.download(exportRecord.filePath, fileName);
    } catch (error: any) {
      console.error("Error downloading export:", error);
      res.status(500).json({ message: "Failed to download export" });
    }
  });
  
  // Get export history
  app.get('/api/export/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const exports = await storage.getDataExports(userId);
      
      res.json(exports.map(exp => ({
        id: exp.id,
        exportType: exp.exportType,
        format: exp.format,
        status: exp.status,
        progress: exp.progress,
        fileName: exp.fileName,
        fileSize: exp.fileSize,
        downloadCount: exp.downloadCount,
        requestedAt: exp.requestedAt,
        completedAt: exp.completedAt,
        lastDownloadedAt: exp.lastDownloadedAt,
        expiresAt: exp.expiresAt
      })));
    } catch (error: any) {
      console.error("Error getting export history:", error);
      res.status(500).json({ message: "Failed to get export history" });
    }
  });
  
  // Delete export
  app.delete('/api/export/:exportId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { exportId } = req.params;
      
      const exportRecord = await storage.getDataExportById(exportId);
      
      if (!exportRecord) {
        return res.status(404).json({ message: "Export not found" });
      }
      
      if (exportRecord.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Delete file if exists
      if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
        fs.unlinkSync(exportRecord.filePath);
      }
      
      // Delete from database
      const { dataExports } = await import('@shared/schema');
      await db.delete(dataExports).where(eq(dataExports.id, exportId));
      
      res.json({ message: "Export deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting export:", error);
      res.status(500).json({ message: "Failed to delete export" });
    }
  });

  // ===== ACCOUNT DELETION - GDPR/KVKK COMPLIANT =====
  
  // Request account deletion (30-day grace period)
  app.post('/api/account/delete/request', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reason, additionalReason } = req.body;
      
      // Check if already scheduled
      const existingDeletion = await storage.getAccountDeletion(userId);
      if (existingDeletion) {
        return res.status(400).json({ 
          message: "Account deletion already scheduled",
          scheduledFor: existingDeletion.scheduledFor
        });
      }
      
      // Create deletion request with 30-day grace period
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const deletion = await storage.requestAccountDeletion({
        userId,
        reason: reason || 'user_request',
        additionalReason,
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        confirmationToken,
      });
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'account_deletion_requested',
        eventDescription: `Account deletion scheduled for ${deletion.scheduledFor}`,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });
      
      res.json({
        message: "Account deletion scheduled",
        scheduledFor: deletion.scheduledFor,
        deletionId: deletion.id,
        gracePeriodDays: 30
      });
    } catch (error: any) {
      console.error("Error requesting account deletion:", error);
      res.status(500).json({ message: "Failed to request account deletion" });
    }
  });
  
  // Check deletion status
  app.get('/api/account/deletion-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deletion = await storage.getAccountDeletion(userId);
      
      if (!deletion) {
        return res.json({ scheduled: false });
      }
      
      const now = new Date();
      const daysRemaining = Math.ceil((deletion.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      res.json({
        scheduled: true,
        scheduledFor: deletion.scheduledFor,
        daysRemaining: Math.max(0, daysRemaining),
        deletionId: deletion.id,
        reason: deletion.reason,
        canCancel: deletion.status === 'scheduled'
      });
    } catch (error: any) {
      console.error("Error checking deletion status:", error);
      res.status(500).json({ message: "Failed to check deletion status" });
    }
  });
  
  // Cancel scheduled deletion
  app.post('/api/account/delete/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deletion = await storage.getAccountDeletion(userId);
      
      if (!deletion) {
        return res.status(404).json({ message: "No deletion scheduled" });
      }
      
      if (deletion.status !== 'scheduled') {
        return res.status(400).json({ message: "Cannot cancel deletion at this stage" });
      }
      
      await storage.cancelAccountDeletion(deletion.id);
      
      // Log security event
      await storage.logSecurityEvent({
        userId,
        eventType: 'account_deletion_cancelled',
        eventDescription: 'User cancelled scheduled account deletion',
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });
      
      res.json({ message: "Account deletion cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling deletion:", error);
      res.status(500).json({ message: "Failed to cancel deletion" });
    }
  });
  
  // Immediate deletion (development only)
  app.delete('/api/account/delete/immediate', isAuthenticated, sensitiveRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // SECURITY: Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Immediate deletion not allowed in production" });
      }
      
      // Perform immediate deletion
      await storage.permanentlyDeleteAccount(userId);
      
      // Destroy session
      req.logout((err: any) => {
        if (err) console.error('Error logging out:', err);
      });
      
      res.json({ message: "Account deleted immediately" });
    } catch (error: any) {
      console.error("Error with immediate deletion:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // ===== HEALTH CHECK =====
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // ===== iOS IN-APP PURCHASE ROUTES =====
  
  // Helper function to verify iOS receipt with Apple
  async function verifyIosReceipt(receiptData: string) {
    const endpoint = process.env.NODE_ENV === 'production'
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';
    
    const sharedSecret = process.env.APPSTORE_SHARED_SECRET;
    
    if (!sharedSecret) {
      throw new Error('APPSTORE_SHARED_SECRET not configured');
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          password: sharedSecret
        })
      });
      
      const data = await response.json();
      
      // Status code 0 means receipt is valid
      // Status code 21007 means sandbox receipt sent to production, retry with sandbox
      if (data.status === 21007) {
        // Retry with sandbox endpoint
        const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'receipt-data': receiptData,
            password: sharedSecret
          })
        });
        
        const sandboxData = await sandboxResponse.json();
        return sandboxData;
      }
      
      return data;
    } catch (error) {
      console.error('Error verifying receipt with Apple:', error);
      throw error;
    }
  }
  
  // POST /api/iap/verify - Verify iOS receipt
  app.post('/api/iap/verify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { receiptData, productId, transactionId } = req.body;
      
      if (!receiptData || !productId || !transactionId) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required fields" 
        });
      }
      
      // Verify receipt with Apple
      const verificationResult = await verifyIosReceipt(receiptData);
      
      if (verificationResult.status === 0) {
        // Receipt is valid
        const receipt = verificationResult.receipt;
        const latestReceiptInfo = verificationResult.latest_receipt_info?.[0] || receipt.in_app?.[0];
        
        if (!latestReceiptInfo) {
          return res.status(400).json({
            success: false,
            message: "No purchase information in receipt"
          });
        }
        
        // Determine product type
        const isSubscription = productId.includes('.sub.');
        const isConsumable = productId.includes('.coins.');
        
        const purchaseData: any = {
          userId,
          productId: latestReceiptInfo.product_id || productId,
          transactionId: latestReceiptInfo.transaction_id || transactionId,
          originalTransactionId: latestReceiptInfo.original_transaction_id,
          receiptData,
          productType: isSubscription ? 'subscription' : 'consumable',
          environment: verificationResult.environment || 'sandbox',
          verified: true,
          verifiedAt: new Date(),
          validationResponse: verificationResult,
          purchaseDate: new Date(parseInt(latestReceiptInfo.purchase_date_ms || Date.now())),
        };
        
        // Add subscription-specific fields
        if (isSubscription) {
          purchaseData.expiresDate = latestReceiptInfo.expires_date_ms 
            ? new Date(parseInt(latestReceiptInfo.expires_date_ms))
            : null;
          purchaseData.isTrialPeriod = latestReceiptInfo.is_trial_period === 'true';
          purchaseData.cancellationDate = latestReceiptInfo.cancellation_date_ms
            ? new Date(parseInt(latestReceiptInfo.cancellation_date_ms))
            : null;
        }
        
        // Add consumable-specific fields
        if (isConsumable) {
          purchaseData.quantity = latestReceiptInfo.quantity || 1;
          // Calculate coins based on product ID
          const coinAmount = productId.includes('1000') ? 1000
            : productId.includes('500') ? 500
            : productId.includes('100') ? 100
            : 0;
          purchaseData.coinsAwarded = coinAmount;
        }
        
        // Record purchase in database
        await storage.recordIapPurchase(purchaseData);
        
        // Update user based on purchase type
        if (isSubscription) {
          await storage.updateSubscriptionFromIap({
            userId,
            productId: purchaseData.productId,
            expiresDate: purchaseData.expiresDate,
            isActive: true
          });
        } else if (isConsumable) {
          await storage.addCoinsFromIap(userId, purchaseData.coinsAwarded);
        }
        
        // Log security event
        await storage.logSecurityEvent({
          userId,
          eventType: 'iap_purchase',
          eventDescription: `iOS purchase verified: ${productId}`,
          ipAddress: req.ip || '',
          userAgent: req.get('User-Agent') || ''
        });
        
        res.json({
          success: true,
          message: "Purchase verified successfully",
          productId: purchaseData.productId,
          transactionId: purchaseData.transactionId
        });
      } else {
        // Receipt is invalid
        console.error('Receipt verification failed:', verificationResult);
        
        res.status(400).json({
          success: false,
          message: "Receipt verification failed",
          status: verificationResult.status
        });
      }
    } catch (error: any) {
      console.error("Error verifying iOS receipt:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to verify receipt" 
      });
    }
  });
  
  // POST /api/iap/webhook - Handle App Store Server Notifications v2
  app.post('/api/iap/webhook', express.json(), async (req, res) => {
    try {
      // App Store Server Notifications v2 format
      const notification = req.body;
      
      console.log('Received App Store notification:', JSON.stringify(notification, null, 2));
      
      // Extract notification type and data
      const notificationType = notification.notificationType;
      const subtype = notification.subtype;
      const data = notification.data;
      
      if (!data || !data.signedTransactionInfo) {
        console.error('Invalid notification format');
        return res.status(400).json({ message: "Invalid notification format" });
      }
      
      // In production, you should verify the JWT signature
      // For now, we'll process the notification data directly
      
      // Parse the transaction info (in production, decode JWT)
      const transactionInfo = data.signedTransactionInfo;
      
      // Handle different notification types
      switch (notificationType) {
        case 'SUBSCRIBED':
        case 'DID_RENEW':
          // Subscription started or renewed
          console.log(`Subscription ${notificationType.toLowerCase()}:`, transactionInfo);
          // Update user subscription status
          // await storage.updateSubscriptionFromWebhook(transactionInfo);
          break;
          
        case 'DID_CHANGE_RENEWAL_STATUS':
          // User changed auto-renewal status
          console.log('Subscription renewal status changed:', transactionInfo);
          break;
          
        case 'DID_FAIL_TO_RENEW':
          // Subscription renewal failed
          console.log('Subscription renewal failed:', transactionInfo);
          // Update user subscription status to past_due
          break;
          
        case 'EXPIRED':
          // Subscription expired
          console.log('Subscription expired:', transactionInfo);
          // Update user subscription status to expired
          break;
          
        case 'GRACE_PERIOD_EXPIRED':
          // Grace period expired, revoke access
          console.log('Grace period expired:', transactionInfo);
          break;
          
        case 'REFUND':
          // Purchase was refunded
          console.log('Purchase refunded:', transactionInfo);
          // Revoke coins or subscription access
          break;
          
        case 'CONSUMPTION_REQUEST':
          // For consumables
          console.log('Consumable consumption requested:', transactionInfo);
          break;
          
        default:
          console.log('Unknown notification type:', notificationType);
      }
      
      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ message: "Notification received" });
    } catch (error: any) {
      console.error("Error processing App Store webhook:", error);
      // Still respond with 200 to prevent retries
      res.status(200).json({ message: "Notification processed with errors" });
    }
  });
  
  // GET /api/iap/receipts - Get user's purchase history
  app.get('/api/iap/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const receipts = await storage.getUserIapReceipts(userId);
      
      res.json(receipts);
    } catch (error: any) {
      console.error("Error fetching IAP receipts:", error);
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // ===== LEAGUE SYSTEM ROUTES =====
  
  // Get all leagues
  app.get('/api/leagues', isAuthenticated, async (req: any, res) => {
    try {
      const leagues = await storage.getAllLeagues();
      res.json(leagues);
    } catch (error: any) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ message: "Failed to fetch leagues" });
    }
  });
  
  // Get user's current league
  app.get('/api/leagues/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentLeague = await storage.getUserCurrentLeague(userId);
      
      if (!currentLeague) {
        return res.status(404).json({ message: "Not enrolled in any league" });
      }
      
      const leaderboard = await storage.getLeagueLeaderboard(currentLeague.season.id);
      
      // Calculate time remaining in season
      const now = new Date();
      const endDate = new Date(currentLeague.season.endDate);
      const timeRemaining = endDate.getTime() - now.getTime();
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      
      res.json({
        league: currentLeague.league,
        season: currentLeague.season,
        participant: currentLeague.participant,
        leaderboard,
        hoursRemaining,
      });
    } catch (error: any) {
      console.error("Error fetching current league:", error);
      res.status(500).json({ message: "Failed to fetch current league" });
    }
  });
  
  // Get league leaderboard
  app.get('/api/leagues/:leagueId/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { leagueId } = req.params;
      
      const activeSeason = await storage.getActiveSeason(leagueId);
      if (!activeSeason) {
        return res.status(404).json({ message: "No active season for this league" });
      }
      
      const leaderboard = await storage.getLeagueLeaderboard(activeSeason.id);
      
      res.json({
        season: activeSeason,
        leaderboard,
      });
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  
  // Join a league
  app.post('/api/leagues/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { leagueId } = req.body;
      
      if (!leagueId) {
        return res.status(400).json({ message: "League ID is required" });
      }
      
      // Check if user is already in an active league
      const currentLeague = await storage.getUserCurrentLeague(userId);
      if (currentLeague && currentLeague.season.status === 'active') {
        return res.status(400).json({ message: "Already enrolled in an active league" });
      }
      
      // Get or create active season for this league
      let activeSeason = await storage.getActiveSeason(leagueId);
      
      if (!activeSeason) {
        // Create a new season if none exists
        const league = await storage.getLeagueById(leagueId);
        if (!league) {
          return res.status(404).json({ message: "League not found" });
        }
        
        const now = new Date();
        const startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
        
        activeSeason = await storage.createLeagueSeason({
          seasonNumber: 1,
          leagueId: league.id,
          startDate,
          endDate,
          status: 'active',
          maxParticipants: 50,
          currentParticipants: 0,
        });
      }
      
      // Check if season is full
      if ((activeSeason.currentParticipants ?? 0) >= (activeSeason.maxParticipants ?? 50)) {
        return res.status(400).json({ message: "League season is full" });
      }
      
      // Join the league
      const participant = await storage.joinLeague({
        userId,
        seasonId: activeSeason.id,
        leagueId,
        weeklyXp: 0,
        rank: 0,
        promoted: false,
        relegated: false,
        rewardClaimed: false,
      });
      
      res.json({
        message: "Successfully joined league",
        participant,
        season: activeSeason,
      });
    } catch (error: any) {
      console.error("Error joining league:", error);
      res.status(500).json({ message: "Failed to join league" });
    }
  });
  
  // Get user's league history
  app.get('/api/leagues/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getUserLeagueHistory(userId, 20);
      
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching league history:", error);
      res.status(500).json({ message: "Failed to fetch league history" });
    }
  });
  
  // ===== AVATAR & QUEST SYSTEM ROUTES =====
  
  // Avatar Routes
  app.get('/api/avatar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const avatar = await storage.getOrCreateAvatar(userId);
      const user = await storage.getUserById(userId);
      res.json({ 
        avatar,
        coins: user?.coinBalance || 0
      });
    } catch (error: any) {
      console.error("Error fetching avatar:", error);
      res.status(500).json({ message: "Failed to fetch avatar" });
    }
  });
  
  // Support both PATCH and PUT for avatar updates
  app.patch('/api/avatar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      await storage.updateAvatar(userId, updates);
      const updatedAvatar = await storage.getOrCreateAvatar(userId);
      res.json(updatedAvatar);
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  app.put('/api/avatar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      await storage.updateAvatar(userId, updates);
      const updatedAvatar = await storage.getOrCreateAvatar(userId);
      res.json(updatedAvatar);
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });
  
  app.post('/api/avatar/equip/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId } = req.params;
      await storage.equipItem(userId, itemId);
      const updatedAvatar = await storage.getOrCreateAvatar(userId);
      res.json({ message: "Item equipped successfully", avatar: updatedAvatar });
    } catch (error: any) {
      console.error("Error equipping item:", error);
      res.status(500).json({ message: error.message || "Failed to equip item" });
    }
  });
  
  app.post('/api/avatar/unequip/:category', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category } = req.params;
      await storage.unequipItem(userId, category);
      const updatedAvatar = await storage.getOrCreateAvatar(userId);
      res.json({ message: "Item unequipped successfully", avatar: updatedAvatar });
    } catch (error: any) {
      console.error("Error unequipping item:", error);
      res.status(500).json({ message: "Failed to unequip item" });
    }
  });
  
  // Quest Routes
  app.get('/api/quests', isAuthenticated, async (req: any, res) => {
    try {
      const { difficulty, minLevel } = req.query;
      const filters: any = {};
      if (difficulty) filters.difficulty = difficulty;
      if (minLevel) filters.minLevel = parseInt(minLevel as string);
      
      const quests = await storage.getAllQuests(filters);
      res.json(quests);
    } catch (error: any) {
      console.error("Error fetching quests:", error);
      res.status(500).json({ message: "Failed to fetch quests" });
    }
  });
  
  app.get('/api/quests/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activeQuests = await storage.getUserActiveQuests(userId);
      res.json(activeQuests);
    } catch (error: any) {
      console.error("Error fetching active quests:", error);
      res.status(500).json({ message: "Failed to fetch active quests" });
    }
  });
  
  app.post('/api/quests/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const userQuest = await storage.startQuest(userId, id);
      res.json({ message: "Quest started successfully", userQuest });
    } catch (error: any) {
      console.error("Error starting quest:", error);
      res.status(500).json({ message: error.message || "Failed to start quest" });
    }
  });
  
  app.get('/api/quests/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const activeQuests = await storage.getUserActiveQuests(userId);
      const quest = activeQuests.find(q => q.questId === id);
      
      if (!quest) {
        return res.status(404).json({ message: "Quest not found" });
      }
      
      res.json(quest);
    } catch (error: any) {
      console.error("Error fetching quest progress:", error);
      res.status(500).json({ message: "Failed to fetch quest progress" });
    }
  });
  
  app.post('/api/quests/:id/attack-boss', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { damage } = req.body;
      
      const activeQuests = await storage.getUserActiveQuests(userId);
      const userQuest = activeQuests.find(q => q.questId === id);
      
      if (!userQuest) {
        return res.status(404).json({ message: "Quest not found" });
      }
      
      const result = await storage.attackBoss(userQuest.id, damage || 10);
      res.json(result);
    } catch (error: any) {
      console.error("Error attacking boss:", error);
      res.status(500).json({ message: error.message || "Failed to attack boss" });
    }
  });
  
  app.post('/api/quests/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const activeQuests = await storage.getUserActiveQuests(userId);
      const userQuest = activeQuests.find(q => q.questId === id);
      
      if (!userQuest) {
        return res.status(404).json({ message: "Quest not found" });
      }
      
      await storage.completeQuest(userQuest.id);
      res.json({ message: "Quest completed successfully" });
    } catch (error: any) {
      console.error("Error completing quest:", error);
      res.status(500).json({ message: "Failed to complete quest" });
    }
  });
  
  // Shop Routes
  app.get('/api/shop/items', isAuthenticated, async (req: any, res) => {
    try {
      const { category, rarity } = req.query;
      const filters: any = {};
      if (category) filters.category = category;
      if (rarity) filters.rarity = rarity;
      
      const items = await storage.getAllAvatarItems(filters);
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching shop items:", error);
      res.status(500).json({ message: "Failed to fetch shop items" });
    }
  });
  
  app.get('/api/shop/my-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userItems = await storage.getUserAvatarItems(userId);
      res.json(userItems);
    } catch (error: any) {
      console.error("Error fetching user items:", error);
      res.status(500).json({ message: "Failed to fetch user items" });
    }
  });
  
  app.post('/api/shop/purchase/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId } = req.params;
      const userItem = await storage.purchaseAvatarItem(userId, itemId);
      res.json({ message: "Item purchased successfully", userItem });
    } catch (error: any) {
      console.error("Error purchasing item:", error);
      res.status(500).json({ message: error.message || "Failed to purchase item" });
    }
  });
  
  // Seed data routes (for development/initial setup)
  app.post('/api/admin/seed-quests', isAuthenticated, async (req: any, res) => {
    try {
      await storage.seedQuests();
      res.json({ message: "Quests seeded successfully" });
    } catch (error: any) {
      console.error("Error seeding quests:", error);
      res.status(500).json({ message: "Failed to seed quests" });
    }
  });
  
  app.post('/api/admin/seed-avatar-items', isAuthenticated, async (req: any, res) => {
    try {
      await storage.seedAvatarItems();
      res.json({ message: "Avatar items seeded successfully" });
    } catch (error: any) {
      console.error("Error seeding avatar items:", error);
      res.status(500).json({ message: "Failed to seed avatar items" });
    }
  });

  // Initialize Socket.IO for real-time features
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Initialize social socket handlers
  socialService.initializeSocialSocket(io);
  
  // Initialize notification service with Socket.IO
  notificationService.setSocketIO(io);
  
  // Initialize gamification service with Socket.IO
  try {
    const { setSocketInstance } = await import('./gamification');
    if (setSocketInstance) {
      setSocketInstance(io);
    }
  } catch (error) {
    console.log('Gamification socket setup skipped');
  }
  
  // Register behavioral science routes
  registerBehavioralRoutes(app);
  
  // Socket.IO connection handler for notifications
  io.on('connection', (socket) => {
    socket.on('authenticate', async (userId: string) => {
      // Join user-specific room for targeted notifications
      socket.join(`user:${userId}`);
      
      // Send initial unread count
      const unreadCount = await notificationService.getUnreadCount(userId);
      socket.emit('notification:unread-count', unreadCount);
    });
    
    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });
  
  // Schedule periodic tasks for notifications
  // TODO: Implement sendScheduledNotifications method
  // setInterval(async () => {
  //   try {
  //     await notificationService.sendScheduledNotifications();
  //   } catch (error: any) {
  //     console.error('Error sending scheduled notifications:', error);
  //   }
  // }, 60000); // Check every minute
  
  return httpServer;
}