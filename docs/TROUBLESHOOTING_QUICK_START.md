# OverTrain Troubleshooting Quick Start

## Issues to Fix

You have two main issues blocking production deployment:

### Issue #1: Google OAuth Error 400 (redirect_uri_mismatch)

**Problem**: Can't log in with Google on `https://overtrainapp.vercel.app`

**Quick Fix (3 steps):**

1. **Wait 15 minutes** for Google credential cache to clear (updated your config ~15 min ago)
2. **Test in Incognito Window** on `https://overtrainapp.vercel.app`
3. **Check Console** for errors:
   - Press F12
   - Go to Console tab
   - Should see: `[Auth Callback] Session established successfully: ...`
   - If error: note the exact message

**See**: [GOOGLE_OAUTH_DEBUGGING.md](./GOOGLE_OAUTH_DEBUGGING.md) for detailed diagnosis

---

### Issue #2: Android PWA Install Banner Not Appearing

**Problem**: "Install OverTrain App" banner doesn't show on Android Chrome

**Quick Fix (2 steps):**

1. **Open Chrome DevTools** on Android:
   - Press F12 (or find DevTools icon)
   - Go to Console tab
   - Look for `[PWA]` lines
2. **Check what it says:**
   - If `[PWA] beforeinstallprompt event received` → Button will appear (may be hidden, scroll down)
   - If warning about event not received → See debugging guide to diagnose

**See**: [ANDROID_PWA_DEBUGGING.md](./ANDROID_PWA_DEBUGGING.md) for detailed diagnosis

---

## Testing Checklist

### For Google OAuth

```
Testing on: https://overtrainapp.vercel.app

□ Open in incognito/private window
□ Click "Sign in with Google"
□ Select your account
□ Press "Continue" when asked for authorization
□ Should redirect to /auth/callback with spinner
□ Within 3 seconds should redirect to dashboard
□ Check console for [Auth Callback] Session established message

EXPECTED RESULT: Logged in, user data shows
ACTUAL RESULT: (note any error message)
```

### For PWA on Android

```
Testing on: https://overtrainapp.vercel.app

Phone: __________ Android Version: __________
Browser: __________ Version: __________

□ Open URL on phone
□ Press F12 to open DevTools
□ Go to Application tab
□ Check Service Workers (should show "activated and running")
□ Check Manifest (should show JSON with icons)
□ Go to Console tab
□ Look for [PWA] logs after 5 seconds
□ Check if "Install OverTrain App" banner appears at bottom

EXPECTED RESULT: Banner appears, user can click Install
ACTUAL RESULT: (note what you see)

Console Log Output:
(screenshot or copy/paste the [PWA] logs)
```

---

## Common Issues & Fixes

### Google OAuth Still Getting Error 400

| Check | How to Fix |
|-------|-----------|
| Is Vercel domain in Google Cloud Console URIs? | Go to Google Cloud Console → Credentials → Edit OAuth → Add `https://overtrainapp.vercel.app/auth/callback` |
| Has 5+ minutes passed since adding URI? | Wait another 10 minutes, caches are slow |
| Is Supabase using latest credentials? | Go to Supabase → Settings → Authentication → Google → Update Client ID and Secret from Google Cloud Console |
| Are environment variables on Vercel set? | Check Vercel Dashboard → Settings → Environment Variables for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Is app on localhost? | Test at `https://overtrainapp.vercel.app` not `localhost:3000` |

### PWA Banner Not Showing on Android

| Check | How to Fix |
|-------|-----------|
| Is service worker registered? | DevTools → Application → Service Workers should show active SW |
| Is manifest.json loading? | DevTools → Application → Manifest should show JSON |
| Are icons missing? | Icons must exist at `/icons/icon-192x192.png` and `/icons/icon-512x512.png` |
| Is HTTPS enabled? | App must be HTTPS (not HTTP) |
| Is browser Chrome? | Some browsers don't support install banners (try Chrome, Edge, Brave) |

---

## When You're Ready to Test

### Test Google OAuth

```bash
# Make sure app is built and running on Vercel
# URL: https://overtrainapp.vercel.app

1. Open the URL
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Check DevTools Console for [Auth Callback] messages
5. Report success or exact error message
```

### Test PWA on Android

```
1. Get Android phone/tablet
2. Open Chrome browser
3. Go to https://overtrainapp.vercel.app
4. Press F12 for DevTools
5. Go to Console tab
6. Wait 5 seconds
7. Look for [PWA] logs
8. Report what logs you see + whether banner appears
```

---

## Files Created for Debugging

New documentation files have been created to help diagnose these issues:

- **[GOOGLE_OAUTH_DEBUGGING.md](./GOOGLE_OAUTH_DEBUGGING.md)** - Comprehensive OAuth troubleshooting guide
  - Step-by-step verification of Google Cloud Console setup
  - Step-by-step verification of Supabase setup
  - How to use DevTools to debug OAuth flow
  - Diagnosis matrix for common error messages
  - What to expect at each step

- **[ANDROID_PWA_DEBUGGING.md](./ANDROID_PWA_DEBUGGING.md)** - Comprehensive PWA troubleshooting guide
  - How PWA installation works on Android
  - How to check service worker registration
  - How to verify manifest.json
  - What `[PWA]` console logs mean
  - Lighthouse PWA scoring
  - Testing on different Android browsers
  - Complete troubleshooting by symptom

---

## Current Configuration Status

### Google OAuth ✓

```
Google Cloud Console:
  ✓ OAuth 2.0 Client ID created
  ✓ 4 redirect URIs configured:
    - https://overtrain.app/auth/callback
    - https://staging.overtrain.app/auth/callback
    - http://localhost:3000/auth/callback
    - https://overtrainapp.vercel.app/auth/callback

Supabase:
  ? Using correct Client ID and Secret (user should verify)

App Code (lib/auth.ts):
  ✓ Redirects to ${origin}/auth/callback

Callback Handler (app/auth/callback/page.tsx):
  ✓ Properly exchanges code for session
  ✓ Has comprehensive error handling
  ✓ Logs detailed [Auth Callback] messages
```

### PWA ✓

```
Manifest:
  ✓ public/manifest.json exists
  ✓ Configured as standalone display mode
  ✓ Has all required fields

Service Worker:
  ✓ public/sw.js exists
  ✓ Registers on page load
  ✓ Handles offline caching

Components:
  ✓ PWAInstallPrompt detects environment
  ✓ Only shows on browser (not webview/Capacitor)
  ✓ Has extensive console logging

Icons:
  ⚠ Directory exists but icons may be missing
  → Need to add icon files to public/icons/
```

### DNS/Domain ⏳

```
Current: overtrain.app → GoDaddy parking page
Configured: GoDaddy nameservers → Vercel DNS
Status: DNS propagating globally (24-48 hours)

Tracking:
  - Most regions: ✓ Showing Vercel DNS
  - Some regions: ⏳ Still showing old DNS
  - Expected: Full propagation within 24-48 hours

Workaround: Use https://overtrainapp.vercel.app while waiting
```

---

## Next Steps

### Immediate (Today)

1. **Test Google OAuth**
   - Wait 15 minutes from now
   - Open `https://overtrainapp.vercel.app` in incognito
   - Try to log in with Google
   - Report success or error message

2. **Test PWA on Android**
   - Get Android phone
   - Open `https://overtrainapp.vercel.app` in Chrome
   - Open DevTools (F12)
   - Screenshot the `[PWA]` console logs
   - Report whether banner appears

### This Week

3. **Monitor DNS Propagation**
   - Check https://whatsmydns.net/?domain=overtrain.app
   - Should show all regions with Vercel DNS by tomorrow/day after
   - Once propagated: test everything on overtrain.app

4. **Add PWA Icons (if missing)**
   - Create `public/icons/` directory if doesn't exist
   - Add required icon files:
     - `icon-192x192.png` (192×192 pixels)
     - `icon-512x512.png` (512×512 pixels)
     - `apple-touch-icon.png` (180×180 pixels)
   - Use [PWABuilder](https://www.pwabuilder.com/) to generate from a logo

### This Week (After DNS Propagates)

5. **Test Everything on overtrain.app**
   - Google login on https://overtrain.app
   - PWA install on Android
   - PWA install on iOS
   - Offline functionality

---

## Questions?

Detailed information available in:
- [GOOGLE_OAUTH_DEBUGGING.md](./GOOGLE_OAUTH_DEBUGGING.md) - OAuth troubleshooting
- [ANDROID_PWA_DEBUGGING.md](./ANDROID_PWA_DEBUGGING.md) - PWA troubleshooting
- [PWA_INSTALL_BANNER_GUIDE.md](./PWA_INSTALL_BANNER_GUIDE.md) - PWA overview
- [PWA_INSTALL_BANNER_ARCHITECTURE.txt](./PWA_INSTALL_BANNER_ARCHITECTURE.txt) - PWA technical details

---

## Success Timeline

```
✓ Today:  OAuth credentials configured, PWA code deployed
⏳ Today:  Wait for Google cache to clear (15 min)
? Today:  Test Google OAuth on Vercel
? Today:  Test PWA on Android
⏳ 24-48h: DNS propagates to all regions
? Day 3:  Test everything on overtrain.app domain
✓ Day 3:  Production launch ready
```

---
