import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { users, connectedAccounts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Apple OAuth Configuration
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || process.env.APPLE_SERVICE_ID || 'org.lilove.signin';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
const APPLE_KEY_ID = process.env.APPLESIGNIN_KEY_ID || process.env.APPLE_KEY_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLESIGNIN_SECRET_KEY || process.env.APPLE_PRIVATE_KEY || '';

// Get callback URL - supports both production (lilove.org) and dev (replit.dev) domains
const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
const devDomain = process.env.REPLIT_DEV_DOMAIN || domains.find(d => d.includes('replit.dev')) || '';

/**
 * Get the primary domain for Apple OAuth callbacks
 * Uses the first registered domain from REPLIT_DOMAINS
 */
function getPrimaryDomain(): string {
  // Use the first domain from REPLIT_DOMAINS
  if (domains.length > 0) {
    return domains[0];
  }
  // Fallback to dev domain
  if (devDomain) {
    return devDomain;
  }
  return 'localhost:5000';
}

const primaryDomain = getPrimaryDomain();
const protocol = primaryDomain.includes('localhost') ? 'http' : 'https';
const APPLE_CALLBACK_URL = `${protocol}://${primaryDomain}/api/auth/apple/callback`;
const APPLE_CALLBACK_URL_DEV = devDomain ? `https://${devDomain}/api/auth/apple/callback` : APPLE_CALLBACK_URL;

// Store the callback URL used for the current request (needed for token exchange)
let currentCallbackUrl = APPLE_CALLBACK_URL;

console.log('[Apple OAuth] Callback URL (production):', APPLE_CALLBACK_URL);
console.log('[Apple OAuth] Callback URL (dev):', APPLE_CALLBACK_URL_DEV);

/**
 * Format the Apple private key from environment variable to proper PEM format
 */
function getFormattedPrivateKey(): string {
  let key = APPLE_PRIVATE_KEY.trim();
  
  // Replace escaped newlines with actual newlines
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  
  // Remove any existing PEM headers/footers and whitespace for clean rebuild
  key = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');
  
  // Rebuild proper PEM format with 64-char line breaks
  const keyLines: string[] = [];
  for (let i = 0; i < key.length; i += 64) {
    keyLines.push(key.substring(i, i + 64));
  }
  
  return `-----BEGIN PRIVATE KEY-----\n${keyLines.join('\n')}\n-----END PRIVATE KEY-----`;
}

/**
 * Generate Apple client_secret JWT
 * The client_secret for Apple OAuth is a JWT signed with your private key
 */
export function generateAppleClientSecret(): string {
  // Validate required configuration
  if (!APPLE_TEAM_ID) {
    throw new Error('Apple OAuth: APPLE_TEAM_ID is not configured');
  }
  if (!APPLE_KEY_ID) {
    throw new Error('Apple OAuth: APPLESIGNIN_KEY_ID or APPLE_KEY_ID is not configured');
  }
  if (!APPLE_PRIVATE_KEY) {
    throw new Error('Apple OAuth: APPLESIGNIN_SECRET_KEY or APPLE_PRIVATE_KEY is not configured');
  }
  
  let privateKey: string;
  try {
    privateKey = getFormattedPrivateKey();
  } catch (keyError: any) {
    throw new Error(`Apple OAuth: Failed to format private key - ${keyError.message}`);
  }
  
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 86400 * 180, // 6 months max
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  };
  
  try {
    return jwt.sign(claims, privateKey, {
      algorithm: 'ES256',
      keyid: APPLE_KEY_ID,
    });
  } catch (signError: any) {
    throw new Error(`Apple OAuth: Failed to sign JWT - ${signError.message}. Check that your private key is a valid ES256 key.`);
  }
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from Apple
 * @param callbackUrl - The callback URL used for authorization (must match)
 */
export async function exchangeAppleCode(code: string, callbackUrl?: string): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}> {
  const clientSecret = generateAppleClientSecret();
  const redirectUri = callbackUrl || currentCallbackUrl;
  
  console.log('[Apple OAuth] Exchanging code with redirect_uri:', redirectUri);
  
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple token exchange failed: ${errorText}`);
  }
  
  const tokens = await response.json();
  return tokens;
}

/**
 * Decode and verify Apple ID token (JWT)
 */
export function decodeAppleIdToken(idToken: string): {
  sub: string;  // Apple user ID
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  auth_time: number;
} {
  // Decode without verification - Apple's signature uses their public keys
  // In production, you should verify with Apple's public keys
  const decoded = jwt.decode(idToken) as any;
  
  if (!decoded || !decoded.sub) {
    throw new Error('Invalid Apple ID token');
  }
  
  return decoded;
}

/**
 * Handle Apple user sign-in/sign-up
 */
export async function handleAppleUser(
  appleUserId: string,
  email: string | undefined,
  firstName: string | undefined,
  lastName: string | undefined,
  accessToken: string,
  refreshToken: string | undefined,
  existingUserId?: string
): Promise<any> {
  const displayName = firstName && lastName ? `${firstName} ${lastName}`.trim() : undefined;
  
  // If linking to existing account
  if (existingUserId) {
    const existing = await db.select().from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, existingUserId),
        eq(connectedAccounts.provider, 'apple')
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(connectedAccounts)
        .set({
          accessToken,
          refreshToken,
          displayName: displayName || existing[0].displayName,
          email: email || existing[0].email,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, existing[0].id));
    } else {
      await db.insert(connectedAccounts).values({
        userId: existingUserId,
        provider: 'apple',
        providerAccountId: appleUserId,
        displayName,
        email,
        accessToken,
        refreshToken,
      });
    }

    const user = await db.select().from(users)
      .where(eq(users.id, existingUserId))
      .limit(1);

    return user[0];
  }

  // Sign in/sign up flow
  // First, check if we already have a connected account with this Apple ID
  const existingConnection = await db.select().from(connectedAccounts)
    .where(and(
      eq(connectedAccounts.provider, 'apple'),
      eq(connectedAccounts.providerAccountId, appleUserId)
    ))
    .limit(1);
  
  let user: any[] = [];
  
  if (existingConnection.length > 0) {
    user = await db.select().from(users)
      .where(eq(users.id, existingConnection[0].userId))
      .limit(1);
    
    if (user.length > 0) {
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
    // Create new user
    const userEmail = email || `${appleUserId}@privaterelay.appleid.com`;
    const username = `user_${crypto.randomBytes(8).toString('hex')}`;
    
    const newUsers = await db.insert(users).values({
      email: userEmail,
      username,
      appleId: appleUserId,
      firstName: firstName || null,
      lastName: lastName || null,
      password: '',
      onboardingCompleted: false,
      timezone: 'UTC',
    }).returning();
    const newUser = newUsers[0];
    
    await db.insert(connectedAccounts).values({
      userId: newUser.id,
      provider: 'apple',
      providerAccountId: appleUserId,
      displayName,
      email,
      accessToken,
      refreshToken,
    });
    
    return newUser;
  }

  // User exists but may not have Apple connection
  const hasConnection = await db.select().from(connectedAccounts)
    .where(and(
      eq(connectedAccounts.userId, user[0].id),
      eq(connectedAccounts.provider, 'apple')
    ))
    .limit(1);
  
  if (hasConnection.length === 0) {
    await db.insert(connectedAccounts).values({
      userId: user[0].id,
      provider: 'apple',
      providerAccountId: appleUserId,
      displayName,
      email,
      accessToken,
      refreshToken,
    });
  }
  
  return user[0];
}

/**
 * Get Apple authorization URL
 * @param state - OAuth state for CSRF protection
 * @param callbackUrl - Optional callback URL (for dev domain support)
 */
export function getAppleAuthUrl(state: string, callbackUrl?: string): string {
  const redirectUri = callbackUrl || APPLE_CALLBACK_URL;
  
  // Store the callback URL for token exchange
  currentCallbackUrl = redirectUri;
  
  console.log('[Apple OAuth] Generating auth URL with redirect_uri:', redirectUri);
  
  const params = new URLSearchParams({
    response_type: 'code',
    response_mode: 'form_post',
    client_id: APPLE_CLIENT_ID,
    redirect_uri: redirectUri,
    state: state,
    scope: 'name email',
  });
  
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/**
 * Get the appropriate Apple callback URL based on host
 */
export function getAppleCallbackUrlForHost(host: string): string {
  if (host && host.includes('replit.dev') && devDomain) {
    console.log('[Apple OAuth] Using dev domain callback:', APPLE_CALLBACK_URL_DEV);
    return APPLE_CALLBACK_URL_DEV;
  }
  console.log('[Apple OAuth] Using production callback:', APPLE_CALLBACK_URL);
  return APPLE_CALLBACK_URL;
}

/**
 * Check if Apple OAuth is configured
 */
export function isAppleOAuthConfigured(): boolean {
  return Boolean(APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY);
}

/**
 * Initialize Apple OAuth and log configuration
 */
export function initializeAppleOAuth(): void {
  if (!isAppleOAuthConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Apple OAuth credentials not configured - Apple login will be unavailable');
    }
    return;
  }
  
  // Test that we can generate a client secret (validates key format)
  try {
    generateAppleClientSecret();
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Apple OAuth configured (direct implementation)');
    }
  } catch (error) {
    // Apple OAuth key validation failed - Apple login will not work
  }
}
