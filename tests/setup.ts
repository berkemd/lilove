/// <reference types="jest" />

import { db } from '../server/storage';
import { users, userProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-integration-tests';

// ===== MOCK MODULES NOT NEEDED FOR MOBILE AUTH TESTING =====
// These mocks prevent loading modules with side effects (timers, Socket.IO, etc.)
// while still allowing tests to use production route handlers

// Mock replitAuth module to avoid openid-client ESM issues
jest.mock('../server/replitAuth', () => ({
  setupAuth: jest.fn().mockResolvedValue(undefined),
  isAuthenticated: jest.fn((req: any, res: any, next: any) => next()),
  getSession: jest.fn(() => {
    return (req: any, res: any, next: any) => {
      req.session = {};
      next();
    };
  }),
}));

// Mock socket module to avoid index.js import and Socket.IO initialization
jest.mock('../server/socket', () => ({
  initializeSocketIO: jest.fn().mockReturnValue(undefined),
}));

// Mock analytics module to avoid PostHog initialization
jest.mock('../server/analytics', () => ({
  analyticsService: {
    trackEvent: jest.fn(),
    identifyUser: jest.fn(),
  },
}));

// Mock PostHog module to avoid timer and network issues
jest.mock('../server/analytics/posthog', () => ({
  getPostHogClient: jest.fn().mockReturnValue(null),
  initPostHog: jest.fn(),
}));

// Mock notification service (not needed for auth tests)
jest.mock('../server/notifications', () => ({
  notificationService: {
    sendNotification: jest.fn(),
  },
}));

// Mock social service (not needed for auth tests)
jest.mock('../server/social', () => ({
  socialService: {
    createPost: jest.fn(),
  },
}));

// Mock payment service (not needed for auth tests)
jest.mock('../server/payments', () => ({
  paymentService: {
    createCheckout: jest.fn(),
  },
}));

// Mock AI mentor (not needed for auth tests)
jest.mock('../server/aiMentor', () => ({
  aiMentor: {
    generateResponse: jest.fn(),
  },
}));

// Mock auth/oauth module to avoid setInterval timer
jest.mock('../server/auth/oauth', () => ({
  initializeOAuth: jest.fn(),
  generateOAuthState: jest.fn(),
  verifyOAuthState: jest.fn(),
  getUserConnectedAccounts: jest.fn(),
  unlinkAccount: jest.fn(),
  requireAuth: jest.fn((req: any, res: any, next: any) => next()),
}));

// Mock AI cache module to avoid setInterval timer
jest.mock('../server/cache/aiCache', () => ({
  aiCache: {
    get: jest.fn(),
    set: jest.fn(),
    logStats: jest.fn(),
    getStats: jest.fn().mockReturnValue({}),
    invalidateUser: jest.fn(),
    invalidateUserGoalContext: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock cron module to prevent any cron jobs from starting
jest.mock('../server/cron', () => ({
  initializeCronJobs: jest.fn(),
  startNewLeagueSeasons: jest.fn(),
  endLeagueSeasons: jest.fn(),
  updateLeagueRankings: jest.fn(),
  processScheduledDeletions: jest.fn(),
  cleanupExpiredOAuthStates: jest.fn(),
  aggregateAIUsageDaily: jest.fn(),
}));

// Mock AI rate limiter to avoid setInterval and rate limiting in tests
jest.mock('../server/middleware/aiRateLimiter', () => ({
  createAIRateLimiter: jest.fn(() => (req: any, res: any, next: any) => next()),
  getAIRateLimitStats: jest.fn().mockReturnValue({}),
}));

// Mock AI usage analytics
jest.mock('../server/analytics/aiUsage', () => ({
  aiUsageAnalytics: {
    trackUsage: jest.fn(),
    getSystemStats: jest.fn(),
    getUserStats: jest.fn(),
  },
}));

// Mock rate limiters from auth middleware (disable rate limiting in tests)
// We use jest.doMock to allow partial mocking
const actualAuth = jest.requireActual('../server/middleware/auth');
jest.mock('../server/middleware/auth', () => ({
  ...actualAuth,
  // Mock createRateLimiter to return pass-through middleware (no setInterval)
  createRateLimiter: jest.fn(() => (req: any, res: any, next: any) => next()),
  // Replace rate limiters with pass-through middleware
  authRateLimit: (req: any, res: any, next: any) => next(),
  apiRateLimit: (req: any, res: any, next: any) => next(),
  uploadRateLimit: (req: any, res: any, next: any) => next(),
}));

// Silence console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test database cleanup
beforeEach(async () => {
  try {
    // Clean up test data - delete test users created during tests
    await db.delete(users).where(eq(users.email, 'test-apple@example.com'));
    await db.delete(users).where(eq(users.email, 'test-google@example.com'));
    await db.delete(users).where(eq(users.email, 'existing-user@example.com'));
  } catch (error) {
    console.error('Setup cleanup error:', error);
  }
});

afterEach(async () => {
  try {
    // Clean up test data after each test
    await db.delete(users).where(eq(users.email, 'test-apple@example.com'));
    await db.delete(users).where(eq(users.email, 'test-google@example.com'));
    await db.delete(users).where(eq(users.email, 'existing-user@example.com'));
  } catch (error) {
    console.error('Teardown cleanup error:', error);
  }
});

afterAll(async () => {
  // Clear all timers to prevent Jest from hanging
  jest.clearAllTimers();
  jest.clearAllMocks();
  
  // Final cleanup
  try {
    await db.delete(users).where(eq(users.email, 'test-apple@example.com'));
    await db.delete(users).where(eq(users.email, 'test-google@example.com'));
    await db.delete(users).where(eq(users.email, 'existing-user@example.com'));
  } catch (error) {
    console.error('Final cleanup error:', error);
  }
});
