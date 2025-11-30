# Codemagic iOS Code Signing Setup

The error "No matching profiles found for bundle identifier" means Codemagic needs your Apple Developer certificates and provisioning profiles configured.

## Solution: Use Automatic Code Signing (Easiest)

Codemagic can automatically manage certificates and provisioning profiles using your App Store Connect API key.

### Step 1: Get App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click your name (top right) → **Users and Access**
3. Go to **Keys** tab
4. Click **"+"** to create a new key
5. Name it: "Codemagic iOS"
6. Select **App Manager** role (or **Admin** if you need full access)
7. Click **Generate**
8. **Download the `.p8` file** (you can only download once!)
9. Note the **Key ID** and **Issuer ID** (shown on screen)

### Step 2: Configure App Store Connect Integration in Codemagic

1. In Codemagic, go to your app settings
2. Click **"Integrations"** tab
3. Find **"App Store Connect"** section
4. Click **"Add integration"** or **"Configure"**
5. Fill in:
   - **Issuer ID**: Your Issuer ID from App Store Connect
   - **Key ID**: Your Key ID from App Store Connect
   - **Private Key**: Paste the contents of the `.p8` file (entire file)
6. Click **"Save"**

### Step 3: Link Integration to Workflow

In your `codemagic.yaml`, you already have:
```yaml
integrations:
  app_store_connect: OverTrain # Configure this in Codemagic UI
```

Make sure the name matches what you configured in Codemagic UI.

### Step 4: Enable Automatic Code Signing

Your YAML already has:
```yaml
ios_signing:
  distribution_type: app_store
  bundle_identifier: app.overtrain.gooonemore
```

This tells Codemagic to:
- Use App Store distribution
- Automatically create/find certificates
- Automatically create/find provisioning profiles

### Step 5: Verify Bundle ID Exists in Apple Developer

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers**
4. Check if `app.overtrain.gooonemore` exists
5. If not, create it:
   - Click **"+"**
   - Select **App IDs** → **App**
   - Bundle ID: `app.overtrain.gooonemore`
   - Description: "OverTrain: Go One More"
   - Enable capabilities (Push Notifications, Background Modes if needed)
   - Click **Continue** → **Register**

## Alternative: Manual Certificate Upload

If automatic signing doesn't work, you can upload certificates manually:

### Option A: Upload Certificates in Codemagic UI

1. In Codemagic app settings → **Code signing identities**
2. Click **"Add certificate"**
3. Upload your `.p12` distribution certificate
4. Enter the certificate password
5. Upload your `.mobileprovision` provisioning profile

### Option B: Use Codemagic's Certificate Generator

1. In Codemagic app settings → **Code signing identities**
2. Click **"Generate certificate"**
3. Codemagic will create certificates automatically
4. You'll need to download and install them in Apple Developer Portal

## Troubleshooting

### "Bundle identifier not found"
- Make sure the bundle ID exists in Apple Developer Portal
- Check spelling: `app.overtrain.gooonemore` (exact match required)

### "No matching profiles"
- Ensure App Store Connect integration is configured
- Check that the API key has proper permissions
- Try regenerating the API key

### "Certificate expired"
- Generate a new certificate in Codemagic
- Or upload a new certificate manually

### "Team ID mismatch"
- Make sure your App Store Connect API key is from the same Apple Developer account
- Check Team ID in Apple Developer Portal matches

## Quick Checklist

- [ ] App Store Connect API key created
- [ ] API key configured in Codemagic integrations
- [ ] Bundle ID exists in Apple Developer Portal
- [ ] Integration name matches in `codemagic.yaml`
- [ ] `ios_signing` section configured in YAML
- [ ] Distribution type set to `app_store`

## Updated codemagic.yaml Configuration

Your current configuration should work once the integration is set up:

```yaml
integrations:
  app_store_connect: OverTrain  # ← Make sure this name matches Codemagic UI

environment:
  ios_signing:
    distribution_type: app_store
    bundle_identifier: app.overtrain.gooonemore
```

## Next Steps

1. Set up App Store Connect integration in Codemagic UI
2. Verify bundle ID exists in Apple Developer Portal
3. Run the build again
4. Codemagic will automatically handle certificates and profiles

## Need Help?

- Codemagic Docs: [docs.codemagic.io/code-signing](https://docs.codemagic.io/code-signing/)
- Codemagic Support: [support@codemagic.io](mailto:support@codemagic.io)

