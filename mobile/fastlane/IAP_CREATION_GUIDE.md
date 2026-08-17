# IAP Product Creation Guide - Spaceship API Implementation

## Overview

This guide explains how to use the automated IAP (In-App Purchase) product creation lane in Fastfile, which uses the Spaceship::Tunes API to create subscription products in App Store Connect.

## Implementation Details

### Technology Stack
- **Spaceship::Tunes API**: Ruby interface to App Store Connect
- **Fastlane**: Automation tool for iOS deployment
- **Product Type**: Auto-Renewable Subscriptions

### Product Configuration

The following subscription products are configured:

| Product ID | Name | Price | Duration | Free Trial |
|------------|------|-------|----------|------------|
| `org.lilove.app.sub.pro.monthly` | Premium Monthly | $9.99 | 1 month | 1 week |
| `org.lilove.app.sub.pro.yearly` | Premium Yearly | $99.99 | 1 year | 1 week |
| `org.lilove.app.sub.team.monthly` | Team Monthly | $19.99 | 1 month | 1 week |
| `org.lilove.app.sub.team.yearly` | Team Yearly | $199.99 | 1 year | 1 week |

## Prerequisites

### 1. Environment Setup

Set your Apple ID in the environment:

```bash
export FASTLANE_APPLE_ID="your@email.com"
# or
export APPLE_ID="your@email.com"
```

**Important**: Spaceship::Tunes requires username/password authentication, not API tokens.

### 2. Subscription Group

A subscription group **must exist** before running this script. You have two options:

#### Option A: Create Manually First
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: My Apps → LiLove → Features → In-App Purchases
3. Click "Manage" under "Subscriptions"
4. Click "+" to create a new subscription group
5. Name: "LiLove Premium"
6. Reference Name: "lilove_premium_group"
7. Save the subscription group

#### Option B: Create One Product Manually
Create the first subscription product manually in App Store Connect. This will automatically create the subscription group. Then run this script to add the remaining products to the same group.

### 3. App Store Connect Permissions

Your Apple ID must have:
- Admin or App Manager role
- Access to the LiLove app
- Permission to manage In-App Purchases

## Usage

### Basic Usage

From the `mobile` directory:

```bash
cd mobile
bundle exec fastlane create_iap_products
```

### With Debug Output

To see detailed error traces:

```bash
DEBUG=true bundle exec fastlane create_iap_products
```

## Execution Flow

### Step 1: Authentication
- Checks for `FASTLANE_APPLE_ID` or `APPLE_ID` environment variable
- Authenticates with App Store Connect using Spaceship::Tunes
- Selects the appropriate team

### Step 2: Find App
- Locates the app by bundle identifier: `org.lilove.app`
- Validates app exists in App Store Connect

### Step 3: Subscription Group Validation
- Retrieves all existing IAP products
- Looks for existing subscription to find `family_id` (subscription group ID)
- **Fails with instructions if no group exists**

### Step 4: Idempotency Check
- Lists all existing product IDs
- Skips products that already exist
- Only attempts to create missing products

### Step 5: Product Creation
For each product to create:
- Calls `app.in_app_purchases.create!()` with:
  - Type: `RECURRING` (auto-renewable subscription)
  - Product ID, reference name, and localized metadata
  - Subscription duration and free trial period
  - Price tier (worldwide pricing)
  - Family ID (subscription group)
  - Initial availability: `cleared_for_sale: false` (for review)
- Logs success or failure per product
- Continues with remaining products if one fails

### Step 6: Summary Report
- Lists successfully created products
- Lists failed products with error messages
- Provides next steps for verification

## Error Handling

### Authentication Errors

**Error**: "AUTHENTICATION REQUIRED: Set FASTLANE_APPLE_ID environment variable"

**Solution**:
```bash
export FASTLANE_APPLE_ID="your@email.com"
bundle exec fastlane create_iap_products
```

### Subscription Group Missing

**Error**: "SUBSCRIPTION GROUP REQUIRED"

**Solution**: Follow the instructions in Prerequisites → Subscription Group above.

### Product Already Exists

**Behavior**: Script automatically skips existing products
```
⏭️  Skipping org.lilove.app.sub.pro.monthly (already exists)
```

This is normal and expected for idempotent operation.

### App Not Found

**Error**: "APP NOT FOUND: 'org.lilove.app' not found"

**Solution**: Verify the app exists in App Store Connect and your Apple ID has access.

### API Failures

If product creation fails, the script:
1. Logs the specific error message
2. Continues with remaining products
3. Provides detailed manual fallback instructions at the end

## Success Verification

### In Fastlane Output

Look for:
```
✅ SUCCESS: Product created in App Store Connect
```

### In App Store Connect

1. Go to: App Store Connect → My Apps → LiLove → Features → In-App Purchases
2. Verify all 4 products appear in the list
3. Check each product's details match the specifications

## Post-Creation Steps

After successful creation:

1. **Verify Products**: Check App Store Connect to confirm all products exist
2. **Complete Metadata**: Add any additional descriptions or screenshots if required
3. **Set Ready for Sale**: Update `cleared_for_sale: true` when ready
4. **RevenueCat Sync**: Import products to RevenueCat Dashboard
5. **Sandbox Testing**: Test purchases using sandbox test accounts
6. **Mobile App Update**: Ensure mobile app uses correct product IDs

## Manual Fallback

If the automated script fails entirely, detailed manual creation instructions are provided in the error output. You'll see:

- Direct link to App Store Connect
- Step-by-step instructions for subscription group creation
- Complete specifications for each product including:
  - Product ID
  - Type
  - Duration
  - Price tier
  - Free trial period
  - Display names (English and Turkish)
  - Descriptions

## Troubleshooting

### Two-Factor Authentication

If using 2FA, you may need to:
1. Generate an app-specific password in your Apple ID settings
2. Use that password instead of your regular password
3. Or authenticate in a browser first, then run the script

### Rate Limiting

The script includes a 1-second delay between product creations to avoid rate limiting. If you encounter rate limit errors:
- Wait 5-10 minutes before retrying
- Reduce the number of products created in one run

### Spaceship Deprecation Warning

Spaceship::Tunes is being deprecated in favor of App Store Connect REST API. However:
- It's still functional and widely used
- No official replacement for IAP creation is available yet
- This implementation includes proper error handling for future changes

## Technical Implementation

### API Method

```ruby
app.in_app_purchases.create!(
  type: Spaceship::Tunes::IAPType::RECURRING,
  reference_name: "Premium Monthly Subscription",
  product_id: "org.lilove.app.sub.pro.monthly",
  family_id: subscription_family_id,
  subscription_duration: "1m",
  subscription_free_trial: "1w",
  versions: {
    "en-US" => {
      name: "Premium Monthly",
      description: "Access all premium features..."
    }
  },
  cleared_for_sale: false,
  pricing_intervals: [
    {
      country: "WW",
      tier: 10
    }
  ]
)
```

### Duration Codes
- `"1w"` - 1 week
- `"1m"` - 1 month
- `"2m"` - 2 months
- `"3m"` - 3 months
- `"6m"` - 6 months
- `"1y"` - 1 year

### Price Tiers (Approximate)
- Tier 10 ≈ $9.99
- Tier 20 ≈ $19.99
- Tier 50 ≈ $99.99
- Tier 70 ≈ $199.99

Exact prices vary by country/region.

## Security Considerations

- Never commit Apple ID credentials to version control
- Use environment variables for authentication
- Products are created with `cleared_for_sale: false` initially
- Review all products before enabling for sale
- Test thoroughly in Sandbox before production

## References

- [Spaceship Documentation](https://docs.fastlane.tools/advanced/other/#spaceship)
- [App Store Connect API](https://developer.apple.com/app-store-connect/api/)
- [In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [RevenueCat Docs](https://docs.revenuecat.com/docs/ios)

## Support

For issues with:
- **Fastlane/Spaceship**: Check [fastlane GitHub issues](https://github.com/fastlane/fastlane/issues)
- **App Store Connect**: Contact Apple Developer Support
- **RevenueCat Integration**: See RevenueCat documentation

## Changelog

### 2025-01-30 - Initial Implementation
- Implemented real Spaceship::Tunes API calls
- Added subscription group validation
- Implemented idempotency checks
- Added comprehensive error handling
- Created detailed fallback instructions
- Added support for English and Turkish localizations
