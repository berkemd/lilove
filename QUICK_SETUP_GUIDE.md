# 🚀 Quick Setup Guide - LiLove Platform

This guide will help you set up the LiLove platform after the critical fixes have been applied.

---

## ⚡ Quick Start (5 minutes)

### Step 1: Copy Environment Template
```bash
cp .env.example .env
```

### Step 2: Generate Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and add it to `.env`:
```bash
SESSION_SECRET=<paste-the-generated-secret-here>
```

### Step 3: Configure Database
Add your PostgreSQL connection string to `.env`:
```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
```

**Don't have a database?** Get a free one at [Neon.tech](https://neon.tech) in 2 minutes.

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Validate Configuration
```bash
npm run check-secrets
```

### Step 6: Start Development Server
```bash
npm run dev
```

Your app should now be running at `http://localhost:5000` 🎉

---

## 🔐 Authentication Setup

### Email/Password Authentication
✅ Already working! Users can register and login with email/password.

### Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Add credentials to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   ```

### Apple OAuth (Optional)
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources)
2. Create a Service ID and configure Sign in with Apple
3. Add credentials to `.env`:
   ```bash
   APPLE_CLIENT_ID=org.lilove.signin
   APPLE_TEAM_ID=ABC123DEFG
   APPLE_KEY_ID=XYZ123
   APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
   ```

---

## 💳 Payment Setup (Paddle)

### Required for Payment Features

1. **Sign up at Paddle**
   - Go to [Paddle.com](https://www.paddle.com/)
   - Create a sandbox account for testing

2. **Get API Credentials**
   ```bash
   PADDLE_ENV=sandbox
   PADDLE_VENDOR_ID=<from-paddle-dashboard>
   PADDLE_API_KEY=<from-paddle-dashboard>
   ```

3. **Configure Webhook Secret** ⚠️ CRITICAL
   - In Paddle Dashboard → Developer Tools → Webhooks
   - Add webhook URL: `https://your-domain.com/api/webhooks/paddle`
   - Copy the webhook secret:
   ```bash
   PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxxxxxxxxxx
   ```
   
   **Why this is critical:** Without this secret, anyone can send fake payment notifications to your app, leading to fraud.

---

## 📧 Email Setup (Optional)

For password reset and notifications:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
MAIL_FROM=LiLove <noreply@lilove.org>
```

**Gmail Users:** Use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

---

## 📊 Analytics & Monitoring (Optional)

### PostHog (User Analytics)
```bash
POSTHOG_API_KEY=phc_xxxxxxxxxxxxx
POSTHOG_HOST=https://app.posthog.com
```
Get from: [PostHog.com](https://posthog.com)

### Sentry (Error Tracking)
```bash
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```
Get from: [Sentry.io](https://sentry.io)

---

## 🤖 AI Features (Optional)

### OpenAI API for AI Mentor
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```
Get from: [OpenAI Platform](https://platform.openai.com/api-keys)

---

## 🔍 Verification Checklist

After configuration, verify everything works:

### 1. Environment Validation
```bash
npm run check-secrets
```
Should show: ✅ All critical environment variables are configured correctly

### 2. Database Connection
```bash
npm run db:push
```
Should create tables without errors.

### 3. Authentication Flow
1. Start the app: `npm run dev`
2. Open http://localhost:5000
3. Try registering a new user
4. Verify you can login and logout

### 4. Session Persistence
1. Login to the app
2. Refresh the page
3. Verify you're still logged in (session persists)

### 5. OAuth (if configured)
1. Click "Sign in with Google" or "Sign in with Apple"
2. Complete OAuth flow
3. Verify you're logged in

### 6. Payment Webhook (if configured)
1. In Paddle Dashboard, send a test webhook
2. Check server logs for: `📥 [Paddle Webhook] Event received`
3. Should show: ✅ Webhook signature verified

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL is required"
**Fix:** Add DATABASE_URL to your `.env` file

### Error: "SESSION_SECRET not set"
**Fix:** Generate and add SESSION_SECRET to `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Error: "401 Not authenticated"
**Possible causes:**
1. SESSION_SECRET changed (invalidates existing sessions)
2. Database connection issue
3. Cookie not being sent/received

**Fix:**
1. Clear browser cookies
2. Check DATABASE_URL is correct
3. Verify trust proxy setting (should be enabled)

### Error: "PADDLE_WEBHOOK_SECRET not configured"
**Fix:** Add PADDLE_WEBHOOK_SECRET from Paddle Dashboard to `.env`

### OAuth redirect error
**Fix:** 
1. Check OAuth callback URLs match your domain
2. For localhost: `http://localhost:5000/api/auth/google/callback`
3. For production: `https://your-domain.com/api/auth/google/callback`

---

## 🚀 Production Deployment

### Environment Variables
Set these in your deployment platform (Replit Secrets, Vercel Environment Variables, etc.):
- DATABASE_URL (production database)
- SESSION_SECRET (rotate from dev secret)
- PADDLE_ENV=production
- PADDLE_WEBHOOK_SECRET (production secret)
- All other optional variables as needed

### Security Checklist
- [ ] Use production DATABASE_URL (not development)
- [ ] Rotate SESSION_SECRET from development
- [ ] Use production Paddle credentials (not sandbox)
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Configure CORS for production domain
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics (PostHog)
- [ ] Configure backup strategy for database

### Performance Checklist
- [ ] Enable database connection pooling
- [ ] Configure CDN for static assets
- [ ] Enable Gzip compression (already configured)
- [ ] Monitor response times
- [ ] Set up rate limiting (already configured)

---

## 📚 Additional Resources

- **Full Documentation:** See `CRITICAL_FIXES_COMPLETED.md`
- **Secret Requirements:** See `SECRETS_NEEDED.md`
- **Security Guide:** See `SECURITY.md`
- **Technical Details:** See `TECH_PLAN.md`

---

## 🆘 Getting Help

### Common Questions
1. **"Where do I get a free database?"**
   - [Neon.tech](https://neon.tech) offers free PostgreSQL databases

2. **"Do I need all environment variables?"**
   - Only DATABASE_URL and SESSION_SECRET are required
   - Others enable optional features

3. **"Can I use a different database?"**
   - Yes, any PostgreSQL-compatible database works
   - Update DATABASE_URL accordingly

4. **"Is Paddle required?"**
   - No, payment features work without Paddle
   - But you won't be able to process payments

### Still Having Issues?
1. Check server logs for detailed error messages
2. Run `npm run check-secrets` to verify configuration
3. Review `CRITICAL_FIXES_COMPLETED.md` for troubleshooting
4. Open an issue on GitHub with logs

---

**Status:** ✅ Ready for development  
**Time to setup:** ~5-10 minutes with free tier services  
**Production ready:** After configuring payment and OAuth credentials

Happy coding! 🚀
