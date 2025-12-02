# Apple Sign-In Setup Guide

This guide walks you through configuring Apple Sign-In for OverTrain iOS app. Apple requires Sign in with Apple if your app offers any other third-party sign-in options (like Google).

## Prerequisites

- Apple Developer Account (paid membership required)
- Access to Apple Developer Portal
- Xcode installed on Mac
- Supabase project with authentication enabled

---

## Step 1: Apple Developer Portal Configuration

### 1.1 Create/Verify App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** in the left sidebar
4. Search for or create an App ID with identifier: `app.overtrain.gooonemore`
5. If creating new:
   - Click the **+** button
   - Select **App IDs** → Continue
   - Select **App** → Continue
   - Description: `OverTrain: Go One More`
   - Bundle ID: Select **Explicit** and enter: `app.overtrain.gooonemore`
   - Under **Capabilities**, check **Sign In with Apple**
   - Click **Continue** → **Register**

### 1.2 Create Service ID (for Supabase)

1. Still in **Identifiers**, click the **+** button
2. Select **Services IDs** → Continue
3. Description: `OverTrain Web Authentication`
4. Identifier: `app.overtrain.gooonemore.web` (or similar, must be unique)
5. Click **Continue** → **Register**
6. **Important**: Check the **Sign In with Apple** checkbox
7. Click **Configure** next to Sign In with Apple
8. Configure the Service ID:
   - **Primary App ID**: Select `app.overtrain.gooonemore`
   - **Website URLs**:
     - **Domains**: Add your Supabase project domain (e.g., `your-project.supabase.co`)
     - **Return URLs**: Add your callback URL:
       ```
       https://your-project.supabase.co/auth/v1/callback
       ```
   - Click **Save** → **Continue** → **Save**

### 1.3 Create Key for Sign In with Apple

1. In **Certificates, Identifiers & Profiles**, click **Keys** in the left sidebar
2. Click the **+** button to create a new key
3. Key Name: `OverTrain Apple Sign-In Key`
4. Check **Sign In with Apple**
5. Click **Configure** → Select your Primary App ID (`app.overtrain.gooonemore`)
6. Click **Save** → **Continue** → **Register**
7. **CRITICAL**: Download the key file (`.p8` file) - you can only download it once!
8. Note the **Key ID** (you'll need this for Supabase)

---

## Step 2: Xcode Configuration

### 2.1 Open Xcode Project

1. Open Terminal and navigate to your project:
   ```bash
   cd "S:\Program Files\OverTrain"
   ```
2. Open the Xcode workspace:
   ```bash
   open ios/App/App.xcworkspace
   ```
   Or manually: Navigate to `ios/App/` and double-click `App.xcworkspace`

### 2.2 Add Sign In with Apple Capability

1. In Xcode, select the **App** target in the left sidebar (under "TARGETS")
2. Click the **Signing & Capabilities** tab
3. Click **+ Capability** button (top left)
4. Search for and double-click **Sign In with Apple**
5. The capability should now appear in your list

### 2.3 Verify Bundle Identifier

1. Still in **Signing & Capabilities** tab
2. Verify **Bundle Identifier** is: `app.overtrain.gooonemore`
3. If different, update it to match your Apple Developer App ID

### 2.4 Configure Signing

1. Under **Signing**, select your **Team** (your Apple Developer account)
2. Xcode should automatically create/select a provisioning profile
3. If you see errors, click **Try Again** or **Download Manual Profiles**

### 2.5 Build and Test

1. Connect an iOS device or use the simulator
2. Select your device/simulator from the device dropdown
3. Press **Cmd + B** to build (verify no errors)
4. The capability is now configured in Xcode

---

## Step 3: Supabase Configuration

### 3.1 Enable Apple Provider

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** in the list and click to expand
5. Toggle **Enable Apple provider** to ON

### 3.2 Configure Apple Provider Settings

You'll need the following information from Step 1:

#### From Step 1.2 (Service ID):
- **Services ID**: `app.overtrain.gooonemore.web` (or whatever you created)

#### From Step 1.3 (Key):
- **Key ID**: The Key ID you noted when creating the key
- **Private Key**: The contents of the `.p8` file you downloaded

#### Fill in Supabase fields:

1. **Services ID**: Enter your Service ID (e.g., `app.overtrain.gooonemore.web`)
2. **Secret Key**: 
   - Open the `.p8` file you downloaded in Step 1.3
   - Copy the entire contents (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - Paste into this field
3. **Key ID**: Enter the Key ID from Step 1.3
4. **Team ID**: 
   - Found in Apple Developer Portal → **Membership** (top right)
   - It's a 10-character string (e.g., `ABC123DEF4`)

### 3.3 Configure Redirect URLs

1. Still in Supabase **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, ensure you have:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   (This should already be there if you configured Google OAuth)

3. For native app redirects, also add:
   ```
   overtrain://auth/callback
   ```
   (This matches the URL scheme in your `Info.plist`)

**Note**: For native iOS apps, Supabase handles the OAuth redirect automatically through the Capacitor plugin. The callback URL in Apple Developer Portal should point to Supabase's callback endpoint, not your app's custom URL scheme.

### 3.4 Save Configuration

1. Click **Save** at the bottom of the Apple provider configuration
2. Wait a few seconds for changes to propagate

---

## Step 4: Testing Apple Sign-In

### 4.1 Test on iOS Device/Simulator

1. Build and run your app on an iOS device or simulator
2. Navigate to the login screen
3. You should see the **"Continue with Apple"** button (black button with Apple logo)
4. Tap the button
5. You should see the Apple Sign-In dialog
6. Complete the sign-in flow

### 4.2 Troubleshooting

**Issue: "Apple Sign-In is only available on iOS devices"**
- ✅ This is expected on web/Android - the button only shows on iOS

**Issue: "Invalid client" or "Configuration error"**
- Check that your Service ID in Supabase matches the one in Apple Developer Portal
- Verify the Key ID and Team ID are correct
- Ensure the `.p8` private key was copied correctly (include headers)

**Issue: "Redirect URI mismatch"**
- Verify the callback URL in Supabase matches the one in Apple Developer Portal Service ID configuration
- Check that `overtrain://auth/callback` is in Supabase redirect URLs

**Issue: Button doesn't appear on iOS**
- Check that `Capacitor.getPlatform() === 'ios'` is working
- Verify the app is running in a native Capacitor context (not web browser)
- Check browser console for errors

**Issue: OAuth opens in browser instead of native flow**
- This is expected behavior with the current implementation
- Supabase's OAuth will open Safari/Chrome for authentication
- After authentication, it should redirect back to your app
- If it doesn't redirect back, check that the callback URL is configured correctly

**Issue: "Invalid redirect_uri" error**
- Verify the Service ID in Apple Developer Portal has the correct callback URL
- The callback URL should be: `https://your-project.supabase.co/auth/v1/callback`
- Make sure there are no typos or extra slashes

---

## Step 5: App Store Submission Notes

When submitting to App Store:

1. **App Review Information**:
   - If asked about Sign in with Apple, mention that you offer it as an alternative to Google Sign-In
   - Apple requires Sign in with Apple if you offer other third-party sign-in options

2. **Privacy Policy**:
   - Ensure your privacy policy mentions how Apple Sign-In data is handled
   - Link to your privacy policy in App Store Connect

3. **Testing**:
   - Test Sign in with Apple on a real device before submission
   - Test with a TestFlight build to ensure it works in production-like environment

---

## Quick Reference Checklist

- [ ] App ID created with Sign In with Apple capability in Apple Developer Portal
- [ ] Service ID created and configured with callback URL
- [ ] Key created and downloaded (`.p8` file saved securely)
- [ ] Key ID and Team ID noted
- [ ] Sign In with Apple capability added in Xcode
- [ ] Bundle identifier matches App ID
- [ ] Apple provider enabled in Supabase
- [ ] Service ID, Key ID, Team ID, and Private Key entered in Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Tested on iOS device/simulator

---

## Security Notes

- **Never commit the `.p8` key file to git** - it's already in `.gitignore`
- Store the key securely (password manager, encrypted storage)
- The key is tied to your Apple Developer account - if compromised, revoke and create a new one
- Team ID and Key ID are not sensitive, but keep them organized

---

## Additional Resources

- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Supabase Apple Provider Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Capacitor OAuth Guide](https://capacitorjs.com/docs/guides/oauth)

