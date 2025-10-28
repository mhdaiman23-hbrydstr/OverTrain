# Google OAuth Diagnostic - Error 400 redirect_uri_mismatch

## Current Error
```
Access blocked: OverTrain's request is invalid
Error 400: redirect_uri_mismatch
```

This happens when Google doesn't recognize the redirect URL. Since we've already added the URI to Google Cloud Console, the issue is likely one of these:

---

## Diagnostic Steps (Do These Now)

### Step 1: Verify Supabase Credentials (Most Likely Issue)

**This is the most common reason for redirect_uri_mismatch!**

Supabase needs to have the EXACT Client ID and Secret from Google Cloud Console.

**Check Supabase:**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **Authentication** → **Providers**
4. Click **Google** to expand
5. Copy the **Client ID** shown
6. Keep this page open

**Check Google Cloud Console:**

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID (Web application)
4. Copy the **Client ID** shown at the top

**Compare:**
- Do the Client IDs match exactly?
- If NO → This is your problem!
- If YES → Continue to Step 2

**If they don't match:**
1. Copy the Client ID from Google Cloud Console
2. Paste it into Supabase Google Provider
3. Click **Save**
4. Do the same for Client Secret
5. Wait 5 minutes
6. Test OAuth again

---

### Step 2: Check Supabase Configuration is Saved

Sometimes Supabase doesn't save properly.

1. Go back to Supabase → Settings → Authentication → Providers → Google
2. Scroll down to see if there's a **Save** button
3. If "Save" button is visible and not greyed out → Click it
4. Wait for confirmation message
5. Refresh the page
6. Verify credentials are still there

---

### Step 3: Verify Environment Variables on Vercel

Supabase needs the correct Supabase URL and Key to communicate with Google.

**Check Vercel:**

1. Go to [Vercel Dashboard](https://vercel.com/)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Verify these exist:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://[your-project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
5. Both should have a value (not blank)

**If missing:**
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (paste into `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon** key (paste into `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
5. Add to Vercel environment variables
6. Redeploy app

---

### Step 4: Check Current Redirect Behavior

Let's verify what URL Google is actually receiving.

**On https://overtrainapp.vercel.app:**

1. Press F12 to open DevTools
2. Go to **Network** tab
3. Go to **Application** → **Cookies** tab
4. Look for any cookies with "google" or "oauth" in the name
5. Take a screenshot
6. Delete all cookies and refresh

7. Click "Sign in with Google"
8. Watch the Network tab carefully
9. You should see a request to `accounts.google.com`
10. Click on it
11. Look at **Request URL** in the Headers section
12. It will show the parameters Google received
13. Look for `redirect_uri=` parameter
14. What is it set to?

**Expected:**
```
redirect_uri=https%3A%2F%2Fovertrainapp.vercel.app%2Fauth%2Fcallback
(URL-encoded: https://overtrainapp.vercel.app/auth/callback)
```

**If different:**
- Report what it shows
- This tells us what URL our code is actually sending

---

### Step 5: Check for Domain/Subdomain Issues

Sometimes Vercel's domain handling causes issues.

**Check Vercel domain configuration:**

1. Go to [Vercel Dashboard](https://vercel.com/)
2. Select your project
3. Go to **Settings** → **Domains**
4. You should see:
   ```
   overtrainapp.vercel.app (Primary)
   ```
5. Are there any other domains listed?
6. Click on the domain
7. Check DNS records

**Check Google Cloud Console for subdomains:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Expand **Authorized redirect URIs**
5. Do you see BOTH:
   - `https://overtrainapp.vercel.app/auth/callback` ← With "app" in the name
   - `https://overtrain.vercel.app/auth/callback` ← Without "app"?
6. If you only see one, add the other

---

## Diagnosis Matrix

Based on which step fails, here's what's wrong:

| Step | Passes? | Problem | Solution |
|------|---------|---------|----------|
| 1 | ❌ No | Supabase has wrong Client ID/Secret | Copy from Google Cloud Console to Supabase |
| 1 | ✓ Yes | Credentials are correct | Go to Step 2 |
| 2 | ❌ No | Credentials not saved in Supabase | Click Save, wait for confirmation |
| 2 | ✓ Yes | Credentials saved | Go to Step 3 |
| 3 | ❌ No | Vercel missing env vars | Add NEXT_PUBLIC_SUPABASE_URL/KEY, redeploy |
| 3 | ✓ Yes | Env vars present | Go to Step 4 |
| 4 | ❌ No | App sending wrong redirect_uri | Check that `window.location.origin` is correct (should be `https://overtrainapp.vercel.app`) |
| 4 | ✓ Yes | Redirect URI matches | Go to Step 5 |
| 5 | ❌ No | Domain mismatch in Google Cloud | Add both `overtrainapp.vercel.app` and `overtrain.vercel.app` URIs |
| 5 | ✓ Yes | All domains configured | **Should work now!** |

---

## What to Report

When you've done these steps, report back with:

1. **Step 1 Result**: Do Supabase and Google Cloud Console Client IDs match?
2. **Step 2 Result**: Did you click Save? Was there a confirmation?
3. **Step 3 Result**: Are both env vars present on Vercel?
4. **Step 4 Result**: What is the `redirect_uri` parameter Google receives?
5. **Step 5 Result**: Are both domain variants in Google Cloud Console URIs?
6. **Current Error**: Still getting redirect_uri_mismatch or different error?

---

## If Still Failing After These Steps

If you've done all 5 steps and still getting the error:

1. **Try localhost**:
   - Run `npm run dev`
   - Go to http://localhost:3000
   - Try Google login
   - If this works → Problem is Vercel-specific
   - If this fails → Problem is Supabase configuration

2. **Clear Vercel Cache**:
   - Go to Vercel Dashboard
   - Click "Redeploy"
   - Wait for deployment to finish
   - Try again

3. **Check Supabase Logs**:
   - Go to Supabase Dashboard
   - Click **Logs** (left sidebar)
   - Filter by your timestamp
   - Look for OAuth-related errors
   - Screenshot and share what you find

---

## Common Gotchas

❌ **Gotcha 1**: You added the URI to Supabase but forgot to click **Save**
- Solution: Go back and explicitly click the Save button

❌ **Gotcha 2**: You're testing on `localhost:3000` but added `https://overtrainapp.vercel.app/auth/callback` to Google
- Solution: `localhost:3000/auth/callback` must also be in the list (it should be)

❌ **Gotcha 3**: Google has multiple OAuth credentials (maybe for different apps)
- Solution: Make sure you're using credentials for the right app/project

❌ **Gotcha 4**: Supabase has multiple projects
- Solution: Make sure you're editing the right project's Google provider

❌ **Gotcha 5**: Browser cache showing old Supabase credentials
- Solution: Clear cookies and try in incognito window

---

## Still Stuck?

If you've completed all diagnostic steps and still seeing the error, we need deeper investigation:

1. Take a screenshot of:
   - Google Cloud Console OAuth 2.0 Client ID (showing Client ID and redirect URIs)
   - Supabase Google Provider settings (showing saved Client ID)
   - Network request to accounts.google.com (showing redirect_uri parameter)
   - Error message from Google

2. Share all screenshots and I can pinpoint the exact issue

---
