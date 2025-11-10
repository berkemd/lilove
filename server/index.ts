import * as dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeCronJobs } from "./cron";
import { initPostHog } from "./analytics/posthog";
import { validateEnvironment, logValidationResults } from "./config/env-validation";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import crypto from "crypto";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import rateLimit from "express-rate-limit";

// Validate environment variables at startup
const envValidation = validateEnvironment();
logValidationResults(envValidation);

// Only block startup for critical errors in production
if (!envValidation.isValid && process.env.NODE_ENV === 'production') {
  console.error('\n💥 Startup aborted due to missing critical environment variables');
  console.error('   Please configure the required environment variables and restart\n');
  process.exit(1);
}

// Initialize Sentry for production monitoring
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || 'development',
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_FORCE_SEND) {
        return null;
      }
      return event;
    }
  });
}

const app = express();

// Trust proxy - CRITICAL for Replit deployment
app.set('trust proxy', 1);

// Sentry request and tracing handlers (must be first)
// For Sentry v10, use Handlers
const SentryHandlers = (Sentry as any).Handlers;
if (process.env.SENTRY_DSN && SentryHandlers) {
  app.use(SentryHandlers.requestHandler());
  app.use(SentryHandlers.tracingHandler());
}

// CORS configuration for production-grade security
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allowed origins
    const allowedOrigins = [
      'https://lilove.org',
      'https://www.lilove.org',
      /^https:\/\/.*\.replit\.dev$/,  // All Replit preview domains
      /^https:\/\/.*\.repl\.co$/,      // Replit domains
    ];
    
    // Add localhost in development
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:5000');
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://127.0.0.1:5000');
      allowedOrigins.push('http://0.0.0.0:5000');
      allowedOrigins.push(/^http:\/\/localhost:\d+$/);
      allowedOrigins.push(/^http:\/\/127\.0\.0\.1:\d+$/);
      allowedOrigins.push(/^http:\/\/0\.0\.0\.0:\d+$/);
    }
    
    // Check if origin is allowed
    const allowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Security headers for production-grade deployment
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdn.paddle.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.paddle.com", "https://sandbox-api.paddle.com"],
      frameSrc: ["'self'", "https://checkout.paddle.com", "https://sandbox-checkout.paddle.com"],
      objectSrc: ["'none'"],
      ...(process.env.NODE_ENV === 'production' && { upgradeInsecureRequests: [] }),
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "no-referrer" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Compression for better performance
app.use(compression());

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/healthz' || req.path === '/api/health';
  }
});

app.use(globalRateLimit);

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register routes and setup auth - returns the HTTP server
  const server = await registerRoutes(app);
  
  app.use(express.static("public"));

  // Sentry error handler (must be before other error handlers)
  const SentryHandlers = (Sentry as any).Handlers;
  if (process.env.SENTRY_DSN && SentryHandlers) {
    app.use(SentryHandlers.errorHandler({
      shouldHandleError(error: any) {
        // Capture all errors 400 and above
        if (error.status && error.status >= 400) {
          return true;
        }
        return true;
      }
    }));
  }

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Security: Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Our team has been notified.',
        requestId: crypto.randomBytes(16).toString('hex')
      });
    } else {
      res.status(status).json({ 
        error: message,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: err.stack,
          details: err 
        })
      });
    }

    // Log error for monitoring
    console.error(`Error ${status} on ${req.method} ${req.path}:`, message);
    if (status >= 500) {
      console.error(err.stack);
      // Log to Sentry for 500 errors
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(err, {
          contexts: {
            request: {
              url: req.url,
              method: req.method,
              headers: req.headers,
            }
          }
        });
      }
    }
  });

  // Setup vite in development
  console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
  if (process.env.NODE_ENV === "development") {
    console.log('[DEBUG] Setting up Vite...');
    await setupVite(app, server);
    console.log('[DEBUG] Vite setup complete');
  } else {
    console.log('[DEBUG] Serving static files...');
    serveStatic(app);
  }

  // Initialize cron jobs for league system
  initializeCronJobs();

  // Initialize PostHog for server-side analytics
  initPostHog();

  // Start Express server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();