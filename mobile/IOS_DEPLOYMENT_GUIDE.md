# LiLove iOS App Store Deployment Guide

## Prerequisites

1. **Apple Developer Account** - Active enrollment ($99/year)
2. **EAS CLI** - Install with `npm install -g eas-cli`
3. **Expo Account** - Login with `eas login`

## Build Commands

### Development Build (Simulator)
```bash
cd mobile
eas build --platform ios --profile development
```

### Preview Build (Internal Testing)
```bash
cd mobile
eas build --platform ios --profile preview
```

### Production Build (App Store)
```bash
cd mobile
eas build --platform ios --profile production
```

## App Store Submission

### Automatic Submission
```bash
cd mobile
eas submit --platform ios --latest
```

### Manual Submission
1. Download the `.ipa` file from EAS dashboard
2. Open Transporter app on Mac
3. Upload the `.ipa` file
4. Wait for processing in App Store Connect

## App Store Connect Configuration

- **App ID:** 6753267087
- **Bundle ID:** org.lilove.app
- **Apple Team ID:** 87U9ZK37M2
- **Apple ID:** brkekahraman@icloud.com

## Required Secrets in EAS

Set these in EAS dashboard or via CLI:
```bash
eas secret:create --name REVENUECAT_IOS_API_KEY --value "your_key"
eas secret:create --name SENTRY_DSN --value "your_dsn"
```

## Current Build Status

- **Version:** 1.0.0
- **Build Number:** 125
- **Last Update:** January 2026

## Checklist Before Submission

- [ ] App Store screenshots (6.7", 6.5", 5.5" devices)
- [ ] App description and keywords
- [ ] Privacy policy URL (https://lilove.org/legal/privacy)
- [ ] Support URL (https://lilove.org)
- [ ] Marketing URL (https://lilove.org)
- [ ] App review notes
- [ ] Age rating questionnaire completed
- [ ] In-app purchases configured in RevenueCat

## One-Command Deployment

For full automated build and submission:
```bash
cd mobile && eas build --platform ios --profile production --auto-submit
```

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
eas build:cancel
rm -rf node_modules
npm install
eas build --platform ios --profile production --clear-cache
```

### Submission Rejected
- Check App Store Connect for rejection reason
- Common issues: missing screenshots, privacy policy, or metadata
