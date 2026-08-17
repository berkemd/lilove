# IAP Product Creation - Quick Start

## Prerequisites Checklist

- [ ] Apple ID with App Manager or Admin role
- [ ] Access to org.lilove.app in App Store Connect
- [ ] Subscription group created in App Store Connect (or one subscription product exists)
- [ ] Fastlane installed (`gem install fastlane`)

## Quick Start

### Step 1: Set Environment Variable

```bash
export FASTLANE_APPLE_ID="your@email.com"
```

### Step 2: Navigate to Mobile Directory

```bash
cd mobile
```

### Step 3: Run the Lane

```bash
bundle exec fastlane create_iap_products
```

## Expected Output

### Successful Execution

```
================================================================================
🚀 LiLove IAP Product Creation via Spaceship API
================================================================================

🔐 Step 1: Authenticating with App Store Connect...
✅ Authenticated as: your@email.com

📱 Step 2: Finding app 'org.lilove.app'...
✅ Found app: LiLove (org.lilove.app)

📦 Step 3: Checking subscription group...
✅ Found existing subscription group: 1234567890

🔍 Step 4: Checking for existing products...
📝 4 product(s) to create

🏗️  Step 5: Creating IAP products...

1/4: Creating Premium Monthly Subscription...
   Product ID: org.lilove.app.sub.pro.monthly
   Price Tier: 10 (approx $9.99)
   Duration: 1m
   ✅ SUCCESS: Product created in App Store Connect

2/4: Creating Premium Yearly Subscription...
   Product ID: org.lilove.app.sub.pro.yearly
   Price Tier: 50 (approx $99.99)
   Duration: 1y
   ✅ SUCCESS: Product created in App Store Connect

3/4: Creating Team Monthly Subscription...
   Product ID: org.lilove.app.sub.team.monthly
   Price Tier: 20 (approx $19.99)
   Duration: 1m
   ✅ SUCCESS: Product created in App Store Connect

4/4: Creating Team Yearly Subscription...
   Product ID: org.lilove.app.sub.team.yearly
   Price Tier: 70 (approx $199.99)
   Duration: 1y
   ✅ SUCCESS: Product created in App Store Connect

================================================================================
📊 CREATION SUMMARY
================================================================================

✅ Successfully Created (4):
   ✓ org.lilove.app.sub.pro.monthly
   ✓ org.lilove.app.sub.pro.yearly
   ✓ org.lilove.app.sub.team.monthly
   ✓ org.lilove.app.sub.team.yearly

🎯 NEXT STEPS:
1. ✅ Verify products in App Store Connect → My Apps → LiLove → In-App Purchases
2. 📝 Complete product metadata (descriptions, screenshots if needed)
3. 🔄 Set products to 'Ready for Sale' (cleared_for_sale: true)
4. 🔗 Sync products to RevenueCat Dashboard
5. 🧪 Test purchases in Sandbox environment
6. 📱 Update mobile app with product IDs

================================================================================
```

### If Subscription Group is Missing

```
================================================================================
❌ IAP CREATION FAILED
================================================================================

Error: ❌ SUBSCRIPTION GROUP REQUIRED

   A subscription group must exist before creating subscriptions.
   Please create one manually in App Store Connect:

   1. Go to: App Store Connect → My Apps → LiLove → Features → In-App Purchases
   2. Click 'Manage' under 'Subscriptions'
   3. Click '+' to create a new subscription group
   4. Name it 'LiLove Premium' (Reference Name: lilove_premium_group)
   5. Save the subscription group
   6. Run this lane again

   Note: You can also create one subscription manually to establish the group,
   then this script can add the remaining products to the same group.
```

### If Products Already Exist

```
🔍 Step 4: Checking for existing products...
⏭️  Skipping org.lilove.app.sub.pro.monthly (already exists)
⏭️  Skipping org.lilove.app.sub.pro.yearly (already exists)
⏭️  Skipping org.lilove.app.sub.team.monthly (already exists)
⏭️  Skipping org.lilove.app.sub.team.yearly (already exists)

✅ All products already exist! No action needed.

📋 Existing Products:
   ✓ org.lilove.app.sub.pro.monthly - Premium Monthly Subscription
   ✓ org.lilove.app.sub.pro.yearly - Premium Yearly Subscription
   ✓ org.lilove.app.sub.team.monthly - Team Monthly Subscription
   ✓ org.lilove.app.sub.team.yearly - Team Yearly Subscription
```

## Common Issues

### Issue: "AUTHENTICATION REQUIRED"

```bash
# Solution: Set your Apple ID
export FASTLANE_APPLE_ID="your@email.com"
```

### Issue: Two-Factor Authentication Prompt

If prompted for 2FA:
1. Enter the 6-digit code sent to your device
2. Or use an app-specific password from appleid.apple.com

### Issue: "APP NOT FOUND"

Verify:
- App exists in App Store Connect
- Bundle ID is exactly: `org.lilove.app`
- Your Apple ID has access to the app

## Verification Steps

After running the script:

1. **Check App Store Connect**:
   - Go to: https://appstoreconnect.apple.com
   - Navigate to: My Apps → LiLove → Features → In-App Purchases
   - Verify all 4 products appear

2. **Verify Product Details**:
   - Each product should show:
     - ✅ Product ID matches specification
     - ✅ Price tier is correct
     - ✅ Duration is correct
     - ✅ Localized names in English and Turkish

3. **Check Status**:
   - Products will be in "Waiting for Review" or "Ready to Submit" status
   - This is normal - they're not yet "Ready for Sale"

## Next Steps After Creation

1. **Complete Metadata**: Add promotional images if required
2. **Submit for Review**: Change status to "Ready for Sale"
3. **RevenueCat Setup**: Import products to RevenueCat dashboard
4. **Mobile App**: Update product IDs in mobile app configuration
5. **Test**: Use sandbox accounts to test purchases

## Manual Creation (Fallback)

If automation fails, follow the detailed manual instructions in the error output or see `IAP_CREATION_GUIDE.md` for complete specifications.

## Debug Mode

For detailed troubleshooting:

```bash
DEBUG=true bundle exec fastlane create_iap_products
```

This will show full stack traces for any errors.

## Support Resources

- **Full Documentation**: See `IAP_CREATION_GUIDE.md`
- **Fastlane Docs**: https://docs.fastlane.tools
- **App Store Connect**: https://appstoreconnect.apple.com
- **RevenueCat**: https://docs.revenuecat.com
