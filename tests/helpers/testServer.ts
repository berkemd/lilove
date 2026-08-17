import express, { Express } from 'express';
import { createServer, type Server } from 'http';
import { registerRoutes } from '../../server/routes';
import expressSession from 'express-session';

/**
 * Create a test server that uses PRODUCTION routes from server/routes.ts
 * This ensures tests validate real server code, not reimplemented duplicates.
 * 
 * CRITICAL: This function imports and uses registerRoutes from server/routes.ts
 * to ensure tests validate production code paths, middleware, and business logic.
 * 
 * Mocks for external services (Apple JWKS, Google OAuth) are set up in tests/setup.ts
 */
export async function createTestServer(): Promise<Server> {
  const app = express();
  
  // Add minimal middleware needed for tests
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Create a minimal session middleware for testing
  // This is needed by registerRoutes but won't be used for mobile auth routes
  const sessionMiddleware = expressSession({
    secret: 'test-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // HTTP in tests
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });
  
  // Register ALL production routes from server/routes.ts
  // This includes:
  // - POST /api/auth/apple (Mobile Apple Sign-In)
  // - POST /api/auth/google/mobile (Mobile Google Sign-In)
  // - POST /api/user/push-token (Push notification token registration)
  // - All other production routes
  const httpServer = await registerRoutes(app, sessionMiddleware);
  
  return httpServer;
}
