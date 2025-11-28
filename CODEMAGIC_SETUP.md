# Codemagic CI/CD Setup Guide for OverTrain

This guide walks you through setting up Codemagic to build iOS (and optionally Android) versions of OverTrain for TestFlight and App Store distribution.

## Prerequisites

- [ ] GitHub/GitLab/Bitbucket repository with your code
- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect access
- [ ] Your app created in App Store Connect

## Step 1: Connect Repository to Codemagic

1. Go to [codemagic.io](https://codemagic.io) and sign up/log in
2. Click **"Add application"**
3. Select your repository provider (GitHub/GitLab/Bitbucket)
4. Authorize Codemagic to access your repositories
5. Select the **OverTrain** repository
6. Click **"Check for configuration file"** (Codemagic will detect `codemagic.yaml`)

## Step 2: Configure iOS Code Signing

### Option A: Automatic Code Signing (Recommended)

1. In Codemagic, go to your app settings
2. Navigate to **"Integrations"** → **"App Store Connect"**
3. Click **"Enable App Store Connect integration"**
4. Follow the wizard to connect your Apple Developer account:
   - Generate an App Store Connect API Key
   - Enter your Issuer ID, Key ID, and download the `.p8` key file
   - Upload the key to Codemagic
5. Save the integration as **"OverTrain"** (must match the name in `codemagic.yaml`)

Codemagic will now automatically manage certificates and provisioning profiles for you!

### Option B: Manual Code Signing

If you prefer manual control:

1. Generate certificates and provisioning profiles in Apple Developer Portal:
   - **Distribution Certificate** (iOS Distribution)
   - **Provisioning Profile** (App Store distribution type)
   - Bundle ID: `app.overtrain.gooonemore`

2. In Codemagic, go to **"Teams"** → **"Code signing identities"** → **"iOS"**
3. Upload your:
   - Certificate (`.p12` file) with password
   - Provisioning profile (`.mobileprovision` file)

## Step 3: Configure Environment Variables

1. In Codemagic, go to your app → **"Environment variables"**
2. Add the following variables:

| Variable | Value | Group | Secure |
|----------|-------|-------|--------|
| `APP_STORE_ID` | Your App Store Connect app ID | - | No |
| `SENTRY_AUTH_TOKEN` | (Optional) Your Sentry token | - | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | - | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | - | Yes |

3. **For Android builds** (optional), add these to an `android_credentials` group:
   - `KEYSTORE_PASSWORD` - Your keystore password (secure)
   - `KEY_ALIAS` - Your key alias
   - `KEY_PASSWORD` - Your key password (secure)

4. Upload your Android keystore:
   - Go to **"Code signing identities"** → **"Android"**
   - Upload `release-keystore.jks`
   - Reference name: `overtrain_keystore`

## Step 4: Update Configuration

1. Edit [codemagic.yaml](codemagic.yaml) and replace:
   ```yaml
   email:
     recipients:
       - your-email@example.com  # Change to your actual email
   ```

2. If you named your App Store Connect integration differently, update:
   ```yaml
   integrations:
     app_store_connect: OverTrain  # Match your integration name
   ```

## Step 5: Trigger Your First Build

### Method 1: Commit and Push

```bash
git add codemagic.yaml CODEMAGIC_SETUP.md
git commit -m "Add Codemagic CI/CD configuration for iOS builds"
git push origin main
```

Codemagic will automatically detect the push and start building!

### Method 2: Manual Trigger

1. Go to Codemagic dashboard
2. Select your app
3. Click **"Start new build"**
4. Select workflow: `ios-capacitor-workflow`
5. Click **"Start new build"**

## Step 6: Monitor Build Progress

1. Build will take approximately 15-25 minutes for iOS
2. You can watch live logs in the Codemagic UI
3. Build stages:
   - ✅ Install Node.js dependencies (~3 min)
   - ✅ Install CocoaPods (~2 min)
   - ✅ Build Next.js app (~5 min)
   - ✅ Sync Capacitor (~1 min)
   - ✅ Build iOS app (~10 min)
   - ✅ Submit to TestFlight (~3 min)

## Step 7: TestFlight

After successful build:

1. Check your email for build notification
2. Go to [App Store Connect](https://appstoreconnect.apple.com)
3. Navigate to **TestFlight** tab
4. Your build should appear under **"iOS Builds"**
5. Add internal/external testers
6. Distribute the build!

## Troubleshooting

### Build Fails: "No provisioning profile found"

- Check that your bundle ID matches: `app.overtrain.gooonemore`
- Verify App Store Connect integration is properly configured
- Ensure provisioning profile is for **App Store** distribution type

### Build Fails: "Command not found: pod"

- Codemagic environment issue - contact support or try `cocoapods: default` in config

### Build Fails: "Build number already exists"

- The auto-increment script failed
- Manually increment build number in `ios/App/App/Info.plist`
- Or remove the "Set build number and version" script temporarily

### TestFlight Upload Fails

- Check your App Store Connect API key has **"Admin"** or **"Developer"** role
- Verify the API key hasn't expired
- Ensure your app is created in App Store Connect with the correct bundle ID

### Environment Variables Not Working

- Make sure you saved them in the correct group
- Check that variable names match exactly (case-sensitive)
- Restart the build after adding new variables

## Build Optimization Tips

1. **Cache Dependencies**: Codemagic automatically caches `node_modules` and CocoaPods
2. **Faster Builds**: Use `mac_mini_m1` or `mac_mini_m2` instance types
3. **Conditional Builds**: Add branch filters to only build on specific branches:
   ```yaml
   triggering:
     events:
       - push
     branch_patterns:
       - pattern: 'main'
         include: true
   ```

## Next Steps

- [ ] Set up automatic builds on every push to `main`
- [ ] Configure Slack/Discord notifications
- [ ] Set up Android workflow for Google Play
- [ ] Add automated testing before builds
- [ ] Configure staging vs production builds

## Resources

- [Codemagic Docs - Capacitor](https://docs.codemagic.io/yaml-quick-start/building-a-capacitor-app/)
- [Codemagic Docs - iOS Code Signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)

---

**Need Help?**
- Codemagic Support: support@codemagic.io
- Codemagic Slack Community: codemagic.io/slack
