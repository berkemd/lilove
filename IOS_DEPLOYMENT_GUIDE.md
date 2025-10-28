# 🍎 LiLove iOS Development & Deployment Guide

## Overview
This guide provides complete instructions for developing and deploying the LiLove application as an iOS app. This is designed to be used by autonomous development agents (like Replit Agent) or human developers.

## Prerequisites

### Required Accounts & Tools
1. **Apple Developer Account** ($99/year)
   - Enrollment at: https://developer.apple.com/programs/
   - Required for TestFlight and App Store deployment

2. **Development Environment**
   - macOS computer (required for iOS development)
   - Xcode 15+ (latest version recommended)
   - Node.js 18+ and npm
   - CocoaPods (`sudo gem install cocoapods`)
   - Expo CLI (`npm install -g expo-cli`)

3. **Required Credentials**
   - Apple Developer Team ID
   - App Store Connect API credentials
   - Bundle Identifier: `org.lilove.app`

## Project Structure

The LiLove project uses **React Native with Expo** for mobile development:

```
lilove/
├── mobile/           # React Native mobile app (if exists)
├── client/           # Web React app
├── server/           # Node.js Express backend
├── shared/           # Shared TypeScript types and schemas
├── app.json          # Expo configuration
├── eas.json          # Expo Application Services config
└── package.json      # Dependencies
```

## Step 1: Environment Setup

### 1.1 Install Required Environment Variables

Create a `.env` file in the project root with these variables:

```bash
# === DATABASE ===
DATABASE_URL=postgresql://...  # Neon PostgreSQL connection string

# === APPLE IAP ===
APPLE_BUNDLE_ID=org.lilove.app
APPLE_SHARED_SECRET=<your-shared-secret-from-app-store-connect>
APPLE_TEAM_ID=<your-10-character-team-id>
APPLE_KEY_ID=<your-key-id-from-app-store-connect>
APPLE_ISSUER_ID=<your-issuer-id>
APPLE_PRIVATE_KEY_PEM=<your-private-key>

# === APPLE SIGN IN ===
APPLE_CLIENT_ID=org.lilove.signin
APPLE_SERVICE_ID=org.lilove.signin

# === GOOGLE OAUTH ===
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_WEB_CLIENT_ID=<your-web-client-id>

# === PADDLE PAYMENTS ===
PADDLE_API_KEY=<your-paddle-api-key>
PADDLE_WEBHOOK_SECRET=<your-webhook-secret>
PADDLE_CLIENT_TOKEN=<your-client-token>
PADDLE_ENVIRONMENT=sandbox  # or 'production'

# Price IDs for Paddle subscriptions
PADDLE_PRO_MONTHLY_PRICE_ID=pri_...
PADDLE_PRO_YEARLY_PRICE_ID=pri_...
PADDLE_TEAM_MONTHLY_PRICE_ID=pri_...
PADDLE_TEAM_YEARLY_PRICE_ID=pri_...

# Paddle coin packages
PADDLE_COIN_SMALL_PRICE_ID=pri_...
PADDLE_COIN_MEDIUM_PRICE_ID=pri_...
PADDLE_COIN_LARGE_PRICE_ID=pri_...
PADDLE_COIN_MEGA_PRICE_ID=pri_...

# === STRIPE PAYMENTS ===
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...

# === OPENAI ===
OPENAI_API_KEY=sk-...

# === APPLICATION ===
NODE_ENV=production  # or 'development'
SESSION_SECRET=<generate-random-string>
```

### 1.2 Generate Required Credentials

#### Apple Developer Credentials:
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Create App ID with Bundle ID: `org.lilove.app`
3. Enable capabilities:
   - In-App Purchase
   - Push Notifications
   - Sign in with Apple
   - Associated Domains

#### App Store Connect API Key:
1. Go to https://appstoreconnect.apple.com/access/api
2. Create new API Key with App Manager role
3. Download the .p8 key file
4. Note the Key ID and Issuer ID

## Step 2: Configure Expo for iOS

### 2.1 Update app.json

```json
{
  "expo": {
    "name": "LiLove",
    "slug": "lilove",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "org.lilove.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "LiLove needs camera access for profile photos",
        "NSPhotoLibraryUsageDescription": "LiLove needs photo library access to select images",
        "NSUserTrackingUsageDescription": "LiLove uses tracking to provide personalized content"
      },
      "associatedDomains": [
        "applinks:lilove.org",
        "applinks:www.lilove.org"
      ],
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "14.0"
          }
        }
      ]
    ]
  }
}
```

### 2.2 Configure EAS Build (eas.json)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEFGH12"
      }
    }
  }
}
```

## Step 3: Implement In-App Purchases

### 3.1 Configure Products in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to "Features" → "In-App Purchases"
4. Create the following products:

#### Subscriptions (Auto-Renewable):
- **Pro Monthly**: `org.lilove.pro.monthly` - $9.99/month
- **Pro Yearly**: `org.lilove.pro.yearly` - $99.99/year
- **Team Monthly**: `org.lilove.team.monthly` - $19.99/month
- **Team Yearly**: `org.lilove.team.yearly` - $199.99/year

#### Consumables (Coins):
- **Small Pack**: `org.lilove.coins.small` - $4.99 (500 coins)
- **Medium Pack**: `org.lilove.coins.medium` - $9.99 (1200 coins)
- **Large Pack**: `org.lilove.coins.large` - $19.99 (2500 coins)
- **Mega Pack**: `org.lilove.coins.mega` - $49.99 (6000 coins)

### 3.2 Install IAP Dependencies

```bash
npx expo install expo-in-app-purchases
npx expo install react-native-iap
```

### 3.3 Implement IAP in Mobile App

Create `mobile/services/iap.ts`:

```typescript
import * as InAppPurchases from 'expo-in-app-purchases';

const PRODUCT_IDS = {
  pro_monthly: 'org.lilove.pro.monthly',
  pro_yearly: 'org.lilove.pro.yearly',
  coins_small: 'org.lilove.coins.small',
  // ... other products
};

export class IAPService {
  async initialize() {
    await InAppPurchases.connectAsync();
  }

  async getProducts() {
    const { results } = await InAppPurchases.getProductsAsync(
      Object.values(PRODUCT_IDS)
    );
    return results;
  }

  async purchaseProduct(productId: string) {
    await InAppPurchases.purchaseItemAsync(productId);
  }

  async verifyPurchase(receiptData: string) {
    // Send to backend for verification
    const response = await fetch('https://api.lilove.org/api/payments/apple/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptData }),
    });
    return response.json();
  }
}
```

## Step 4: Implement OAuth (Sign in with Apple & Google)

### 4.1 Sign in with Apple

```bash
npx expo install expo-apple-authentication
```

Create `mobile/auth/AppleSignIn.tsx`:

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

export async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    // Send credential to backend
    const response = await fetch('https://api.lilove.org/api/auth/apple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityToken: credential.identityToken,
        user: credential.user,
      }),
    });
    
    return response.json();
  } catch (error) {
    console.error('Apple sign in failed:', error);
    throw error;
  }
}
```

### 4.2 Google Sign In

```bash
npx expo install @react-native-google-signin/google-signin
```

Configure in `app.json`:

```json
{
  "ios": {
    "googleServicesFile": "./GoogleService-Info.plist"
  }
}
```

## Step 5: Build for iOS

### 5.1 Build Development Version

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS Simulator (for testing)
eas build --platform ios --profile development --local

# Build for device (TestFlight)
eas build --platform ios --profile preview
```

### 5.2 Build Production Version

```bash
# Production build for App Store
eas build --platform ios --profile production

# This will:
# 1. Build the app with your credentials
# 2. Upload to Expo servers
# 3. Provide a download link when complete
```

## Step 6: TestFlight Deployment

### 6.1 Automatic Submission

```bash
# Submit to TestFlight automatically
eas submit --platform ios --latest
```

### 6.2 Manual Submission

1. Download the .ipa file from EAS build
2. Go to https://appstoreconnect.apple.com
3. Select your app → TestFlight
4. Click "+" to add build
5. Upload the .ipa file using Transporter app

### 6.3 Configure TestFlight

1. Add test information:
   - Beta App Description
   - Feedback Email
   - What to Test notes

2. Add internal testers (up to 100)
   - App Store Connect users
   - Instant access

3. Add external testers:
   - Public link or email invites
   - Requires App Review (first time)

## Step 7: App Store Submission

### 7.1 Prepare App Store Listing

Create in App Store Connect:

1. **App Information**
   - Name: LiLove
   - Subtitle: Love Your Growth, Live Your Peak
   - Primary Category: Health & Fitness
   - Secondary Category: Productivity

2. **Screenshots** (required for all device sizes):
   - iPhone 6.7" Display (Pro Max): 1290 x 2796
   - iPhone 6.5" Display: 1242 x 2688
   - iPhone 5.5" Display: 1242 x 2208
   - iPad Pro 12.9": 2048 x 2732

3. **App Preview Videos** (optional but recommended)

4. **Description**:
```
LiLove is your AI-powered personal growth companion. Transform your life with:

✨ AI Life Coach powered by GPT-4
🎯 Smart goal tracking and achievement system
🎮 Gamified habit formation with XP and levels
👥 Team challenges and social accountability
📊 Advanced analytics and insights
💎 Premium features and rewards

Join thousands of users who have transformed their lives with LiLove!
```

5. **Keywords**: personal growth, ai coach, habit tracker, goals, productivity, wellness, achievement, gamification, motivation, self-improvement

6. **Privacy Policy URL**: https://lilove.org/privacy
7. **Terms of Service URL**: https://lilove.org/terms

### 7.2 App Review Information

Provide:
- Demo account credentials (if login required)
- Notes for reviewers
- Contact information

### 7.3 Submit for Review

```bash
# Final production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

## Step 8: Post-Launch

### 8.1 Monitor App Performance

- Check crash reports in Xcode Organizer
- Monitor reviews and ratings
- Track analytics in App Store Connect

### 8.2 Push Updates

```bash
# For bug fixes or features that don't need review
eas update --branch production --message "Bug fixes"

# For major updates requiring review
eas build --platform ios --profile production
eas submit --platform ios --latest
```

### 8.3 Manage In-App Purchases

- Monitor subscription metrics
- Handle refund requests
- Update pricing as needed

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   eas build:clean
   eas build --platform ios --profile production --clear-cache
   ```

2. **Certificate Issues**
   ```bash
   # Regenerate credentials
   eas credentials
   ```

3. **IAP Not Working**
   - Ensure products are "Ready to Submit" in App Store Connect
   - Use Sandbox tester accounts for testing
   - Check entitlements in Xcode

4. **OAuth Issues**
   - Verify Bundle ID matches in all configs
   - Check Associated Domains are enabled
   - Ensure Service IDs are configured in Apple Developer

## Automated Deployment Script

Create `scripts/deploy-ios.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 LiLove iOS Deployment Script"
echo "================================"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "Installing EAS CLI..."
    npm install -g eas-cli
fi

# Login to Expo
echo "📝 Logging in to Expo..."
eas login

# Bump version
echo "📦 Bumping version..."
npm version patch

# Build for production
echo "🔨 Building production version..."
eas build --platform ios --profile production --non-interactive

# Submit to App Store
echo "📤 Submitting to App Store..."
eas submit --platform ios --latest --non-interactive

echo "✅ Deployment complete!"
echo "Check App Store Connect for status."
```

Make it executable:
```bash
chmod +x scripts/deploy-ios.sh
```

## Resources

### Documentation
- Expo: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- Apple Developer: https://developer.apple.com/documentation/
- App Store Connect API: https://developer.apple.com/documentation/appstoreconnectapi

### Tools
- Expo EAS: https://expo.dev/eas
- App Store Connect: https://appstoreconnect.apple.com
- TestFlight: https://developer.apple.com/testflight/

### Support
- Expo Discord: https://chat.expo.dev/
- Apple Developer Forums: https://developer.apple.com/forums/

---

## For Replit Agent

If you're a Replit Agent reading this:

1. Start by running: `npm install`
2. Ensure all environment variables are set in Secrets
3. Run: `eas login` (use provided credentials)
4. Build: `eas build --platform ios --profile production`
5. Submit: `eas submit --platform ios --latest`
6. Monitor build status in: https://expo.dev/accounts/[account]/projects/lilove/builds

The backend payment integrations are already complete in:
- `server/payments/paddle.ts` - Paddle integration
- `server/payments/apple.ts` - Apple IAP integration
- `server/payments/index.ts` - Stripe integration

All webhook handlers are implemented and ready for production use.
