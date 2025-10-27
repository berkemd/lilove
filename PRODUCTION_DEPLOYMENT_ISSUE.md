# Production Deployment Routing Issue - CRITICAL

## Issue Summary
The production site at lilove.org has a critical routing configuration issue where API endpoints are not being properly proxied to the Express backend server. Instead, they are falling through to the static SPA hosting, returning HTML instead of JSON.

## Current Status

### ✅ Working Endpoints
- `/api/health` - Returns proper JSON: `{"ok":true,"ts":...}`
- `/api/auth/google` - Redirects properly to Google OAuth
- `/api/auth/apple` - Redirects properly to Apple OAuth
- `/api/auth/register` - Returns proper JSON responses/errors

### ❌ Broken Endpoints (Return HTML instead of JSON)
- `/api/pricing` - Returns SPA HTML instead of pricing data
- `/api/ai-mentor/*` - All AI mentor endpoints return SPA HTML
- `/api/goals` - Returns SPA HTML (after authentication check)
- `/api/paddle/*` - Payment endpoints return SPA HTML
- `/healthz` - Returns Google 404 page
- Most other `/api/*` routes

## Root Cause
The production deployment on Google's infrastructure (Firebase Hosting or Google Cloud Load Balancer) is not configured to properly route API requests to the Express backend. The routing rules are missing or too narrow, causing most API paths to fall through to the static site hosting.

## Required Fix

### Google Cloud/Firebase Configuration
The production deployment configuration needs to be updated to:

1. **Add proxy rules for all API routes:**
   ```
   /api/** → Express backend service
   /healthz → Express backend service
   ```

2. **Ensure routing priority:**
   - API routes should be handled BEFORE static file fallback
   - Only non-API routes should fall through to the SPA

### Example Firebase Hosting Configuration
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api" 
        // OR "run": { "serviceId": "express-backend" }
      },
      {
        "source": "/healthz",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Example Google Cloud Load Balancer Configuration
```yaml
urlMap:
  pathMatchers:
    - name: api-routes
      pathRules:
        - paths:
            - /api/*
            - /api/**
            - /healthz
          service: express-backend-service
    - name: static-site
      defaultService: static-frontend-service
```

## Impact
- **Authentication**: Works partially (OAuth redirects work, but authenticated API calls fail)
- **AI Features**: Completely broken - cannot access AI mentor
- **Payment**: Paddle integration broken - cannot process payments
- **Core Functionality**: Goals, tasks, habits, teams - all broken
- **Mobile App**: iOS app will fail to connect to backend APIs

## Testing After Fix
Once the routing configuration is updated:

1. Test `/healthz` returns JSON: `{"status":"healthy"}`
2. Test `/api/pricing` returns pricing data
3. Test `/api/ai-mentor/chat` with authentication
4. Test Paddle webhook at `/api/paddle/webhook`
5. Verify all API routes in server/routes.ts are accessible

## Local Development
The local development environment works correctly because the Express server directly handles all routes on port 5000. The issue only affects the production deployment where Google's infrastructure sits in front of the Express server.

## Action Required
**The deployment team needs to update the Google Cloud/Firebase routing configuration to properly proxy API routes to the Express backend service.**

Until this is fixed, the production site at lilove.org will have severely limited functionality.