# iOS TestFlight Testing Guide for LiLove

## Build Information
- **Build Number**: 23
- **Bundle ID**: org.lilove.app
- **API URL**: https://lilove.org
- **Environment**: TestFlight Beta

## Prerequisites
1. Install TestFlight app from App Store
2. Accept TestFlight invitation for LiLove
3. Download LiLove build #23
4. Have test account credentials ready

## ⚠️ Critical Production Issue
**Note**: The production API at lilove.org currently has routing issues. Many API endpoints return HTML instead of JSON. Until this is fixed, the iOS app may have limited functionality.

## Testing Checklist

### 1. Authentication Flow ✅
- [ ] **Apple Sign In**
  - Tap "Sign in with Apple"
  - Complete Apple ID authentication
  - Verify redirect back to app
  - Check user profile loads

- [ ] **Google Sign In** 
  - Tap "Sign in with Google"
  - Complete Google authentication
  - Verify redirect back to app
  - Check user profile loads

- [ ] **Email/Password Registration**
  - Tap "Sign up with email"
  - Enter email and password
  - Verify account creation
  - Check automatic login

- [ ] **Email/Password Login**
  - Enter existing credentials
  - Verify successful login
  - Check "Remember me" functionality
  - Test logout and re-login

### 2. Onboarding Flow
- [ ] Welcome screen displays correctly
- [ ] Can set personal goals
- [ ] Can select focus areas
- [ ] Can configure notification preferences
- [ ] Onboarding completion saves properly

### 3. Core Features

#### Dashboard
- [ ] Daily overview loads
- [ ] Progress charts display
- [ ] Quick actions work
- [ ] Motivational quote appears
- [ ] Stats update in real-time

#### Goals Module
- [ ] Create new goal
- [ ] Edit existing goal
- [ ] Set target dates
- [ ] Add milestones
- [ ] Mark goals complete
- [ ] View goal analytics

#### Tasks Module
- [ ] Add new tasks
- [ ] Link tasks to goals
- [ ] Set priorities (low/medium/high)
- [ ] Set due dates
- [ ] Mark tasks complete
- [ ] View task history

#### Habits Module
- [ ] Create new habits
- [ ] Set frequency (daily/weekly)
- [ ] Track habit streaks
- [ ] View habit calendar
- [ ] Record habit completion
- [ ] View habit statistics

### 4. AI Coach Features 🔴 (Currently Broken)
**Note**: These features require API fixes to work

- [ ] Chat with AI mentor
- [ ] Get personalized advice
- [ ] Receive daily insights
- [ ] Goal planning assistance
- [ ] Performance analysis
- [ ] Task recommendations

### 5. Social Features

#### Teams
- [ ] Create new team
- [ ] Join existing team
- [ ] View team members
- [ ] Team chat functionality
- [ ] Share team goals
- [ ] Team leaderboard

#### Challenges
- [ ] Browse available challenges
- [ ] Join challenges
- [ ] Track challenge progress
- [ ] View challenge leaderboard
- [ ] Complete challenge tasks

#### Friends
- [ ] Add friends
- [ ] View friend activity
- [ ] Send encouragement
- [ ] Compare progress
- [ ] Share achievements

### 6. Gamification

#### Achievements
- [ ] View earned badges
- [ ] Track achievement progress
- [ ] Unlock new achievements
- [ ] Share achievements

#### Leaderboards
- [ ] View global ranking
- [ ] Filter by timeframe
- [ ] View friend rankings
- [ ] Track XP progress

#### Avatar & Shop
- [ ] Customize avatar
- [ ] Earn coins
- [ ] Purchase items
- [ ] Apply customizations

### 7. Premium Features 🔴 (Requires Paddle Fix)

#### Subscription
- [ ] View pricing plans
- [ ] Initiate subscription
- [ ] Complete payment
- [ ] Access premium features
- [ ] Cancel subscription

#### Premium Features
- [ ] Unlimited AI coaching
- [ ] Advanced analytics
- [ ] Priority support
- [ ] Custom themes
- [ ] Export data

### 8. Settings & Profile

#### Profile Management
- [ ] Update display name
- [ ] Change profile picture
- [ ] Update bio
- [ ] View statistics
- [ ] Privacy settings

#### App Settings
- [ ] Toggle dark mode
- [ ] Change language (EN/TR)
- [ ] Notification preferences
- [ ] Sound settings
- [ ] Data sync options

### 9. Notifications
- [ ] Enable push notifications
- [ ] Receive goal reminders
- [ ] Achievement notifications
- [ ] Friend activity alerts
- [ ] Daily motivation

### 10. Performance Testing
- [ ] App launches quickly (<3s)
- [ ] Smooth scrolling
- [ ] No UI freezes
- [ ] Images load properly
- [ ] Animations are smooth
- [ ] No memory leaks
- [ ] Battery usage normal

### 11. Offline Functionality
- [ ] App works without internet
- [ ] Data syncs when online
- [ ] Offline mode indicator
- [ ] Queue actions for sync
- [ ] Handle connection errors

### 12. iOS Specific Features
- [ ] Face ID/Touch ID login
- [ ] iOS widgets work
- [ ] Siri shortcuts
- [ ] Share sheet integration
- [ ] Universal links
- [ ] App badges update

## Known Issues

### Critical Issues (Production API)
1. **AI Coach not working** - API returns HTML instead of JSON
2. **Paddle payments broken** - Payment API endpoints return HTML
3. **Many API features limited** - Due to routing configuration issue

### Local Environment Works
All features work correctly when testing against local development server (port 5000).

## Bug Reporting
When reporting bugs, please include:
1. Device model and iOS version
2. Build number (23)
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots if applicable
6. Error messages (if any)

## Test Accounts
Use these test credentials:
- Email: test@example.com
- Password: Test123!

## Support
For issues or questions:
- Development issues: Check server logs
- API issues: See PRODUCTION_DEPLOYMENT_ISSUE.md
- App crashes: Check Sentry dashboard

## Next Steps After Testing
1. Document all issues found
2. Prioritize fixes based on severity
3. Update production deployment configuration
4. Re-test after fixes are deployed
5. Prepare for App Store submission