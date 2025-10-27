// Replit Auth Integration
// This file provides authentication middleware for Replit's built-in auth system
import { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import { initializeOAuth } from './auth/oauth';

export interface AuthenticatedRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      email?: string;
      name?: string;
    };
  };
  isAuthenticated(): boolean;
}

export async function setupAuth(app: Express) {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'lilove-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Initialize OAuth strategies (Google, Apple)
  initializeOAuth(app);

  console.log('✅ Authentication middleware configured');
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}

// Middleware to get current user ID
export function getUserId(req: AuthenticatedRequest): string | null {
  if (req.user && req.user.claims && req.user.claims.sub) {
    return req.user.claims.sub;
  }
  return null;
}
