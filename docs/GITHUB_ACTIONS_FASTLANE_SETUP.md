# GitHub Actions + Fastlane + TestFlight Complete Setup Guide

This guide walks you through setting up automatic iOS builds and TestFlight deployment using GitHub Actions and Fastlane.

## Overview

This setup provides:
- ✅ **Automatic iOS builds** on every push to main/develop
- ✅ **Automatic TestFlight deployment** when pushing to main
- ✅ **Manual builds** via GitHub Actions UI
- ✅ **Ad-hoc builds** for device testing
- ✅ **Free builds** using GitHub's macOS runners

## Prerequisites

- Apple Developer Account ($99/year)
- GitHub repository with your iOS project
- Your app bundle ID: `app.overtrain.gooonemore`

---

## Step 1: Create App Store Connect API Key

### 1A: Go to App Store Connect
1. Visit [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Login with your Apple Developer account
3. Click your name/profile (top right) → **Users and Access**

### 1B: Create API Key
1. Click **Keys** tab
2. Click **"+"** button to create new key
3. Fill in:
   - **Name**: `GitHub Actions Fastlane`
   - **Access**: Select **App Manager** role (this gives full permissions)
4. Click **Generate**

### 1C: Save Your Credentials
1. **Download the `.p8` file** immediately (you can only download once!)
2. **Note the Key ID** (shown on screen, 10 characters like "ABC1234567")
3. **Note the Issuer ID** (shown at top of Keys page, UUID format)
4. **Save the `.p8` file** somewhere safe on your computer

---

## Step 2: Set Up GitHub Secrets

### 2A: Go to Your GitHub Repository
1. Go to your repo on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

### 2B: Add These Secrets (create each one)

#### Secret 1: APPSTORE_ISSUER_ID
- **Name**: `APPSTORE_ISSUER_ID`
- **Value**: Your Issuer ID from Step 1C

#### Secret 2: APPSTORE_API_KEY_ID  
- **Name**: `APPSTORE_API_KEY_ID`
- **Value**: Your Key ID from Step 1C

#### Secret 3: APPSTORE_API_PRIVATE_KEY
- **Name**: `APPSTORE_API_PRIVATE_KEY`
- **Value**: Open the `.p8` file you downloaded, copy the ENTIRE content (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

#### Secret 4: IOS_DEVELOPMENT_TEAM
- **Name**: `IOS_DEVELOPMENT_TEAM`
- **Value**: Your 10-character Team ID from [Apple Developer Portal](https://developer.apple.com/account)

---

## Step 3: Verify Your App Setup

### 3A: Check Bundle ID in Apple Developer
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Confirm `app.overtrain.gooonemore` exists
4. If not, create it:
   - Click **"+"** → **App IDs** → **App**
   - Bundle ID: `app.overtrain.gooonemore`
   - Description: "OverTrain: Go One More"
   - Click **Continue** → **Register**

### 3B: Check App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps**
3. Confirm your app exists with the same bundle ID
4. If not, create it with the same bundle ID

---

## Step 4: Files Created for You

The following files have been automatically created in your project:

### 4A: Fastlane Configuration
- **File**: `ios/App/fastlane/Fastfile`
- **Purpose**: Defines build lanes for TestFlight and Ad-hoc deployment
- **Features**: Automatic changelog from git commits, proper signing

### 4B: Ruby Dependencies
- **File**: `ios/App/Gemfile`
- **Purpose**: Specifies Fastlane as a Ruby gem
- **Auto-managed**: GitHub Actions will install dependencies

### 4C: GitHub Actions Workflow
- **File**: `.github/workflows/ios-build.yml`
- **Purpose**: Automates the entire build and deployment process
- **Triggers**: Push to main/develop, tags, manual runs

---

## Step 5: Test Your Setup

### 5A: Commit Your Changes
```bash
git add .
git commit -m "Setup GitHub Actions with Fastlane for TestFlight"
git push origin main
```

### 5B: Watch the Build
1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see the "iOS Build and TestFlight Deployment" workflow running
4. Click on the workflow to watch progress

### 5C: Check TestFlight
1. After the build succeeds, go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **TestFlight** → **iOS**
3. You should see your new build processing

---

## How It Works

### Automatic Triggers
- **Push to main**: Builds and uploads to TestFlight
- **Push to develop**: Builds for testing
- **Create tag (v1.0.0)**: Builds for release
- **Pull request**: Builds for validation

### Manual Triggers
1. Go to **Actions** tab
2. Select **iOS Build and TestFlight Deployment**
3. Click **Run workflow**
4. Choose build type:
   - `beta`: Uploads to TestFlight
   - `adhoc`: Creates IPA for device testing

### Build Process
1. **Setup**: Node.js, Ruby, Xcode
2. **Dependencies**: npm, CocoaPods, Fastlane
3. **Build**: Next.js app, Capacitor sync
4. **Sign**: Automatic code signing via App Store Connect API
5. **Deploy**: TestFlight or create IPA artifact

---

## What You Get

### ✅ Features Included

#### Automatic TestFlight Deployment
- Builds upload automatically to TestFlight
- Changelog from git commit messages
- No manual intervention needed

#### Code Signing Automation
- Uses App Store Connect API for certificates
- No need to manage provisioning profiles manually
- Automatic profile updates

#### Build Artifacts
- IPA files available for download (30 days)
- Build logs for debugging
- Multiple build types supported

#### Manual Controls
- Trigger builds on-demand
- Choose between TestFlight and Ad-hoc builds
- Build from any branch or tag

### 🎯 Use Cases Solved

#### For Development Team
- **Automatic builds** on every commit
- **TestFlight updates** without manual uploads
- **Consistent build process** across team

#### For Release Process
- **Tag-based releases** (v1.0.0, v1.1.0)
- **Release candidate testing** via TestFlight
- **Automated version management**

#### For Testing
- **Ad-hoc builds** for device testing
- **Pull request builds** for validation
- **Artifact downloads** for local testing

---

## Troubleshooting

### Common Issues and Solutions

#### Build Fails with "No signing certificate"
**Problem**: GitHub Actions can't sign your app
**Solution**:
1. Verify your Team ID is correct in secrets
2. Check that bundle ID exists in Apple Developer
3. Ensure API key has "App Manager" role
4. Confirm app exists in App Store Connect

#### Fastlane Gem Installation Fails
**Problem**: Ruby gems don't install properly
**Solution**: The workflow uses Ruby setup action with caching, this should resolve automatically. If it persists, check the workflow logs.

#### TestFlight Upload Fails
**Problem**: Build succeeds but TestFlight upload fails
**Solution**:
1. Check that your app exists in App Store Connect
2. Verify API key permissions
3. Ensure bundle ID matches exactly
4. Check Team ID in secrets

#### Build Timeout
**Problem**: Build takes longer than 120 minutes
**Solution**: Increase timeout in workflow:
```yaml
timeout-minutes: 180
```

#### CocoaPods Issues
**Problem**: Pod install fails
**Solution**: The workflow runs `pod install --repo-update` which should handle most issues. Check your Podfile for syntax errors.

---

## Advanced Customization

### Adding Slack Notifications
```yaml
- name: Notify Slack on Success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: success
    channel: '#ios-builds'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Automatic App Store Submission
Add to Fastfile:
```ruby
lane :release do
  upload_to_app_store(
    skip_metadata: false,
    skip_screenshots: true,
    precheck_include_in_app_purchases: false
  )
end
```

### Multiple Environments
```ruby
lane :beta_staging do
  upload_to_testflight(
    groups: ['Staging Testers'],
    changelog: changelog_from_git_commits
  )
end
```

---

## Cost Analysis

### GitHub Actions
- **Free tier**: 2000 minutes/month for private repos
- **Typical iOS build**: ~20-30 minutes
- **Cost**: $0 for most projects

### Alternative Services
| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **GitHub Actions** | 2000 min/month | $0.008/min after |
| **Codemagic** | 500 min/month | $95/month |
| **Bitrise** | 10 builds/month | $40/month |

---

## Next Steps

### Immediate Actions
1. **Complete the setup** by adding GitHub secrets
2. **Test with a commit** to verify everything works
3. **Add team members** to TestFlight in App Store Connect

### Future Enhancements
1. **Add notifications** (Slack, Discord, Email)
2. **Set up release automation** for App Store
3. **Add testing automation** (unit tests, UI tests)
4. **Configure environment-specific builds**

### Maintenance
1. **Monitor build times** and usage
2. **Update dependencies** (Node.js, Ruby gems, CocoaPods)
3. **Rotate API keys** periodically for security
4. **Backup build artifacts** for compliance

---

## Support Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fastlane Documentation](https://docs.fastlane.tools)
- [Apple Developer Documentation](https://developer.apple.com/documentation)

### Common Issues
- Check the **Actions** tab for detailed build logs
- Review **TestFlight** status in App Store Connect
- Monitor **bundle ID** configuration across services

### Getting Help
- GitHub Actions: Check workflow logs
- Fastlane: Run locally with `fastlane [lane_name]`
- Apple Developer: Review code signing certificates

---

## Summary

You now have a complete iOS build and deployment system that:

1. **Builds automatically** on every commit
2. **Deploys to TestFlight** without manual intervention
3. **Provides manual controls** for special cases
4. **Costs nothing** for typical usage
5. **Scales with your team** and project needs

The setup is production-ready and follows industry best practices for iOS CI/CD.

🎉 **Your iOS development workflow is now fully automated!**
