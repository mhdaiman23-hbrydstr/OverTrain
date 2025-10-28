# Google OAuth Verification Checklist - RIGHT NOW

## Your Current Situation
- ❌ Google OAuth showing: `Error 400: redirect_uri_mismatch`
- Testing on: `https://overtrainapp.vercel.app`
- Error means: Google doesn't recognize the redirect URL we're sending

---

## QUICK CHECK (5 minutes)

### ✓ Check 1: Supabase Credentials Match Google Cloud Console

**Do This Right Now:**

1. **Open Supabase Dashboard**
   - URL: https://app.supabase.com/
   - Select your project
   - Go: Settings → Authentication → Providers → Google
   - What is shown in the **Client ID** field? Copy it:
     ```
     Supabase Client ID: ____________________________________
     ```

2. **Open Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Go: APIs & Services → Credentials
   - Click your OAuth 2.0 Client ID (Web application)
   - What is shown in the **Client ID** field? Copy it:
     ```
     Google Cloud Client ID: ____________________________________
     ```

3. **Compare**
   - ✓ **DO THEY MATCH?** YES / NO
   - If NO → This is your problem!
     - Copy the Google Cloud Console ID
     - Paste it into Supabase
     - Click **Save**
     - Wait 2 minutes
     - Try OAuth again

---

### ✓ Check 2: Client Secret Also Matches

**Do This Right Now:**

1. **In Supabase**, look for **Client Secret** field
   - Copy the value shown:
     ```
     Supabase Client Secret: ____________________________________
     ```

2. **In Google Cloud Console**, find the **Client Secret**
   - Click show to reveal it
   - Copy it:
     ```
     Google Cloud Client Secret: ____________________________________
     ```

3. **Compare**
   - ✓ **DO THEY MATCH?** YES / NO
   - If NO → Copy from Google Cloud to Supabase and click **Save**

---

### ✓ Check 3: Redirect URIs in Google Cloud Console

**Do This Right Now:**

1. **In Google Cloud Console**, expand **Authorized redirect URIs**
2. **Count how many URIs are listed:**
   ```
   1. ______________________________
   2. ______________________________
   3. ______________________________
   4. ______________________________
   ```

3. **Check for EXACTLY these 4 URIs:**
   - [ ] `https://overtrain.app/auth/callback`
   - [ ] `https://staging.overtrain.app/auth/callback`
   - [ ] `http://localhost:3000/auth/callback`
   - [ ] `https://overtrainapp.vercel.app/auth/callback`

4. **If any are missing:**
   - Click **Edit**
   - Add the missing URI
   - Click **Save**
   - Wait 5 minutes
   - Try OAuth again

---

### ✓ Check 4: Vercel Environment Variables

**Do This Right Now:**

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/
   - Select your project
   - Go: Settings → Environment Variables

2. **Check for these two:**
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://[something].supabase.co`
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJ...`

3. **If either is missing:**
   - Go to Supabase Dashboard → Settings → API
   - Copy **Project URL** → paste into Vercel as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon key** → paste into Vercel as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click **Save**
   - Go to Deployments and click **Redeploy**
   - Wait for deployment to finish
   - Try OAuth again

---

## After Doing Quick Checks

**If you fixed anything:**
1. Wait 2-5 minutes
2. Go to `https://overtrainapp.vercel.app`
3. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
4. Try Google login again
5. Report result

**If everything matched:**
- See detailed diagnostic guide: [GOOGLE_OAUTH_DIAGNOSTIC.md](docs/GOOGLE_OAUTH_DIAGNOSTIC.md)
- Follow Step 4 (check actual redirect_uri being sent)

---

## What to Report Back

After completing the checklist, tell me:

1. **Check 1**: Did Client IDs match? Did you fix it?
2. **Check 2**: Did Client Secrets match? Did you fix it?
3. **Check 3**: Were all 4 URIs present? Did you add any?
4. **Check 4**: Were Vercel env vars present? Did you add them?
5. **Result**: Is Google OAuth working now? Or still showing error?

---

## If STILL Getting Error 400

Next steps:

1. **Try on localhost:**
   ```bash
   npm run dev
   ```
   - Go to `http://localhost:3000`
   - Try Google login
   - Does it work? YES / NO
   - If YES → Problem is Vercel-specific
   - If NO → Problem is Supabase/Google configuration

2. **Check Network request:**
   - On `https://overtrainapp.vercel.app`
   - Press F12 → Network tab
   - Click "Sign in with Google"
   - Look for request to `accounts.google.com`
   - What parameters does it show?
   - Screenshot and share

3. **Check browser console:**
   - Press F12 → Console tab
   - Are there any error messages?
   - Screenshot and share

---

## Timeline

- **NOW**: Do the quick checks above (5-10 min)
- **If fixed**: Test OAuth (2 min)
- **If NOT fixed**: Follow diagnostic guide or share screenshots

---

**Do the quick checks first, then report back with what you found!**
