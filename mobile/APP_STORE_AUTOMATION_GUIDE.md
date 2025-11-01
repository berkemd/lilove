# 📱 LiLove iOS App Store Automated Submission Guide

## 🎯 Overview

This guide provides a **complete automated solution** for submitting the LiLove iOS app to the App Store. The automation handles:

- ✅ App metadata (descriptions, keywords, URLs)
- ✅ Screenshots upload
- ✅ Build submission
- ✅ TestFlight distribution
- ✅ App Store review submission

## 🚀 Quick Start

### Option 1: Metadata and Screenshots Only (Recommended for existing build)

Since you already have build #37 in TestFlight, you can submit just metadata:

```bash
cd mobile

# Set your API credentials
export ASC_KEY_ID="725AYMVS7J"
export ASC_ISSUER_ID="your-issuer-id"
export ASC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgS108GimcTkTomrfd
5TPfPBM09YlTRA6C+4whNBiWlOmhRANCAAQyDArucFeVMa4nOONIfM4B6KoUrp8a
vB+szVYT8Ge4yRNCLJ2aWO7U8qz7Ss48m7YNFyS6VGlxitc1LTCK90p5
-----END PRIVATE KEY-----"

# Upload metadata
./appstore-submit.sh --metadata-only

# After adding screenshots (see below), upload them
./appstore-submit.sh --screenshots-only

# Submit your existing build for review
./appstore-submit.sh --submit-review 37
```

### Option 2: Complete Automation (Build + Submit)

To build a new version and submit:

```bash
cd mobile

# Set API credentials (as above)
export ASC_KEY_ID="725AYMVS7J"
export ASC_ISSUER_ID="your-issuer-id"
export ASC_PRIVATE_KEY="<your-key>"

# Run complete flow
./appstore-submit.sh --full

# Then submit for review
./appstore-submit.sh --submit-review <new-build-number>
```

## 🔑 Required Setup

### 1. App Store Connect API Key

You need three pieces of information:

1. **Key ID**: `725AYMVS7J` (you already have this)
2. **Issuer ID**: Find this in [App Store Connect → Users and Access → Keys](https://appstoreconnect.apple.com/access/api)
3. **Private Key**: You provided this (starts with `-----BEGIN PRIVATE KEY-----`)

### 2. Set Environment Variables

Create a file `mobile/.env.local`:

```bash
# App Store Connect API Credentials
ASC_KEY_ID=725AYMVS7J
ASC_ISSUER_ID=<your-issuer-id-here>
ASC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgS108GimcTkTomrfd
5TPfPBM09YlTRA6C+4whNBiWlOmhRANCAAQyDArucFeVMa4nOONIfM4B6KoUrp8a
vB+szVYT8Ge4yRNCLJ2aWO7U8qz7Ss48m7YNFyS6VGlxitc1LTCK90p5
-----END PRIVATE KEY-----"
```

Then load it:
```bash
source .env.local
```

## 📸 Adding Screenshots

Screenshots are **required** for App Store submission. Here's how to add them:

### Required Sizes

- **iPhone 6.5" Display**: 1284 x 2778 pixels (iPhone 14 Pro Max, etc.)
- **iPhone 5.5" Display**: 1242 x 2208 pixels (iPhone 8 Plus, etc.)

### Where to Place Screenshots

```
mobile/fastlane/metadata/
├── en-US/screenshots/
│   ├── iphone65/
│   │   ├── 01-dashboard.png
│   │   ├── 02-goals.png
│   │   ├── 03-habits.png
│   │   ├── 04-ai-coach.png
│   │   └── 05-analytics.png
│   └── iphone55/
│       └── (same screenshots, different size)
└── tr/screenshots/
    ├── iphone65/
    │   └── (Turkish localized screenshots)
    └── iphone55/
        └── (Turkish localized screenshots)
```

### How to Capture Screenshots

#### Method 1: From iOS Simulator

```bash
# Start the app in simulator
cd mobile
npm start

# Press 'i' to open iOS simulator
# Navigate to each screen
# Press Cmd+S to capture screenshot
# Screenshots are saved to Desktop
# Move them to fastlane/metadata/en-US/screenshots/iphone65/
```

#### Method 2: From Physical Device

1. Open the app on a real iPhone
2. Navigate to each screen
3. Press Volume Up + Power Button simultaneously
4. Transfer screenshots to your computer
5. Place in `fastlane/metadata/en-US/screenshots/iphone65/`

#### Method 3: Skip Screenshots for Now

If you don't have screenshots yet, you can:
1. Submit without screenshots initially
2. Add them manually in [App Store Connect](https://appstoreconnect.apple.com/apps/6670815109/appstore/ios/version/inflight)
3. Use the web interface to upload

## 📝 What's Already Configured

The automation includes:

### ✅ English Metadata
- **App Name**: LiLove - Your Personal Growth Companion
- **Subtitle**: Personal Development & Goal Tracking
- **Description**: Complete description with features and benefits
- **Keywords**: Optimized for App Store search
- **URLs**: Privacy policy, support, marketing
- **Release Notes**: Ready for version 1.0.0

### ✅ Turkish Metadata
- Complete Turkish localization
- All metadata translated
- Ready for Turkish market

### ✅ Fastlane Configuration
- App Store Connect API integration
- Automated metadata upload
- Screenshot upload automation
- Review submission automation

## 🎮 Available Commands

```bash
# Upload only metadata (descriptions, keywords, URLs)
./appstore-submit.sh --metadata-only

# Upload only screenshots
./appstore-submit.sh --screenshots-only

# Build new version with EAS
./appstore-submit.sh --build-only

# Submit to TestFlight
./appstore-submit.sh --testflight-only

# Submit build for App Store review
./appstore-submit.sh --submit-review 37

# Complete flow (build + metadata + screenshots)
./appstore-submit.sh --full
```

## ⚠️ Important Manual Steps

Some things **CANNOT** be automated and must be done in App Store Connect web UI:

### First-Time Setup (Do Once)

1. **App Information** - Go to [App Store Connect](https://appstoreconnect.apple.com/apps/6670815109)
   - Set primary category (e.g., "Health & Fitness" or "Productivity")
   - Set secondary category (optional)
   
2. **Age Rating**
   - Answer the age rating questionnaire
   - Based on your app features, likely 4+ or 9+
   
3. **App Review Information**
   - Provide demo account credentials (if app requires login)
   - Add contact information for reviewers
   - Add notes for reviewer
   
4. **Pricing and Availability**
   - Set app price (Free or paid)
   - Select available countries/regions
   
5. **In-App Purchases** (if using subscriptions)
   - Create subscription groups
   - Add subscription products
   - Set pricing for each product
   - Add localized descriptions

### Every Release

1. **Export Compliance**
   - Answer encryption usage questions
   - Usually "No" for most apps
   
2. **Content Rights**
   - Declare if you have rights to all content
   - Usually "Yes"

## 🔄 Complete Submission Workflow

### Scenario 1: Submit Existing Build #37

```bash
cd mobile

# 1. Set credentials
export ASC_KEY_ID="725AYMVS7J"
export ASC_ISSUER_ID="<your-issuer-id>"
export ASC_PRIVATE_KEY="<your-private-key>"

# 2. Upload metadata
./appstore-submit.sh --metadata-only

# 3. Add screenshots (manually, see above)
# Place screenshots in fastlane/metadata/en-US/screenshots/iphone65/

# 4. Upload screenshots
./appstore-submit.sh --screenshots-only

# 5. Go to App Store Connect and:
#    - Set app category
#    - Complete age rating questionnaire
#    - Add app review information
#    - Configure pricing

# 6. Submit for review
./appstore-submit.sh --submit-review 37
```

### Scenario 2: Build New Version and Submit

```bash
cd mobile

# 1. Set credentials
export ASC_KEY_ID="725AYMVS7J"
export ASC_ISSUER_ID="<your-issuer-id>"
export ASC_PRIVATE_KEY="<your-private-key>"

# 2. Run complete automation
./appstore-submit.sh --full

# 3. Add screenshots and upload
# (see Scenario 1, step 3-4)

# 4. Complete manual steps in App Store Connect
# (see Scenario 1, step 5)

# 5. Submit for review with new build number
./appstore-submit.sh --submit-review <build-number>
```

## 🐛 Troubleshooting

### Error: "Invalid API Key"

- Check that `ASC_ISSUER_ID` is set correctly
- Verify the private key format (must include BEGIN/END lines)
- Ensure API key has App Manager or Admin role

### Error: "Missing Screenshots"

- Screenshots are required for first submission
- Add at least 3 screenshots per language
- Use correct dimensions (1284x2778 for 6.5" display)

### Error: "Build Not Found"

- Wait 5-10 minutes after EAS build completes
- Build must finish processing in App Store Connect
- Verify build number in [TestFlight](https://appstoreconnect.apple.com/apps/6670815109/testflight/ios)

### Error: "Metadata Validation Failed"

- Check description length (max 4000 characters)
- Keywords must be comma-separated, max 100 characters
- Subtitle max 30 characters
- URLs must be valid HTTPS URLs

## 📊 Monitoring Submission

After submission, monitor status at:
- **App Store Connect**: https://appstoreconnect.apple.com/apps/6670815109
- **TestFlight**: https://appstoreconnect.apple.com/apps/6670815109/testflight/ios

Review typically takes 1-3 days. You'll receive email notifications about:
- Review status changes
- Approval/rejection
- When app goes live

## 🎉 Post-Submission

Once approved:
1. App automatically goes live (if automatic release enabled)
2. Users can download from App Store
3. You can promote on social media, website, etc.

## 💡 Tips for Successful Review

1. **Provide demo account**: If app requires login
2. **Clear instructions**: Add notes for reviewer
3. **Complete features**: All advertised features should work
4. **Follow guidelines**: https://developer.apple.com/app-store/review/guidelines/
5. **Test thoroughly**: Use TestFlight before submitting

## 📚 Additional Resources

- [App Store Connect](https://appstoreconnect.apple.com/)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/ios/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## ❓ Need Help?

If automation fails or you have questions:

1. Check the error message carefully
2. Consult the troubleshooting section above
3. Check Fastlane logs in `mobile/fastlane/fastlane.log`
4. Verify all credentials are set correctly
5. Try manual submission via App Store Connect as fallback

---

**Remember**: Some steps (app category, age rating, pricing) MUST be done manually in App Store Connect web interface for first-time submission. This is an Apple requirement and cannot be automated.
