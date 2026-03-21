# Fastlane Match Setup Guide

This guide will walk you through setting up Fastlane Match to fix the iOS code signing issue and get your GitHub Actions workflow working.

## What is Fastlane Match?

Fastlane Match creates and manages your iOS certificates and provisioning profiles in a secure, encrypted Git repository. This solves the "No signing certificate 'iOS Distribution' found" error you've been experiencing.

## Prerequisites

- ✅ A Mac with Xcode installed
- ✅ Apple Developer account
- ✅ App Store Connect API credentials (already configured)
- ✅ Access to GitHub

## Step 1: Create a Private Repository for Certificates

1. Go to GitHub and create a new **private** repository
   - Repository name: `overtrain-certificates` (or any name you prefer)
   - **IMPORTANT**: Must be private
   - Don't add README, .gitignore, or license

2. Copy the repository URL:
   ```
   https://github.com/YOUR_USERNAME/overtrain-certificates.git
   ```

## Step 2: Initialize Fastlane Match (Run on Mac)

Open Terminal on your Mac and navigate to your project:

```bash
cd "path/to/OverTrain/ios/App"
bundle exec fastlane match init
```

When prompted:
- **Select storage mode**: Choose `1` for `git`
- **Enter git URL**: Paste your private repo URL from Step 1

This creates a `Matchfile` in `ios/App/fastlane/`.

## Step 3: Generate Certificates (Run on Mac)

Now generate the iOS Distribution certificate and App Store provisioning profile:

```bash
bundle exec fastlane match appstore
```

You'll be prompted for:

1. **Passphrase**: Enter a strong password to encrypt your certificates
   - **IMPORTANT**: Save this password - you'll need it for GitHub secrets
   - Example: Use a password manager to generate a secure passphrase

2. **Apple ID**: Enter your Apple Developer account email

3. **Team ID**: Should auto-detect, or enter your team ID

Match will:
- ✅ Create an iOS Distribution certificate
- ✅ Create an App Store provisioning profile
- ✅ Encrypt them with your passphrase
- ✅ Upload to your private repository
- ✅ Install them on your Mac

## Step 4: Create GitHub Personal Access Token

You need a Personal Access Token for GitHub Actions to access your private certificates repository.

1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
   - Or visit: https://github.com/settings/tokens

2. Click "Generate new token (classic)"

3. Configure the token:
   - **Note**: `Fastlane Match - OverTrain`
   - **Expiration**: Choose 90 days or longer
   - **Scopes**: Check `repo` (Full control of private repositories)

4. Click "Generate token"

5. **IMPORTANT**: Copy the token immediately (you won't see it again)

## Step 5: Create MATCH_GIT_BASIC_AUTHORIZATION Secret

On your Mac Terminal, create the base64 encoded authorization:

```bash
echo -n "YOUR_GITHUB_USERNAME:YOUR_PERSONAL_ACCESS_TOKEN" | base64
```

Replace:
- `YOUR_GITHUB_USERNAME` with your GitHub username
- `YOUR_PERSONAL_ACCESS_TOKEN` with the token from Step 4

Example:
```bash
echo -n "mhdaiman23:ghp_abc123xyz789" | base64
```

Copy the output (the long base64 string).

## Step 6: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **3 new secrets**:

### 1. MATCH_GIT_URL
- **Value**: Your certificates repository URL
- Example: `https://github.com/YOUR_USERNAME/overtrain-certificates.git`

### 2. MATCH_PASSWORD
- **Value**: The passphrase you created in Step 3

### 3. MATCH_GIT_BASIC_AUTHORIZATION
- **Value**: The base64 string from Step 5

## Step 7: Verify GitHub Secrets

You should now have **7 secrets** total in GitHub:

1. ✅ `APPSTORE_API_KEY_ID` (existing)
2. ✅ `APPSTORE_API_PRIVATE_KEY` (existing)
3. ✅ `APPSTORE_ISSUER_ID` (existing)
4. ✅ `IOS_DEVELOPMENT_TEAM` (existing)
5. ✅ `MATCH_GIT_URL` (new)
6. ✅ `MATCH_PASSWORD` (new)
7. ✅ `MATCH_GIT_BASIC_AUTHORIZATION` (new)

## Step 8: Test the Workflow

Trigger the GitHub Actions workflow:

```bash
# Option 1: Push to main branch
git push origin main

# Option 2: Manual trigger
# Go to Actions tab → iOS Build and TestFlight Deployment → Run workflow
```

## What Happens During the Build?

1. GitHub Actions checks out your code
2. Installs dependencies (Node.js, CocoaPods, Ruby)
3. Builds your Next.js app
4. Syncs Capacitor
5. **Match downloads and installs certificates** 🎉
6. Builds the iOS app with proper code signing
7. Exports the .ipa file
8. Uploads to TestFlight

## Troubleshooting

### Error: "Could not download match certificates"
- Check that `MATCH_GIT_URL` points to your private repository
- Verify `MATCH_GIT_BASIC_AUTHORIZATION` is correct base64 encoding
- Ensure your Personal Access Token has `repo` scope

### Error: "Invalid passphrase"
- Verify `MATCH_PASSWORD` matches the passphrase from Step 3

### Error: "Repository not found"
- Ensure the certificates repository is created and accessible
- Check that your Personal Access Token hasn't expired

### Still having issues?
Run Match locally first to verify it works:
```bash
cd "path/to/OverTrain/ios/App"
bundle exec fastlane match appstore --readonly
```

## Important Notes

- 🔒 **Never commit certificates to your main repository**
- 🔒 **Keep your MATCH_PASSWORD secret secure**
- 🔒 **The certificates repository must remain private**
- 📱 **Match can be reused for multiple apps/projects**
- ⏰ **Certificates expire after 1 year** - Match will auto-renew them

## Next Steps

Once the workflow succeeds:
1. Check TestFlight in App Store Connect
2. Your app should appear within 10-15 minutes
3. Add internal testers
4. Start testing!

## Need Help?

If you encounter errors:
1. Check the GitHub Actions logs
2. Look for specific error messages
3. Verify all 7 secrets are correctly configured
4. Test Match locally on your Mac first
