# EAS Secrets Configuration

## Required Secrets

Set these secrets via EAS CLI before building:

### RevenueCat iOS API Key
```bash
cd mobile
eas secret:create --scope project --name REVENUECAT_IOS_API_KEY --value appl_XXXX
```

### Sentry DSN (Optional)
```bash
eas secret:create --scope project --name SENTRY_DSN --value https://xxx@sentry.io/xxx
```

## Verify Secrets

```bash
eas secret:list
```

## Build Commands

### Development Build (Simulator)
```bash
eas build --profile development --platform ios
```

### Preview Build (TestFlight)
```bash
eas build --profile preview --platform ios
```

### Production Build (App Store)
```bash
eas build --profile production --platform ios
```

## Build Profile Details

### Development Profile
- **Purpose**: Local development and testing
- **Distribution**: Internal
- **Simulator**: Enabled
- **API URL**: http://localhost:5000 (local backend)
- **Use Case**: Testing new features during development

### Preview Profile
- **Purpose**: Internal testing before production
- **Distribution**: Internal (TestFlight)
- **Simulator**: Disabled (physical devices only)
- **API URL**: https://lilove.org (production API)
- **Use Case**: QA testing and stakeholder reviews

### Production Profile
- **Purpose**: App Store releases
- **Distribution**: Store
- **Simulator**: Disabled
- **API URL**: https://lilove.org
- **Auto-increment**: Enabled
- **Secrets**: Includes RevenueCat and Sentry configuration
- **Use Case**: Public releases to the App Store

## Secret Reference Syntax

In eas.json, secrets are referenced using the `${VARIABLE_NAME}` syntax:

```json
"env": {
  "REVENUECAT_IOS_API_KEY": "${REVENUECAT_IOS_API_KEY}",
  "SENTRY_DSN": "${SENTRY_DSN}"
}
```

This tells EAS to inject the secret value during the build process without exposing it in the configuration file.
