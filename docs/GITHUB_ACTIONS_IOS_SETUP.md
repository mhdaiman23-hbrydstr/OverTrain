# GitHub Actions iOS Build Setup

This guide explains how to set up GitHub Actions to build your iOS app without needing a Mac machine.

## Overview

GitHub Actions provides **free macOS runners** for public repositories (2000 minutes/month for private repos). This is a great free alternative to Codemagic for building iOS apps.

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Required for code signing and App Store distribution
   - Get your Team ID from [developer.apple.com](https://developer.apple.com/account)

2. **App Store Connect API Key** (for automatic TestFlight uploads)
   - Go to [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Keys
   - Create a new API key with "App Manager" role
   - Download the `.p8` key file
   - Note the Key ID and Issuer ID

3. **Code Signing Certificate and Provisioning Profile**
   - You can generate these manually or let GitHub Actions handle it (see below)

## Setup Steps

### Option 1: Automatic Certificate Management (Recommended)

GitHub Actions can automatically manage certificates using App Store Connect API:

1. **Add Secrets to GitHub Repository**

   Go to your repository → Settings → Secrets and variables → Actions → New repository secret

   Add these secrets:

   ```
   APPSTORE_ISSUER_ID=your-issuer-id-here
   APPSTORE_API_KEY_ID=your-key-id-here
   APPSTORE_API_PRIVATE_KEY=your-p8-key-content-here
   IOS_DEVELOPMENT_TEAM=your-team-id-here
   ```

   **How to get these values:**
   - `APPSTORE_ISSUER_ID`: Found in App Store Connect → Users and Access → Keys (Issuer ID)
   - `APPSTORE_API_KEY_ID`: The Key ID from your API key
   - `APPSTORE_API_PRIVATE_KEY`: The entire contents of your `.p8` file (copy-paste)
   - `IOS_DEVELOPMENT_TEAM`: Your 10-character Team ID from Apple Developer account

2. **Update Workflow File**

   The workflow will automatically:
   - Download/create certificates
   - Download/create provisioning profiles
   - Sign your app
   - Build the IPA

### Option 2: Manual Certificate Management

If you prefer to manage certificates manually:

1. **Export Certificate and Provisioning Profile**

   On a Mac (or use Codemagic/another service to export):
   ```bash
   # Export certificate as .p12
   security find-identity -v -p codesigning
   security export -t identities -f pkcs12 -o certificate.p12 -k ~/Library/Keychains/login.keychain-db
   ```

2. **Add Secrets to GitHub**

   ```
   IOS_CERTIFICATE_BASE64=base64-encoded-p12-file
   IOS_CERTIFICATE_PASSWORD=your-p12-password
   IOS_PROVISIONING_PROFILE_NAME=your-profile-name
   IOS_DEVELOPMENT_TEAM=your-team-id
   ```

   To encode your certificate:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```

## Workflow Features

The workflow (`/.github/workflows/ios-build.yml`) includes:

- ✅ **Automatic builds** on push to main/develop branches
- ✅ **Manual builds** via GitHub Actions UI (workflow_dispatch)
- ✅ **Tag-based builds** for releases (tags starting with `v*`)
- ✅ **Build number management** (auto-increment or timestamp-based)
- ✅ **IPA artifact upload** (downloadable for 30 days)
- ✅ **TestFlight upload** (optional, on main branch pushes)

## Usage

### Automatic Builds

The workflow runs automatically when you:
- Push to `main` or `develop` branches
- Create a tag starting with `v` (e.g., `v1.0.0`)
- Open a pull request to `main`

### Manual Builds

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **iOS Build** workflow
4. Click **Run workflow**
5. Choose build type:
   - `app-store`: For App Store submission
   - `ad-hoc`: For testing on specific devices

### Downloading Builds

1. Go to **Actions** tab
2. Click on the completed workflow run
3. Scroll down to **Artifacts**
4. Download `ios-ipa` artifact
5. Extract the `.ipa` file

## TestFlight Upload

To enable automatic TestFlight uploads, you need to:

1. **Install fastlane** (add to workflow):
   ```yaml
   - name: Install fastlane
     run: sudo gem install fastlane
   ```

2. **Configure fastlane** (create `fastlane/Fastfile`):
   ```ruby
   lane :beta do
     upload_to_testflight(
       api_key_path: "auth_key.json",
       skip_waiting_for_build_processing: true
     )
   end
   ```

3. **Add upload step** to workflow:
   ```yaml
   - name: Upload to TestFlight
     run: fastlane beta
     env:
       APP_STORE_CONNECT_API_KEY_PATH: auth_key.json
   ```

## Troubleshooting

### Build Fails with Code Signing Error

- Verify your Team ID is correct
- Check that provisioning profile matches bundle identifier
- Ensure certificate hasn't expired

### CocoaPods Installation Fails

- The workflow runs `pod install --repo-update` which should handle updates
- If issues persist, check Podfile syntax

### Build Timeout

- Default timeout is 120 minutes
- Increase in workflow: `timeout-minutes: 180`

### Xcode Version Issues

- Update `XCODE_VERSION` in workflow to match your requirements
- Check iOS deployment target in Podfile matches Xcode version

## Cost Comparison

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **GitHub Actions** | 2000 min/month (private) | $0.008/min after |
| **Codemagic** | 500 min/month | $95/month (unlimited) |
| **EAS Build** | Limited free builds | $29/month (unlimited) |

For most projects, GitHub Actions free tier is sufficient!

## Next Steps

1. Set up the secrets in your GitHub repository
2. Push a commit to trigger the workflow
3. Check the Actions tab to see the build progress
4. Download the IPA from artifacts

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/code_signing_services)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)

