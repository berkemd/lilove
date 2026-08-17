import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { randomBytes } from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import admin from 'firebase-admin';

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = await client.discovery(
          new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
          process.env.REPL_ID!
        );
        console.log(`✅ OIDC discovery succeeded on attempt ${attempt}`);
        return config;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️  OIDC discovery attempt ${attempt}/${maxRetries} failed:`, (error as Error).message);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('OIDC discovery failed after all retries');
  },
  { maxAge: 3600 * 1000 }
);

/**
 * Extract the registrable domain (apex/TLD+1) from a hostname
 * e.g., "app.lilove.org" -> "lilove.org"
 * e.g., "www.example.co.uk" -> "example.co.uk" (simplified - doesn't handle all TLDs)
 */
function getApexDomain(hostname: string): string | null {
  // Remove port if present
  const domain = hostname.split(':')[0];
  
  // Skip localhost and IP addresses
  if (domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return null;
  }
  
  // For common TLDs, extract TLD+1 (apex domain)
  // This handles most common cases: .org, .com, .net, .io, .dev, .app, etc.
  const parts = domain.split('.');
  
  // If it's already an apex domain (2 parts like "lilove.org"), return as-is
  if (parts.length === 2) {
    return domain;
  }
  
  // For subdomains (3+ parts like "app.lilove.org"), return last 2 parts
  // This is a simplified approach that works for most common TLDs
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  
  return null;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Determine if we're in production (non-localhost) environment
  const isProduction = process.env.NODE_ENV === 'production' || !process.env.REPLIT_DOMAINS?.includes('localhost');
  
  // Get primary domain for cookie (e.g., .lilove.org for apex domain cookies)
  const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
  const primaryDomain = domains.find(d => d.includes('lilove.org'));
  
  // Extract apex domain (TLD+1) for cookie sharing across subdomains
  // e.g., "app.lilove.org" -> ".lilove.org"
  let cookieDomain: string | undefined;
  if (primaryDomain) {
    const apex = getApexDomain(primaryDomain);
    if (apex) {
      cookieDomain = `.${apex}`;
    }
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Production/Deployment: secure + sameSite=none for Apple OAuth cross-site POST
      // Development (localhost): secure=false + sameSite=lax for HTTP
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: sessionTtl,
      // Set domain for production to enable cross-subdomain cookies (e.g., .lilove.org)
      // This allows auth.lilove.org to set cookies readable by lilove.org
      ...(isProduction && cookieDomain ? { domain: cookieDomain } : {}),
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express, sessionMiddleware: ReturnType<typeof getSession>) {
  app.set("trust proxy", 1);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Parse domains and add localhost for development
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Always add localhost if not present in REPLIT_DOMAINS (Replit runs with NODE_ENV=production)
  if (!domains.includes('localhost')) {
    domains.push('localhost');
  }
  
  for (const domain of domains) {
    // Detect localhost and Replit preview domains (*.replit.dev) - use http://
    // Use https:// only for custom domains like lilove.org
    const isLocalhost = domain === 'localhost';
    const isReplitPreview = domain.endsWith('.replit.dev');
    const protocol = (isLocalhost || isReplitPreview) ? 'http' : 'https';
    const port = isLocalhost ? ':5000' : '';
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${protocol}://${domain}${port}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // CRITICAL FIX: Dynamic strategy registration for test/preview environments
  // This ensures strategies are registered on-demand for any hostname (e.g., dynamic *.replit.dev domains)
  const ensureStrategyExists = (hostname: string) => {
    const strategyName = `replitauth:${hostname}`;
    
    // Check if strategy already exists
    if (!(passport as any)._strategy(strategyName)) {
      console.log(`[Auth] Dynamically registering strategy for: ${hostname}`);
      
      // Determine protocol and port based on hostname
      const isLocalhost = hostname === 'localhost';
      const isReplitPreview = hostname.endsWith('.replit.dev');
      const protocol = (isLocalhost || isReplitPreview) ? 'http' : 'https';
      const port = isLocalhost ? ':5000' : '';
      
      // Create and register strategy for this hostname
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `${protocol}://${hostname}${port}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
    }
  };

  app.get("/api/login", (req, res, next) => {
    // Ensure strategy exists for this hostname (handles dynamic test/preview domains)
    ensureStrategyExists(req.hostname);
    
    // Use OAuth2 state parameter to encode mode information
    const mode = req.query.mode as string;
    const stateData = {
      mode: mode === 'popup' ? 'popup' : 'redirect',
      csrf: randomBytes(16).toString('hex')
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    console.log('[Auth Debug] Login request - hostname:', req.hostname, 'mode:', stateData.mode);
    console.log('[Auth Debug] Available strategies:', domains.join(', '));
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
      state: state,
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Ensure strategy exists for this hostname (handles dynamic test/preview domains)
    ensureStrategyExists(req.hostname);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        return next(err);
      }
      
      // Decode state parameter to determine auth mode
      let mode: 'popup' | 'redirect' = 'redirect';
      const stateParam = req.query.state as string;
      
      if (stateParam) {
        try {
          const stateData = JSON.parse(Buffer.from(stateParam, 'base64').toString());
          mode = stateData.mode || 'redirect';
          console.log('[Popup Debug] Callback mode from state:', mode, 'csrf:', stateData.csrf);
        } catch (error) {
          console.error('[Popup Debug] Failed to parse state parameter:', error);
        }
      } else {
        console.log('[Popup Debug] No state parameter in callback');
      }
      
      if (mode === 'popup') {
        console.log('[Popup Debug] Redirecting to /api/callback/popup');
        return res.redirect('/api/callback/popup');
      }
      
      // Regular redirect flow
      console.log('[Popup Debug] Regular redirect to /');
      res.redirect('/');
    });
  });

  // Popup completion route - returns HTML that posts message to opener
  app.get("/api/callback/popup", (req, res) => {
    // Security: Only authenticated users can access this
    if (!req.isAuthenticated()) {
      return res.status(401).send('Unauthorized');
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Authentication Successful</title>
      </head>
      <body>
        <script>
          try {
            // Security: Validate opener exists and has same origin
            if (window.opener && window.opener !== window) {
              // Post message to parent window
              window.opener.postMessage(
                { type: 'auth-success' },
                window.location.origin
              );
              
              // Close popup after short delay to ensure message is received
              setTimeout(() => {
                window.close();
              }, 100);
            } else {
              // No opener, redirect to home
              window.location.href = '/';
            }
          } catch (error) {
            console.error('Error communicating with opener:', error);
            // Fallback: redirect to home
            window.location.href = '/';
          }
        </script>
        <noscript>
          <p>Authentication successful! You can close this window.</p>
        </noscript>
      </body>
      </html>
    `);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET must be set in production environment');
    return 'fallback-secret-not-secure';
  }
  return 'dev-only-insecure-secret-change-in-production';
})();

// Helper function to verify Firebase token
async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string; name?: string } | null> {
  if (admin.apps.length === 0) {
    return null;
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (error: any) {
    // Only log if it's not a token format issue
    if (error.code !== 'auth/argument-error') {
      // Silent fail for non-Firebase tokens
    }
    return null;
  }
}

// Helper function to find or create user from Firebase auth
async function findOrCreateFirebaseUser(firebaseUser: { uid: string; email?: string; name?: string }) {
  // First try to find by firebaseUid
  let userResult = await db.select().from(users)
    .where(eq(users.firebaseUid, firebaseUser.uid))
    .limit(1);
  
  if (userResult.length > 0) {
    return userResult[0];
  }
  
  // Try to find by email if firebaseUid not found
  if (firebaseUser.email) {
    userResult = await db.select().from(users)
      .where(eq(users.email, firebaseUser.email))
      .limit(1);
    
    if (userResult.length > 0) {
      // Update the existing user with firebaseUid
      await db.update(users)
        .set({ firebaseUid: firebaseUser.uid })
        .where(eq(users.id, userResult[0].id));
      return userResult[0];
    }
  }
  
  // Create new user
  const newUser = await db.insert(users).values({
    email: firebaseUser.email || `${firebaseUser.uid}@firebase.local`,
    firebaseUid: firebaseUser.uid,
    firstName: firebaseUser.name?.split(' ')[0] || 'User',
    lastName: firebaseUser.name?.split(' ').slice(1).join(' ') || '',
    subscriptionTier: 'free',
  }).returning();
  
  return newUser[0];
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // First, check for JWT Bearer token (for mobile app)
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Try Firebase token verification FIRST (mobile apps use Firebase)
    try {
      const firebaseUser = await verifyFirebaseToken(token);
      if (firebaseUser) {
        const dbUser = await findOrCreateFirebaseUser(firebaseUser);
        (req as any).user = {
          claims: {
            sub: dbUser.id,
            email: dbUser.email,
          },
          id: dbUser.id,
          email: dbUser.email,
          subscriptionTier: dbUser.subscriptionTier,
          isAuthenticated: true,
          isJwtAuth: true,
        };
        return next();
      }
    } catch (firebaseError) {
      // Firebase verification failed, try local JWT
    }
    
    // Fallback to local JWT verification (web sessions)
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'lilove.org',
      }) as any;
      
      // Get user from database
      const userResult = await db.select().from(users)
        .where(eq(users.id, decoded.sub))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(401).json({ message: "User not found" });
      }

      // Set user in request with claims structure for compatibility
      (req as any).user = {
        claims: {
          sub: userResult[0].id,
          email: userResult[0].email,
        },
        id: userResult[0].id,
        email: userResult[0].email,
        subscriptionTier: userResult[0].subscriptionTier,
        isAuthenticated: true,
        isJwtAuth: true,
      };
      
      return next();
    } catch (localJwtError: any) {
      // Both Firebase and local JWT failed
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }

  // Fall back to session-based auth (Replit Auth)
  const user = req.user as any;

  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};