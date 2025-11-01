# LiLove Mobile App

Mobile application for LiLove built with Expo and React Native.

## 📱 iOS App Store Submission - AUTOMATED

### 🚀 Quick Start for App Store Submission

Since you already have build #37 in TestFlight, follow these steps to submit to the App Store:

#### Step 1: Setup Credentials (5 minutes)

```bash
cd mobile
npm run appstore:setup
```

Or manually create `.env.local`:
```bash
ASC_KEY_ID=725AYMVS7J
ASC_ISSUER_ID=your-issuer-id-here
ASC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your private key...
-----END PRIVATE KEY-----"
```

#### Step 2: Upload Metadata (2 minutes)

```bash
source .env.local
npm run appstore:metadata
```

This uploads app name, description, keywords, and URLs in English + Turkish.

#### Step 3: Add & Upload Screenshots (20 minutes)

Add screenshots to `fastlane/metadata/en-US/screenshots/iphone65/` then:

```bash
npm run appstore:screenshots
```

See [APP_STORE_AUTOMATION_GUIDE.md](./APP_STORE_AUTOMATION_GUIDE.md) for how to capture screenshots.

#### Step 4: Complete Manual Steps (30-45 minutes first time)

Go to [App Store Connect](https://appstoreconnect.apple.com/apps/6670815109) and complete:
- App category
- Age rating
- App review information
- Pricing
- In-app purchases (if applicable)

**Detailed instructions**: [MANUAL_APPSTORE_STEPS.md](./MANUAL_APPSTORE_STEPS.md)

#### Step 5: Submit for Review (1 minute)

```bash
npm run appstore:submit 37
```

Done! Monitor at: https://appstoreconnect.apple.com/apps/6670815109

### Available Commands

```bash
npm run appstore:setup          # Interactive setup wizard
npm run appstore:metadata       # Upload descriptions/keywords
npm run appstore:screenshots    # Upload screenshots
npm run appstore:submit 37      # Submit build for review
npm run appstore:full           # Complete flow (build + metadata)
```

### Documentation

- **[APP_STORE_AUTOMATION_GUIDE.md](./APP_STORE_AUTOMATION_GUIDE.md)** - Complete guide
- **[MANUAL_APPSTORE_STEPS.md](./MANUAL_APPSTORE_STEPS.md)** - Required manual steps

---

## 🔧 Development

### Setup

```bash
npm install
npm start
```

### Run

```bash
npm run ios      # iOS simulator
npm run android  # Android emulator
```

### Build

```bash
eas build --platform ios --profile production
```

## Features

- ✅ Expo Router navigation
- ✅ RevenueCat subscriptions
- ✅ TypeScript
- ✅ **Automated App Store submission**

## License

Private - All rights reserved
