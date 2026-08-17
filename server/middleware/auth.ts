import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;
try {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0]!;
    } else {
      console.log('[Firebase Admin] Initializing with project:', projectId);
      firebaseApp = admin.initializeApp({
        projectId: projectId,
      });
    }
    console.log('[Firebase Admin] ✅ Initialized successfully');
  } else {
    console.warn('[Firebase Admin] No Firebase project ID configured');
  }
} catch (error) {
  console.error('[Firebase Admin] Failed to initialize:', error);
}

/**
 * Generate a Firebase custom token for a user
 * This allows OAuth-authenticated users to be signed into Firebase client-side
 */
export async function generateFirebaseCustomToken(uid: string, additionalClaims?: Record<string, any>): Promise<string | null> {
  if (!firebaseApp) {
    console.error('[Firebase Admin] Cannot generate custom token: Firebase not initialized');
    return null;
  }
  
  try {
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
    console.log('[Firebase Admin] Custom token generated for uid:', uid);
    return customToken;
  } catch (error: any) {
    console.error('[Firebase Admin] Failed to generate custom token:', error.message);
    return null;
  }
}

// CRITICAL SECURITY FIX: Use environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  JWT_SECRET not set, using insecure default for development only');
  return 'dev-only-insecure-secret-change-in-production';
})();

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = '30d';
const SALT_ROUNDS = 10;

export interface AuthRequest extends Request {
  user?: any;
}

// Generate JWT token
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { 
      sub: userId,
      email: email
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRY,
      algorithm: 'HS256',
      issuer: 'lilove.org',
    } as jwt.SignOptions
  );
}

// Generate refresh token
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { 
      sub: userId,
      type: 'refresh'
    },
    JWT_SECRET,
    { 
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
      issuer: 'lilove.org',
    } as jwt.SignOptions
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'lilove.org',
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password with hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Verify Firebase ID token
async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string; name?: string } | null> {
  if (!firebaseApp) {
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
    // Only log if it's not a token format issue (Firebase tokens fail gracefully for non-Firebase tokens)
    if (error.code !== 'auth/argument-error') {
      console.log('[Firebase Auth] Token verification failed:', error.code || error.message);
    }
    return null;
  }
}

// Find or create user from Firebase auth
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

// Authentication middleware
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Check if user is authenticated via Replit Auth or session
      if (req.isAuthenticated && req.isAuthenticated()) {
        const sessionUser = req.user as any;
        if (sessionUser?.claims?.sub) {
          req.user = {
            id: sessionUser.claims.sub,
            email: sessionUser.claims.email,
            isAuthenticated: true,
          };
          return next();
        }
      }
      
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid JWT token in the Authorization header'
      });
    }

    const token = authHeader.substring(7);
    
    // Try Firebase token verification FIRST (mobile apps use Firebase)
    const firebaseUser = await verifyFirebaseToken(token);
    if (firebaseUser) {
      const dbUser = await findOrCreateFirebaseUser(firebaseUser);
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        subscriptionTier: dbUser.subscriptionTier,
        isAuthenticated: true,
      };
      return next();
    }
    
    // Fallback to local JWT verification (web sessions)
    try {
      const decoded = verifyToken(token);
      
      // Get user from database
      const userResult = await db.select().from(users)
        .where(eq(users.id, decoded.sub))
        .limit(1);

      if (userResult.length > 0) {
        req.user = {
          id: userResult[0].id,
          email: userResult[0].email,
          subscriptionTier: userResult[0].subscriptionTier,
          isAuthenticated: true,
        };
        return next();
      }
    } catch (localJwtError: any) {
      // Local JWT also failed - token is invalid
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    
    if (error.message === 'Token has expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message || 'Invalid or expired token'
    });
  }
};

// Admin-only middleware
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.subscriptionTier !== 'enterprise') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This endpoint requires administrator privileges'
    });
  }
  next();
};

// Premium-only middleware
export const requirePremium = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access premium features'
    });
  }

  const premiumTiers = ['pro', 'team', 'enterprise'];
  if (!premiumTiers.includes(req.user.subscriptionTier)) {
    return res.status(403).json({ 
      error: 'Premium required',
      message: 'This feature requires a premium subscription'
    });
  }
  
  next();
};

// Rate limiting middleware factory
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  // Clean up old entries every minute
  setInterval(() => {
    const now = Date.now();
    // Convert to array to iterate properly
    Array.from(attempts.entries()).forEach(([key, data]) => {
      if (data.resetTime < now) {
        attempts.delete(key);
      }
    });
  }, 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const userAttempts = attempts.get(key);
    
    if (!userAttempts || userAttempts.resetTime < now) {
      attempts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userAttempts.count >= max) {
      const retryAfter = Math.ceil((userAttempts.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(userAttempts.resetTime).toISOString());
      
      return res.status(429).json({
        error: 'Too many requests',
        message: message || 'Please try again later',
        retryAfter
      });
    }

    userAttempts.count++;
    
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', (max - userAttempts.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(userAttempts.resetTime).toISOString());
    
    next();
  };
};

// Create specific rate limiters (skip in test environment to avoid setInterval timers)
export const authRateLimit = process.env.NODE_ENV === 'test'
  ? (req: Request, res: Response, next: NextFunction) => next()
  : createRateLimiter(
      15 * 60 * 1000, // 15 minutes
      5, // 5 attempts
      'Too many authentication attempts. Please try again later.'
    );

export const apiRateLimit = process.env.NODE_ENV === 'test'
  ? (req: Request, res: Response, next: NextFunction) => next()
  : createRateLimiter(
      15 * 60 * 1000, // 15 minutes
      100, // 100 requests
      'API rate limit exceeded. Please slow down your requests.'
    );

export const uploadRateLimit = process.env.NODE_ENV === 'test'
  ? (req: Request, res: Response, next: NextFunction) => next()
  : createRateLimiter(
      60 * 60 * 1000, // 1 hour
      10, // 10 uploads
      'Upload limit reached. Please try again later.'
    );