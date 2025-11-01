# LiLove Mobile App

Mobile application for LiLove built with Expo and React Native, featuring RevenueCat for in-app purchases.

## Features

- ✅ RevenueCat integration for subscriptions
- ✅ iOS and Android support
- ✅ Expo Router for navigation
- ✅ TypeScript support
- ✅ EAS Build configuration

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli eas-cli`)
- EAS account (https://expo.dev)
- RevenueCat account (https://www.revenuecat.com)

## Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure RevenueCat

1. Create a project in RevenueCat dashboard
2. Get your API keys (iOS and Android)
3. Update `app.json` with your RevenueCat API keys:

```json
{
  "extra": {
    "revenueCatApiKey": {
      "ios": "appl_YOUR_IOS_API_KEY_HERE",
      "android": "goog_YOUR_ANDROID_API_KEY_HERE"
    }
  }
}
```

4. Configure products in RevenueCat dashboard to match your subscription plans

### 3. Add Assets

Place the following files in the `assets/` directory:
- `icon.png` - App icon (1024x1024px)
- `splash.png` - Splash screen image

### 4. Configure EAS Build

Make sure you're logged into EAS:

```bash
eas login
```

## Development

### Run on iOS Simulator

```bash
npm run ios
```

### Run on Android Emulator

```bash
npm run android
```

### Run on Physical Device

```bash
npm start
# Scan QR code with Expo Go app
```

## Building

### Development Build

```bash
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

### Preview Build (Internal Testing)

```bash
eas build --profile preview --platform ios
# or
eas build --profile preview --platform android
```

### Production Build

```bash
eas build --profile production --platform ios
# or
eas build --profile production --platform android
```

## Submitting to App Stores

### iOS App Store

1. Build for production:
```bash
eas build --profile production --platform ios
```

2. Submit to App Store:
```bash
eas submit --platform ios
```

### Google Play Store

1. Build for production:
```bash
eas build --profile production --platform android
```

2. Submit to Play Store:
```bash
eas submit --platform android
```

## Environment Variables

The app uses the following environment variables (configured in `eas.json`):

- `EXPO_PUBLIC_API_URL` - Backend API URL (default: https://lilove.org)

## RevenueCat Integration

### Subscription Plans

The app supports the following subscription tiers:
- Free
- Heart (Monthly/Annual)
- Peak (Monthly/Annual)
- Champion (Monthly/Annual)

Configure these products in your RevenueCat dashboard with the appropriate pricing.

### Entitlements

Configure the following entitlements in RevenueCat:
- `pro` - For paid tier access
- `premium` - For premium features
- `all_access` - For full access

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Clear cache:
```bash
rm -rf node_modules
npm install
```

2. Check EAS build logs:
```bash
eas build:list
```

### RevenueCat Issues

- Verify API keys are correct in `app.json`
- Check RevenueCat dashboard for product configuration
- Enable debug logging in development

### iOS Specific

- Ensure bundle identifier matches: `org.lilove.app`
- Check Apple Developer account capabilities
- Verify In-App Purchase capability is enabled

### Android Specific

- Ensure package name matches: `org.lilove.app`
- Configure Google Play billing in Play Console
- Link RevenueCat to Google Play

## Documentation

- [Expo Documentation](https://docs.expo.dev)
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Documentation](https://reactnative.dev)

## Support

For issues specific to:
- Expo/EAS: https://expo.dev/support
- RevenueCat: https://support.revenuecat.com
- LiLove platform: Contact development team
