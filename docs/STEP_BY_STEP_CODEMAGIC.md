# Step-by-Step Codemagic Setup (From Scratch)

Starting with **only** the identifier `app.overtrain.gooonemore` in App Store Connect.

---

## PART 1: App Store Connect Setup (15 minutes)

### Step 1.1: Create App Store Connect API Key

This is what Codemagic will use to upload builds.

1. **Go to App Store Connect**
   - Open: https://appstoreconnect.apple.com
   - Sign in with your Apple ID

2. **Navigate to Keys**
   - Click **"Users and Access"** in the top menu
   - Click **"Integrations"** tab
   - Click **"App Store Connect API"**
   - Click the **"+" button** (Generate API Key)

3. **Create New Key**
   - **Name**: `Codemagic CI/CD`
   - **Access**: Select **"App Manager"** (gives TestFlight upload permission)
   - Click **"Generate"**

4. **CRITICAL: Download & Save These 3 Values**

   You'll see a success screen with:

   **a) Issuer ID** (looks like: `12345678-1234-1234-1234-123456789012`)
   - Copy this to a text file
   - Label it: "Issuer ID"

   **b) Key ID** (looks like: `AB12CD34EF`)
   - Copy this to same text file
   - Label it: "Key ID"

   **c) Download API Key** (.p8 file)
   - Click **"Download API Key"** button
   - File will be named like: `AuthKey_AB12CD34EF.p8`
   - Save it somewhere safe
   - ⚠️ **YOU CAN ONLY DOWNLOAD THIS ONCE!**

5. **Open the .p8 file in text editor**
   - Right-click the downloaded .p8 file
   - Open with Notepad or VS Code
   - Copy the **entire content** (including the BEGIN/END lines)
   - Should look like:
   ```
   -----BEGIN PRIVATE KEY-----
   MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
   ... multiple lines of random characters ...
   -----END PRIVATE KEY-----
   ```
   - Save this to your text file
   - Label it: "API Key .p8 Content"

✅ **Checkpoint**: You should now have a text file with:
- Issuer ID
- Key ID
- API Key .p8 Content (full text from the file)

---

### Step 1.2: Create App in App Store Connect

1. **Go to My Apps**
   - In App Store Connect, click **"Apps"** in top menu
   - Click the **"+" button**
   - Select **"New App"**

2. **Fill in App Information**
   - **Platforms**: Check **iOS** only (uncheck tvOS, macOS if shown)
   - **Name**: `OverTrain: Go One More`
   - **Primary Language**: `English (U.S.)`
   - **Bundle ID**: Select `app.overtrain.gooonemore` from dropdown
     - If you don't see it in dropdown, stop here and tell me
   - **SKU**: `overtrain-001` (can be any unique identifier, letters/numbers only)
   - **User Access**: Full Access (default)

3. **Click "Create"**

✅ **Checkpoint**: You should now see your app page with "OverTrain: Go One More" at the top

---

### Step 1.3: Verify Bundle ID Registration

Let's make sure the identifier is properly registered.

1. **Go to Apple Developer**
   - Open new tab: https://developer.apple.com/account
   - Sign in (same Apple ID)

2. **Check Identifiers**
   - Click **"Certificates, Identifiers & Profiles"**
   - Click **"Identifiers"** in left sidebar
   - Search for: `app.overtrain.gooonemore`

3. **If Found**: You're good! Note what you see.

4. **If NOT Found**: We need to create it
   - Click the **"+" button**
   - Select **"App IDs"** → Click **"Continue"**
   - Select **"App"** → Click **"Continue"**
   - **Description**: `OverTrain Go One More`
   - **Bundle ID**: Select **"Explicit"**
   - Enter: `app.overtrain.gooonemore`
   - **Capabilities**: Leave defaults (or select what you need)
   - Click **"Continue"** → Click **"Register"**

✅ **Checkpoint**: Bundle ID `app.overtrain.gooonemore` exists in Identifiers list

---

## PART 2: Codemagic Setup (10 minutes)

### Step 2.1: Create Codemagic Account

1. **Go to Codemagic**
   - Open: https://codemagic.io/signup

2. **Sign Up with GitHub**
   - Click **"Sign up with GitHub"**
   - GitHub will ask for authorization
   - Click **"Authorize codemagic-ltd-1"**
   - You'll be redirected back to Codemagic

✅ **Checkpoint**: You should see Codemagic dashboard (might be empty or show welcome screen)

---

### Step 2.2: Add Your Repository

1. **Add Application**
   - Look for **"Add application"** button (blue button, top right area)
   - Click it

2. **Select Repository Source**
   - Click **"GitHub"**
   - You'll see a list of your repositories

3. **Find Your Repo**
   - Look for `OverTrain` or the name of your repository
   - If you don't see it, click **"Refresh"** or check GitHub permissions
   - Click on your repository

4. **Finish Setup**
   - Click **"Finish: Add application"**
   - Codemagic will scan for `codemagic.yaml`

✅ **Checkpoint**: You should see your app dashboard with "ios-capacitor-workflow" detected

---

### Step 2.3: Add App Store Connect Integration

This connects Codemagic to Apple so it can upload builds.

1. **Navigate to Integrations**
   - Click **"Teams"** in the top right corner (next to your profile icon)
   - You'll see a dropdown or sidebar
   - Click **"Team settings"** or find **"Integrations"** tab

2. **Find App Store Connect Section**
   - Scroll down to **"App Store Connect"** section
   - Click **"Add key"** or **"Connect"**

3. **Enter Your API Credentials**

   Get your text file with the 3 values from Step 1.1:

   - **Integration name**: `OverTrain`
     - ⚠️ **MUST BE EXACTLY**: `OverTrain` (matches your codemagic.yaml line 7)
     - Case-sensitive!

   - **Issuer ID**: Paste your Issuer ID
     - Should look like: `12345678-1234-1234-1234-123456789012`

   - **Key ID**: Paste your Key ID
     - Should look like: `AB12CD34EF`

   - **API key**: Paste the **entire content** of your .p8 file
     - Must include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
     - All the random characters in between
     - Don't add extra spaces or line breaks

4. **Save**
   - Click **"Save"** or **"Add"**
   - You should see a success message

✅ **Checkpoint**: You should see "OverTrain" listed under App Store Connect integrations with a green checkmark

---

### Step 2.4: Configure Code Signing

This tells Codemagic to auto-create certificates.

1. **Go to Your App Settings**
   - Click **"Applications"** in the top menu
   - Click on your **"OverTrain"** app (or whatever name Codemagic detected)

2. **Open Code Signing Settings**
   - Click the **gear icon** (Settings) in the top right
   - Look for **"Code signing identities"** tab in left sidebar
   - Click **"iOS"**

3. **Select Automatic Signing**
   - You'll see options like: "Manual", "Automatic", "Codemagic managed"
   - Select **"Automatic"** or **"Codemagic managed"**

4. **Verify Bundle Identifier**
   - Should auto-fill: `app.overtrain.gooonemore`
   - If not, enter it manually

5. **Fetch Signing Files**
   - Click **"Fetch signing files"** button
   - Codemagic will connect to Apple
   - Wait 10-30 seconds
   - You should see: "Successfully fetched signing files"
   - Or it might create certificates automatically on first build

✅ **Checkpoint**: Code signing is configured (you'll see bundle ID and signing method set)

---

## PART 3: First Build (25 minutes)

### Step 3.1: Start Build

1. **Go to Build Page**
   - In your app dashboard, look for **"Start new build"** button
   - Click it

2. **Select Build Configuration**
   - **Branch**: Select `main` (or your current branch)
   - **Workflow**: Select `ios-capacitor-workflow`
   - **Build number**: Leave as default (will auto-increment)

3. **Start!**
   - Click **"Start new build"** button at the bottom
   - Build will start immediately

✅ **Checkpoint**: You should see build page with logs starting to appear

---

### Step 3.2: Monitor Build Progress

Watch the logs. You'll see these stages (in order):

**Stage 1: Setup** (2-3 minutes)
```
✓ Cloning repository...
✓ Configuring build environment...
```

**Stage 2: Install Dependencies** (3-4 minutes)
```
✓ Install Node.js dependencies
  - Running: npm ci
  - Installing packages...
```

**Stage 3: iOS Dependencies** (1-2 minutes)
```
✓ Install CocoaPods dependencies
  - Running: pod install
```

**Stage 4: Build Next.js** (4-6 minutes)
```
✓ Build Next.js app for native
  - Running: npm run build:native
  - Compiling pages...
  - Generating static export...
```

**Stage 5: Sync Capacitor** (30 seconds)
```
✓ Sync Capacitor with iOS
  - Running: npx cap sync ios
  - Copying web assets...
```

**Stage 6: Build Number** (30 seconds)
```
✓ Set build number and version
  - Fetching latest TestFlight build...
  - Setting build number: 1
```

**Stage 7: Code Signing** (1-2 minutes)
```
✓ Preparing signing...
  - Creating distribution certificate...
  - Creating provisioning profile...
```

**Stage 8: Build IPA** (6-10 minutes)
```
✓ Build iOS app
  - Building workspace: ios/App/App.xcworkspace
  - Scheme: App
  - Compiling...
  - Archiving...
  - Exporting IPA...
```

**Stage 9: Upload** (1-2 minutes)
```
✓ Publish to App Store Connect
  - Uploading IPA...
  - Validating...
  - Upload complete!
```

**Total Time**: 15-25 minutes

---

### Step 3.3: What to Do During Build

**✅ DO:**
- Keep the tab open (you can minimize it)
- Check progress every 5 minutes
- Prepare to celebrate 🎉

**❌ DON'T:**
- Close the browser (build continues, but you lose logs)
- Panic if one step takes longer than expected
- Click "Cancel" unless you're sure something is wrong

---

### Step 3.4: Success! What You'll See

When build completes successfully:

**In Codemagic:**
```
✓ Build finished successfully in 18m 34s
✓ Artifact: App.ipa (45.2 MB)
✓ Published to App Store Connect
```

**In Your Email** (mhd.aiman23@gmail.com):
- Subject: "Build #1 succeeded for ios-capacitor-workflow"
- Download link to IPA
- Build logs attached

**In App Store Connect:**
- Go to: https://appstoreconnect.apple.com
- My Apps → OverTrain → TestFlight
- You'll see: "Processing..." for 5-10 minutes
- Then: "Ready to Submit"

---

## PART 4: TestFlight Testing (10 minutes)

### Step 4.1: Add Yourself as Tester

1. **Go to TestFlight**
   - In App Store Connect
   - My Apps → OverTrain → TestFlight tab

2. **Add Internal Testers**
   - Click **"Internal Testing"** in left sidebar
   - Click **"+" next to testers**
   - Add your email: `mhd.aiman23@gmail.com`
   - Click **"Add"**

3. **Enable Build for Testing**
   - Your build should appear in the list
   - Click the build number
   - Make sure it's enabled for internal testing

✅ **Checkpoint**: You're listed as internal tester

---

### Step 4.2: Install on iPhone

1. **Download TestFlight App**
   - On your iPhone, open App Store
   - Search: "TestFlight"
   - Install Apple's TestFlight app

2. **Accept Invitation**
   - Open email on your iPhone: "You're invited to test OverTrain"
   - Click **"View in TestFlight"** or **"Start Testing"**
   - Opens TestFlight app

3. **Install OverTrain**
   - Click **"Install"**
   - Wait for download
   - Click **"Open"**

4. **Test Your App!**
   - Sign in with your account
   - Test core features
   - Check for any bugs

---

## Troubleshooting

### Build Failed at "Install CocoaPods dependencies"

**Error**: `pod install failed`

**Solution**:
- This is usually transient
- Click **"Rebuild"** - often works on second try
- Check if `ios/App/Podfile` exists in your repo

---

### Build Failed at "Build Next.js app for native"

**Error**: `npm run build:native failed`

**Solution**:
- Check if `scripts/build-native.js` exists
- Check if `next.config.native.mjs` exists
- Look at specific error in logs

---

### Build Failed at "Build iOS app" - Code Signing

**Error**: `No provisioning profile found`

**Solution**:
1. Go back to Codemagic → Settings → Code signing → iOS
2. Click **"Fetch signing files"** again
3. Make sure App Store Connect integration is named **exactly** `OverTrain`
4. Rebuild

---

### Build Succeeded but TestFlight Shows Error

**Error**: `Invalid binary` or `Missing compliance`

**Solution**:
- Go to App Store Connect → OverTrain → TestFlight
- Click on the build
- Answer export compliance questions:
  - "Does your app use encryption?" → Probably "No" (unless you added it)
- Resubmit

---

### Can't Find Integration Name in Codemagic

**Where is it?**
- Teams → Team settings → Integrations → App Store Connect
- Look for the name you gave it
- It MUST match line 7 in `codemagic.yaml`: `app_store_connect: OverTrain`

---

## Summary Checklist

Before starting, make sure you have:

- [ ] App Store Connect API Key (.p8 file content)
- [ ] Issuer ID
- [ ] Key ID
- [ ] Bundle ID registered: `app.overtrain.gooonemore`
- [ ] App created in App Store Connect: "OverTrain: Go One More"

Then follow:
- [ ] Part 1: App Store Connect Setup (15 min)
- [ ] Part 2: Codemagic Setup (10 min)
- [ ] Part 3: First Build (25 min)
- [ ] Part 4: TestFlight Testing (10 min)

**Total Time**: ~60 minutes (most of it is waiting for build)

---

## What to Tell Me If You Get Stuck

Please share:
1. **Which step you're on** (e.g., "Step 2.3")
2. **Exact error message** (copy/paste from Codemagic logs)
3. **Screenshot** (if helpful)

I'll help you debug!

---

**Ready?** Start with **PART 1: App Store Connect Setup** above! 🚀
