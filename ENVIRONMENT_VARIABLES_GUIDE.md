# 🔐 LiLove Environment Variables Configuration Guide

This document provides complete configuration for all environment variables required by the LiLove application.

## Quick Setup

Create a `.env` file in the project root with all the required variables below:

## Database Configuration

### PostgreSQL (Neon)
```bash
# Main database connection string
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Example for Neon:
# DATABASE_URL=postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/lilove?sslmode=require
```

**How to get:**
1. Go to https://neon.tech
2. Create a project
3. Copy the connection string from the dashboard

---

## Payment Integrations

### Paddle (Recommended for SaaS)

```bash
# Paddle API credentials
PADDLE_API_KEY=your_paddle_api_key_here
PADDLE_WEBHOOK_SECRET=your_webhook_secret_here
PADDLE_CLIENT_TOKEN=your_client_token_here
PADDLE_ENVIRONMENT=sandbox  # Change to 'production' for live

# Subscription Price IDs (from Paddle Dashboard)
PADDLE_PRO_MONTHLY_PRICE_ID=pri_01hxxx
PADDLE_PRO_YEARLY_PRICE_ID=pri_01hyyy
PADDLE_TEAM_MONTHLY_PRICE_ID=pri_01hzzz
PADDLE_TEAM_YEARLY_PRICE_ID=pri_01haaa
PADDLE_ENTERPRISE_MONTHLY_PRICE_ID=pri_01hbbb
PADDLE_ENTERPRISE_YEARLY_PRICE_ID=pri_01hccc

# Coin Package Price IDs
PADDLE_COIN_SMALL_PRICE_ID=pri_01hddd    # 500 coins - $4.99
PADDLE_COIN_MEDIUM_PRICE_ID=pri_01heee   # 1200 coins - $9.99
PADDLE_COIN_LARGE_PRICE_ID=pri_01hfff    # 2500 coins - $19.99
PADDLE_COIN_MEGA_PRICE_ID=pri_01hggg     # 6000 coins - $49.99
```

**How to get:**
1. Sign up at https://paddle.com
2. Go to Developer Tools → Authentication
3. Create API key (copy `PADDLE_API_KEY`)
4. Set up webhook endpoint and get secret (`PADDLE_WEBHOOK_SECRET`)
5. Get client token from Paddle Checkout settings (`PADDLE_CLIENT_TOKEN`)
6. Create products and prices in Catalog
7. Copy price IDs for each product

**Webhook URL:** `https://your-domain.com/api/webhooks/paddle`

---

### Stripe (Alternative Payment Processor)

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx  # Use sk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Price IDs
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_yyy
STRIPE_TEAM_MONTHLY_PRICE_ID=price_zzz
STRIPE_TEAM_YEARLY_PRICE_ID=price_aaa
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_bbb
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_ccc
```

**How to get:**
1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy Secret key (`STRIPE_SECRET_KEY`)
4. Create webhook endpoint: https://dashboard.stripe.com/webhooks
5. Copy webhook signing secret (`STRIPE_WEBHOOK_SECRET`)
6. Create products and prices: https://dashboard.stripe.com/products
7. Copy price IDs

**Webhook URL:** `https://your-domain.com/api/webhooks/stripe`
**Webhook Events to Enable:**
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

### Apple In-App Purchases

```bash
# App Information
APPLE_BUNDLE_ID=org.lilove.app
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect

# Apple Developer Credentials
APPLE_TEAM_ID=ABCD123456  # 10-character Team ID
APPLE_KEY_ID=ABC123XYZ    # App Store Connect API Key ID
APPLE_ISSUER_ID=12345678-1234-1234-1234-123456789012
APPLE_PRIVATE_KEY_PEM=-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----

# Apple Sign In (OAuth)
APPLE_CLIENT_ID=org.lilove.signin
APPLE_SERVICE_ID=org.lilove.signin
APPLESIGNIN_SECRET_KEY=your_apple_signin_private_key
```

**How to get:**

1. **Shared Secret:**
   - Go to https://appstoreconnect.apple.com
   - Select your app → Features → In-App Purchases
   - Click "App-Specific Shared Secret"
   - Copy the secret

2. **Team ID:**
   - Go to https://developer.apple.com/account
   - Top right corner shows your Team ID

3. **App Store Connect API Key:**
   - Go to https://appstoreconnect.apple.com/access/api
   - Click "+" to create new key
   - Select "App Manager" role
   - Download the .p8 file
   - Copy Key ID and Issuer ID
   - Convert .p8 file content to PEM format (it's already in PEM format, just copy the content)

4. **Sign in with Apple:**
   - Go to https://developer.apple.com/account/resources/identifiers/list/serviceId
   - Create new Services ID
   - Configure Sign in with Apple
   - Add domain: `lilove.org`
   - Add Return URLs: `https://lilove.org/api/auth/apple/callback`
   - Generate key from Certificates, Identifiers & Profiles → Keys

**Webhook URL:** `https://your-domain.com/api/payments/apple/notification`

---

## OAuth Authentication

### Google OAuth

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
```

**How to get:**
1. Go to https://console.cloud.google.com
2. Create a project (or select existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://lilove.org/api/auth/google/callback` (production)
7. Copy Client ID and Client Secret
8. For mobile, create another OAuth client ID for "iOS"
9. Copy the iOS client ID as `GOOGLE_WEB_CLIENT_ID`

---

### Replit Authentication (Optional)

```bash
# Replit OAuth (if using Replit Auth)
REPLIT_CLIENT_ID=your_replit_client_id
REPLIT_CLIENT_SECRET=your_replit_client_secret
```

**How to get:**
1. Go to https://replit.com/~
2. Settings → OAuth Applications
3. Create new application
4. Copy Client ID and Secret

---

## AI Services

### OpenAI (for AI Coach)

```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4  # or gpt-4-turbo, gpt-3.5-turbo

# Optional: Organization ID for team accounts
OPENAI_ORGANIZATION=org-xxxxxxxxxxxxx
```

**How to get:**
1. Sign up at https://platform.openai.com
2. Go to https://platform.openai.com/api-keys
3. Create new secret key
4. Copy the key (starts with `sk-`)

**Cost considerations:**
- GPT-4: $0.03/1K tokens input, $0.06/1K tokens output
- GPT-3.5-Turbo: $0.0005/1K tokens input, $0.0015/1K tokens output
- Set usage limits in OpenAI dashboard

---

## Email Services

### Nodemailer (Email Notifications)

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for 465, false for other ports
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password

# Email Sender Info
EMAIL_FROM=noreply@lilove.org
EMAIL_FROM_NAME=LiLove Team
```

**For Gmail:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate new app password for "Mail"
5. Use this password in `SMTP_PASSWORD`

**Alternative services:**
- SendGrid: https://sendgrid.com
- Mailgun: https://www.mailgun.com
- AWS SES: https://aws.amazon.com/ses/

---

## Analytics & Monitoring

### PostHog (Product Analytics)

```bash
# PostHog Configuration
POSTHOG_API_KEY=phc_xxxxxxxxxxxxx
POSTHOG_HOST=https://app.posthog.com
```

**How to get:**
1. Sign up at https://posthog.com
2. Create organization and project
3. Copy Project API Key from Settings

### Sentry (Error Tracking)

```bash
# Sentry DSN
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production  # or development
```

**How to get:**
1. Sign up at https://sentry.io
2. Create new project
3. Copy DSN from Settings → Client Keys

---

## Application Configuration

### General Settings

```bash
# Environment
NODE_ENV=production  # or 'development'

# Server Configuration
PORT=5000
HOST=0.0.0.0

# Session Secret (generate random string)
SESSION_SECRET=generate_a_very_long_random_string_here_at_least_32_characters

# Domains (for OAuth callbacks)
REPLIT_DOMAINS=lilove.org,www.lilove.org
PRIMARY_DOMAIN=lilove.org

# Frontend URL
FRONTEND_URL=https://lilove.org
API_URL=https://api.lilove.org
```

**Generate SESSION_SECRET:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

---

## Redis (Optional - for caching)

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# For Upstash Redis (serverless)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

**How to get:**
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy connection URL

---

## File Storage

### AWS S3 (for file uploads)

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=lilove-uploads
```

**How to get:**
1. Go to https://aws.amazon.com
2. Create IAM user with S3 access
3. Generate access keys
4. Create S3 bucket

---

## Testing Credentials

### Sandbox Accounts

```bash
# Test Mode Flags
USE_TEST_MODE=true
SKIP_PAYMENT_VERIFICATION=false  # Only true for development

# Paddle Sandbox
PADDLE_ENVIRONMENT=sandbox

# Stripe Test Mode
# Just use sk_test_ keys instead of sk_live_
```

---

## Environment-Specific Files

### Development (.env.development)
```bash
NODE_ENV=development
PADDLE_ENVIRONMENT=sandbox
STRIPE_SECRET_KEY=sk_test_xxx
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000
```

### Production (.env.production)
```bash
NODE_ENV=production
PADDLE_ENVIRONMENT=production
STRIPE_SECRET_KEY=sk_live_xxx
FRONTEND_URL=https://lilove.org
API_URL=https://api.lilove.org
```

---

## Security Best Practices

1. **Never commit .env files to git**
   - Add `.env*` to `.gitignore`

2. **Use different keys for development and production**

3. **Rotate secrets regularly**
   - Change SESSION_SECRET every 3-6 months
   - Rotate API keys annually

4. **Use secret management tools**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Replit Secrets (for Replit deployment)

5. **Limit API key permissions**
   - Use minimum required scopes
   - Enable IP whitelisting where possible

---

## Verification Checklist

Before deploying, verify all required variables are set:

### Critical (App won't start without these):
- [ ] `DATABASE_URL`
- [ ] `SESSION_SECRET`
- [ ] `NODE_ENV`

### Payment (At least one required):
- [ ] Paddle credentials
- [ ] Stripe credentials
- [ ] Apple IAP credentials

### Authentication (At least email or one OAuth):
- [ ] Google OAuth credentials
- [ ] Apple Sign In credentials
- [ ] SMTP credentials

### AI Features:
- [ ] `OPENAI_API_KEY` (for AI Coach)

### Analytics (Optional but recommended):
- [ ] PostHog or Sentry

---

## Troubleshooting

### Common Issues:

1. **"Database connection failed"**
   - Check `DATABASE_URL` format
   - Verify database exists
   - Check network access (Neon allows connections from anywhere)

2. **"Payment provider not configured"**
   - Ensure at least one payment provider has all required credentials
   - Check API keys are for correct environment (sandbox vs production)

3. **"OAuth redirect mismatch"**
   - Verify callback URLs match exactly in OAuth provider settings
   - Include both http://localhost (dev) and https://your-domain (prod)

4. **"Webhook signature verification failed"**
   - Double-check webhook secrets
   - Ensure webhook URL is correct
   - Check webhook events are properly configured

---

## Getting Help

If you need help obtaining any credentials:

- **Paddle**: support@paddle.com
- **Stripe**: support@stripe.com
- **Apple Developer**: https://developer.apple.com/contact/
- **Google Cloud**: https://cloud.google.com/support

---

## For Replit Deployment

In Replit, add these as Secrets (Tools → Secrets):

1. Add each environment variable as a separate secret
2. Replit will automatically load them as environment variables
3. You don't need a .env file in Replit

The application will automatically detect and use Replit Secrets.
