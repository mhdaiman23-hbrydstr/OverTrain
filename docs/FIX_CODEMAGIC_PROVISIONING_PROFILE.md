# Fix: "No matching profiles found" in Codemagic

This error means Codemagic can't find a provisioning profile for your bundle ID. Here's how to fix it:

## Solution: Create App ID in Apple Developer Portal First

Codemagic needs the App ID to exist in Apple Developer Portal before it can create provisioning profiles.

### Step 1: Create App ID in Apple Developer Portal

1. **Go to Apple Developer Portal**
   - Visit: https://developer.apple.com/account
   - Sign in with your Apple Developer account

2. **Navigate to Identifiers**
   - Click **"Certificates, Identifiers & Profiles"** in the left sidebar
   - Click **"Identifiers"** in the left menu
   - Click the **"+"** button (top left)

3. **Create New App ID**
   - Select **"App IDs"** → Click **"Continue"**
   - Select **"App"** → Click **"Continue"**
   - Fill in:
     - **Description**: `OverTrain: Go One More`
     - **Bundle ID**: Select **"Explicit"**
     - **Bundle ID**: `app.overtrain.gooonemore` (exact match!)
   - Click **"Continue"**

4. **Select Capabilities** (if needed)
   - ✅ Push Notifications (if you use push notifications)
   - ✅ Background Modes (if you use background fetch)
   - ✅ Associated Domains (if you use universal links)
   - Click **"Continue"**

5. **Review and Register**
   - Review the information
   - Click **"Register"**
   - You should see: "Your App ID has been registered"

### Step 2: Verify in Codemagic

1. **Go to Codemagic**
   - Open your app settings
   - Go to **"Code signing identities"** → **"iOS Provisioning profiles"**

2. **Check if profile exists**
   - Codemagic should automatically detect the App ID
   - If not, you may need to trigger a build first

3. **Alternative: Let Codemagic Create Profile**
   - With the App ID created, Codemagic can automatically create the provisioning profile
   - Run a build and Codemagic will create it automatically

### Step 3: Manual Provisioning Profile (If Automatic Doesn't Work)

If Codemagic still can't create it automatically:

1. **Create Provisioning Profile in Apple Developer Portal**
   - Go to **"Profiles"** → Click **"+"**
   - Select **"App Store"** → Click **"Continue"**
   - Select your App ID: `app.overtrain.gooonemore` → Click **"Continue"**
   - Select your Distribution Certificate → Click **"Continue"**
   - Name it: `OverTrain App Store` → Click **"Generate"**
   - **Download** the `.mobileprovision` file

2. **Upload to Codemagic**
   - In Codemagic: **Code signing identities** → **iOS Provisioning profiles**
   - Click **"Upload"**
   - Upload the `.mobileprovision` file
   - Codemagic will extract the bundle ID automatically

## Quick Checklist

- [ ] App ID `app.overtrain.gooonemore` exists in Apple Developer Portal
- [ ] App Store Connect API key configured in Codemagic
- [ ] Integration name matches: `OverTrain`
- [ ] Bundle ID in YAML matches exactly: `app.overtrain.gooonemore`
- [ ] Distribution type is `app_store`

## Common Issues

### "Bundle ID not found"
- **Fix**: Create the App ID in Apple Developer Portal first (Step 1)

### "Certificate not found"
- **Fix**: Codemagic should create certificates automatically with App Store Connect integration
- Or upload your distribution certificate manually

### "Team ID mismatch"
- **Fix**: Make sure your App Store Connect API key is from the same Apple Developer account
- Check Team ID matches in both places

### "Profile expired"
- **Fix**: Codemagic should auto-renew, but you can manually create a new one
- Or delete the old profile and let Codemagic create a new one

## Verification Steps

1. **Check App ID exists**:
   - Apple Developer Portal → Identifiers
   - Search for: `app.overtrain.gooonemore`
   - Should show: ✅ Registered

2. **Check Codemagic Integration**:
   - Codemagic → Settings → Integrations
   - App Store Connect: ✅ Configured
   - Name: `OverTrain`

3. **Run Build**:
   - Codemagic should now be able to create/find the provisioning profile
   - If it still fails, check the build logs for specific errors

## Next Steps

1. ✅ Create App ID in Apple Developer Portal (if not exists)
2. ✅ Verify App Store Connect integration in Codemagic
3. ✅ Run build again
4. ✅ Codemagic will automatically create provisioning profile

## Still Having Issues?

If you've done all the above and it still doesn't work:

1. **Check build logs** in Codemagic for specific error messages
2. **Verify API key permissions** - make sure it has "App Manager" or "Admin" role
3. **Try manual upload** - create provisioning profile manually and upload to Codemagic
4. **Contact Codemagic support** - they can check your account configuration

## Useful Links

- Apple Developer Portal: https://developer.apple.com/account
- App Store Connect: https://appstoreconnect.apple.com
- Codemagic Docs: https://docs.codemagic.io/code-signing/

