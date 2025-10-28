# Google OAuth Setup - Audit Trail

**Date:** October 28, 2025
**Status:** ✅ Complete & Tested
**Domain:** overtrain.app (DNS propagating), overtrainapp.vercel.app (live)

## Summary

Reconfigured Google OAuth from scratch due to initial configuration issues. Setup now complete with working authentication on both local development and production (Vercel).

## Configuration Steps Completed

### 1. Google Cloud Console Setup
- **Project:** OverTrain OAuth App
- **OAuth Type:** Web application
- **Authorized Redirect URIs Added:**
  ```
  http://localhost:3000/auth/callback
  https://liftlog-abc123.vercel.app/auth/callback
  https://overtrain.app/auth/callback
  https://fyhbpkjibjtvltwcavlw.supabase.co/auth/v1/callback
  ```

### 2. Supabase Configuration
- **Project:** fyhbpkjibjtvltwcavlw
- **Provider:** Google (Enabled)
- **Credentials Added:**
  - Client ID: [from Google Cloud Console]
  - Client Secret: [from Google Cloud Console]

### 3. Issues Resolved

#### Issue 1: Error 400 - redirect_uri_mismatch (Initial)
**Problem:** Supabase OAuth callback URI not in Google's authorized redirect URIs
**Solution:** Added `https://fyhbpkjibjtvltwcavlw.supabase.co/auth/v1/callback` to Google Console
**Result:** ✅ Auth flow progressed past Google login screen

#### Issue 2: Service Worker Response Clone Errors
**Problem:** Service worker attempting to clone Response bodies that were already consumed, causing 503 errors
**File:** `public/sw.js`
**Root Cause:** Calling `c.put(request, response.clone())` after response body already consumed
**Solution:** Simplified service worker to network-first strategy without aggressive caching
**Changes:**
- Removed response caching logic that cloned consumed responses
- Implemented simple network-first fetch strategy
- Fallback to cached version on network failure
- Result: No more 503 errors

#### Issue 3: Missing PWA Icons
**Problem:** Manifest referenced non-existent icon files causing 404 errors
**File:** `public/manifest.json`
**Solution:** Cleared icon arrays (empty arrays instead of missing files)
**Changes:**
  - `"icons": []` (was: array of 4 non-existent files)
  - `"screenshots": []` (was: array of 2 non-existent files)
  - `"shortcuts": []` (was: array of 3 shortcuts with non-existent icons)

### 4. Testing Results

#### Local Development (localhost:3000)
- ✅ Google Sign-in button redirects to Google login
- ✅ User can select email account
- ✅ Successfully authenticated
- ✅ Session established (59 minutes)
- ✅ User created in Supabase `profiles` table
- ✅ Dashboard loads with user data
- ✅ No console errors (only dev warnings)

#### Production - Vercel Domain (overtrainapp.vercel.app)
- ✅ Tested on desktop Firefox
- ✅ Tested on mobile (Android 13) via WiFi
- ✅ Google auth callback works
- ✅ User session persisted

#### Custom Domain (overtrain.app)
- ⏳ DNS propagating (24-48 hours from setup)
- 🔄 Will test once nameservers fully propagate
- Expected: Same behavior as Vercel domain

### 5. Key Files Modified

1. **public/sw.js** - Service worker
   - Simplified fetch event handler
   - Removed problematic response cloning
   - Network-first strategy for all requests

2. **public/manifest.json** - PWA manifest
   - Cleared non-existent icon references
   - Cleared non-existent screenshot references
   - Cleared non-existent shortcut references

3. **.env.local** - Environment variables (unchanged)
   - Already had correct Supabase URL and keys
   - No Google credentials needed in .env (stored in Supabase provider settings)

### 6. Architecture Notes

**OAuth Flow:**
```
User clicks "Sign in with Google"
  ↓
AuthService.signInWithGoogle() [lib/auth.ts:168]
  ↓
Supabase redirects to Google (with redirectTo callback)
  ↓
User authenticates with Google
  ↓
Google redirects to: https://fyhbpkjibjtvltwcavlw.supabase.co/auth/v1/callback
  ↓
Supabase processes OAuth response
  ↓
Supabase redirects to: /auth/callback [app/auth/callback/page.tsx]
  ↓
AuthCallbackPage exchanges code for session
  ↓
Redirects to dashboard (/)
  ↓
AuthContext loads user data from database
  ↓
Dashboard renders with user program/workout data
```

**Critical URLs:**
- Google callback (internal): `https://fyhbpkjibjtvltwcavlw.supabase.co/auth/v1/callback`
- App callback (user-facing): `/auth/callback`
- Supabase URL: `https://fyhbpkjibjtvltwcavlw.supabase.co`

### 7. Verification Checklist

- [x] Google OAuth credentials created
- [x] Supabase Google provider enabled
- [x] All redirect URIs in Google Console
- [x] Local development login works
- [x] Production login works
- [x] Service worker errors resolved
- [x] PWA manifest issues resolved
- [x] User data persists after logout/login
- [x] Session authentication working
- [x] Profile created in database
- [x] No critical console errors

### 8. Deployment Status

**Development:** ✅ Ready
**Production:** ✅ Deployed to Vercel
**Custom Domain:** ⏳ Awaiting DNS propagation (set GoDaddy nameservers to Vercel)

### 9. Next Steps

1. Wait for DNS propagation (check with `nslookup overtrain.app`)
2. Test custom domain `overtrain.app` once live
3. Consider adding PWA icons for installation prompt
4. Monitor Sentry logs for any OAuth-related issues

### 10. Important Notes

- **Mobile data vs WiFi:** Always test on WiFi first (mobile data may have different DNS/routing)
- **Service worker cache:** Keep monitoring for response cloning issues
- **Session expiration:** Default 1 hour (59 minutes shown in testing)
- **User profile:** Auto-created in `profiles` table on first OAuth login
- **Email verification:** Not required for Google OAuth users (Google handles verification)

---

**Tested By:** User
**Verification Date:** October 28, 2025
**Status:** Production Ready ✅
