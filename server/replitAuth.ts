import type { Express, RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import crypto from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

const PgSession = connectPgSimple(session);

/**
 * Setup authentication middleware for the application
 * Configures express-session with PostgreSQL store and passport
 */
export async function setupAuth(app: Express) {
  // Generate or use SESSION_SECRET from environment
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
  
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET not set - using generated secret (sessions will not persist across restarts)');
    console.warn('   Set SESSION_SECRET environment variable for production');
  }

  // Database URL for session store
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not configured - session store will not work');
    throw new Error('DATABASE_URL is required for session management');
  }

  // Configure session middleware with PostgreSQL store
  const sessionConfig: session.SessionOptions = {
    store: new PgSession({
      conString: databaseUrl,
      tableName: 'user_sessions', // Table name for storing sessions
      createTableIfMissing: true, // Auto-create session table
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'lilove.sid', // Custom session cookie name
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-site for production
      domain: process.env.COOKIE_DOMAIN, // Allow subdomain cookies if configured
    },
    proxy: true, // Trust proxy (critical for Replit/reverse proxy setups)
  };

  app.use(session(sessionConfig));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization - store user ID in session
  passport.serializeUser((user: any, done) => {
    done(null, user.id || user.claims?.sub);
  });

  // Passport deserialization - retrieve user from database
  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (!user) {
        return done(null, false);
      }

      // Format user to match expected session format
      const sessionUser = {
        claims: {
          sub: user.id,
        },
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        onboardingCompleted: user.onboardingCompleted,
      };

      done(null, sessionUser);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });

  console.log("✅ Authentication setup complete");
  console.log("   - Session store: PostgreSQL");
  console.log("   - Session cookie: lilove.sid");
  console.log(`   - Cookie secure: ${sessionConfig.cookie?.secure}`);
  console.log(`   - Cookie sameSite: ${sessionConfig.cookie?.sameSite}`);
}

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ 
    message: 'Authentication required',
    error: 'Not authenticated' 
  });
};
