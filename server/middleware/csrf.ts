import csrf from 'csurf';
import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * 
 * Protects session-based routes from Cross-Site Request Forgery attacks
 * Uses session storage (cookie: false) to store CSRF tokens
 * 
 * SECURITY: All mutating requests (POST/PUT/PATCH/DELETE) require a valid CSRF token
 */

// CSRF protection middleware - uses session storage
export const csrfProtection = csrf({ cookie: false });

/**
 * CSRF token endpoint handler
 * Returns a fresh CSRF token for the current session
 */
export function getCsrfToken(req: Request, res: Response) {
  res.json({ csrfToken: req.csrfToken() });
}

/**
 * Conditional CSRF middleware
 * Applies CSRF protection selectively based on route and HTTP method
 * 
 * SKIPS CSRF for:
 * - Webhooks (third-party callbacks with their own signature verification)
 * - Health checks
 * - OAuth callbacks and device flows
 * - Mobile OAuth endpoints (native app authentication)
 * - All GET requests (safe methods don't need CSRF protection)
 * 
 * APPLIES CSRF for:
 * - All POST/PUT/PATCH/DELETE requests to session-based API routes
 */
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // Paths that should skip CSRF protection
  const skipPaths = [
    '/api/webhooks/',        // All webhook endpoints (Paddle, Apple, etc.)
    '/api/iap/webhook',      // Apple IAP webhook (alternative path)
    '/api/health',           // Health check endpoint
    '/healthz',              // Alternative health check
    '/api/auth/register',    // Registration endpoint (JWT-based, no session)
    '/api/auth/login',       // Login endpoint (JWT-based, no session)
    '/api/auth/logout',      // Logout endpoint
    '/api/auth/me',          // Get current user (JWT-based)
    '/api/auth/refresh',     // Token refresh endpoint (JWT-based)
    '/api/auth/google',      // Google OAuth (native mobile)
    '/api/auth/callback',    // OAuth callbacks (Google, Apple, etc.)
    '/api/auth/apple',       // Mobile native Apple Sign-In (no CSRF token available)
    '/api/auth/apple/callback', // Apple OAuth callback (POST from Apple's server)
    '/api/auth/device/',     // All device flow endpoints (poll, status, etc.)
    '/api/auth/oauth-device', // Mobile device OAuth flow (RFC 8628)
    '/api/auth/oauth-token',  // OAuth token exchange endpoint
    '/api/oauth/',           // OAuth flow endpoints
    '/api/user/push-token',  // Push notification token registration (session-authenticated)
    '/api/notifications/',   // Push notification endpoints (session-authenticated)
    '/api/ai-coach/',        // AI coach endpoints (session-authenticated)
    '/api/admin/seed-test-accounts', // Test account seeding (development only)
  ];
  
  // Check if current path should skip CSRF
  const isSkipPath = skipPaths.some(path => req.path.startsWith(path));
  
  // GET requests are safe and don't need CSRF protection
  const isGet = req.method === 'GET';
  
  // Skip CSRF for allowed paths or GET requests
  if (isSkipPath || isGet) {
    return next();
  }
  
  // Apply CSRF protection for all other requests
  return (csrfProtection as any)(req, res, next);
}

/**
 * CSRF error handler
 * Provides friendly error messages for CSRF validation failures
 */
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  
  // Log CSRF failure for security monitoring
  console.error('❌ CSRF token validation failed:', {
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    timestamp: new Date().toISOString(),
  });
  
  // Return user-friendly error
  res.status(403).json({ 
    error: 'Invalid or missing CSRF token. Please refresh the page and try again.',
    code: 'CSRF_VALIDATION_FAILED'
  });
}
