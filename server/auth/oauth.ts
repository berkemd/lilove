import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { db } from '../db';
import { users, connectedAccounts } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// OAuth Credentials from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || process.env.APPLE_SERVICE_ID || 'org.lilove.signin';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
// Use APPLESIGNIN_KEY_ID for Sign-In (not APPSTORE_KEY_ID which is for App Store Connect API)
const APPLE_KEY_ID = process.env.APPLESIGNIN_KEY_ID || process.env.APPLE_KEY_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLESIGNIN_SECRET_KEY || process.env.APPLE_PRIVATE_KEY || '';

// Get all domains from REPLIT_DOMAINS environment variable
const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
const devDomain = process.env.REPLIT_DEV_DOMAIN || domains.find(d => d.includes('replit.dev')) || '';

/**
 * Get the primary domain for OAuth callbacks
 * Uses the first registered domain from REPLIT_DOMAINS
 */
function getPrimaryDomain(): string {
  // Use the first domain from REPLIT_DOMAINS (usually the primary custom domain)
  if (domains.length > 0) {
    return domains[0];
  }
  // Fallback to dev domain if no custom domains
  if (devDomain) {
    return devDomain;
  }
  return 'localhost:5000';
}

const primaryDomain = getPrimaryDomain();
const protocol = primaryDomain.includes('localhost') ? 'http' : 'https';

// Log the callback domain on startup for debugging
console.log('[OAuth] Primary domain resolved to:', primaryDomain);
console.log('[OAuth] Dev domain:', devDomain || 'not set');

// OAuth callback URLs - Use the primary registered domain
const GOOGLE_CALLBACK_URL = `${protocol}://${primaryDomain}/api/auth/google/callback`;
const APPLE_CALLBACK_URL = `${protocol}://${primaryDomain}/api/auth/apple/callback`;

// Dev domain callback URLs for testing
const GOOGLE_CALLBACK_URL_DEV = devDomain ? `https://${devDomain}/api/auth/google/callback` : GOOGLE_CALLBACK_URL;
const APPLE_CALLBACK_URL_DEV = devDomain ? `https://${devDomain}/api/auth/apple/callback` : APPLE_CALLBACK_URL;

console.log('[OAuth] Google callback URL (production):', GOOGLE_CALLBACK_URL);
console.log('[OAuth] Google callback URL (dev):', GOOGLE_CALLBACK_URL_DEV);

// Base URL for OAuth callbacks - dynamically determines based on request
const getBaseUrl = (req: Request) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
};

// Get the appropriate callback URL based on request origin
export const getGoogleCallbackUrl = (req: Request) => {
  const host = (req.headers['x-forwarded-host'] || req.get('host')) as string;
  // If request is from dev domain, use dev callback (if configured in Google Console)
  if (host && host.includes('replit.dev') && devDomain) {
    console.log('[OAuth] Using dev domain callback for Google:', GOOGLE_CALLBACK_URL_DEV);
    return GOOGLE_CALLBACK_URL_DEV;
  }
  console.log('[OAuth] Using production callback for Google:', GOOGLE_CALLBACK_URL);
  return GOOGLE_CALLBACK_URL;
};

export const getAppleCallbackUrl = (req: Request) => {
  const host = (req.headers['x-forwarded-host'] || req.get('host')) as string;
  // For Apple, also support dev domain if configured
  if (host && host.includes('replit.dev') && devDomain) {
    console.log('[OAuth] Using dev domain callback for Apple:', APPLE_CALLBACK_URL_DEV);
    return APPLE_CALLBACK_URL_DEV;
  }
  console.log('[OAuth] Using production callback for Apple:', APPLE_CALLBACK_URL);
  return APPLE_CALLBACK_URL;
};

/**
 * OAuth State Management using Database (scalable for multi-server deployments)
 * 
 * Stores OAuth states in the database with expiration for CSRF protection.
 * This approach works with horizontal scaling and load balancers.
 */

// In-memory fallback for when database is unavailable (development only)
const oauthStatesMemory = new Map<string, { userId?: string; popup?: boolean; expiresAt: number }>();

// Clean up expired states from memory fallback every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of Array.from(oauthStatesMemory.entries())) {
    if (data.expiresAt < now) {
      oauthStatesMemory.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate OAuth state for CSRF protection
 * Stores state in database with 10-minute expiration
 */
export async function generateOAuthState(userId?: string, popup?: boolean): Promise<string> {
  const state = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  try {
    // Insert state directly (table already exists from schema migration)
    // Don't run cleanup on every request - cron job handles this
    await db.execute(sql`
      INSERT INTO oauth_states (state, user_id, popup, expires_at)
      VALUES (${state}, ${userId || null}, ${popup || false}, ${expiresAt.toISOString()})
      ON CONFLICT (state) DO NOTHING
    `);
  } catch (error) {
    // Fallback to memory for development
    oauthStatesMemory.set(state, {
      userId,
      popup,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }
  
  return state;
}

/**
 * Verify OAuth state and retrieve associated data
 * Checks database first, falls back to memory
 */
export async function verifyOAuthState(state: string): Promise<{ userId?: string; popup?: boolean } | null> {
  try {
    // Try database first
    const result = await db.execute(sql`
      SELECT user_id, popup, expires_at
      FROM oauth_states
      WHERE state = ${state}
    `);
    
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const expiresAt = new Date(row.expires_at);
      
      // Check expiration
      if (expiresAt < new Date()) {
        await db.execute(sql`DELETE FROM oauth_states WHERE state = ${state}`);
        return null;
      }
      
      // Delete state (one-time use)
      await db.execute(sql`DELETE FROM oauth_states WHERE state = ${state}`);
      
      return {
        userId: row.user_id || undefined,
        popup: row.popup || false,
      };
    }
  } catch (error) {
    // Fallback to memory check
  }
  
  // Fallback to memory
  const data = oauthStatesMemory.get(state);
  if (!data || data.expiresAt < Date.now()) {
    oauthStatesMemory.delete(state);
    return null;
  }
  oauthStatesMemory.delete(state); // One-time use
  return data;
}

// Configure Google OAuth Strategy
export function configureGoogleOAuth(app: any) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Google OAuth credentials not configured - Google login will be unavailable');
    }
    return;
  }

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
      return done(error);
    }
  }));
}

// Configure Apple OAuth Strategy
export function configureAppleOAuth(app: any) {
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Apple OAuth credentials not configured - Apple login will be unavailable');
    }
    return;
  }

  // Format private key - Apple keys need proper PEM format
  let formattedPrivateKey = APPLE_PRIVATE_KEY.trim();
  
  // Replace escaped newlines with actual newlines
  if (formattedPrivateKey.includes('\\n')) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  }
  
  // Remove any existing PEM headers/footers and whitespace for clean rebuild
  formattedPrivateKey = formattedPrivateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');
  
  // Rebuild proper PEM format with 64-char line breaks
  const keyLines: string[] = [];
  for (let i = 0; i < formattedPrivateKey.length; i += 64) {
    keyLines.push(formattedPrivateKey.substring(i, i + 64));
  }
  formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${keyLines.join('\n')}\n-----END PRIVATE KEY-----`;
  
  passport.use('apple-oauth', new AppleStrategy({
    clientID: APPLE_CLIENT_ID,
    teamID: APPLE_TEAM_ID,
    keyID: APPLE_KEY_ID,
    privateKeyString: formattedPrivateKey,
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
      // First, check if we already have a connected account with this Apple ID
      const existingConnection = await db.select().from(connectedAccounts)
        .where(and(
          eq(connectedAccounts.provider, 'apple'),
          eq(connectedAccounts.providerAccountId, providerAccountId)
        ))
        .limit(1);
      
      let user: any[] = [];
      
      if (existingConnection.length > 0) {
        // Found existing connection, get the user
        user = await db.select().from(users)
          .where(eq(users.id, existingConnection[0].userId))
          .limit(1);
        
        if (user.length > 0) {
          // Update the connection with latest tokens
          await db.update(connectedAccounts)
            .set({
              accessToken,
              refreshToken,
              displayName: displayName || existingConnection[0].displayName,
              email: email || existingConnection[0].email,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(connectedAccounts.id, existingConnection[0].id));
        }
      }
      
      // If no user found via Apple ID connection, try email lookup
      if (user.length === 0 && email) {
        user = await db.select().from(users)
          .where(eq(users.email, email))
          .limit(1);
      }

      if (user.length === 0) {
        // Create new user - generate email if not provided by Apple
        const userEmail = email || `${providerAccountId}@privaterelay.appleid.com`;
        const newUser = await db.insert(users).values({
          email: userEmail,
          displayName,
          firstName: profile.name?.firstName,
          lastName: profile.name?.lastName,
          onboardingCompleted: true,
          appleId: providerAccountId, // Store Apple ID for future lookups
        }).returning();

        user = newUser;

        // Create connected account
        await db.insert(connectedAccounts).values({
          userId: newUser[0].id,
          provider: 'apple',
          providerAccountId,
          displayName,
          email: userEmail,
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
