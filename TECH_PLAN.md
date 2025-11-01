# LiLove Technical Architecture Plan

**Version:** 1.0.0  
**Date:** October 28, 2025  
**Status:** Production Ready Implementation

## Executive Summary

LiLove is a full-stack AI-powered personal development platform combining habit formation, gamification, team collaboration, and performance coaching. This document outlines the technical architecture and implementation plan for production deployment.

## Technology Stack

### Current Stack (Maintained)

**Frontend:**
- **Framework:** React 18.3 + TypeScript
- **Build Tool:** Vite 7.1
- **UI Library:** Radix UI + Tailwind CSS 3.4
- **State Management:** TanStack Query (React Query) 5.x
- **Routing:** Wouter 3.x (lightweight SPA router)
- **Forms:** React Hook Form + Zod validation
- **i18n:** i18next + react-i18next

**Backend:**
- **Runtime:** Node.js + Express 4.x
- **Type System:** TypeScript 5.9
- **Build:** esbuild 0.25 (fast compilation)
- **Process Manager:** tsx for development

**Database:**
- **Provider:** Neon PostgreSQL (serverless, auto-scaling)
- **ORM:** Drizzle ORM 0.39
- **Migrations:** drizzle-kit 0.18
- **Connection:** @neondatabase/serverless (HTTP-based, edge-compatible)

**Mobile:**
- **Framework:** Expo SDK 52 + React Native 0.76
- **Navigation:** React Navigation 6.x
- **Build Service:** EAS (Expo Application Services)
- **Store Deployment:** Apple App Store, TestFlight

**Authentication:**
- **Session Management:** express-session + connect-pg-simple (PostgreSQL-backed)
- **OAuth Libraries:** passport + passport-google-oauth20 + passport-apple
- **Password Hashing:** bcrypt (10 rounds)
- **CSRF Protection:** csurf middleware

**Payments:**
- **Web:** Paddle v2 SDK (@paddle/paddle-node-sdk)
- **iOS:** Apple In-App Purchase (StoreKit 2 + App Store Server Library)

**AI/ML:**
- **Primary:** OpenAI API (GPT-4 for coaching)
- **Analytics:** PostHog (product analytics)
- **Error Tracking:** Sentry (optional, recommended for production)

**Real-time:**
- **WebSocket:** Socket.IO 4.8 (client + server)

**Infrastructure:**
- **Hosting:** Replit Deployments (autoscale, managed)
- **Domain:** lilove.org (HTTPS via Let's Encrypt)
- **CDN:** Replit CDN for static assets

### Stack Justification

**Why keep current stack?**

1. **Serverless-First:** Neon PostgreSQL is fully serverless with generous free tier
2. **Zero Config Deployment:** Replit provides integrated hosting with zero infrastructure management
3. **Edge-Compatible:** Drizzle + Neon HTTP adapter works on edge runtimes
4. **Modern DX:** Vite + esbuild = ultra-fast builds
5. **Battle-Tested:** Express 4.x is stable, well-documented, and widely supported
6. **Mobile Native:** Expo SDK 52 is production-ready with EAS build service
7. **Cost-Effective:** Entire stack can run on free tiers until significant scale

**No changes needed:** The existing stack is production-ready and appropriate for the scale.

## Architecture Overview

### Monorepo Structure

```
lilove/
├── client/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # Client utilities
│   │   └── locales/       # i18n translations
│   └── public/            # Static assets
├── server/                # Express API
│   ├── auth/              # Authentication logic
│   ├── payments/          # Payment integrations
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── index.ts           # Server entry point
├── mobile/                # Expo/React Native app
│   ├── app.json           # Expo config
│   ├── eas.json           # EAS build config
│   └── [app structure]    # Mobile app code
├── shared/                # Shared code between client/server
│   └── schema.ts          # Drizzle schema (source of truth)
├── e2e/                   # Playwright E2E tests
├── scripts/               # Build and utility scripts
├── docs/                  # Documentation
└── .github/workflows/     # CI/CD pipelines
```

### Data Layer

**Database Schema (Drizzle):**
- **Users:** Authentication, profiles, preferences
- **Goals:** User goals with categories, priorities, deadlines
- **Tasks:** Task management with Pomodoro timers
- **Habits:** Daily habit tracking with streaks
- **Achievements:** Gamification achievements (50+ types)
- **Teams:** Collaborative team features
- **Subscriptions:** Payment entitlements (Paddle + Apple)
- **ConnectedAccounts:** OAuth account linking
- **Sessions:** Express session storage

**Connection Pooling:**
- Drizzle pool: 10 connections max
- Neon auto-scales connections
- HTTP-based queries (no TCP connection pooling needed)

**Migrations:**
- `drizzle-kit generate` creates SQL migrations
- `drizzle-kit push` applies schema changes
- Schema file: `shared/schema.ts` (single source of truth)

### Rate Limiting Strategy

**Implementation:**
- **Library:** express-rate-limit
- **Storage:** In-memory (sufficient for single-instance deployment)
- **Limits:**
  - Auth endpoints: 5 requests / 15 minutes per IP
  - API endpoints: 100 requests / 15 minutes per user
  - AI endpoints: 20 requests / hour per user
  - Webhook endpoints: No limit (verified by signature)

**Future:** If scaling to multiple instances, use Redis for distributed rate limiting.

## Security Architecture

### Authentication Flow

**Web Authentication Methods:**
1. **Email/Password:** bcrypt hashing, secure session cookies
2. **Google OAuth:** passport-google-oauth20 with PKCE
3. **Apple OAuth:** passport-apple with OpenID Connect
4. **Magic Link:** (To be implemented) Email-based passwordless auth
5. **Passkey/WebAuthn:** (To be implemented) FIDO2-based authentication

**iOS Authentication Methods:**
1. **Sign in with Apple:** Native iOS SDK
2. **Google Sign In:** GoogleSignIn SDK for iOS

**Session Management:**
- **Store:** PostgreSQL-backed (connect-pg-simple)
- **Duration:** 7 days (configurable)
- **Cookie Settings:**
  - httpOnly: true (prevents XSS)
  - secure: true (HTTPS only)
  - sameSite: 'strict' (CSRF protection)
- **Session Rotation:** On privilege escalation

**Account Linking:**
- Multiple OAuth providers can link to same email
- User confirms account merge on first duplicate email
- ConnectedAccounts table tracks all linked providers

### Payment Security

**Paddle (Web):**
- Webhook signature verification (HMAC-SHA256)
- Idempotent transaction handling
- Event replay prevention (timestamp + deduplication)
- Subscription status stored in database

**Apple IAP (iOS):**
- App Store Server API receipt verification
- Server-side transaction validation
- App Store Server Notifications v2 webhook
- Shared secret validation

**PCI Compliance:**
- No credit card data stored or transmitted
- All payment processing through Paddle/Apple
- User can only see masked card info from provider

### Infrastructure Security

**HTTPS Enforcement:**
- Replit auto-provisions SSL certificates (Let's Encrypt)
- HSTS header forces HTTPS
- Automatic HTTP → HTTPS redirect

**Security Headers:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**CSRF Protection:**
- csurf middleware for state-changing requests
- Double-submit cookie pattern
- SameSite cookie attribute

**Input Validation:**
- Zod schemas for all API inputs
- SQL injection protection (Drizzle parameterized queries)
- XSS protection (React auto-escaping + DOMPurify for HTML)
- SSRF protection (no user-controlled URLs)

## Deployment Architecture

### Web Deployment (Replit)

**Build Process:**
1. Install dependencies: `npm install`
2. Build frontend: `vite build` → `dist/`
3. Build backend: `esbuild server/index.ts` → `dist/`
4. Start server: `node dist/index.js`

**Deployment Configuration:**
- **Type:** Autoscale (recommended for production)
- **Port:** 5000
- **Health Check:** `/healthz` returns `{"status":"healthy"}`
- **Domain:** lilove.org (custom domain configured)
- **Environment:** Production environment variables in Replit Secrets

**Scaling:**
- Replit autoscale handles traffic spikes
- Neon PostgreSQL auto-scales connections
- Stateless server design (sessions in DB)

### iOS Deployment (EAS + TestFlight)

**Build Process:**
1. Configure EAS: `eas.json` with production profile
2. Build IPA: `eas build --platform ios --profile production`
3. Submit to TestFlight: `eas submit --platform ios --profile production`
4. App Store review: Manual submission via App Store Connect

**Configuration:**
- **Bundle ID:** org.lilove.app
- **Team ID:** 87U9ZK37M2
- **App Store App ID:** 6753267087
- **Build Number:** Auto-increment on each build
- **API Endpoint:** https://lilove.org/api

### CI/CD Strategy

**GitHub Actions Workflows:**

1. **ci.yml** - Continuous Integration
   - Trigger: Push, Pull Request
   - Steps: Install → Lint → Type Check → Test → Build
   - Quality Gates: All checks must pass

2. **deploy_web.yml** - Web Deployment
   - Trigger: Push to main (after CI passes)
   - Steps: Build → Deploy to Replit → Health Check
   - Environments: staging → production (manual approval)

3. **ios_release.yml** - iOS Release
   - Trigger: Manual (workflow_dispatch)
   - Steps: Fastlane → EAS Build → TestFlight Upload
   - Requires: Apple credentials in GitHub Secrets

**Fastlane Configuration:**
```ruby
# fastlane/Fastfile
lane :beta do
  build_app(scheme: "LiLove", export_method: "app-store")
  upload_to_testflight(skip_waiting_for_build_processing: true)
end

lane :release do
  build_app(scheme: "LiLove", export_method: "app-store")
  upload_to_app_store(
    skip_metadata: false,
    skip_screenshots: false,
    submit_for_review: true,
    automatic_release: false
  )
end
```

## Required Environment Variables

### Critical Secrets

**Database:**
- `DATABASE_URL` - Neon PostgreSQL connection string (required)

**Session:**
- `SESSION_SECRET` - Express session encryption key (required)

**Apple OAuth (Web):**
- `APPLE_CLIENT_ID` - Apple Service ID (required)
- `APPLE_TEAM_ID` - Apple Team ID (required)
- `APPLE_KEY_ID` - Apple Key ID (required)
- `APPLE_PRIVATE_KEY` - Apple private key PEM (required)

**Google OAuth:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (required)

**Email (Magic Link):**
- `SMTP_HOST` - SMTP server host (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (e.g., 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password or app-specific password
- `MAIL_FROM` - Sender email address (e.g., noreply@lilove.org)

**Paddle (Web Payments):**
- `PADDLE_ENV` - sandbox | live (required)
- `PADDLE_VENDOR_ID` - Paddle vendor/seller ID (required)
- `PADDLE_API_KEY` - Paddle API key (required)
- `PADDLE_WEBHOOK_SECRET` - Paddle webhook secret for signature verification (required)

**Apple App Store:**
- `ASC_ISSUER_ID` - App Store Connect API issuer ID (required for iOS)
- `ASC_KEY_ID` - App Store Connect API key ID (required for iOS)
- `ASC_PRIVATE_KEY` - App Store Connect API private key (required for iOS)

**iOS Build:**
- `IOS_BUNDLE_ID` - org.lilove.app (required)
- `IOS_APPLE_ID` - Apple ID email for app management (required)
- `APP_STORE_APP_ID` - 6753267087 (required)

**AI/Analytics:**
- `OPENAI_API_KEY` - OpenAI API key for AI coach (optional, degrades gracefully)
- `POSTHOG_API_KEY` - PostHog analytics key (optional)

**Infrastructure:**
- `REPLIT_DOMAINS` - lilove.org (auto-configured by Replit)
- `PORT` - 5000 (auto-configured by Replit)

### Optional Secrets

- `SENTRY_DSN` - Error tracking (recommended for production)
- `VERCEL_TOKEN` - If deploying to Vercel instead of Replit
- `CLOUDFLARE_API_TOKEN` - If using Cloudflare Workers

## Testing Strategy

### Unit Tests (Target: ≥85% coverage)

**Framework:** Vitest (fast, Vite-compatible)

**Coverage:**
- `server/auth/` - Authentication logic
- `server/payments/` - Payment processing
- `shared/` - Shared utilities
- `client/lib/` - Client-side utilities

### Contract Tests

**Paddle Webhooks:**
- Fixture-based tests with real webhook payloads
- Signature verification tests
- Event replay prevention tests

**App Store Server API:**
- Mock App Store responses
- Receipt verification tests
- Transaction validation tests

### E2E Tests (Playwright)

**Critical User Flows:**
1. Signup → Onboarding → Dashboard
2. Login → Dashboard
3. Create Goal → Complete Goal → Earn XP
4. Purchase Subscription (Paddle) → Access Premium Features
5. iOS: Purchase IAP → Unlock Premium
6. Logout → Session Destroyed
7. Unauthorized Access → Redirect to Auth

**Test Environment:**
- **Web:** localhost:5000 (dev server)
- **CI:** Sandbox Paddle + test accounts
- **iOS:** Simulator + Sandbox App Store

### Load Tests

**Tool:** k6 or Artillery

**Scenarios:**
- 100 concurrent users browsing
- 50 users creating goals simultaneously
- 20 AI coach requests per minute
- Payment webhook bursts (10 webhooks/second)

**Success Criteria:**
- p95 response time < 500ms
- No 500 errors
- Database connection pool healthy

## Monitoring & Observability

### Logging

**Log Levels:**
- **ERROR:** System errors, payment failures, auth failures
- **WARN:** Rate limit exceeded, unusual patterns
- **INFO:** Successful payments, user signups, deployments
- **DEBUG:** Development only

**Log Storage:**
- Replit built-in logs (7-day retention)
- Consider external log aggregation (Logtail, DataDog)

**PII Protection:**
- Never log passwords, tokens, credit cards
- Hash/mask email addresses in logs
- Redact sensitive fields automatically

### Alerts

**Critical Alerts (Immediate):**
- Payment webhook failures
- Database connection failures
- Auth system down
- API error rate > 5%

**Warning Alerts (Within 1 hour):**
- High memory usage (>80%)
- Slow API responses (p95 > 1s)
- Unusual signup patterns

**Tools:**
- PostHog for product analytics
- Sentry for error tracking (recommended)
- GitHub Actions for CI/CD failures

## Performance Optimization

### Frontend Performance Budget

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **Bundle Size:** < 300KB gzipped

**Optimization Techniques:**
- Code splitting (React.lazy + Suspense)
- Image optimization (WebP, lazy loading)
- Tree shaking (Vite)
- Caching (service worker for static assets)

### Backend Performance

- **API Response Time:** p95 < 500ms
- **Database Query Time:** p95 < 100ms
- **Webhook Processing:** < 5s

**Optimization Techniques:**
- Database indexes on frequently queried fields
- Connection pooling (Drizzle)
- Caching (HTTP caching headers)
- Async processing for webhooks (queue if needed)

## Accessibility

**WCAG 2.1 AA Compliance:**
- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation (tab order)
- Focus indicators
- Color contrast ratio ≥ 4.5:1
- Screen reader support

**Testing:**
- Lighthouse accessibility audit (score ≥ 90)
- Manual keyboard navigation testing
- Screen reader testing (VoiceOver on iOS)

## Disaster Recovery

### Backup Strategy

**Database:**
- Neon automatic daily backups (7-day retention)
- Point-in-time recovery available
- Manual export via `pg_dump` weekly

**Code:**
- Git repository (GitHub)
- Replit automatic checkpoints
- Tagged releases for rollback

### Rollback Procedures

**Web Deployment:**
1. Identify issue in logs/monitoring
2. Revert to previous deployment in Replit UI
3. Or: Deploy previous git tag
4. Verify health checks pass
5. Monitor for 1 hour

**Database Migrations:**
1. Test migration in staging first
2. Backup before migration
3. If failure: Restore from backup
4. If schema change: Deploy rollback migration

**iOS:**
- Cannot rollback App Store releases
- Push hotfix via EAS Update (OTA)
- Or: Submit new build to expedited review

## Compliance & Legal

### GDPR Compliance

- **Right to Access:** Export user data endpoint
- **Right to Erasure:** Account deletion endpoint (anonymize, not delete)
- **Right to Portability:** JSON export of all user data
- **Consent:** Cookie consent banner, terms acceptance
- **Privacy Policy:** docs/PRIVACY.md

### Apple App Store Guidelines

- **IAP for Digital Content:** Use StoreKit 2 (not Paddle) for iOS
- **Privacy Manifest:** Include privacy manifest in iOS app
- **App Tracking Transparency:** Request permission if tracking
- **Review Guidelines:** No prohibited content, proper metadata

### Content Policies

- User-generated content moderation (if applicable)
- DMCA compliance procedures
- Prohibited content (hate speech, illegal activity)

## Future Scalability

### When to Scale

**Indicators:**
- > 10,000 daily active users
- > 1M database rows
- > 100 requests/second
- Database query time > 1s

### Scaling Options

1. **Database:**
   - Neon auto-scales (no action needed)
   - Add read replicas for analytics queries
   - Consider partitioning large tables

2. **Application:**
   - Replit autoscale handles most cases
   - Move to Kubernetes if multi-region needed
   - Add Redis for distributed caching

3. **CDN:**
   - Cloudflare for global edge caching
   - Serve static assets from S3 + CloudFront

4. **Background Jobs:**
   - Add job queue (BullMQ + Redis)
   - Process webhooks asynchronously
   - Send emails via queue

## Implementation Phases

See main plan in PR description for detailed phase breakdown.

**Estimated Timeline:**
- Phase 0-1: 1 day (Architecture & Planning)
- Phase 2-3: 3 days (Authentication)
- Phase 4-5: 4 days (Payments)
- Phase 6: 2 days (AI Layer)
- Phase 7: 2 days (Security)
- Phase 8: 3 days (Testing)
- Phase 9: 2 days (CI/CD)
- Phase 10: 2 days (Documentation)
- Phase 11: 1 day (Monitoring)
- Phase 12: 1 day (Validation)

**Total:** ~21 working days (4-5 weeks)

## Success Criteria

- [x] All required secrets documented
- [ ] Secrets validation script passes
- [ ] 100% test coverage on auth and payments
- [ ] ≥85% overall test coverage
- [ ] All E2E tests passing in CI
- [ ] Web deployment automated
- [ ] iOS TestFlight upload automated
- [ ] All documentation complete
- [ ] Security audit passed (CodeQL)
- [ ] Performance budget met (Lighthouse ≥90)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Go-live checklist completed

## Conclusion

LiLove's technical architecture is production-ready with minimal changes needed. The existing stack is modern, scalable, and cost-effective. The primary work involves implementing real payment integrations, completing authentication methods, adding comprehensive testing, and setting up CI/CD automation.

This plan prioritizes security, reliability, and maintainability while leveraging serverless and free-tier services to minimize operational costs.

---

**Document Owner:** Technical Team  
**Last Updated:** October 28, 2025  
**Next Review:** After Phase 12 completion
