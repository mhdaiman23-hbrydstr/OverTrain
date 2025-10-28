# ⚡ Sentry Quick Start (5 minutes)

## What Was Just Set Up

✅ **Installed:**
- `@sentry/nextjs` package (115 new packages)

✅ **Created Files:**
- `sentry.config.js` - Sentry configuration
- `next.config.mjs` - Updated with Sentry integration
- `.env.example` - Template for environment variables
- `app/api/debug/test-error/route.ts` - Test error endpoint
- `components/debug/sentry-test.tsx` - Test error component
- `SENTRY_SETUP_GUIDE.md` - Full documentation

---

## 🚀 Your Next 3 Steps

### Step 1: Create Sentry Account (5 min)
```
1. Go to https://sentry.io
2. Sign up (free tier)
3. Create a project for "Next.js"
4. Name it "liftlog-app"
5. Copy your DSN
```

### Step 2: Add Credentials (2 min)
```
Create .env.local file:

NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@ingest.sentry.io/123456
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=liftlog-app

# (Keep your existing Supabase keys)
```

### Step 3: Test It (2 min)
```bash
npm run dev
# Visit http://localhost:3000
# Look for the yellow "🔍 Sentry Test Panel"
# Click "Throw Error (Client)"
# Check your Sentry dashboard - error should appear!
```

---

## 🔍 Key Difference: Console vs Sentry

```typescript
// CONSOLE.LOG
console.log("User logged in");
// → Visible in DevTools (anyone can see it)

// SENTRY
Sentry.captureMessage("User logged in", "info");
// → Sent to secure server (only team sees it)
```

**That's the main difference!** Console logs stay in the browser. Sentry sends to a secure server.

---

## ❌ What NOT to Log (Either Place)

```typescript
// NEVER log passwords, tokens, API keys
console.log(userToken);          // ❌ DON'T
Sentry.captureMessage(password); // ❌ DON'T

// Safe to log
console.log("Auth successful");     // ✅ OK
Sentry.captureMessage("Auth OK");   // ✅ OK
```

---

## 📊 After Setup: Console Logs vs Sentry

When you run `npm run dev` with the test panel:

| Button | Where It Goes | Who Sees It |
|--------|---|---|
| "Throw Error (Client)" | Sentry dashboard | Only you (team) |
| "Log to Console" | Browser DevTools | Anyone who opens F12 |
| "Log Info Message" | Sentry dashboard | Only you (team) |

---

## 🎯 Why This Matters for Phase 3 (Security)

1. **Console logs are UNSAFE** - Users/hackers can see them in DevTools
2. **Sentry is SAFE** - Only authenticated team members see it
3. **This lets us clean up console logs** - Remove debug info, keep Sentry for production errors

---

## ✅ Checklist

- [ ] Visit https://sentry.io and sign up
- [ ] Create "Next.js" project named "liftlog-app"
- [ ] Copy your DSN
- [ ] Create `.env.local` with DSN
- [ ] Run `npm run dev`
- [ ] See yellow test panel on page
- [ ] Click "Throw Error (Client)"
- [ ] Check Sentry dashboard for the error
- [ ] Celebrate! 🎉

---

## 📖 Full Details

See `SENTRY_SETUP_GUIDE.md` for complete documentation on:
- Security best practices
- What to log and what not to
- Code examples
- FAQ

---

## 🆘 Troubleshooting

**Panel doesn't show?**
- Must be in development mode (`npm run dev`)
- Check NODE_ENV is "development"

**Error not appearing in Sentry?**
- Check that `NEXT_PUBLIC_SENTRY_DSN` is set in `.env.local`
- Restart the dev server after changing .env
- Sentry only captures in PRODUCTION by default (see `sentry.config.js`)

**Getting dependency errors?**
- We used `--legacy-peer-deps` to install Sentry with React 19
- This is safe and documented

---

## 🎓 Understanding the Output

When you trigger a test error, you'll see in Sentry:
```json
{
  "event": "Test client-side error - This is from /api/debug/test-error",
  "timestamp": "2025-10-28T12:34:56Z",
  "tags": {
    "endpoint": "/api/debug/test-error",
    "type": "client"
  },
  "environment": "development",
  "release": "1.0.0"
}
```

This tells you:
- **What** happened (the error message)
- **When** it happened (timestamp)
- **Where** it happened (endpoint, file)
- **Why** it happened (stack trace)
- **Context** (user, session, etc.)

Much better than `console.log("error occurred")` 🎯

---

**You're now ready to understand console logs vs Sentry!**

Next: Once verified, we'll clean up your console logs knowing what Sentry captures.

