import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { db } from '../db';
import { users, connectedAccounts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// OAuth Credentials from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || process.env.APPLE_SERVICE_ID || 'org.lilove.signin';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || process.env.APPSTORE_KEY_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLESIGNIN_SECRET_KEY || process.env.applesignin_secret_key || process.env.APPLE_PRIVATE_KEY_PEM || '';

// Get primary domain from REPLIT_DOMAINS environment variable
const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
const primaryDomain = domains.find(d => d.includes('lilove.org')) || domains[0] || 'localhost:5000';
const protocol = primaryDomain.includes('localhost') ? 'http' : 'https';

// OAuth callback URLs
const GOOGLE_CALLBACK_URL = `${protocol}://${primaryDomain}/api/auth/google/callback`;
const APPLE_CALLBACK_URL = `${protocol}://${primaryDomain}/api/auth/apple/callback`;

// Base URL for OAuth callbacks
const getBaseUrl = (req: Request) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
};

// State management for CSRF protection
const oauthStates = new Map<string, { userId?: string; popup?: boolean; expiresAt: number }>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of Array.from(oauthStates.entries())) {
    if (data.expiresAt < now) {
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

export function generateOAuthState(userId?: string, popup?: boolean): string {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, {
    userId,
    popup,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
  return state;
}

export function verifyOAuthState(state: string): { userId?: string; popup?: boolean } | null {
  const data = oauthStates.get(state);
  if (!data || data.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }
  oauthStates.delete(state); // One-time use
  return data;
}

// Configure Google OAuth Strategy
export function configureGoogleOAuth(app: any) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth credentials not configured - Google login will be unavailable');
    return;
  }

  console.log('✅ Google OAuth configured');
  console.log(`   Callback URL: ${GOOGLE_CALLBACK_URL}`);

  passport.use('google-oauth', new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
  }, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      const displayName = profile.displayName;
      const avatarUrl = profile.photos?.[0]?.value;
      const providerAccountId = profile.id;

      // Check if this is a linking operation (user is already logged in)
      const existingUserId = req.user?.claims?.sub;
      
      if (existingUserId) {
        // Linking to existing account
        const existing = await db.select().from(connectedAccounts)
          .where(and(
            eq(connectedAccounts.userId, existingUserId),
            eq(connectedAccounts.provider, 'google')
          ))
          .limit(1);

        if (existing.length > 0) {
          // Update existing connection
          await db.update(connectedAccounts)
            .set({
              accessToken,
              refreshToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
              displayName,
              email,
              avatarUrl,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(connectedAccounts.id, existing[0].id));
        } else {
          // Create new connection
          await db.insert(connectedAccounts).values({
            userId: existingUserId,
            provider: 'google',
            providerAccountId,
            displayName,
            email,
            avatarUrl,
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 3600 * 1000),
          });
        }

        const user = await db.select().from(users)
          .where(eq(users.id, existingUserId))
          .limit(1);

        return done(null, user[0]);
      }

      // Sign in/sign up flow
      // Check if account already exists with this email
      let user = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        // Create new user
        const newUser = await db.insert(users).values({
          email,
          displayName,
          profileImageUrl: avatarUrl,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          onboardingCompleted: true,
        }).returning();

        user = newUser;

        // Create connected account
        await db.insert(connectedAccounts).values({
          userId: newUser[0].id,
          provider: 'google',
          providerAccountId,
          displayName,
          email,
          avatarUrl,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        });
      } else {
        // Ensure onboardingCompleted is set for existing user
        if (!user[0].onboardingCompleted) {
          await db.update(users)
            .set({ onboardingCompleted: true })
            .where(eq(users.id, user[0].id));
          user[0].onboardingCompleted = true;
        }

        // Check if connected account exists
        const existing = await db.select().from(connectedAccounts)
          .where(and(
            eq(connectedAccounts.userId, user[0].id),
            eq(connectedAccounts.provider, 'google')
          ))
          .limit(1);

        if (existing.length === 0) {
          // Link account
          await db.insert(connectedAccounts).values({
            userId: user[0].id,
            provider: 'google',
            providerAccountId,
            displayName,
            email,
            avatarUrl,
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 3600 * 1000),
          });
        } else {
          // Update existing connection
          await db.update(connectedAccounts)
            .set({
              accessToken,
              refreshToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
              displayName,
              email,
              avatarUrl,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(connectedAccounts.id, existing[0].id));
        }

        // Update user profile with OAuth data if not set
        if (!user[0].profileImageUrl && avatarUrl) {
          await db.update(users)
            .set({ profileImageUrl: avatarUrl })
            .where(eq(users.id, user[0].id));
        }
      }

      return done(null, user[0]);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error);
    }
  }));
}

// Configure Apple OAuth Strategy
export function configureAppleOAuth(app: any) {
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    console.warn('⚠️  Apple OAuth credentials not configured - Apple login will be unavailable');
    return;
  }

  console.log('✅ Apple OAuth configured');
  console.log(`   Callback URL: ${APPLE_CALLBACK_URL}`);
  
  passport.use('apple-oauth', new AppleStrategy({
    clientID: APPLE_CLIENT_ID,
    teamID: APPLE_TEAM_ID,
    keyID: APPLE_KEY_ID,
    privateKeyString: APPLE_PRIVATE_KEY,
    callbackURL: APPLE_CALLBACK_URL,
    passReqToCallback: true,
  }, async (req: any, accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
    try {
      const email = profile.email;
      const displayName = profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : undefined;
      const providerAccountId = profile.id;

      // Check if this is a linking operation
      const existingUserId = req.user?.claims?.sub;

      if (existingUserId) {
        // Linking to existing account
        const existing = await db.select().from(connectedAccounts)
          .where(and(
            eq(connectedAccounts.userId, existingUserId),
            eq(connectedAccounts.provider, 'apple')
          ))
          .limit(1);

        if (existing.length > 0) {
          // Update existing connection
          await db.update(connectedAccounts)
            .set({
              accessToken,
              refreshToken,
              displayName,
              email,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(connectedAccounts.id, existing[0].id));
        } else {
          // Create new connection
          await db.insert(connectedAccounts).values({
            userId: existingUserId,
            provider: 'apple',
            providerAccountId,
            displayName,
            email,
            accessToken,
            refreshToken,
          });
        }

        const user = await db.select().from(users)
          .where(eq(users.id, existingUserId))
          .limit(1);

        return done(null, user[0]);
      }

      // Sign in/sign up flow
      let user = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        // Create new user
        const newUser = await db.insert(users).values({
          email,
          displayName,
          firstName: profile.name?.firstName,
          lastName: profile.name?.lastName,
          onboardingCompleted: true,
        }).returning();

        user = newUser;

        // Create connected account
        await db.insert(connectedAccounts).values({
          userId: newUser[0].id,
          provider: 'apple',
          providerAccountId,
          displayName,
          email,
          accessToken,
          refreshToken,
        });
      } else {
        // Ensure onboardingCompleted is set for existing user
        if (!user[0].onboardingCompleted) {
          await db.update(users)
            .set({ onboardingCompleted: true })
            .where(eq(users.id, user[0].id));
          user[0].onboardingCompleted = true;
        }

        // Check if connected account exists
        const existing = await db.select().from(connectedAccounts)
          .where(and(
            eq(connectedAccounts.userId, user[0].id),
            eq(connectedAccounts.provider, 'apple')
          ))
          .limit(1);

        if (existing.length === 0) {
          // Link account
          await db.insert(connectedAccounts).values({
            userId: user[0].id,
            provider: 'apple',
            providerAccountId,
            displayName,
            email,
            accessToken,
            refreshToken,
          });
        } else {
          // Update existing connection
          await db.update(connectedAccounts)
            .set({
              accessToken,
              refreshToken,
              displayName,
              email,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(connectedAccounts.id, existing[0].id));
        }
      }

      return done(null, user[0]);
    } catch (error) {
      console.error('Apple OAuth error:', error);
      return done(error);
    }
  }));
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !(req.user as any).claims?.sub) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// Get connected accounts for a user
export async function getUserConnectedAccounts(userId: string) {
  return await db.select().from(connectedAccounts)
    .where(eq(connectedAccounts.userId, userId));
}

// Unlink a connected account
export async function unlinkAccount(userId: string, provider: string) {
  const result = await db.delete(connectedAccounts)
    .where(and(
      eq(connectedAccounts.userId, userId),
      eq(connectedAccounts.provider, provider)
    ))
    .returning();

  return result.length > 0;
}

// Initialize OAuth strategies
export function initializeOAuth(app: any) {
  // Note: passport.initialize() is already called in replitAuth.ts
  // Removing duplicate initialization to prevent conflicts
  configureGoogleOAuth(app);
  configureAppleOAuth(app);
}
