# EAS Build - Quick Start (RECOMMENDED)

EAS Build handles iOS code signing automatically. No certificates, no provisioning profiles, no headaches.

## Setup (5 minutes)

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```
Create account if you don't have one (free).

### 3. Configure Project
```bash
eas build:configure
```

This creates `eas.json`. When prompted:
- Select: `iOS`
- Choose: `production` build profile

### 4. Update eas.json

The generated file should look like:
```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  }
}
```

### 5. Build for iOS
```bash
eas build --platform ios --profile production
```

EAS will:
- ✅ Create certificates automatically
- ✅ Create provisioning profiles
- ✅ Build your app
- ✅ Give you .ipa file to download

### 6. Submit to TestFlight (Optional)
```bash
eas submit --platform ios
```

Provide your App Store Connect API key when prompted.

## Cost

- **Free tier**: 30 builds/month
- **If you need more**: $29/month for unlimited

## Why This Works

EAS Build was created specifically to solve iOS code signing nightmares. It:
- Manages certificates in their secure cloud
- No local Mac needed
- No manual certificate creation
- Works with Capacitor perfectly

## Troubleshooting

If build fails, check:
```bash
eas build:list
eas build:view [build-id]
```

## Next Steps

Once you get the .ipa:
1. EAS can submit to TestFlight automatically
2. Or download and upload manually to App Store Connect

This should work on first try.
