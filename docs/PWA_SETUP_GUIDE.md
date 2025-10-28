# OverTrain PWA Setup Guide

This guide explains the Progressive Web App (PWA) setup for OverTrain: Go One More, including web installation, offline support, and preparation for app store deployment.

## What's Included

### 1. **Web App Manifest** (`public/manifest.json`)
- App metadata (name, description, theme colors)
- Icon configuration for different platforms
- App display mode (standalone - looks like a native app)
- Shortcuts for quick access
- Share target configuration

### 2. **Install Prompt Component** (`components/pwa-install-prompt.tsx`)
- Shows "Install" button for Android/Web browsers
- iOS-specific instructions (Apple requires manual Add to Home Screen)
- Dismissible prompt
- Automatic retry logic

### 3. **Service Worker** (`public/sw.js`)
- Offline functionality
- Asset caching strategy
- Background sync preparation
- Update notifications

### 4. **Service Worker Registration** (`components/sw-register.tsx`)
- Automatic registration on app load
- Update detection
- User notification for new versions

### 5. **PWA Metadata** (`app/layout.tsx`)
- Next.js metadata configuration
- Apple Web App setup
- OpenGraph and Twitter cards
- Icon references

## Setting Up Icons

The PWA requires icons in `public/icons/`. You'll need to generate the following:

### Required Icon Files

1. **192x192 PNG** (`icon-192x192.png`)
   - Standard Android home screen icon
   - Used in app drawer

2. **192x192 Maskable PNG** (`icon-192x192-maskable.png`)
   - Android Adaptive Icons support
   - Important for Android 8+
   - Icon should be at least 80x80 with 56px padding

3. **512x512 PNG** (`icon-512x512.png`)
   - Splash screen icon
   - App store preview

4. **512x512 Maskable PNG** (`icon-512x512-maskable.png`)
   - Splash screen adaptive icon

5. **Apple Touch Icon** (`apple-touch-icon.png`)
   - 180x180 PNG
   - iOS home screen icon (transparent background recommended)

6. **96x96 PNG** (`icon-96x96.png`)
   - Shortcuts menu icons
   - App shortcuts on Android

7. **Screenshot Assets** (optional but recommended)
   - `screenshot-540x720.png` - Mobile portrait (540x720)
   - `screenshot-1280x720.png` - Desktop landscape (1280x720)
   - Used in app store listings

### Generating Icons

#### Option 1: Using Online Tools
- **PWA Image Generator**: https://www.pwabuilder.com/imageGenerator
- Upload your app logo and it will generate all required sizes

#### Option 2: Using ImageMagick
```bash
# From a high-res image (e.g., 1024x1024.png)
convert logo.png -resize 192x192 public/icons/icon-192x192.png
convert logo.png -resize 512x512 public/icons/icon-512x512.png
convert logo.png -resize 180x180 public/icons/apple-touch-icon.png
convert logo.png -resize 96x96 public/icons/icon-96x96.png
```

#### Option 3: Using Node.js Sharp
```javascript
const sharp = require('sharp');

async function generateIcons() {
  const input = 'logo.png';

  await sharp(input).resize(192, 192).toFile('public/icons/icon-192x192.png');
  await sharp(input).resize(512, 512).toFile('public/icons/icon-512x512.png');
  await sharp(input).resize(180, 180).toFile('public/icons/apple-touch-icon.png');
  await sharp(input).resize(96, 96).toFile('public/icons/icon-96x96.png');
}

generateIcons();
```

### Maskable Icon Best Practices

For maskable icons (adaptive icons on Android):
1. Keep important content in the center 80x80 area
2. Allow safe areas around edges to be masked
3. Use your brand color as background
4. Ensure good contrast

Example template (SVG-based):
```svg
<svg viewBox="0 0 192 192">
  <!-- Background safe area -->
  <circle cx="96" cy="96" r="96" fill="#000000"/>

  <!-- Icon content (keep within 80x80 center) -->
  <g transform="translate(56 56)">
    <!-- Your icon here -->
  </g>
</svg>
```

## Testing the PWA

### Local Testing

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Run production build**
   ```bash
   npm run start
   ```

4. **Test in browser**
   - Open `https://localhost:3000` (note: must be HTTPS for PWA)
   - For local HTTPS testing, use: `npm run dev -- --experimental-https`
   - Look for the install button in supported browsers

### Android Testing
- Chrome, Edge, Samsung Internet support install prompts
- Install from the address bar or the install button in the app
- App will appear on home screen and app drawer
- Works offline (with cached data)

### iOS Testing
- Safari requires manual "Add to Home Screen"
- Follow the on-screen instructions shown by the app
- App runs in standalone mode (no Safari chrome)
- Some features (like app icons) are iOS 16.4+

### Testing Checklist
- [ ] Install prompt appears on Android Chrome
- [ ] iOS shows instruction modal
- [ ] App works offline
- [ ] Splash screen appears
- [ ] Service worker registers (check DevTools → Application → Service Workers)
- [ ] Icons load correctly
- [ ] App name appears on home screen

## Deployment

### HTTPS Requirement
PWA features require HTTPS:
1. Ensure your domain has a valid SSL certificate
2. Service workers won't register over HTTP
3. Self-signed certificates work for testing only

### Verifying PWA Installation
Check Google Lighthouse:
```bash
npm install -g lighthouse
lighthouse https://liftlog.app --view
```

Look for the "PWA" section score.

## App Store Deployment

### For Google Play Store
1. **Package APK/AAB**
   - Use tools like Capacitor or Android Studio
   - Convert your PWA to native Android app

2. **Required Files**
   - App icon (512x512)
   - App screenshots
   - Descriptions and keywords
   - Privacy policy URL

3. **Recommended Tools**
   - **Capacitor**: https://capacitorjs.com/
   - **PWA Builder**: https://www.pwabuilder.com/
   - **Ionic**: https://ionicframework.com/

### For Apple App Store
1. **Package as iOS App**
   - Similar process to Android
   - Requires Mac with Xcode
   - Apple Developer account ($99/year)

2. **App Store Requirements**
   - App icon (1024x1024)
   - Screenshots for iPhone and iPad
   - App description
   - Privacy policy
   - Category and rating

3. **Recommended Tools**
   - **Capacitor**: Best option for web-to-native conversion
   - **PWA Builder**: Can generate native packages
   - **Swift**: Write native iOS code directly

## Service Worker Updates

The app automatically checks for service worker updates every hour. When an update is found:
1. User sees a notification banner
2. Clicking "Refresh" applies the update
3. Auto-refresh after 10 seconds if ignored

To force clear cache:
```javascript
// In browser console
navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' })
```

## Offline Functionality

### What Works Offline
- Static assets (HTML, CSS, JS)
- Previously cached API responses
- App UI and navigation

### What Requires Network
- Authentication
- Real-time data sync
- New API requests (fallback to cached if available)

### Improving Offline Support
1. Implement queue system for offline actions
2. Use Background Sync API for deferred updates
3. Cache more API responses in service worker
4. Show "offline mode" indicator

## Performance Optimization

1. **Asset Caching**: Service worker caches static assets
2. **Runtime Caching**: API responses cached after first request
3. **Cache Versioning**: Update `CACHE_NAME` in `sw.js` to invalidate cache
4. **Lazy Loading**: Load features on-demand to reduce initial size

## Troubleshooting

### Service Worker Not Registering
- Check HTTPS is enabled
- Check browser console for errors
- Verify `public/sw.js` exists and is accessible
- Clear browser cache and Service Worker storage

### Install Prompt Not Showing
- Must meet PWA criteria (manifest, icons, HTTPS, service worker)
- Android: Try Chrome, Edge, or Samsung Internet
- iOS: Supports PWA but requires manual installation
- Check if already installed

### Icons Not Loading
- Verify files exist in `public/icons/`
- Check manifest.json paths are correct
- Inspect Network tab in DevTools
- Try cache busting (update `?v=1` parameter)

### Offline Issues
- Check Service Worker is active in DevTools
- Verify cache names in `sw.js`
- Clear cache and reinstall app
- Check browser storage limits (usually 50MB+ per app)

## Resources

- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Capacitor Docs](https://capacitorjs.com/docs)

## Next Steps

1. **Generate Icons**: Create the icon files using recommended tools
2. **Test Locally**: Run build and test installation
3. **Deploy**: Push to production (HTTPS required)
4. **Monitor**: Check Lighthouse scores and user installation rates
5. **App Store**: When ready, package for Google Play and Apple App Store
