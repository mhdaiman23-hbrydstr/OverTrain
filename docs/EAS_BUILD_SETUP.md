# EAS Build Setup for iOS

Since you already have `eas.json` configured, you can use **Expo Application Services (EAS Build)** to build iOS apps without a Mac. This is another great alternative to Codemagic.

## What is EAS Build?

EAS Build is Expo's cloud build service that can build iOS apps even if you're using Capacitor (with some configuration). However, since you're primarily using Capacitor, **GitHub Actions is recommended** as it works better with Capacitor projects.

## When to Use EAS Build

- ✅ You want to migrate to Expo managed workflow
- ✅ You prefer Expo's tooling and ecosystem
- ✅ You want integrated TestFlight deployment
- ✅ You're okay with Expo's pricing model

## Setup Steps

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure Build

Your `eas.json` is already set up! You just need to configure credentials:

```bash
eas build:configure
```

### 4. Build iOS App

```bash
# Development build
eas build --platform ios --profile development

# Preview build (for testing)
eas build --platform ios --profile preview

# Production build (for App Store)
eas build --platform ios --profile production
```

## Important Note for Capacitor Projects

**EAS Build is designed for Expo projects.** Since you're using Capacitor, you have two options:

### Option A: Use GitHub Actions (Recommended)
- Works directly with Capacitor
- Free for most use cases
- Full control over build process
- See `GITHUB_ACTIONS_IOS_SETUP.md`

### Option B: Migrate to Expo
- Convert your Capacitor project to Expo
- Use EAS Build seamlessly
- Requires significant refactoring

## EAS Build Pricing

| Plan | iOS Builds | Price |
|------|------------|-------|
| Free | 30 builds/month | $0 |
| Production | Unlimited | $29/month |

## Comparison: EAS vs GitHub Actions

| Feature | EAS Build | GitHub Actions |
|---------|-----------|----------------|
| **Cost** | Free tier: 30 builds | Free: 2000 min/month |
| **Setup** | Easy (Expo projects) | Medium (any project) |
| **Capacitor Support** | Limited | Full support |
| **TestFlight Upload** | Automatic | Manual setup |
| **Mac Required** | ❌ No | ❌ No |

## Recommendation

**For your Capacitor project, use GitHub Actions** (see `GITHUB_ACTIONS_IOS_SETUP.md`). EAS Build is better suited for Expo projects.

If you want to explore EAS Build anyway, you can try it, but you may need to adjust your build configuration significantly.

