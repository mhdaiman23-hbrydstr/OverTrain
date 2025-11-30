# Codemagic Setup Guide - Step by Step

## Prerequisites �o.

You already have:
- �o. `codemagic.yaml` configured in your repo
- �o. Bundle ID: `app.overtrain.gooonemore`
- �o. Apple Developer account credentials (you can log in to Apple Developer & App Store Connect)
- �o. (Optional) old App Store Connect API keys / GitHub secrets — **OK if you deleted them**

This guide assumes you **removed everything from App Store Connect and kept only the bundle identifier**.  
We will:
- Re-create your App Store Connect API key
- Hook it up to Codemagic
- Let Codemagic handle certificates and provisioning automatically

For a longer, ultra-detailed version, see `STEP_BY_STEP_CODEMAGIC.md`.

---

## Step 0: Make Sure the App Exists in App Store Connect

If you deleted the **app record** in App Store Connect, you need to re-create it once before you can see TestFlight builds.

1. Go to https://appstoreconnect.apple.com
2. Click **"Apps"**
3. Click the **"+"** button ��' **"New App"**
4. Fill in:
   - **Platforms**: iOS
   - **Name**: `OverTrain: Go One More`
   - **Primary Language**: `English (U.S.)`
   - **Bundle ID**: choose `app.overtrain.gooonemore` from the dropdown
   - **SKU**: `overtrain-001` (or any unique string)
5. Click **"Create"**

�o. **Checkpoint**: You see an app page with title **"OverTrain: Go One More"**.

If the bundle ID is missing from the dropdown, stop and tell me.

---

## Step 1: Sign Up & Connect Repository

### 1.1 Create Codemagic Account
1. Go to https://codemagic.io/signup
2. Click **"Sign up with GitHub"**
3. Authorize Codemagic to access your GitHub account

### 1.2 Add Your Repository
1. On Codemagic dashboard, click **"Add application"**
2. Select **"GitHub"** as the source
3. Find and select your repository: `OverTrain` (or your actual repo)
4. Click **"Finish: Add application"**

�o. **Checkpoint**: Codemagic shows your app and detects `codemagic.yaml` with workflow `ios-capacitor-workflow`.

---

## Step 2: Create App Store Connect API Key & Integration

This is **CRITICAL** – without this, code signing and TestFlight upload will fail.

### 2.1 Create (or Recreate) Your App Store Connect API Key

1. Go to https://appstoreconnect.apple.com
2. Click your name (top right) ��' **"Users and Access"**
3. Click the **"Integrations"** tab
4. Under **"App Store Connect API"**, click the **"+"** button
5. Fill in:
   - **Name**: `Codemagic CI/CD`
   - **Access** / **Role**: **App Manager**
6. Click **"Generate"**

On the success screen:
- Copy the **Issuer ID** (UUID) to a safe place
- Copy the **Key ID** (10-character ID) to the same place
- Click **"Download API Key"** to download the `.p8` file  
  (you can only download this once)

Then:
1. Open the downloaded `.p8` file in a text editor
2. Copy the **entire content**, including the BEGIN/END lines:
   ```
   -----BEGIN PRIVATE KEY-----
   ...
   -----END PRIVATE KEY-----
   ```

Now you have these 3 values:
- **Issuer ID**
- **Key ID**
- **API Key .p8 content**

> Optional: If you’re still using GitHub Actions, you can also update your GitHub secrets  
> `APPSTORE_ISSUER_ID`, `APPSTORE_API_KEY_ID`, `APPSTORE_API_PRIVATE_KEY` to use this new key.

### 2.2 Add Integration in Codemagic

1. In Codemagic, click **"Teams"** (top right) ��' **"Integrations"**
2. Scroll to **"App Store Connect"**
3. Click **"Add key"**
4. Fill in:
   - **Integration name**: `OverTrain` (must match `codemagic.yaml` line `app_store_connect: OverTrain`)
   - **Issuer ID**: paste the Issuer ID you copied
   - **Key ID**: paste the Key ID you copied
   - **API key**: paste the full `.p8` file content (including BEGIN/END lines)
5. Click **"Save"**

**Verification**: You should see **"OverTrain"** listed under App Store Connect integrations.

---

## Step 3: Configure iOS Code Signing

### 3.1 Navigate to Code Signing Settings
1. Go back to your app in Codemagic
2. Click on the **settings gear** next to the app
3. Open the **"Code signing identities"** tab
4. Select **"iOS"**

### 3.2 Choose Signing Method

**Option A: Automatic (Recommended)**
1. Select **"Automatic"** or **"Codemagic managed"**
2. Confirm bundle identifier is `app.overtrain.gooonemore`  
   (this should come from `codemagic.yaml`)
3. Click **"Fetch signing files"**
4. Wait for success – Codemagic will:
   - Create a distribution certificate
   - Create a provisioning profile for `app.overtrain.gooonemore`

**Option B: Manual (not recommended for first setup)**
- Only use if you already have a .p12 distribution certificate and matching provisioning profile.
- Upload them manually in Codemagic.

For your “start from scratch” case, **use Option A (Automatic)**.

---

## Step 4: Verify Environment Variables

Your `codemagic.yaml` already has the critical variables set:

| Variable | Value | Location |
|----------|-------|----------|
| `XCODE_WORKSPACE` | `ios/App/App.xcworkspace` | `codemagic.yaml` |
| `XCODE_SCHEME` | `App` | `codemagic.yaml` |
| `NOTIFICATION_EMAIL` | `mhd.aiman23@gmail.com` | `codemagic.yaml` |

You normally **don’t need to change these**. In Codemagic UI you can:
- Confirm they show up under **Environment variables** for the workflow, or
- Override them if needed (not required for your current setup).

---

## Step 5: Start Your First Build

### 5.1 Trigger Build
1. In Codemagic, open your app
2. Click **"Start new build"**
3. Choose:
   - **Branch**: `main` (or whatever you’re using)
   - **Workflow**: `ios-capacitor-workflow`
4. Click **"Start new build"**

### 5.2 Monitor Build Progress

The build usually takes **15–25 minutes**.  
You should see stages similar to:
1. �o. Clone repository
2. �o. Install dependencies (`npm ci`)
3. �o. Install CocoaPods
4. �o. Build Next.js (`npm run build:native`)
5. �o. Sync Capacitor
6. �o. Code signing (auto-provisioning)
7. �o. Build IPA
8. �o. Upload to TestFlight

If any step fails, copy the **exact error message** and we’ll debug it.

---

## Step 6: Access Your TestFlight Build

### 6.1 After Successful Build
- Check your email: `mhd.aiman23@gmail.com`  
  You’ll get a **"Build succeeded"** notification from Codemagic.
- Codemagic uploads the IPA to App Store Connect automatically.

### 6.2 TestFlight Access
1. Go to https://appstoreconnect.apple.com
2. Click **"Apps"** ��' select **"OverTrain: Go One More"**
3. Open the **"TestFlight"** tab
4. You’ll see the new build **Processing** (5–10 minutes)
5. Once ready, enable **Internal Testing**
6. Add yourself as a tester (if needed)
7. On your iPhone, install Apple’s **TestFlight** app and start testing

---

## Troubleshooting Common Errors

### Error: "No App Store Connect integration found"
**Solution:**
- Verify integration name is exactly `OverTrain` (case-sensitive)
- Check `codemagic.yaml` has:
  ```yaml
  integrations:
    app_store_connect: OverTrain
  ```

### Error: "No provisioning profile found"
**Solution:**
- Go to **Settings ��' Code signing ��' iOS**
- Click **"Fetch signing files"** again
- Confirm bundle ID is `app.overtrain.gooonemore`

### Error: "Invalid API key"
**Solution:**
- Re-add App Store Connect integration using the **new** key
- Make sure `.p8` content is complete (BEGIN/END lines included)
- Double-check Issuer ID and Key ID

### Error: "Xcode scheme not found"
**Solution:**
- Confirm `XCODE_SCHEME: "App"` in `codemagic.yaml`
- Ensure the `App` scheme exists and is shared in Xcode (already done in this project)

### Error: "Build failed during npm run build:native"
**Solution:**
- Check `package.json` contains the `build:native` script
- Verify `scripts/build-native.js` exists
- Read the specific error from logs and fix the underlying issue

---

## What Happens After First Build?

### Automatic Builds
You can configure automatic builds on:
- Every push to `main`
- Every pull request
- Tag creation (releases)

To enable:
1. Go to your app in Codemagic
2. Open **Settings ��' Build triggers**
3. Enable **"Trigger on push"** for the desired branches

### Build Status Badge
Add this to `README.md` after replacing `YOUR_APP_ID` with your actual Codemagic app ID:
```markdown
[![Codemagic build status](https://api.codemagic.io/apps/YOUR_APP_ID/workflows/ios-capacitor-workflow/status_badge.svg)](https://codemagic.io/apps/YOUR_APP_ID/workflows/ios-capacitor-workflow/latest_build)
```

---

## Cost & Limits (Free Tier)

Codemagic free tier includes:
- �o. **500 build minutes/month**
- �o. Mac mini M2 instance
- �o. Automatic code signing
- �o. TestFlight uploads

Your build is ~20 minutes, so you get about **25 builds/month** for free.

Paid plans give you more minutes if needed.

---

## Next Steps After Setup

1. �o. Get your first Codemagic build green
2. �o. Install via TestFlight and test
3. �o. Fix any runtime issues and rebuild
4. �o. Enable automatic builds on push (optional)
5. �o. Add Android Codemagic workflow (optional)
6. �o. Prepare App Store metadata and submit for review when ready

---

## Quick Reference: Your Project Details

| Item | Value |
|------|-------|
| **Bundle ID** | `app.overtrain.gooonemore` |
| **App Name** | OverTrain: Go One More |
| **Workflow** | `ios-capacitor-workflow` |
| **Integration** | `OverTrain` |
| **Email** | `mhd.aiman23@gmail.com` |
| **Xcode Workspace** | `ios/App/App.xcworkspace` |
| **Xcode Scheme** | `App` |

---

## Support Resources

- **Codemagic Docs**: https://docs.codemagic.io/
- **Capacitor iOS Guide**: https://capacitorjs.com/docs/ios
- **Slack Community**: https://codemagic.slack.com/

---

**Ready to start?**  
Begin with **Step 0** above, then follow Steps **1 → 5**. When you hit a problem, send me the step number and the exact error message, and we’ll fix it together.

