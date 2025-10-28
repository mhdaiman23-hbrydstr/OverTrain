# Google OAuth Debugging Guide

## Current Status

**Error**: `Error 400: redirect_uri_mismatch`
**Testing URL**: `https://overtrainapp.vercel.app`
**Expected**: User should complete OAuth flow and login

---

## Root Cause Analysis

The `redirect_uri_mismatch` error occurs when:
1. Your app redirects to a callback URL
2. That URL is NOT in your Google Cloud Console OAuth credentials
3. OR Google's credential cache hasn't updated yet (can take 5-15 minutes)

### Current Configuration ✓

**Google Cloud Console OAuth 2.0 Credentials:**
```
https://overtrain.app/auth/callback
https://staging.overtrain.app/auth/callback
http://localhost:3000/auth/callback
https://overtrainapp.vercel.app/auth/callback
```

**App Code (lib/auth.ts:176):**
```typescript
redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
```

**Callback Handler (app/auth/callback/page.tsx):**
- Extracts `code` from URL parameters
- Exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
- Establishes authenticated session
- Redirects to dashboard (`/`)

---

## Step-by-Step Debugging

### Step 1: Verify Configuration (5 minutes)

**In Google Cloud Console:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (should be labeled "Web application")
5. Click **Edit** and expand **Authorized redirect URIs**
6. Verify all 4 URIs are present:
   ```
   https://overtrain.app/auth/callback ✓
   https://staging.overtrain.app/auth/callback ✓
   http://localhost:3000/auth/callback ✓
   https://overtrainapp.vercel.app/auth/callback ✓
   ```
7. Click **Save**
8. Note the message: _"It may take 5 minutes to a few hours for settings to take effect"_

**Status**: ✓ User confirmed all 4 URIs present as of previous conversation

---

### Step 2: Verify Supabase Configuration (5 minutes)

**In Supabase Dashboard:**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to: **Settings** → **Authentication** → **Providers**
4. Find **Google**
5. Verify you have these credentials filled in:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
6. Click **Save**

**What to check:**
- Are the Client ID and Secret the same ones shown in Google Cloud Console?
- When was the last update? (Should be within last hour if you just copied them)

**Important**: Supabase doesn't automatically sync with Google Cloud Console. You must manually copy the Client ID and Secret each time they change.

---

### Step 3: Check Browser DevTools (During OAuth Flow)

When testing OAuth on `https://overtrainapp.vercel.app`:

**Step A: Open DevTools**
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Go to **Network** tab
4. Keep both open during the OAuth flow

**Step B: Initiate Google Login**
1. Click "Sign in with Google" button
2. Watch the Network tab
3. Look for requests to `accounts.google.com`

**Step C: Watch Console for Errors**
1. After selecting account and clicking "Sign in", watch the console
2. Look for messages starting with `[Auth Callback]`
3. Expected console logs:
   ```
   [Auth Callback] Processing OAuth callback...
   [Auth Callback] Exchanging code for session...
   [Auth Callback] Session established successfully: user@example.com
   [Auth Callback] Redirecting to dashboard...
   ```

**Step D: Check Network Errors**
1. Look at Network tab for failed requests
2. Find request to `accounts.google.com` that returns error
3. Look at the response - it should contain the error message
4. Expected error detail:
   ```json
   {
     "error": "redirect_uri_mismatch",
     "error_description": "The redirect URI ... is not whitelisted ..."
   }
   ```

---

### Step 4: Verify App is Using Correct URL

**Test on Development (localhost)**
```bash
npm run dev
```

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Should work (localhost:3000/auth/callback is whitelisted)
4. If this FAILS: Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly in `.env.local`

**Test on Vercel Preview**
```
https://overtrainapp.vercel.app
```

1. Open the URL
2. Click "Sign in with Google"
3. You'll be redirected to Google
4. After confirming, you should get redirected to `https://overtrainapp.vercel.app/auth/callback`
5. The callback page should process the code and redirect to dashboard

---

### Step 5: Wait for Cache to Clear (5-15 minutes)

Google's OAuth servers cache credential settings. After updating:

1. **Immediately after saving in Google Cloud Console**: Cache is stale
2. **Wait 5 minutes**: Cache should start clearing
3. **Wait 15 minutes**: Cache should be fully cleared across all Google servers
4. **Retry OAuth flow**

**Pro tip**: Incognito/Private browsing can help bypass some browser caches:
1. Open an incognito window
2. Go to `https://overtrainapp.vercel.app`
3. Try Google login again
4. This bypasses any browser cache but not Google's cache

---

## Diagnosis Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| Error 400: redirect_uri_mismatch | URI not in Google Cloud Console | Add `https://overtrainapp.vercel.app/auth/callback` to list |
| Error 400: redirect_uri_mismatch | Google cache not updated | Wait 5-15 minutes and retry |
| Error 400: redirect_uri_mismatch | Supabase using old credentials | Copy Client ID & Secret from Google Cloud Console to Supabase |
| Blank page at `/auth/callback` | Supabase environment variables missing on Vercel | Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel environment variables |
| "Can't connect to localhost" | Testing on mobile with incorrect URL | Use `https://overtrainapp.vercel.app` not `localhost:3000` |
| Console shows "No authorization code received" | Google didn't redirect with code parameter | Check OAuth error from Google in previous step |

---

## Quick Testing Checklist

### On localhost:3000

- [ ] Open http://localhost:3000
- [ ] Click "Sign in with Google"
- [ ] Select account
- [ ] Confirm authorization
- [ ] Should redirect to `http://localhost:3000/auth/callback`
- [ ] Should see "Completing authentication..." spinner
- [ ] Should redirect to dashboard `/`
- [ ] Console shows: `[Auth Callback] Session established successfully: ...`

### On https://overtrainapp.vercel.app

- [ ] Open the URL in incognito/private window
- [ ] Click "Sign in with Google"
- [ ] Select account
- [ ] Confirm authorization
- [ ] Should redirect to `https://overtrainapp.vercel.app/auth/callback`
- [ ] Should see "Completing authentication..." spinner
- [ ] Should redirect to dashboard `/`
- [ ] Console shows: `[Auth Callback] Session established successfully: ...`

### On https://overtrain.app (once DNS propagates)

- [ ] DNS should show Vercel nameservers (check whatsmydns.net)
- [ ] Open https://overtrain.app
- [ ] Click "Sign in with Google"
- [ ] Should work identically to overtrainapp.vercel.app

---

## Environment Variables Checklist

**On Vercel Dashboard → Settings → Environment Variables:**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Both must be present for Google OAuth to work.

**To verify they're set:**
1. Open https://overtrainapp.vercel.app
2. Press F12 → Console
3. Type: `console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)`
4. Should show your Supabase URL (not undefined)

---

## If All Else Fails

### Nuclear Option: Reset Google OAuth

1. In Google Cloud Console → APIs & Services → Credentials
2. Delete the existing OAuth 2.0 Client ID
3. Create a new one:
   - Type: Web application
   - Name: OverTrain
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/callback
     https://overtrainapp.vercel.app/auth/callback
     https://staging.overtrain.app/auth/callback
     https://overtrain.app/auth/callback
     ```
4. Copy new Client ID and Secret
5. Update in Supabase: Settings → Authentication → Providers → Google
6. Wait 5-15 minutes
7. Test again

### Check Supabase Logs

1. In Supabase Dashboard → Logs
2. Look for OAuth-related errors
3. Filter by timestamp when you tried OAuth
4. Errors might reveal what Supabase is doing with the code exchange

---

## Success Indicators

When OAuth is working correctly, you'll see:

1. **Browser**: Redirects from Google back to your app
2. **Console**: `[Auth Callback] Session established successfully: ...`
3. **App**: User is logged in and sees dashboard
4. **localStorage**: `liftlog_user` is populated with user data
5. **Supabase**: Session is valid and user can make authenticated requests

---

## Testing Timeline

**Current situation:**
- All URIs added to Google Cloud Console ✓
- All URIs added to Supabase ✓
- Callback route implemented ✓
- Waiting for Google cache to clear ⏳

**Recommended next action:**
1. Wait 10 more minutes (until ~5+ minutes after last Google Cloud Console save)
2. Test in incognito window
3. Check console for detailed error message
4. Report error message and we can diagnose further

---
