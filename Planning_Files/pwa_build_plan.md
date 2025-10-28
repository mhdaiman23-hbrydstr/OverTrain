# 🌐 WebApp + PWA + Native Wrapper Build Plan

**Goal:** Maintain one codebase that runs as:
1. **Website** (webapp on your domain)
2. **Installable PWA** (manifest + splash + offline caching)
3. **Store-listed apps** (via BuildNatively or TWA wrapper)

---

## ⚙️ Overview

| Platform | Method | Notes |
|-----------|---------|-------|
| **Web** | Normal deployment | Runs directly in browser |
| **PWA (Installable)** | `manifest.json` + service worker | Users can “Add to Home Screen” |
| **Android App** | Trusted Web Activity (TWA) or BuildNatively | Keeps full PWA features (offline + caching) |
| **iOS App** | BuildNatively wrapper (WKWebView) | Offline/push limited, needs fallback |

---

## 🧭 Environment Detection Snippet

```ts
// env-flags.ts
export function getAppEnv() {
  const ua = navigator.userAgent || '';
  const isStandalonePWA =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari standalone:
    // @ts-ignore
    !!window.navigator.standalone;

  const isAndroidTWA = document.referrer?.startsWith('android-app://');
  const isIOSWebView =
    /iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua);

  return {
    isWebsite: !isStandalonePWA && !isAndroidTWA && !isIOSWebView,
    isPWAStandalone: isStandalonePWA,
    isAndroidWrapper: isAndroidTWA,
    isIOSWrapper: isIOSWebView,
  };
}
```

### Example Usage
```ts
const env = getAppEnv();

// Hide install banners if already inside wrapper/PWA
const shouldShowInstallPrompt = env.isWebsite;

// Handle links safely
function openLink(url: string) {
  if (env.isAndroidWrapper || env.isIOSWrapper) {
    window.location.assign(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
```

---

## 📋 Publishing Checklist

### 1️⃣ PWA / Web Version
- [ ] `manifest.json` includes:
  - `name`, `short_name`
  - `start_url`, `scope`
  - `background_color`, `theme_color`
  - Icon set (192×192, 512×512)
- [ ] Service worker registered for:
  - Offline caching
  - Asset versioning
- [ ] HTTPS enforced
- [ ] Lighthouse PWA audit passes
- [ ] Hide “install” prompt if in wrapper
- [ ] Add `robots.txt` and SEO meta tags

---

### 2️⃣ Android (Google Play)
- [ ] Signed `aab` generated via **BuildNatively** or **TWA** builder
- [ ] `assetlinks.json` uploaded to domain root:
  - `https://yourdomain.com/.well-known/assetlinks.json`
- [ ] App package name reserved (e.g. `com.yourbrand.app`)
- [ ] Native splash + adaptive icon added
- [ ] Permissions reviewed (minimal)
- [ ] FCM push keys (optional) configured
- [ ] Google Play listing complete:
  - App title, description, screenshots
  - Privacy policy URL
  - Content rating
  - App category, tags
- [ ] Internal test track uploaded before production release

---

### 3️⃣ iOS (App Store)
- [ ] App built via **BuildNatively** (WKWebView)
- [ ] Custom native splash & icon assets provided
- [ ] App value justification (avoid “just a website” rejection)
  - Add small native feature (deep links, share sheet, or push)
- [ ] Push configured via **APNs** (optional)
- [ ] Offline fallback handled gracefully
- [ ] App Store Connect listing complete:
  - App name, subtitle, screenshots, icon (1024×1024)
  - Privacy policy + support URL
  - Category and keywords
- [ ] TestFlight internal test run before submission
- [ ] Signed with correct provisioning profile

---

## 🧩 Folder Suggestions

```
/public
  ├── manifest.json
  ├── service-worker.js
  └── .well-known/assetlinks.json
/docs
  └── pwa_build_plan.md  ← this file
/app
  └── env-flags.ts
```

---

## 🚀 Deployment Flow

1. Deploy main webapp → verify manifest & SW.  
2. Test PWA install on desktop + Android.  
3. Wrap site in BuildNatively → generate iOS + Android builds.  
4. Test wrapped builds on devices.  
5. Submit to Google Play + App Store.

---

## ✅ Quick Tips

- Hide web install prompts inside wrapped apps.  
- Use environment checks to tweak link handling.  
- On iOS, expect limited offline caching.  
- Keep **domain + SSL** stable (wrappers depend on it).  
- Rebuild wrappers only when domain/app URL changes.  

---

**Single Codebase → Web + PWA + Native**  
> One app, three footprints — streamlined updates, unified brand, minimal maintenance.
