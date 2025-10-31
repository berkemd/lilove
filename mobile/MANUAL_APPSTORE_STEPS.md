# ⚠️ MANUAL STEPS REQUIRED FOR APP STORE SUBMISSION

## What Cannot Be Automated

Apple requires certain steps to be completed **manually** in the App Store Connect web interface. This document provides **exact step-by-step instructions** for each required manual action.

---

## 🌐 Access App Store Connect

1. Go to: https://appstoreconnect.apple.com/
2. Sign in with: `brkekahraman@icloud.com`
3. Navigate to: **Apps** → **LiLove** (or go directly to https://appstoreconnect.apple.com/apps/6670815109)

---

## 📋 REQUIRED MANUAL STEPS

### Step 1: Set App Category (REQUIRED - First Time Only)

**Why**: Apple requires you to categorize your app so users can find it in the App Store.

**How to do it**:

1. In App Store Connect, go to **LiLove** → **App Information** (in left sidebar)
2. Scroll to **Category** section
3. Click **Primary Category** dropdown
4. Select: **Health & Fitness** (or **Productivity** - choose what fits best)
5. Optionally select **Secondary Category**: **Lifestyle** or **Health & Fitness**
6. Click **Save** in top right

**Recommended Categories**:
- Primary: Health & Fitness (if focused on wellness/habits)
- Primary: Productivity (if focused on goal tracking/tasks)
- Secondary: Lifestyle

---

### Step 2: Age Rating (REQUIRED - First Time Only)

**Why**: Apple requires age rating for all apps to protect users.

**How to do it**:

1. In App Store Connect, go to **LiLove** → **App Information**
2. Scroll to **Age Rating** section
3. Click **Edit** next to Age Rating
4. Answer the questionnaire honestly:

**Common Questions for LiLove**:
```
Cartoon or Fantasy Violence: No
Realistic Violence: No
Sexual Content or Nudity: No
Profanity or Crude Humor: No
Alcohol, Tobacco, or Drug Use: No
Mature/Suggestive Themes: No
Horror/Fear Themes: No
Gambling: No
Medical/Treatment Information: No (unless you provide medical advice)
Unrestricted Web Access: No
User Generated Content: Yes (if you have social features/chat)
Location Services: Yes (if you use location)
```

5. Click **Done**
6. Expected Rating: **4+** or **9+** (depending on social features)

---

### Step 3: App Review Information (REQUIRED - First Time Only)

**Why**: Reviewers need to test your app, so they need login credentials if required.

**How to do it**:

1. In App Store Connect, go to **LiLove** → **App Store** tab
2. Click on **1.0 Prepare for Submission**
3. Scroll to **App Review Information** section
4. Fill in:

```
Sign-in Required: [Yes/No - depending on your app]

If Yes, provide demo account:
  Username: test@lilove.org
  Password: TestAccount123!
  
Notes:
  "This is a personal development app for goal tracking and habit building.
  
  Demo Account Instructions:
  1. Sign in with provided credentials
  2. Explore goals, habits, and AI coaching features
  3. Test social features in Teams section
  
  Key Features:
  - Goal and task management
  - Habit tracking
  - AI-powered coaching
  - Social challenges and teams
  - Gamification (XP, achievements, avatar)
  
  No payment is required for testing basic features.
  Premium features can be tested without actual purchase in sandbox environment."
```

```
Contact Information:
  First Name: Berke
  Last Name: Kahraman
  Phone: +90 [your phone]
  Email: brkekahraman@icloud.com
```

5. Click **Save**

---

### Step 4: Pricing and Availability (REQUIRED - First Time Only)

**Why**: You need to set whether the app is free or paid, and where it's available.

**How to do it**:

1. In App Store Connect, go to **LiLove** → **Pricing and Availability**
2. **Price**: Select **Free** (since you have in-app purchases for premium features)
3. **Availability**: 
   - Leave **All Countries and Regions** selected (or deselect regions where you don't want the app)
   - For Turkey-focused app: Make sure **Turkey** is selected
   - For international: Keep all regions selected
4. **Pre-orders**: Leave **Disabled** (for first release)
5. Click **Save**

---

### Step 5: Export Compliance (REQUIRED - Every Release)

**Why**: US law requires declaration of encryption usage.

**How to do it**:

1. In App Store Connect, go to **LiLove** → **App Store** → **1.0 Prepare for Submission**
2. Scroll to **Export Compliance Information**
3. Answer the question:

```
"Does your app use encryption?"

Answer: No

(Most apps answer "No" because standard HTTPS doesn't count as encryption that needs declaration.
Only answer "Yes" if you implement custom encryption algorithms.)
```

4. This will be asked for **every new version** you submit

---

### Step 6: Content Rights (REQUIRED - Every Release)

**Why**: Apple needs to verify you have rights to all content in your app.

**How to do it**:

1. In the submission form, you'll see **Content Rights**
2. Check the box: **"Yes, I have the necessary rights to use this content"**
3. This confirms you own or have rights to all images, text, designs in your app

---

### Step 7: In-App Purchases Setup (REQUIRED if using subscriptions)

**Why**: You mentioned payment information - subscriptions must be configured in App Store Connect.

**How to do it**:

1. In App Store Connect, go to **LiLove** → **In-App Purchases** (in left sidebar)
2. Click **+** to create new in-app purchase
3. Select **Auto-Renewable Subscription**

**For each subscription tier** (e.g., Premium Monthly, Premium Annual):

4. Click **Create Subscription Group** (first time)
   - Name: "LiLove Premium" or "LiLove Subscriptions"
5. Click **Create Subscription**
6. Fill in details:

```
Reference Name: LiLove Premium - Monthly
Product ID: org.lilove.app.sub.premium.monthly
Subscription Duration: 1 Month
```

7. Click **Create**
8. Add **Subscription Information**:

```
Subscription Display Name (English): Premium Monthly
Subscription Display Name (Turkish): Aylık Premium

Description (English):
"Get unlimited access to all premium features including AI coaching, advanced analytics, and more."

Description (Turkish):
"AI koçluk, gelişmiş analitikler ve daha fazlasını içeren tüm premium özelliklere sınırsız erişim elde edin."
```

9. Add **Subscription Prices**:
   - Click **Add Pricing**
   - Select countries/regions
   - Enter price (e.g., $9.99 USD, ₺99.99 TRY)
   - Click **Next** → **Add**

10. Click **Save**
11. Repeat for Annual subscription

12. **Important**: After creating subscriptions:
    - Submit them for review (separate from app review)
    - They must be approved before app can go live with subscriptions

---

### Step 8: Add Screenshots (if not using automation)

**Why**: Screenshots are required for App Store listing.

**How to do it manually**:

1. In App Store Connect, go to **LiLove** → **App Store** → **1.0 Prepare for Submission**
2. Scroll to **App Previews and Screenshots**
3. Click on **iPhone 6.5" Display**
4. Click **+** to add screenshots
5. Upload at least 3 screenshots (max 10)
   - Recommended: 5-6 screenshots showing key features
   - Required size: 1284 x 2778 pixels
6. Drag to reorder screenshots
7. Repeat for **iPhone 5.5" Display** if supporting older devices
8. Repeat for Turkish localization in **Localization** section

**What to showcase in screenshots**:
1. Main dashboard/home screen
2. Goal creation and tracking
3. Habit tracker
4. AI coaching chat
5. Analytics/progress charts
6. Social features (teams/challenges)

---

## 🚀 FINAL SUBMISSION STEPS

After completing all manual steps above and running the automation:

### Final Checklist

Go to **LiLove** → **App Store** → **1.0 Prepare for Submission**

Verify all sections have ✅:
- [ ] App Information (category, age rating)
- [ ] Pricing and Availability
- [ ] App Privacy (if required)
- [ ] App Review Information
- [ ] Version Information (metadata from automation)
- [ ] Build (select build #37 or latest)
- [ ] Screenshots (3+ per device size)
- [ ] Export Compliance
- [ ] Content Rights

### Submit for Review

1. Click **Add for Review** button (top right)
2. Review all information one final time
3. Click **Submit to App Review**
4. Wait for confirmation email

---

## 📧 What Happens Next

### Review Process Timeline

1. **Submission Received** - Immediate
   - You'll receive email confirmation
   - Status shows "Waiting for Review"

2. **In Review** - Usually within 24-48 hours
   - Apple reviewers test your app
   - They check for guideline compliance
   - Status shows "In Review"

3. **Review Decision** - Usually within 24-48 hours of review start
   - **Approved**: Status shows "Pending Developer Release" or "Ready for Sale"
   - **Rejected**: You'll receive detailed reasons and can resubmit

4. **App Goes Live** - Immediate (if auto-release enabled)
   - Users can download from App Store
   - Shows in search results
   - Listed under your developer account

### Common Review Issues

- **Login required but no demo account**: Provide test credentials
- **Crashes during review**: Test thoroughly before submission
- **Missing features**: All advertised features must work
- **Guideline violations**: Follow https://developer.apple.com/app-store/review/guidelines/

---

## 🆘 TROUBLESHOOTING

### "Cannot submit - missing information"

- Check that ALL sections have green checkmarks
- Verify screenshots are uploaded
- Ensure a build is selected
- Complete age rating questionnaire
- Set app category

### "Build is not available"

- Wait 5-10 minutes after build completes in EAS
- Build must finish processing in App Store Connect
- Check build status in TestFlight section
- Ensure build has no errors

### "Missing compliance information"

- Answer the Export Compliance question
- This is required for every submission
- Usually answer "No" for standard apps

### "In-App Purchase not approved"

- Subscriptions must be submitted and approved separately
- Can take 24-48 hours
- Submit subscriptions before app review

---

## 📞 SUPPORT

If you encounter issues:

1. **Apple Developer Forums**: https://developer.apple.com/forums/
2. **App Store Connect Help**: https://developer.apple.com/support/app-store-connect/
3. **Contact Apple**: Via App Store Connect → Help menu
4. **Documentation**: https://developer.apple.com/app-store/submitting/

---

## ✅ SUMMARY

**What automation handles**:
- ✅ App metadata (name, description, keywords, URLs)
- ✅ Screenshots upload (if prepared)
- ✅ Build upload to TestFlight
- ✅ Triggering review submission

**What you MUST do manually**:
- ❗ Set app category (first time)
- ❗ Complete age rating (first time)
- ❗ Add app review information (first time)
- ❗ Configure pricing (first time)
- ❗ Create in-app purchases/subscriptions (if using)
- ❗ Answer export compliance (every release)
- ❗ Confirm content rights (every release)
- ❗ Add screenshots (if not automated)

**Estimated time for first-time manual setup**: 30-45 minutes
**Estimated time for subsequent releases**: 5-10 minutes (just compliance questions)
