# iOS App Store Submission Guide

This guide covers the steps needed to submit OverTrain to the Apple App Store.

## Prerequisites

1. Apple Developer Account ($99/year)
2. Mac with Xcode installed (required for iOS development)
3. Valid Apple Developer certificates

## 1. Apple Developer Portal Setup

### Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles
3. Create new Identifier:
   - Platform: iOS
   - Bundle ID: `app.overtrain.gooonemore`
   - Description: "OverTrain: Go One More"
4. Enable capabilities:
   - Push Notifications
   - Background Modes

### Create Provisioning Profiles

1. Development Profile (for testing)
2. Distribution Profile (for App Store)

### Create Push Notification Key

1. Go to Keys section
2. Create new key with APNs capability
3. Download the `.p8` file (store securely!)
4. Note the Key ID and Team ID

## 2. Xcode Project Configuration

### Open the project:

```bash
npm run build:native
npx cap sync ios
npx cap open ios
```

### Configure in Xcode:

1. **Select the App target**
2. **General tab**:
   - Display Name: "OverTrain"
   - Bundle Identifier: `app.overtrain.gooonemore`
   - Version: 1.0.0
   - Build: 1

3. **Signing & Capabilities tab**:
   - Team: Select your Apple Developer team
   - Signing Certificate: Distribution
   - Add capabilities:
     - Push Notifications
     - Background Modes (Background fetch, Remote notifications)

4. **Build Settings tab**:
   - iOS Deployment Target: 14.0 (or higher)

## 3. App Icons

Create app icons in the following sizes:

| Size | Scale | Filename |
|------|-------|----------|
| 20pt | 2x, 3x | Icon-20@2x.png, Icon-20@3x.png |
| 29pt | 2x, 3x | Icon-29@2x.png, Icon-29@3x.png |
| 40pt | 2x, 3x | Icon-40@2x.png, Icon-40@3x.png |
| 60pt | 2x, 3x | Icon-60@2x.png, Icon-60@3x.png |
| 1024pt | 1x | Icon-1024.png (App Store) |

Tools:
- [App Icon Generator](https://appicon.co/)
- [Icon Kitchen](https://icon.kitchen/)

Place icons in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Update `Contents.json` to reference all icons.

## 4. Build for App Store

### Archive the app:

1. In Xcode, select "Any iOS Device" as the target
2. Product → Archive
3. Wait for archive to complete
4. Organizer window opens automatically

### Validate the archive:

1. Select the archive in Organizer
2. Click "Validate App"
3. Select distribution options:
   - Upload to App Store Connect
   - Include bitcode: No (Capacitor apps)
   - Include symbols: Yes
4. Review and click Validate

### Upload to App Store Connect:

1. Click "Distribute App"
2. Select "App Store Connect"
3. Select "Upload"
4. Follow prompts to complete upload

## 5. App Store Connect Setup

### Create App Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "+" → "New App"
3. Fill in:
   - Platforms: iOS
   - Name: "OverTrain: Go One More"
   - Primary Language: English (US)
   - Bundle ID: app.overtrain.gooonemore
   - SKU: overtrain-ios-001

### App Information

**Category**: Health & Fitness

**Subtitle** (30 chars max):
```
Track Workouts. Get Stronger.
```

**Promotional Text** (170 chars max):
```
Join thousands of lifters tracking their gains. Smart workout logging, progress analytics, and proven strength programs to help you reach your fitness goals.
```

**Description**:
```
OverTrain: Go One More is your ultimate workout companion for building strength and achieving your fitness goals.

KEY FEATURES:

💪 SMART WORKOUT TRACKING
• Log sets, reps, and weights with intuitive controls
• Track progress on every exercise  
• Rest timers with haptic feedback

📊 DETAILED ANALYTICS
• Volume and load tracking over time
• Personal record detection
• Consistency heatmaps and insights

🏋️ CURATED PROGRAMS
• StrongLifts 5x5 for beginners
• Push/Pull/Legs splits
• Upper/Lower body routines
• Custom program builder

📱 WORKS OFFLINE
• Full offline support
• Syncs automatically when connected
• Never lose your workout data

🎯 PROGRESSION TRACKING
• Automatic weight recommendations
• Deload suggestions
• Program completion tracking

Built for lifters who want to get stronger, track progress, and stay motivated. Whether you're a beginner or experienced lifter, OverTrain helps you go one more rep.

Download now and start your strength journey!
```

**Keywords** (100 chars max):
```
workout,fitness,gym,strength,training,exercise,weight,lifting,tracker,log,progress,program
```

**Privacy Policy URL**: https://overtrain.app/privacy-policy

**Support URL**: https://overtrain.app/support

### Screenshots

Required screenshot sizes:
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1284 x 2778)
- iPhone 5.5" (1242 x 2208)
- iPad Pro 12.9" (2048 x 2732) - if supporting iPad

Recommended screenshots:
1. Dashboard overview
2. Workout logging in action
3. Analytics/progress charts
4. Program selection
5. Exercise library

Use iPhone Simulator or real devices to capture.

### App Preview Videos (Optional)

- 15-30 seconds
- Showcase key features
- No text/voice required

### App Review Information

**Contact Information**:
- First Name: [Your name]
- Last Name: [Your name]
- Phone: [Your phone]
- Email: [Your email]

**Demo Account** (if login required):
- Username: demo@overtrain.app
- Password: [demo password]

**Notes for Reviewer**:
```
This is a workout tracking app. Key features to test:
1. Create an account or use the demo account
2. Select a workout program
3. Start a workout and log some sets
4. View analytics after completing a workout
5. Test offline mode by enabling airplane mode

The app requires a Supabase backend for authentication and data sync.
```

## 6. App Review Submission

### Pre-Submission Checklist

- [ ] All app metadata filled in
- [ ] Screenshots uploaded for all device sizes
- [ ] App icon meets requirements (1024x1024, no alpha)
- [ ] Privacy policy URL active
- [ ] Support URL active
- [ ] No placeholder content
- [ ] Test on multiple devices
- [ ] Test offline functionality
- [ ] Test push notifications

### Submit for Review

1. Select the build to submit
2. Add release notes for this version
3. Select phased release or immediate release
4. Submit for Review

### Review Timeline

- Initial review: 24-48 hours typically
- May receive questions/rejections
- Respond promptly to any issues

## 7. Common Rejection Reasons

### Metadata Issues
- Missing privacy policy
- Inaccurate screenshots
- Placeholder content

### Functionality Issues
- App crashes
- Features not working
- Login issues

### Guideline Violations
- Incomplete app (must have value without login)
- Misleading descriptions
- Missing permissions explanations

## 8. Push Notifications Setup (Firebase)

### Configure Firebase for iOS

1. In Firebase Console, add iOS app
2. Download `GoogleService-Info.plist`
3. Place in `ios/App/App/GoogleService-Info.plist`
4. Add to Xcode project (drag into App folder)

### Upload APNs Key to Firebase

1. In Firebase → Project Settings → Cloud Messaging
2. Upload the `.p8` APNs key
3. Enter Key ID and Team ID

## 9. Version Updates

For updates:

1. Increment version in Xcode:
   - Version: 1.0.1 (user-visible)
   - Build: 2 (always increment)

2. Build and upload:
```bash
npm run build:native
npx cap sync ios
# Then archive and upload in Xcode
```

3. Submit new version for review

## 10. TestFlight Beta Testing

Before App Store release, use TestFlight:

1. Upload build to App Store Connect
2. Add internal testers (up to 100)
3. Add external testers (up to 10,000)
4. Collect feedback
5. Fix issues before public release

## Useful Commands

```bash
# Sync web assets to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Clean build
cd ios/App && xcodebuild clean

# List simulators
xcrun simctl list devices

# Run on simulator
npx cap run ios --target "iPhone 15 Pro"
```

## Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [TestFlight Guide](https://developer.apple.com/testflight/)

