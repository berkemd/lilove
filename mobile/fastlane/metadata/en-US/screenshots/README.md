# LiLove App Store Screenshots

This directory contains screenshots for the App Store listing.

## Required Screenshot Sizes

### iPhone 6.5" Display (iPhone 14 Pro Max, iPhone 13 Pro Max, etc.)
- Resolution: 1284 x 2778 pixels
- Directory: `iphone65/`
- Required: 3-10 screenshots

### iPhone 5.5" Display (iPhone 8 Plus, iPhone 7 Plus, etc.) 
- Resolution: 1242 x 2208 pixels
- Directory: `iphone55/`
- Required: 3-10 screenshots (can reuse if app supports older devices)

## Screenshot Naming Convention

Screenshots should be named in the order they'll appear:
- `01-screenshot.png` (or .jpg)
- `02-screenshot.png`
- `03-screenshot.png`
- etc.

## What to Showcase

1. **Main Dashboard** - Show the app's main interface
2. **Goal Setting** - Show how users create and track goals
3. **Habit Tracking** - Display the habit tracking feature
4. **AI Coaching** - Show the AI mentor chat interface
5. **Analytics** - Display progress charts and insights
6. **Social Features** - Show teams or challenges
7. **Gamification** - Display achievements, badges, or avatar

## Tips for Great Screenshots

- Use actual app content (real or realistic mock data)
- Show the app in use, not just empty screens
- Consider adding text overlays to highlight features
- Use high contrast and clear UI elements
- Show diversity in user examples
- Ensure screenshots are well-lit and clear

## Tools for Screenshot Generation

- **Expo Development Build**: Take screenshots directly from a real device
- **iOS Simulator**: Use Cmd+S to capture screenshots
- **Fastlane Snapshot**: Automate screenshot generation (advanced)
- **Design Tools**: Create promotional screenshots with Figma, Sketch, or Photoshop

## Missing Screenshots?

If you don't have screenshots yet:

1. Build the app on a physical device or simulator
2. Navigate through key features
3. Capture screenshots (Cmd+S on simulator, volume+power on device)
4. Transfer to this directory with proper naming
5. Run `fastlane upload_screenshots` to upload to App Store Connect

Alternatively, you can upload screenshots manually via App Store Connect web interface.
