# PWA Install Banner Guide

## Overview

The **Install App Banner** automatically appears on mobile devices when visiting OverTrain in a web browser. It doesn't appear in webviews or when running as a packaged app, making it intelligent and non-intrusive.

## How It Works

### Three Scenarios

#### 1. **Mobile Browser** ✅ (Shows Banner)

**Android/Chrome:**
- User visits `overtrain.app` in mobile browser
- Banner appears at bottom of screen
- User clicks "Install"
- Browser's native install prompt appears
- After installation, app appears on home screen and app drawer
- When launching shortcut: Opens in **standalone mode** (fullscreen, no browser chrome)

**iOS/Safari:**
- User visits `overtrain.app` in Safari
- Banner appears at bottom with "Install" button
- User clicks "Install"
- App shows manual instructions (iOS requires manual setup)
- User follows steps: Share → Add to Home Screen
- After installation, app icon appears on home screen
- When launching: Opens in **app-like mode** (no browser UI)

#### 2. **WebView** ❌ (No Banner)

**In-app Browser (e.g., Facebook, Twitter in-app browser):**
- User visits link in app's webview
- `beforeinstallprompt` event **doesn't fire**
- Banner is **automatically hidden**
- Cannot install PWA from webview (limitation of webviews)

**How it's detected:**
```javascript
// Detects if window.android or window.webkit exist
isWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes("wv") || // Android webview
         typeof window.android !== "undefined" || // Android indicator
         typeof window.webkit !== "undefined"      // iOS indicator
}
```

#### 3. **Capacitor Packaged App** ❌ (No Banner)

**Android APK/AAB or iOS Native App:**
- App is already installed as native app
- `beforeinstallprompt` event **doesn't fire**
- Banner is **automatically hidden**
- App runs in standalone mode by default

**How it's detected:**
```javascript
// Detects Capacitor wrapper or standalone mode
isCapacitor(): boolean {
  return typeof window.Capacitor !== "undefined"
}

isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
         navigator.standalone === true ||
         document.referrer.includes("android-app://")
}
```

---

## Technical Implementation

### Component: `pwa-install-prompt.tsx`

**What it does:**
1. Detects environment using `PWADetection` utilities
2. Logs environment to browser console
3. Sets up event listeners for `beforeinstallprompt`
4. Shows/hides banner based on environment
5. Handles iOS manual instructions
6. Tracks installation

**Key Features:**
- Dismissible banner (user can close it)
- Remembers dismissal (uses local state)
- Auto-hides when app is installed
- Responsive design (mobile-optimized)

### Service: `lib/pwa-detection.ts`

Provides environment detection utilities:

```typescript
PWADetection.getEnvironment()
// Returns: "native" | "webview" | "standalone" | "browser"

PWADetection.shouldShowInstallPrompt()
// Returns: true only for browser environment

PWADetection.isStandalone()
// Detects if running as installed app

PWADetection.isCapacitor()
// Detects Capacitor wrapper

PWADetection.isWebView()
// Detects if in embedded webview

PWADetection.getEnvironmentDescription()
// Returns: "App (Mobile)", "WebView (Desktop)", etc.
```

---

## Manifest Configuration

**File:** `public/manifest.json`

Key settings for standalone mode:

```json
{
  "display": "standalone",  // ← Makes it look like native app
  "name": "OverTrain: Go One More",
  "short_name": "OverTrain",
  "start_url": "/",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192-maskable.png",
      "sizes": "192x192",
      "purpose": "maskable"  // ← For Android Adaptive Icons
    }
    // ... more icons
  ]
}
```

**Explanation:**
- `display: "standalone"` - No browser UI when opened
- `maskable` icons - Properly sized for Android home screen
- Multiple icon sizes - Different devices use different sizes

---

## Testing Checklist

### Android/Chrome Testing

- [ ] Open `https://overtrain.app` on Android phone
- [ ] Wait 2-3 seconds
- [ ] "Install OverTrain App" banner appears at bottom
- [ ] Click "Install" button
- [ ] Native Android install prompt appears
- [ ] Click "Install" in prompt
- [ ] App appears on home screen
- [ ] Open from home screen → Opens in fullscreen (standalone mode)
- [ ] No browser address bar visible
- [ ] Console shows: `[PWA] Environment: browser`

### iOS/Safari Testing

- [ ] Open `https://overtrain.app` on iPhone
- [ ] "Install OverTrain App" banner appears at bottom
- [ ] Click "Install" button
- [ ] Modal dialog shows manual instructions
- [ ] Follow instructions (Share → Add to Home Screen)
- [ ] App icon appears on home screen with OverTrain label
- [ ] Open from home screen → Opens in standalone mode
- [ ] Console shows: `[PWA] Environment: browser`

### WebView Testing

- [ ] Copy OverTrain link
- [ ] Open in: Facebook Messenger → In-app browser
- [ ] **Banner should NOT appear**
- [ ] Check console: `[PWA] Should show install prompt: false`
- [ ] Repeat with: Twitter, Instagram, WhatsApp in-app browsers

### Capacitor Testing

- [ ] Build APK/AAB with Capacitor
- [ ] Install on Android device
- [ ] Launch app from app drawer
- [ ] **Banner should NOT appear** (app is already installed)
- [ ] Console shows: `[PWA] Environment: standalone`

---

## Browser Console Debugging

When testing, check console for helpful logs:

```
[PWA] Environment: browser (Mobile Browser)
[PWA] Should show install prompt: true
[PWA] beforeinstallprompt event received
[PWA] App installed successfully
```

If banner isn't showing:
```
[PWA] Environment: webview (Mobile WebView)
[PWA] Should show install prompt: false
[PWA] Skipping install prompt setup (running as app or in webview)
```

---

## Standalone Mode Features

When installed and launched from home screen:

✅ **What Works:**
- Full app functionality (workouts, programs, analytics)
- Offline support (via service worker)
- Push notifications (can be added)
- Access to device hardware (camera, mic, sensors)
- Appears in app switcher with app icon
- App shortcuts from home screen menu

❌ **What Doesn't Work:**
- Browser features (history, bookmarks, downloads)
- Address bar (no URL visible)
- Tab management (single window only)
- Some legacy browser APIs

---

## Customization

### Restrict Banner to Landing Page Only

If you want the banner only on the landing page:

```typescript
// In components/pwa-install-prompt.tsx
const router = useRouter()
const isLandingPage = router.pathname === '/'

// In JSX
if (!isLandingPage) return null
```

### Customize Banner Appearance

Edit `components/pwa-install-prompt.tsx`:

```typescript
// Change colors
<Button size="sm" className="bg-blue-500 text-white">
  Install
</Button>

// Change positioning
<div className="fixed bottom-0 right-0 m-4"> {/* New position */}

// Change text
<p className="text-sm font-medium">Install OverTrain</p>
```

### Add Analytics Tracking

```typescript
const handleInstall = async () => {
  // Track installation
  analytics.trackEvent('pwa_install_clicked')

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice

  if (outcome === "accepted") {
    analytics.trackEvent('pwa_install_success')
  }
}
```

---

## Production Checklist

Before deploying to production:

- [ ] HTTPS enabled (required for PWA)
- [ ] Icons generated and in `public/icons/`
- [ ] Manifest validates: https://www.pwabuilder.com/
- [ ] Service worker caches properly
- [ ] Lighthouse PWA score ≥ 90
- [ ] Tested on multiple Android devices/versions
- [ ] Tested on iOS 14.0+
- [ ] Test installation from home screen
- [ ] Verify offline functionality works
- [ ] Check console for `[PWA]` logs

---

## Troubleshooting

### Banner Doesn't Appear on Android

**Possible causes:**
1. Not HTTPS (required)
2. Service worker not registered
3. `beforeinstallprompt` blocked
4. Browser doesn't support PWA

**Fix:**
- Verify HTTPS enabled
- Check DevTools → Application → Service Workers
- Try different browser (Chrome, Edge, Samsung Internet)
- Check console for errors

### Banner Appears on WebView (Shouldn't)

**Check PWA Detection:**
```javascript
// In console
PWADetection.isWebView() // Should be true
PWADetection.shouldShowInstallPrompt() // Should be false
```

**If detection fails:**
- Different webview may need custom detection
- Check user agent in console: `navigator.userAgent`

### App Doesn't Open in Standalone Mode

**Check:**
1. Manifest has `"display": "standalone"`
2. Install was successful
3. iOS may need restart after installation
4. Try uninstall and reinstall

---

## Resources

- [MDN PWA Display Modes](https://developer.mozilla.org/en-US/docs/Web/Manifest/display)
- [Google: Install Experience](https://developers.google.com/web/fundamentals/app-install-banners)
- [Web.dev: PWA Installability](https://web.dev/install-criteria/)
- [Apple: Web Apps](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
