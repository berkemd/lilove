# LiLove - Complete Setup & Deployment Guide

## Overview

This guide covers the complete setup and deployment process for LiLove, including:
- Web application (Vite + React)
- Mobile application (Expo + React Native)
- Payment integrations (Paddle for web, RevenueCat for mobile)
- Database setup
- Production deployment

---

## Prerequisites

### Required Tools
- **Node.js** 18 or higher
- **npm** or **yarn**
- **Git**
- **Expo CLI**: `npm install -g expo-cli eas-cli`
- **PostgreSQL** (or use Neon for serverless)

### Required Accounts
- **Neon** (Database) - https://neon.tech
- **RevenueCat** (Mobile IAP) - https://www.revenuecat.com
- **Paddle** (Web Payments) - https://paddle.com
- **Expo/EAS** - https://expo.dev
- **Apple Developer** (for iOS) - https://developer.apple.com
- **Google Play Console** (for Android) - https://play.google.com/console

---

## Part 1: Initial Setup

### 1.1 Clone and Install

```bash
git clone https://github.com/berkemd/lilove.git
cd lilove
npm install
```

### 1.2 Environment Configuration

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host.neon.tech/lilove?sslmode=require

# Session
SESSION_SECRET=your_64_character_hex_string

# Paddle (Web Payments)
PADDLE_ENV=sandbox  # or 'production'
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret

# Apple IAP (iOS)
ASC_ISSUER_ID=your_app_store_connect_issuer_id
ASC_KEY_ID=your_app_store_connect_key_id
ASC_PRIVATE_KEY=your_base64_encoded_private_key
IOS_BUNDLE_ID=org.lilove.app
APPLE_IAP_ENV=sandbox  # or 'production'

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id

# Analytics (Optional)
POSTHOG_API_KEY=your_posthog_key

# App URL
APP_URL=https://lilove.org
```

### 1.3 Database Setup

```bash
# Push schema to database
npm run db:push
```

---

## Part 2: Web Application Setup

### 2.1 Development

```bash
# Start development server
npm run dev
```

Visit http://localhost:5000

### 2.2 Build for Production

```bash
# Build both client and server
npm run build

# Start production server
npm run start
```

### 2.3 Deploy to Replit

1. Push code to GitHub
2. Import repository in Replit
3. Set environment variables in Replit Secrets
4. Click "Run" button
5. Configure custom domain in Replit settings

---

## Part 3: RevenueCat Setup

### 3.1 Create RevenueCat Project

1. Go to https://app.revenuecat.com
2. Create new project
3. Add iOS app with bundle ID: `org.lilove.app`
4. Add Android app with package: `org.lilove.app`

### 3.2 Get API Keys

1. Go to **Project Settings > API Keys**
2. Copy iOS API key (starts with `appl_`)
3. Copy Android API key (starts with `goog_`)

### 3.3 Configure Products

Create the following products in RevenueCat:

**Subscription Products:**
- `heart_monthly` - Heart tier monthly subscription
- `heart_annual` - Heart tier annual subscription
- `peak_monthly` - Peak tier monthly subscription
- `peak_annual` - Peak tier annual subscription
- `champion_monthly` - Champion tier monthly subscription
- `champion_annual` - Champion tier annual subscription

**Entitlements:**
- `pro` - Access to paid features
- `premium` - Access to premium features
- `all_access` - Full access to all features

### 3.4 Link to App Stores

**iOS:**
1. In RevenueCat, go to **App Settings > iOS**
2. Enter your App Store Connect credentials
3. Link to App Store Connect

**Android:**
1. In RevenueCat, go to **App Settings > Android**
2. Upload Google Play service account JSON
3. Link to Google Play Console

---

## Part 4: Mobile App Setup

### 4.1 Install Dependencies

```bash
cd mobile
npm install
```

### 4.2 Configure RevenueCat Keys

Edit `mobile/app.json` and update:

```json
{
  "extra": {
    "revenueCatApiKey": {
      "ios": "appl_YOUR_IOS_KEY_HERE",
      "android": "goog_YOUR_ANDROID_KEY_HERE"
    }
  }
}
```

### 4.3 Add App Assets

Place the following files in `mobile/assets/`:
- `icon.png` - 1024x1024px app icon
- `splash.png` - Splash screen image

### 4.4 EAS Setup

```bash
# Login to Expo
eas login

# Configure project (if needed)
eas build:configure
```

---

## Part 5: Building Mobile App

### 5.1 Development Build

For testing on physical devices:

```bash
cd mobile

# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### 5.2 Preview Build (Internal Testing)

For TestFlight or Internal Testing:

```bash
# iOS
eas build --profile preview --platform ios

# Android  
eas build --profile preview --platform android
```

### 5.3 Production Build

For App Store / Play Store submission:

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

---

## Part 6: App Store Submission

### 6.1 iOS App Store

**Prerequisites:**
- Apple Developer account ($99/year)
- App created in App Store Connect
- In-App Purchase products configured

**Steps:**

1. **Configure In-App Purchases in App Store Connect:**
   - Create subscription group
   - Add all subscription products
   - Set pricing tiers
   - Configure product details
   - Submit for review

2. **Build and submit:**
```bash
cd mobile
eas build --profile production --platform ios
eas submit --platform ios
```

3. **Complete App Store listing:**
   - Screenshots (required sizes)
   - App description
   - Keywords
   - Privacy policy URL
   - Support URL

4. **Submit for review**

### 6.2 Google Play Store

**Prerequisites:**
- Google Play Console account ($25 one-time)
- App created in Play Console
- In-App Products configured

**Steps:**

1. **Configure In-App Products in Play Console:**
   - Create subscription products
   - Set pricing
   - Configure billing period
   - Add product details

2. **Build and submit:**
```bash
cd mobile
eas build --profile production --platform android
eas submit --platform android
```

3. **Complete Play Store listing:**
   - Screenshots
   - Feature graphic
   - App description
   - Privacy policy URL
   - Content rating questionnaire

4. **Create release and submit**

---

## Part 7: Testing

### 7.1 Test RevenueCat Integration

**Sandbox Testing (iOS):**
1. Create sandbox test user in App Store Connect
2. Sign out of App Store on device
3. Run app and make test purchase
4. Sign in with sandbox test user when prompted

**Sandbox Testing (Android):**
1. Add test account emails in Play Console
2. Join internal test track
3. Download and test

**Verify in RevenueCat:**
- Check Dashboard > Customers
- Verify purchases appear
- Check entitlements are granted

### 7.2 Test Web Payments

Use Paddle's test mode with test card numbers:
- Card: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits

---

## Part 8: Production Checklist

### Before Going Live:

**Environment Variables:**
- [ ] `PADDLE_ENV=production`
- [ ] `APPLE_IAP_ENV=production`
- [ ] Production database URL configured
- [ ] All API keys are production keys

**RevenueCat:**
- [ ] Products configured and approved
- [ ] Entitlements properly set up
- [ ] App Store / Play Store linked
- [ ] Webhook configured (optional)

**Mobile App:**
- [ ] Bundle ID matches across all platforms
- [ ] App icons and splash screens added
- [ ] Privacy policy and terms of service URLs set
- [ ] In-App Purchase products approved

**Web App:**
- [ ] Domain configured and SSL enabled
- [ ] Database migrations run
- [ ] Health checks pass
- [ ] OAuth callbacks updated

---

## Troubleshooting

### Mobile Build Fails

**Issue:** EAS build fails

**Solutions:**
1. Check build logs: `eas build:list`
2. Clear cache and rebuild:
```bash
rm -rf node_modules
npm install
eas build --clear-cache
```

### RevenueCat Not Working

**Issue:** Purchases not appearing in RevenueCat

**Solutions:**
1. Verify API keys in `app.json`
2. Check App Store Connect / Play Console linking
3. Ensure products IDs match exactly
4. Check RevenueCat debug logs

### Web Payment Issues

**Issue:** Paddle checkout not working

**Solutions:**
1. Verify `PADDLE_API_KEY` is set
2. Check webhook secret is correct
3. Ensure products are configured in Paddle dashboard
4. Test with sandbox mode first

---

## Support Resources

- **Expo Docs:** https://docs.expo.dev
- **RevenueCat Docs:** https://docs.revenuecat.com
- **Paddle Docs:** https://developer.paddle.com
- **React Native:** https://reactnative.dev

---

## Quick Reference Commands

```bash
# Web Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run check            # TypeScript check

# Mobile Development
cd mobile
npm start                # Start Expo dev server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator

# EAS Builds
eas build --profile development --platform ios
eas build --profile production --platform all
eas submit --platform ios

# Database
npm run db:push          # Push schema changes
```

---

## Notes

- Always test in sandbox/development mode first
- Keep API keys secure and never commit to git
- Monitor RevenueCat dashboard for subscription issues
- Set up proper error tracking (Sentry) for production
- Regularly backup database
- Keep dependencies updated for security

---

**Good luck with your deployment! 🚀**
