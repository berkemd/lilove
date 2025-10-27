import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const userResult = await db.select().from(users)
      .where(eq(users.id, decoded.sub))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }

    // Attach user to request
    req.user = {
      id: userResult[0].id,
      email: userResult[0].email,
      subscriptionTier: userResult[0].subscriptionTier,
      isAuthenticated: true,
    };

    next();
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

// Create specific rate limiters
export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
);

export const apiRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'API rate limit exceeded. Please slow down your requests.'
);

export const uploadRateLimit = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Upload limit reached. Please try again later.'
);