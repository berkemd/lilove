# ⚠️ SECRETS NEEDED - Production Deployment Blocker

**Status:** 🚫 **BLOCKED**  
**Created:** October 28, 2025  
**Priority:** P0 - Critical  
**Type:** Configuration / Deployment

## Summary

Production deployment is blocked due to missing critical environment variables. The application requires 16 critical secrets to function properly in production. Currently, **0 out of 16** critical secrets are configured.

## Critical Secrets Required (16)

### Database (1)
- [ ] **DATABASE_URL** - Neon PostgreSQL connection string
  - Example: `postgresql://user:password@host.neon.tech/database?sslmode=require`
  - Required for: All database operations
  - How to obtain: Create database at [Neon.tech](https://neon.tech) (free tier available)

### Session Management (1)
- [ ] **SESSION_SECRET** - Express session encryption key
  - Must be: 64+ random characters
  - Required for: User session security
  - How to generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Apple OAuth - Web (4)
- [ ] **APPLE_CLIENT_ID** - Apple Service ID
  - Example: `org.lilove.signin`
  - Required for: Sign in with Apple on web
  - How to obtain: Create at [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)

- [ ] **APPLE_TEAM_ID** - Apple Developer Team ID
  - Format: 10 alphanumeric characters (e.g., `87U9ZK37M2`)
  - Required for: Apple authentication
  - How to find: Apple Developer Account → Membership Details

- [ ] **APPLE_KEY_ID** - Apple Sign in Key ID
  - Format: 10 alphanumeric characters (e.g., `ABC123DEFG`)
  - Required for: Apple authentication
  - How to obtain: Apple Developer → Certificates, Identifiers & Profiles → Keys

- [ ] **APPLE_PRIVATE_KEY** - Apple private key (PEM format)
  - Format: Starts with `-----BEGIN PRIVATE KEY-----`
  - Required for: Apple authentication
  - How to obtain: Download .p8 file from Apple Developer, convert to PEM

### Google OAuth (2)
- [ ] **GOOGLE_CLIENT_ID** - Google OAuth 2.0 client ID
  - Example: `123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com`
  - Required for: Google Sign In
  - How to obtain: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

- [ ] **GOOGLE_CLIENT_SECRET** - Google OAuth 2.0 client secret
  - Required for: Google Sign In
  - How to obtain: Same as Client ID (Google Cloud Console)

### Paddle Payments - Web (4)
- [ ] **PADDLE_ENV** - Paddle environment
  - Values: `sandbox` (testing) or `production` (live)
  - Required for: Payment processing
  - Recommendation: Start with `sandbox`

- [ ] **PADDLE_VENDOR_ID** - Paddle vendor/seller ID
  - Format: Numeric string
  - Required for: Payment processing
  - How to obtain: [Paddle Dashboard](https://vendors.paddle.com)

- [ ] **PADDLE_API_KEY** - Paddle API key
  - Required for: Payment API calls
  - How to obtain: Paddle Dashboard → Developer Tools → API Keys

- [ ] **PADDLE_WEBHOOK_SECRET** - Paddle webhook secret
  - Required for: Webhook signature verification (critical for security)
  - How to obtain: Paddle Dashboard → Developer Tools → Webhooks

### Apple App Store - iOS (4)
- [ ] **ASC_ISSUER_ID** - App Store Connect API issuer ID
  - Format: UUID (e.g., `12345678-1234-1234-1234-123456789012`)
  - Required for: iOS build automation and IAP verification
  - How to obtain: [App Store Connect](https://appstoreconnect.apple.com/access/api) → Keys → Issuer ID

- [ ] **ASC_KEY_ID** - App Store Connect API key ID
  - Format: 10 alphanumeric characters
  - Required for: App Store Connect API access
  - How to obtain: App Store Connect → Users and Access → Keys

- [ ] **ASC_PRIVATE_KEY** - App Store Connect API private key
  - Format: Base64 or PEM
  - Required for: App Store Connect API authentication
  - How to obtain: Download .p8 file from App Store Connect

- [ ] **IOS_BUNDLE_ID** - iOS app bundle identifier
  - Value: `org.lilove.app`
  - Required for: iOS app configuration
  - How to set: This should match the bundle ID in Xcode project

## Recommended Secrets (7)

These secrets enable additional features but are not blockers:

### Email / Magic Link (5)
- [ ] **SMTP_HOST** - SMTP server hostname (e.g., `smtp.gmail.com`)
- [ ] **SMTP_PORT** - SMTP port (e.g., `587`)
- [ ] **SMTP_USER** - SMTP username/email
- [ ] **SMTP_PASS** - SMTP password (app-specific password for Gmail)
- [ ] **MAIL_FROM** - Sender email (e.g., `noreply@lilove.org`)

**Impact if missing:** Magic Link authentication and email notifications will not work.

### iOS Metadata (2)
- [ ] **IOS_APPLE_ID** - Apple ID email for app management
- [ ] **APP_STORE_APP_ID** - App Store app ID (value: `6753267087`)

**Impact if missing:** Automated iOS deployment may require manual steps.

## Optional Secrets (5)

These enhance features but have graceful fallbacks:

- [ ] **OPENAI_API_KEY** - OpenAI API for AI coach (starts with `sk-`)
- [ ] **POSTHOG_API_KEY** - PostHog analytics
- [ ] **SENTRY_DSN** - Error tracking
- [ ] **REPLIT_DOMAINS** - Auto-configured by Replit platform
- [ ] **PORT** - Auto-configured (default: 5000)

## Validation

To check your configuration:

```bash
# Check all secrets
npm run check-secrets

# CI mode (exit code only)
npm run check-secrets:ci

# Generate .env template
npm run check-secrets:template > .env.example
```

## Security Best Practices

1. **Never commit secrets to Git**
   - Add `.env` to `.gitignore` ✅ (already configured)
   - Use GitHub Secrets for CI/CD
   - Use Replit Secrets for deployment

2. **Rotate secrets regularly**
   - Session secrets: Every 90 days
   - API keys: Every 180 days
   - OAuth credentials: When compromised

3. **Use environment-specific secrets**
   - Development: Use sandbox/test credentials
   - Production: Use live credentials
   - Never mix environments

4. **Secure storage**
   - GitHub Secrets: Encrypted at rest
   - Replit Secrets: Encrypted, injected at runtime
   - Local: Use `.env` file (never commit)

## Action Items

### For Repository Owner
1. Obtain all 16 critical secrets (see links above)
2. Add secrets to:
   - **Replit Secrets** (for web deployment)
   - **GitHub Secrets** (for CI/CD and iOS builds)
3. Run `npm run check-secrets` to verify
4. Proceed with deployment once validation passes

### For Contributors
- Do NOT commit secrets to Git
- Use `.env` file for local development
- Contact repository owner if you need access to secrets

## Impact Assessment

### Without Secrets
- ❌ Cannot deploy to production
- ❌ Authentication will not work
- ❌ Payment processing disabled
- ❌ iOS builds will fail
- ❌ Database connection fails

### With Secrets
- ✅ Full production deployment
- ✅ All authentication methods working
- ✅ Payment processing (Paddle + Apple IAP)
- ✅ iOS automated builds to TestFlight
- ✅ All features functional

## Related Documentation

- **Technical Plan:** `TECH_PLAN.md` - Full architecture details
- **Web Deployment:** `docs/WEB_DEPLOYMENT_GUIDE.md` (if exists)
- **iOS Deployment:** `mobile/DEPLOYMENT_GUIDE.md` (if exists)
- **Security:** `SECURITY.md` (to be created)

## Resolution

This issue will be resolved when:
1. All 16 critical secrets are configured
2. `npm run check-secrets` exits with code 0
3. Application successfully connects to database
4. OAuth authentication flows work in staging

## Timeline

**Blocking:** All development and deployment work  
**Expected Resolution:** Requires repository owner action  
**Estimated Time:** 2-4 hours to gather and configure all secrets

---

**Auto-generated by:** `scripts/check-secrets.ts`  
**Last Updated:** October 28, 2025  
**Status:** Open - Awaiting secret configuration
