# Android Play Store Submission Guide

This guide covers the steps needed to submit OverTrain to the Google Play Store.

## Prerequisites

1. Google Play Developer Account ($25 one-time fee)
2. Android Studio installed
3. App signing key (generated below)

## 1. Generate Signing Key

Create a release keystore for signing your app:

```bash
keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias overtrain
```

**IMPORTANT**: 
- Store this keystore file securely - you need it for all future updates
- Never commit the keystore or passwords to git
- Back up the keystore to a secure location

## 2. Configure Signing in Gradle

Edit `android/app/build.gradle` and uncomment the signing configuration:

```groovy
signingConfigs {
    release {
        storeFile file("release-keystore.jks")
        storePassword "your_store_password"
        keyAlias "overtrain"
        keyPassword "your_key_password"
    }
}

buildTypes {
    release {
        // ...
        signingConfig signingConfigs.release
    }
}
```

For CI/CD, use environment variables:

```groovy
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_FILE") ?: "release-keystore.jks")
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias System.getenv("KEY_ALIAS") ?: "overtrain"
        keyPassword System.getenv("KEY_PASSWORD") ?: ""
    }
}
```

## 3. Build Release APK/Bundle

### Build the web app first:

```bash
npm run build:native
npx cap sync android
```

### Build AAB (Android App Bundle) - Recommended:

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Build APK (for direct distribution):

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## 4. Test the Release Build

```bash
# Install release APK on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Or use bundletool for AAB
bundletool build-apks --bundle=app-release.aab --output=app.apks
bundletool install-apks --apks=app.apks
```

## 5. Play Store Console Setup

### Create App Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - App name: "OverTrain: Go One More"
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free

### App Content

Required information:

**Privacy Policy**: 
- URL: https://overtrain.app/privacy-policy

**App Access**:
- Select "All or some functionality is restricted"
- Provide test account credentials

**Ads Declaration**:
- Does not contain ads (if applicable)

**Content Rating**:
- Complete the IARC questionnaire
- Expected rating: Everyone

**Target Audience**:
- Select age groups (typically 13+)
- Not designed for children

**COVID-19 Contact Tracing**:
- Select "No" (not a contact tracing app)

**Data Safety**:
- Data collected: 
  - Email (account management)
  - Name (personalization)
  - Fitness data (app functionality)
- Data shared: None
- Security: Data encrypted in transit

### Store Listing

**Short Description** (80 chars max):
```
Track workouts, build strength programs, and crush your fitness goals.
```

**Full Description** (4000 chars max):
```
OverTrain: Go One More is your ultimate workout companion for building strength and achieving your fitness goals.

KEY FEATURES:

💪 SMART WORKOUT TRACKING
- Log sets, reps, and weights with intuitive controls
- Track progress on every exercise
- Rest timers with haptic feedback

📊 DETAILED ANALYTICS
- Volume and load tracking over time
- Personal record detection
- Consistency heatmaps and insights

🏋️ CURATED PROGRAMS
- StrongLifts 5x5 for beginners
- Push/Pull/Legs splits
- Upper/Lower body routines
- Custom program builder

📱 WORKS OFFLINE
- Full offline support
- Syncs automatically when connected
- Never lose your workout data

🎯 PROGRESSION TRACKING
- Automatic weight recommendations
- Deload suggestions
- Program completion tracking

Built for lifters who want to get stronger, track progress, and stay motivated. Whether you're a beginner or experienced lifter, OverTrain helps you go one more rep.

Download now and start your strength journey!
```

### Graphics Assets

**App Icon**: 512x512 PNG (already in mipmap folders)

**Feature Graphic**: 1024x500 PNG
- Create in design tool (Figma, Canva)
- Show app interface and branding

**Screenshots** (required):
- Phone: 1080x1920 or 1080x2160 (at least 4)
- Tablet 7": 1200x1920 (optional)
- Tablet 10": 1600x2560 (optional)

Take screenshots of:
1. Dashboard/home screen
2. Workout logging in action
3. Analytics/progress charts
4. Program selection
5. Exercise library

## 6. Release Management

### Internal Testing (recommended first)
1. Create internal testing track
2. Upload AAB
3. Add tester email addresses
4. Testers get early access

### Closed Testing (beta)
1. Create closed testing track
2. Invite beta testers via email or Google Groups
3. Gather feedback before public release

### Production Release
1. Review all app content is complete
2. Submit AAB to production track
3. Complete declaration forms
4. Submit for review (takes 1-3 days)

## 7. Version Updates

For updates, increment version in `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2  // Increment for each release
    versionName "1.0.1"  // User-facing version
}
```

Then:

```bash
npm run build:native
npx cap sync android
cd android && ./gradlew bundleRelease
```

Upload new AAB to Play Console.

## 8. Firebase Configuration (for Push Notifications)

1. Create Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Add Android app with package name `app.overtrain.gooonemore`
3. Download `google-services.json`
4. Place in `android/app/google-services.json`
5. Build and test notifications

## Troubleshooting

### Build fails with signing error
- Verify keystore path and passwords
- Check keystore alias matches configuration

### App crashes on startup
- Check logcat: `adb logcat | grep -i overtrain`
- Verify web assets are synced: `npx cap sync android`

### Notifications not working
- Verify `google-services.json` is present
- Check Firebase project configuration
- Ensure notification permissions granted

## Useful Commands

```bash
# Sync web assets to Android
npx cap sync android

# Open Android Studio
npx cap open android

# View device logs
adb logcat | grep -i overtrain

# List connected devices
adb devices

# Install APK
adb install -r app-release.apk
```

## Resources

- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Content Rating](https://support.google.com/googleplay/android-developer/answer/9859655)
- [Store Listing Guidelines](https://support.google.com/googleplay/android-developer/answer/9893335)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)

