# Release Keystore Setup Guide for OverTrain

## ✅ What We've Accomplished

1. **Fixed Native Build Script**: Created a working `scripts/build-native.js` that handles API routes correctly
2. **Configured Capacitor**: Updated `capacitor.config.ts` with keystore path and alias
3. **Moved Keystore**: Your existing keystore is now properly placed at `android/app/release-keystore.jks`
4. **Synced Android**: Successfully synced web assets with Android platform

## ⚠️ Current Issue: Java/Gradle Compatibility

The build is failing because you have Java 25.0.1 but Gradle 8.13, which has a maximum compatible Java version of 23.

### The Problem:
- **Your Java**: 25.0.1 (too new)
- **Gradle**: 8.13 (max compatible: Java 23)
- **Need**: Java 17-23 OR upgrade Gradle

### Solution Options:

#### Option 1: Upgrade Gradle to Support Java 25 (Easiest)
Since you have Java 25.0.1, upgrade Gradle to a version that supports it:

1. **Edit `android/gradle/wrapper/gradle-wrapper.properties`**:
   ```properties
   # Update to Gradle 8.5+ which supports Java 25
   distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
   ```

2. **Sync Android Studio**:
   - Click "Sync Project with Gradle Files"
   - Wait for sync to complete

#### Option 2: Downgrade Java to 17-23 (Recommended)
1. Download and install Java 17 from: https://adoptium.net/
2. Update your JAVA_HOME environment variable to point to Java 17
3. Restart your terminal and IDE

#### Option 2: Use Android Studio's JDK
Android Studio comes with Java 17:
```bash
# Set JAVA_HOME to Android Studio's JDK
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
```

#### Option 3: Configure Android Studio to Use New JDK (Most Common)
After updating environment variables, configure Android Studio:

1. **Open Android Studio**
2. **Go to File → Settings** (or **Android Studio → Settings** on Mac)
3. **Navigate to Build, Execution, Deployment → Build Tools → Gradle**
4. **Under "Gradle JDK", select your Java 17 installation**:
   - Click the dropdown menu
   - Select "Add JDK..." if Java 17 isn't listed
   - Navigate to your Java 17 installation (usually `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`)
   - Select the JDK folder
5. **Click Apply → OK**
6. **Invalidate Caches**:
   - Go to **File → Invalidate Caches**
   - Select **Invalidate and Restart**
   - Wait for Android Studio to restart

7. **Verify JDK Selection**:
   - Open **Settings → Build Tools → Gradle** again
   - Confirm "Gradle JDK" shows Java 17
   - You should see version number 17.x.x

8. **Sync Project**:
   - Click **Sync Project with Gradle Files** in the toolbar
   - Wait for sync to complete (you'll see progress bar at bottom)

#### Option 4: Project-Specific JDK (Alternative)
1. **Close Android Studio**
2. **Navigate to project folder**: `S:\Program Files\OverTrain\android`
3. **Create/Edit `gradle.properties` file**:
   ```properties
   # Force Java 17 for this project
   org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.x.x-hotspot
   ```
4. **Open Android Studio** - it will use the specified JDK
5. **Click "Sync Now"** when prompted

#### Option 5: Gradle Wrapper JDK (Advanced)
1. **Edit `android/gradle/wrapper/gradle-wrapper.properties`**:
   ```properties
   distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip
   ```
2. **Set GRADLE_JAVA_HOME environment variable**:
   ```bash
   export GRADLE_JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"
   ```

## 🔍 Verify Java Version in Android Studio

1. **Open Terminal in Android Studio** (View → Tool Windows → Terminal)
2. **Run**: `java -version`
3. **Should show**: `openjdk version "17.x.x"`

4. **Check Gradle JDK**:
   - **Settings → Build Tools → Gradle**
   - **Look at "Gradle JDK" field**
   - **Should display Java 17 path**

#### Option 3: Downgrade Android Gradle Plugin
Update `android/build.gradle` to use an older AGP version that supports Java 11.

## 🔐 Keystore Configuration

Your keystore is now configured:
- **Path**: `android/app/release-keystore.jks`
- **Alias**: `keystore`
- **Location**: Properly placed in Android app directory

## 🚀 Build Commands (After Java Fix)

### Build Release APK
```bash
cd android
./gradlew assembleRelease
```

### Build Release Bundle (AAB - Recommended for Play Store)
```bash
cd android
./gradlew bundleRelease
```

### Output Locations
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`

## 🔒 Security Best Practices

### Password Management
You'll be prompted for keystore passwords during build. For automation:

1. **Environment Variables (Recommended)**:
```bash
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_PASSWORD="your_key_password"
```

2. **gradle.properties** (Less secure, local only):
```properties
KEYSTORE_PASSWORD=your_keystore_password
KEY_PASSWORD=your_key_password
```

### Backup Strategy
🚨 **CRITICAL**: Your keystore is IRREPLACEABLE!

1. **Multiple Backups**:
   - Cloud storage (Google Drive, Dropbox)
   - External hard drive
   - Secure password manager

2. **Backup Locations**:
   - Primary: Cloud storage
   - Secondary: External drive
   - Tertiary: Password manager attachment

3. **Test Backup**: 
   - Try building from a backup location
   - Verify passwords are documented

## 📱 Testing Your Release Build

1. **Install APK**:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

2. **Test Critical Features**:
   - App launches correctly
   - Login works
   - Core functionality works offline
   - No debug console errors

## 🛠️ Complete Build Workflow

```bash
# 1. Build web app for native
npm run build:native

# 2. Sync with Android
npx cap sync android

# 3. Build release APK/AAB
cd android && ./gradlew bundleRelease

# 4. Test the build
adb install android/app/build/outputs/bundle/release/app-release.aab

# 5. Deploy to Play Store
# Upload app-release.aab to Google Play Console
```

## 📋 Before Publishing Checklist

- [ ] Java version updated to 17+
- [ ] Keystore backups created (3+ locations)
- [ ] Release build tested on device
- [ ] App signing verified in Play Console
- [ ] Version numbers incremented
- [ ] Store listing complete
- [ ] Privacy policy URL set
- [ ] Content rating questionnaire completed

## 🔧 Troubleshooting

### Build Fails with "Signing Error"
- Verify keystore path in `capacitor.config.ts`
- Check keystore alias matches exactly
- Ensure passwords are correct

### "Keystore Not Found" Error
- Confirm keystore is at `android/app/release-keystore.jks`
- Check file permissions
- Verify the keystore isn't corrupted

### "Invalid Keystore Format" Error
- Ensure keystore wasn't edited or corrupted
- Try with a fresh keystore if needed
- Check if keystore is password protected

## 📞 Support

If you encounter issues:
1. Check Android Studio's Build logs
2. Review `android/build/outputs/logs/`
3. Verify keystore integrity with `keytool -list -v -keystore android/app/release-keystore.jks`

Your release keystore setup is almost complete! The main remaining step is updating to Java 17 for successful builds.
