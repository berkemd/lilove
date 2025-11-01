# Go-Live Checklist for LiLove Production Deployment

**Version**: 1.0.0  
**Created**: October 28, 2025  
**Target Go-Live Date**: TBD

## Pre-Launch Checklist

### Phase 1: Environment & Secrets ✅ / 🚫

- [ ] **All critical secrets configured** (16 required)
  - [ ] DATABASE_URL
  - [ ] SESSION_SECRET
  - [ ] APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
  - [ ] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  - [ ] PADDLE_ENV, PADDLE_VENDOR_ID, PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET
  - [ ] ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY
  - [ ] IOS_BUNDLE_ID
- [ ] **Recommended secrets configured** (7 for full features)
  - [ ] SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
  - [ ] IOS_APPLE_ID, APP_STORE_APP_ID
- [ ] **Secret validation passes**: `npm run check-secrets` exits with 0
- [ ] **Secrets documented** in SECRETS_NEEDED.md
- [ ] **GitHub Secrets configured** for CI/CD
- [ ] **Replit Secrets configured** for production deployment

### Phase 2: Authentication ✅ / 🚧

#### Web Authentication
- [ ] **Email/Password authentication** tested end-to-end
- [ ] **Google OAuth** working in production
  - [ ] Callback URL configured: `https://lilove.org/api/auth/google/callback`
  - [ ] Consent screen approved
  - [ ] Tested with real Google accounts
- [ ] **Apple OAuth** working in production
  - [ ] Callback URL configured: `https://lilove.org/api/auth/apple/callback`
  - [ ] Service ID verified
  - [ ] Tested with real Apple accounts
- [ ] **Magic Link** email authentication (if SMTP configured)
  - [ ] Email delivery working
  - [ ] Link expiration working (15 minutes)
  - [ ] Security tokens validated
- [ ] **Passkey/WebAuthn** (optional, planned for v1.1)
- [ ] **Account linking** working for same email across providers
- [ ] **Session management** secure (httpOnly, sameSite=strict cookies)
- [ ] **CSRF protection** enabled and tested
- [ ] **Rate limiting** on auth endpoints (5 attempts/15 min)

#### iOS Authentication
- [ ] **Sign in with Apple** working in iOS app
- [ ] **Google Sign In** working in iOS app
- [ ] **Token refresh** working (silent renewal)
- [ ] **Keychain storage** implemented for tokens
- [ ] **Auth flow** tested on real iOS devices

### Phase 3: Payments ✅ / 🚧

#### Web Payments (Paddle)
- [ ] **Paddle account** active (sandbox or production)
- [ ] **Subscription products** created in Paddle
  - [ ] Free tier (if applicable)
  - [ ] Paid tiers with correct pricing
  - [ ] Monthly and annual plans
- [ ] **Checkout flow** working end-to-end
  - [ ] User can select plan
  - [ ] Paddle overlay opens
  - [ ] Payment processes successfully
  - [ ] User redirected to success page
- [ ] **Webhook endpoint** configured
  - [ ] URL: `https://lilove.org/api/paddle/webhook`
  - [ ] Signature verification working
  - [ ] Idempotency implemented
  - [ ] Subscription activation working
- [ ] **Subscription management** working
  - [ ] Upgrade/downgrade plans
  - [ ] Cancel subscription
  - [ ] Reactivate subscription
- [ ] **Customer portal** link working
- [ ] **VAT/tax** handling configured
- [ ] **Invoice generation** working
- [ ] **Test transactions** completed successfully

#### iOS Payments (StoreKit 2)
- [ ] **IAP products** configured in App Store Connect
  - [ ] Product IDs match code: `org.lilove.app.sub.*`
  - [ ] Pricing and availability set
  - [ ] Localized descriptions (EN, TR)
- [ ] **StoreKit 2** integrated in iOS app
- [ ] **Purchase flow** working end-to-end
  - [ ] User can view products
  - [ ] Purchase initiates successfully
  - [ ] Payment processes (sandbox)
  - [ ] Entitlements granted
- [ ] **App Store Server API** verification working
- [ ] **App Store Server Notifications v2** endpoint configured
  - [ ] URL: `https://lilove.org/api/apple/webhooks`
  - [ ] Signature verification working
  - [ ] Subscription sync working
- [ ] **Restore purchases** working
- [ ] **Subscription management** working (via iOS)
- [ ] **Sandbox testing** completed
- [ ] **TestFlight testing** completed with real users

### Phase 4: Database & Data Layer ✅

- [ ] **Neon PostgreSQL** provisioned and accessible
- [ ] **Database URL** configured in secrets
- [ ] **Schema migrations** applied successfully
- [ ] **Connection pooling** configured (max 10 connections)
- [ ] **Indexes** created on frequently queried columns
  - [ ] `users.email` (unique index)
  - [ ] `goals.user_id` (index)
  - [ ] `tasks.goal_id` (index)
  - [ ] `subscriptions.user_id` (unique index)
- [ ] **Backup strategy** confirmed (Neon auto-backup)
- [ ] **Point-in-time recovery** available
- [ ] **Database performance** tested (p95 query time < 100ms)
- [ ] **Data retention** policies documented

### Phase 5: Security ✅ / 🚧

- [ ] **HTTPS** enforced (Let's Encrypt via Replit)
- [ ] **Security headers** configured
  - [ ] Content-Security-Policy
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] Referrer-Policy
  - [ ] Permissions-Policy
- [ ] **Input validation** with Zod schemas on all endpoints
- [ ] **SQL injection protection** (Drizzle ORM parameterized queries)
- [ ] **XSS protection** (React auto-escaping + CSP)
- [ ] **CSRF protection** enabled (csurf middleware)
- [ ] **Rate limiting** configured
  - [ ] Auth endpoints: 5 req/15min
  - [ ] API endpoints: 100 req/15min
  - [ ] AI endpoints: 20 req/hour
- [ ] **Dependency audit** passing (`npm audit`)
- [ ] **CodeQL scan** passing (no high/critical issues)
- [ ] **Secrets not leaked** to client code
- [ ] **PII protection** in logs (no passwords, emails hashed)
- [ ] **SECURITY.md** published
- [ ] **Security contact** email configured (security@lilove.org)

### Phase 6: Testing ✅ / 🚧

#### Unit Tests
- [ ] **Test coverage ≥ 85%** for critical paths
  - [ ] Authentication logic
  - [ ] Payment processing
  - [ ] Subscription management
  - [ ] Database operations
- [ ] **All tests passing** in CI
- [ ] **Test suite runs** in < 5 minutes

#### E2E Tests (Playwright)
- [ ] **Authentication flows** tested
  - [ ] Sign up with email/password
  - [ ] Login with email/password
  - [ ] Login with Google OAuth
  - [ ] Login with Apple OAuth
  - [ ] Logout
- [ ] **Goal management** tested
  - [ ] Create goal
  - [ ] Update goal
  - [ ] Complete goal
  - [ ] Delete goal
- [ ] **Payment flows** tested (sandbox)
  - [ ] Subscribe to paid plan
  - [ ] Payment success
  - [ ] Premium features unlocked
  - [ ] Cancel subscription
- [ ] **Unauthorized access** tested
  - [ ] Unauthenticated users redirected
  - [ ] Premium features blocked for free users
- [ ] **All E2E tests passing** in CI

#### Contract Tests
- [ ] **Paddle webhooks** contract tests passing
- [ ] **App Store Server API** contract tests passing
- [ ] **Webhook fixtures** covering all event types

#### Load Tests
- [ ] **Load test** completed with k6 or Artillery
  - [ ] 100 concurrent users browsing
  - [ ] 50 users creating goals
  - [ ] 20 AI requests/minute
  - [ ] No 500 errors
  - [ ] p95 response time < 500ms

### Phase 7: CI/CD Pipelines ✅ / 🚧

#### GitHub Actions Workflows
- [ ] **CI workflow** (`.github/workflows/ci.yml`)
  - [ ] Linting (if configured)
  - [ ] Type checking
  - [ ] Unit tests
  - [ ] Build
  - [ ] E2E tests
  - [ ] Security scan (CodeQL)
  - [ ] All jobs passing
- [ ] **Web deployment** workflow (`.github/workflows/deploy_web.yml`)
  - [ ] Deploys to Replit on push to main
  - [ ] Health checks after deployment
  - [ ] Smoke tests passing
  - [ ] Rollback procedure documented
- [ ] **iOS release** workflow (`.github/workflows/ios_release.yml`)
  - [ ] Fastlane configured
  - [ ] EAS build working
  - [ ] TestFlight upload working
  - [ ] Manual App Store submission documented

#### Quality Gates
- [ ] **All tests pass** before merge
- [ ] **Type check passes** before merge
- [ ] **Build succeeds** before merge
- [ ] **Coverage threshold** met (≥85% for critical paths)
- [ ] **Security scan passes** (no high/critical issues)

### Phase 8: Documentation ✅ / 🚧

- [ ] **README.md** updated
  - [ ] Project description
  - [ ] Installation instructions
  - [ ] Environment variables documented
  - [ ] Development setup
  - [ ] Deployment instructions
  - [ ] Architecture overview
- [ ] **TECH_PLAN.md** complete
  - [ ] Technology stack documented
  - [ ] Architecture decisions
  - [ ] Scaling strategy
- [ ] **SECURITY.md** published
  - [ ] Security measures documented
  - [ ] Vulnerability reporting process
  - [ ] Contact information
- [ ] **PRIVACY.md** published
  - [ ] Data collection documented
  - [ ] GDPR/CCPA compliance
  - [ ] User rights explained
- [ ] **TERMS.md** published (if applicable)
  - [ ] Terms of service
  - [ ] Acceptable use policy
- [ ] **RUNBOOK.md** complete
  - [ ] Common issues and resolutions
  - [ ] Incident response procedures
  - [ ] Deployment procedures
  - [ ] Monitoring and alerts
- [ ] **CHANGELOG.md** initialized
  - [ ] Semantic versioning
  - [ ] Release notes format
  - [ ] Automated with semantic-release (optional)
- [ ] **API documentation** available (optional)
  - [ ] Endpoint descriptions
  - [ ] Request/response examples
  - [ ] Authentication requirements

### Phase 9: Monitoring & Observability ✅ / 🚧

- [ ] **Health endpoints** working
  - [ ] `/healthz` returns `{"status":"healthy"}`
  - [ ] `/api/health` returns `{"ok":true}`
- [ ] **Logging** configured
  - [ ] Structured logs (JSON format)
  - [ ] Log levels appropriate (ERROR, WARN, INFO)
  - [ ] No PII in logs
  - [ ] Logs accessible in Replit dashboard
- [ ] **Error tracking** configured (Sentry recommended)
  - [ ] Errors captured and reported
  - [ ] Source maps uploaded
  - [ ] Release tracking enabled
- [ ] **Analytics** configured (PostHog)
  - [ ] Page views tracked
  - [ ] User events tracked
  - [ ] Feature flags ready (optional)
- [ ] **Alerts** configured
  - [ ] Health check failures → Page on-call
  - [ ] Error rate > 5% → Page on-call
  - [ ] Payment failures > 1% → Email on-call
  - [ ] Database connections > 80% → Email on-call
- [ ] **Uptime monitoring** (external, e.g., UptimeRobot)
  - [ ] Monitoring `/healthz` every 5 minutes
  - [ ] Alert on 3 consecutive failures
  - [ ] Multi-region checks

### Phase 10: Performance ✅ / 🚧

- [ ] **Web Performance Budget** met
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
  - [ ] Bundle size < 300KB gzipped
- [ ] **Lighthouse audit** passed
  - [ ] Performance score ≥ 90
  - [ ] Accessibility score ≥ 90
  - [ ] Best Practices score ≥ 90
  - [ ] SEO score ≥ 90
- [ ] **API performance** acceptable
  - [ ] p95 response time < 500ms (non-AI endpoints)
  - [ ] Database query time p95 < 100ms
  - [ ] No N+1 query issues
- [ ] **Caching** implemented
  - [ ] Static assets cached (1 year)
  - [ ] API responses cached where appropriate
  - [ ] CDN configured (optional)

### Phase 11: Accessibility ✅ / 🚧

- [ ] **WCAG 2.1 AA compliant**
  - [ ] Semantic HTML used
  - [ ] ARIA labels on interactive elements
  - [ ] Keyboard navigation working (Tab order)
  - [ ] Focus indicators visible
  - [ ] Color contrast ratio ≥ 4.5:1
- [ ] **Screen reader tested**
  - [ ] VoiceOver (iOS) tested
  - [ ] NVDA/JAWS (desktop) tested
  - [ ] All content accessible
- [ ] **Keyboard-only navigation** tested
  - [ ] All features accessible via keyboard
  - [ ] No keyboard traps
  - [ ] Skip links implemented

### Phase 12: iOS App Readiness ✅ / 🚧

#### App Store Connect Configuration
- [ ] **App created** in App Store Connect
  - [ ] App ID: 6753267087
  - [ ] Bundle ID: org.lilove.app
  - [ ] App name: LiLove
- [ ] **App metadata** complete
  - [ ] Description (EN, TR)
  - [ ] Keywords
  - [ ] Screenshots (6.5" and 5.5" displays)
  - [ ] App icon (1024x1024)
  - [ ] Privacy policy URL
  - [ ] Support URL
  - [ ] Marketing URL
- [ ] **App Privacy manifest** included
  - [ ] Data collection disclosed
  - [ ] Privacy nutrition labels accurate
- [ ] **TestFlight build** uploaded
  - [ ] Internal testing group created
  - [ ] External testing ready
  - [ ] Beta testers invited
- [ ] **App Store submission** ready
  - [ ] Build selected for submission
  - [ ] Review information provided
  - [ ] Contact information verified
  - [ ] Demo account provided (if needed)

#### Fastlane Configuration
- [ ] **Fastlane installed** and configured
- [ ] **Fastfile** created with lanes:
  - [ ] `beta` lane for TestFlight
  - [ ] `release` lane for App Store
- [ ] **Metadata** managed by Fastlane
- [ ] **Screenshots** automated (optional)
- [ ] **Code signing** configured

## Launch Day Checklist

### T-24 Hours (Day Before)

- [ ] **Final code freeze** - No more changes except critical fixes
- [ ] **Final CI/CD run** - All pipelines green
- [ ] **Final security scan** - CodeQL + npm audit passing
- [ ] **Backup database** - Manual backup before launch
- [ ] **Test rollback** - Verify rollback procedure works
- [ ] **Notify team** - Launch happening tomorrow
- [ ] **Prepare announcements** - Blog post, social media, emails

### T-2 Hours (Launch Window)

- [ ] **Deploy to production**
  - [ ] Web: Deploy via GitHub Actions or Replit
  - [ ] Wait for deployment to complete
- [ ] **Verify deployment**
  - [ ] Health checks passing
  - [ ] Smoke tests passing
  - [ ] Authentication working
  - [ ] Payment flows working
- [ ] **Monitor metrics**
  - [ ] Error rate normal (<1%)
  - [ ] Response times normal (p95 <500ms)
  - [ ] No critical errors in logs
- [ ] **Test critical paths**
  - [ ] Sign up new user
  - [ ] Create goal
  - [ ] Try premium feature (payment)
  - [ ] Test on mobile browsers

### T-0 (Go Live)

- [ ] **Announce launch** 🎉
  - [ ] Update website banner
  - [ ] Social media posts
  - [ ] Email announcement (if mailing list)
  - [ ] Product Hunt launch (optional)
- [ ] **Monitor closely** for first 4 hours
  - [ ] Error rates
  - [ ] Performance metrics
  - [ ] User feedback
  - [ ] Support requests

### T+24 Hours (Day After)

- [ ] **Review metrics**
  - [ ] User signups
  - [ ] Error rates
  - [ ] Performance
  - [ ] Payment conversions
- [ ] **Address issues** identified
- [ ] **Collect user feedback**
- [ ] **Plan hotfixes** if needed
- [ ] **Celebrate** 🎉🎊

## Post-Launch Checklist (First Week)

- [ ] **Daily monitoring** of key metrics
- [ ] **User feedback** collection and triage
- [ ] **Bug fixes** deployed within 24 hours
- [ ] **Performance optimizations** based on real traffic
- [ ] **iOS App Store submission** (if not already done)
  - [ ] Submit for review
  - [ ] Respond to review feedback
  - [ ] Monitor approval status
- [ ] **Post-launch retrospective** meeting
  - [ ] What went well?
  - [ ] What could be improved?
  - [ ] Action items for next release

## Rollback Plan

### When to Rollback

- Critical bug affecting >10% of users
- Security vulnerability discovered
- Data corruption or loss
- Payment processing failures

### Rollback Procedure

1. **Announce** downtime (if needed)
2. **Revert deployment** in Replit (select previous version)
3. **Verify** health checks pass
4. **Test** critical paths
5. **Monitor** for 30 minutes
6. **Announce** issue resolved
7. **Investigate** root cause
8. **Fix** issue in development
9. **Re-deploy** when ready

## Sign-Off

### Technical Lead Sign-Off

- [ ] All critical systems tested and working
- [ ] Security audit passed
- [ ] Performance meets requirements
- [ ] Documentation complete

**Signed**: __________________ Date: __________

### Product Owner Sign-Off

- [ ] All user stories completed
- [ ] Acceptance criteria met
- [ ] Ready for production traffic

**Signed**: __________________ Date: __________

### DevOps Sign-Off

- [ ] CI/CD pipelines working
- [ ] Monitoring and alerts configured
- [ ] Rollback tested
- [ ] On-call rotation ready

**Signed**: __________________ Date: __________

---

**Go-Live Date**: TBD (After all checklist items completed)  
**Document Owner**: Project Manager  
**Last Updated**: October 28, 2025

**Status**: 🚧 **IN PROGRESS** - Blocked on secrets configuration (Phase 1)
