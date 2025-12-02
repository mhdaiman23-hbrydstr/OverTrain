# Apple Sign-In Setup Checklist

Use this checklist to track your progress through the Apple Sign-In setup.

## Step 1: Apple Developer Portal ✅

### App ID Configuration
- [ ] Logged into [Apple Developer Portal](https://developer.apple.com/account/)
- [ ] Navigated to Certificates, Identifiers & Profiles → Identifiers
- [ ] Found or created App ID: `app.overtrain.gooonemore`
- [ ] Verified "Sign In with Apple" capability is enabled for the App ID
- [ ] Saved App ID configuration

### Service ID Configuration
- [ ] Created new Service ID (e.g., `app.overtrain.gooonemore.web`)
- [ ] Enabled "Sign In with Apple" for Service ID
- [ ] Configured Service ID:
  - [ ] Selected Primary App ID: `app.overtrain.gooonemore`
  - [ ] Added Domain: `your-project.supabase.co` (your Supabase project domain)
  - [ ] Added Return URL: `https://your-project.supabase.co/auth/v1/callback`
- [ ] Saved Service ID configuration
- [x] **Noted Service ID**: `app.overtrain.gooonemore.web`

### Key Creation
- [x] Created new Key named "OverTrain Apple Sign-In Key"
- [x] Enabled "Sign In with Apple" capability
- [x] Configured key with Primary App ID: `app.overtrain.gooonemore`
- [x] Downloaded `.p8` key file (saved securely - can only download once!)
- [x] **Noted Key ID**: `FBGHCG2ADM`
- [x] **Noted Team ID**: `Z5SF9ULV3Q` (from Membership page)

---

## Step 2: Xcode Configuration ✅

### Project Setup
- [ ] Opened `ios/App/App.xcworkspace` in Xcode
- [ ] Selected **App** target in left sidebar
- [ ] Clicked **Signing & Capabilities** tab

### Capability Addition
- [ ] Clicked **+ Capability** button
- [ ] Added **Sign In with Apple** capability
- [ ] Verified capability appears in capabilities list

### Signing Configuration
- [ ] Verified Bundle Identifier: `app.overtrain.gooonemore`
- [ ] Selected correct **Team** (Apple Developer account)
- [ ] Verified provisioning profile is valid (no errors)
- [ ] Built project successfully (Cmd + B) - no errors

---

## Step 3: Supabase Configuration ✅

### Provider Setup
- [ ] Logged into [Supabase Dashboard](https://app.supabase.com/)
- [ ] Selected your project
- [ ] Navigated to **Authentication** → **Providers**
- [ ] Found **Apple** provider and expanded it
- [ ] Toggled **Enable Apple provider** to ON

### Provider Configuration
- [ ] Entered **Services ID**: `___________________________` (from Step 1.2)
- [ ] Entered **Key ID**: `___________________________` (from Step 1.3)
- [ ] Entered **Team ID**: `___________________________` (from Step 1.3)
- [ ] Opened `.p8` key file downloaded in Step 1.3
- [ ] Copied entire contents of `.p8` file (including headers)
- [ ] Pasted into **Private Key** field in Supabase
- [ ] Clicked **Save** button
- [ ] Verified save was successful (no error messages)

### Redirect URLs
- [ ] Navigated to **Authentication** → **URL Configuration**
- [ ] Verified redirect URL exists: `https://your-project.supabase.co/auth/v1/callback`
- [ ] Added native redirect URL: `overtrain://auth/callback` (if needed)

---

## Step 4: Testing ✅

### Build and Run
- [ ] Built iOS app in Xcode (Cmd + B) - successful
- [ ] Ran app on iOS device or simulator
- [ ] Navigated to login screen

### Visual Verification
- [ ] **"Continue with Apple"** button appears (black button with Apple logo)
- [ ] Button only appears on iOS (not on web/Android) ✓

### Functional Testing
- [ ] Tapped "Continue with Apple" button
- [ ] Apple Sign-In dialog appeared
- [ ] Completed sign-in flow
- [ ] Successfully logged into app
- [ ] User data loaded correctly

### Error Handling
- [ ] Tested on web - button does NOT appear (expected)
- [ ] Tested on Android - button does NOT appear (expected)
- [ ] Verified error messages are user-friendly if something fails

---

## Step 5: Verification ✅

### Configuration Verification
- [ ] Double-checked all IDs match:
  - [ ] Service ID in Supabase = Service ID in Apple Developer Portal
  - [ ] Key ID in Supabase = Key ID from downloaded key
  - [ ] Team ID in Supabase = Team ID from Apple Developer Portal
  - [ ] Bundle ID in Xcode = App ID in Apple Developer Portal

### Security Check
- [ ] `.p8` key file is NOT committed to git (check `.gitignore`)
- [ ] Key file is stored securely (password manager, encrypted storage)
- [ ] Team ID and Key ID are documented for future reference

---

## Troubleshooting Notes

If you encounter issues, note them here:

**Issue 1**: _________________________________________________
**Solution**: _________________________________________________

**Issue 2**: _________________________________________________
**Solution**: _________________________________________________

---

## Completion Status

- [ ] **Step 1 Complete** - Apple Developer Portal configured
- [ ] **Step 2 Complete** - Xcode configured
- [ ] **Step 3 Complete** - Supabase configured
- [ ] **Step 4 Complete** - Testing successful
- [ ] **Step 5 Complete** - All verification passed

**Date Completed**: _______________

**Notes**: _________________________________________________

