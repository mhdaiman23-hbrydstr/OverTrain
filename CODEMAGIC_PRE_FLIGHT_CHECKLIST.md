# Codemagic Pre-Flight Checklist ✈️

Before starting your first build, verify all these items are correct.

## ✅ Repository Configuration

- [x] **codemagic.yaml** exists in repo root
- [x] **Bundle ID** is `app.overtrain.gooonemore` (verified in 3 places)
- [x] **Build script** `npm run build:native` exists in package.json
- [x] **Capacitor config** matches bundle ID
- [x] **Fixed APP_STORE_ID** reference (was causing build failure)

## ✅ Apple Developer Requirements

You need these credentials ready (from GitHub secrets):

### App Store Connect API Key
- [ ] **Issuer ID**: `APPSTORE_ISSUER_ID` secret
- [ ] **Key ID**: `APPSTORE_API_KEY_ID` secret
- [ ] **.p8 file content**: `APPSTORE_API_PRIVATE_KEY` secret

### Apple Developer Account
- [ ] **Team ID**: `IOS_DEVELOPMENT_TEAM` secret
- [ ] **Bundle ID registered**: `app.overtrain.gooonemore` must exist in App Store Connect

## ✅ Codemagic Setup Steps

Complete these in order:

### Step 1: Account & Repository
- [ ] Created Codemagic account at https://codemagic.io/signup
- [ ] Connected via GitHub
- [ ] Added OverTrain repository

### Step 2: App Store Connect Integration
- [ ] Went to Teams → Integrations
- [ ] Added App Store Connect key
- [ ] Named integration **exactly**: `OverTrain` (matches YAML)
- [ ] Pasted Issuer ID, Key ID, and .p8 content
- [ ] Saved successfully

### Step 3: Code Signing
- [ ] Went to app Settings → Code signing → iOS
- [ ] Selected "Automatic" or "Codemagic managed"
- [ ] Verified bundle ID: `app.overtrain.gooonemore`
- [ ] Clicked "Fetch signing files"
- [ ] Got success confirmation

### Step 4: First Build
- [ ] Clicked "Start new build"
- [ ] Selected branch: `main`
- [ ] Selected workflow: `ios-capacitor-workflow`
- [ ] Started build
- [ ] Watching build logs

## 🔍 How to Get Missing Information

### Where to find Issuer ID, Key ID, .p8 file
**Option 1: From GitHub Secrets**
1. Go to your repo → Settings → Secrets and variables → Actions
2. View values (if you have admin access)

**Option 2: From App Store Connect** (if you need to regenerate)
1. Go to https://appstoreconnect.apple.com
2. Users and Access → Integrations → Keys
3. Create new key or use existing
4. Download .p8 file (only shown once!)
5. Copy Issuer ID and Key ID

### Where to find Team ID
1. Go to https://developer.apple.com/account
2. Navigate to "Membership" section
3. Copy "Team ID"

### Where to verify Bundle ID is registered
1. Go to https://developer.apple.com/account
2. Certificates, Identifiers & Profiles → Identifiers
3. Search for `app.overtrain.gooonemore`
4. If not found, create new App ID

## 🚨 Common Pre-Flight Issues

### Issue: "I don't have access to GitHub secrets"
**Solution**: You're the repo owner, so you should have access:
- Go to repo Settings → Secrets and variables → Actions
- If secrets don't show values, you may need to create new App Store Connect key

### Issue: "Bundle ID not registered in Apple Developer"
**Solution**: Register it manually:
1. Go to developer.apple.com → Identifiers
2. Click "+" to create new
3. Select "App IDs" → Continue
4. Type: App, Bundle ID: `app.overtrain.gooonemore`
5. Description: "OverTrain: Go One More"
6. Register

### Issue: "App doesn't exist in App Store Connect"
**Solution**: Create app listing:
1. Go to appstoreconnect.apple.com
2. My Apps → "+" → New App
3. Platforms: iOS
4. Name: "OverTrain: Go One More"
5. Bundle ID: Select `app.overtrain.gooonemore`
6. SKU: `overtrain-001` (any unique identifier)

## 📋 Expected Build Timeline

| Stage | Duration | What's Happening |
|-------|----------|------------------|
| Clone repository | 30s | Downloading code |
| Install npm deps | 2-3 min | `npm ci` |
| Install CocoaPods | 1-2 min | iOS dependencies |
| Build Next.js | 3-5 min | `npm run build:native` |
| Sync Capacitor | 30s | Copy to iOS project |
| Code signing | 1-2 min | Auto-provision certificates |
| Build IPA | 5-8 min | Compile iOS app |
| Upload TestFlight | 1-2 min | Submit to Apple |
| **TOTAL** | **15-25 min** | Full pipeline |

## ✅ Success Indicators

You'll know it worked when you see:

### In Codemagic Console
```
✓ Clone repository
✓ Install Node.js dependencies
✓ Install CocoaPods dependencies
✓ Build Next.js app for native
✓ Sync Capacitor with iOS
✓ Set build number and version
✓ Build iOS app
✓ Publish to App Store Connect
```

### In Your Email
- Subject: "Build #1 succeeded for ios-capacitor-workflow"
- From: no-reply@codemagic.io
- Includes: Download link to IPA file

### In App Store Connect
1. Go to My Apps → OverTrain → TestFlight
2. See build processing (5-10 min after upload)
3. Build status changes: Processing → Ready to Submit

## 🎯 Next Steps After First Successful Build

1. [ ] Add yourself as internal tester in TestFlight
2. [ ] Install TestFlight app on your iPhone
3. [ ] Accept invitation and install OverTrain
4. [ ] Test core functionality
5. [ ] Fix any bugs discovered
6. [ ] Trigger second build to verify fixes
7. [ ] Set up automatic builds on push (optional)

## 📞 Support

If you get stuck:
- **Codemagic Docs**: https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/
- **Codemagic Support**: support@codemagic.io
- **Slack Community**: https://codemagic.slack.com/

---

**Ready?** Start with [CODEMAGIC_SETUP_GUIDE.md](CODEMAGIC_SETUP_GUIDE.md) Step 1!
