# Sentry Setup Guide for LiftLog

## 🎯 What is Sentry?

Sentry is an **error tracking & monitoring service** that captures errors from your app and sends them to a central dashboard. This differs from `console.log` in crucial ways:

| Feature | Console.log | Sentry |
|---------|-----------|--------|
| **Location** | Visible in browser DevTools (user's machine) | Secure server (only team sees) |
| **Data** | Accessible to anyone who opens DevTools | Only accessible to team members |
| **Sensitive Data** | Anyone can see if logged | Should never log sensitive data |
| **Production Use** | Not recommended | ✅ Perfect for production |
| **Stack Traces** | Limited context | Full context + source maps |
| **Historical Data** | Lost on page refresh | Persistent, searchable |

---

## 📋 Setup Steps

### Step 1: Create Sentry Account (5 minutes)

1. Go to https://sentry.io
2. Click **Sign Up** (free tier available)
3. Create account with email/password
4. Complete onboarding

### Step 2: Create a Project

1. In Sentry dashboard, click **Projects**
2. Click **Create Project**
3. Select **Next.js** as platform
4. Name it: `liftlog-app`
5. Set alert owner (your email)
6. Click **Create Project**

### Step 3: Get Your DSN

1. In your project, go to **Settings** → **Client Keys (DSN)**
2. Copy the DSN (looks like: `https://xxx@ingest.sentry.io/123456`)
3. Keep this safe - it's your project identifier

### Step 4: Get Auth Token (Optional but Recommended)

1. Go to **Account Settings** → **Auth Tokens**
2. Click **Create New Token**
3. Give it a name: `liftlog-source-maps`
4. Give it permissions: `project:releases`, `org:read`
5. Copy the token

### Step 5: Add to .env.local

Create a `.env.local` file in your project root (copy from `.env.example`):

```env
# Required
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@ingest.sentry.io/123456

# Optional (for source map uploads)
SENTRY_AUTH_TOKEN=your-auth-token-here

SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=liftlog-app

# Your existing Supabase keys
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Step 6: Test the Setup

#### Option A: Use the Test Component (Development)

1. Open your app in development mode (`npm run dev`)
2. Find the **Sentry Test Panel** (appears at bottom of pages)
3. Click buttons to trigger test errors
4. Check your Sentry dashboard for captured events

#### Option B: Use the API Endpoint

```bash
# Test client error
curl http://localhost:3000/api/debug/test-error?type=client

# Test server error
curl http://localhost:3000/api/debug/test-error?type=server

# Test message
curl http://localhost:3000/api/debug/test-error?type=message
```

#### Option C: Manual Test

Add this to any component:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
}
```

---

## 🔍 Understanding What Gets Captured

### ✅ What Sentry Captures

```typescript
// 1. Exceptions/Errors (automatically)
throw new Error("Something broke");  // ✅ Captured

// 2. Explicit messages
Sentry.captureMessage("User logged in", "info");  // ✅ Captured

// 3. Performance events
// Automatically tracked for API calls, page loads, etc.

// 4. Context about the error
{
  user: { id, email },           // ✅ Captured
  tags: { section: "workout" },  // ✅ Captured
  extra: { data: {...} }         // ✅ Captured
}
```

### ❌ What Does NOT Get Captured

```typescript
// 1. Console.log/console.warn/console.error
console.log("Debug info");  // ❌ Stays in browser only

// 2. Regular console output
console.warn("This is a warning");  // ❌ Not sent to Sentry

// 3. Development-only logs
if (process.env.NODE_ENV === 'development') {
  console.log("Dev only");  // ❌ Not sent
}
```

### ⚠️ What You MUST NOT Capture

```typescript
// NEVER send to Sentry
Sentry.captureMessage(`User token: ${userToken}`);  // 🚫 WRONG
Sentry.captureException({ password: "123456" });     // 🚫 WRONG
Sentry.captureMessage(`API key: ${apiKey}`);        // 🚫 WRONG

// ALWAYS sanitize before capturing
Sentry.captureMessage("User authentication error");  // ✅ SAFE
Sentry.captureMessage("Database connection failed");  // ✅ SAFE
```

---

## 🛠️ Using Sentry in Your Code

### Basic Error Handling

```typescript
import * as Sentry from "@sentry/nextjs";

async function completeWorkout(workoutId: string) {
  try {
    const result = await updateWorkout(workoutId);
    return result;
  } catch (error) {
    // Send to Sentry with context
    Sentry.captureException(error, {
      tags: {
        section: "workout",
        action: "complete",
      },
      extra: {
        workoutId,
        timestamp: new Date().toISOString(),
      },
    });

    // Also log to console for debugging
    console.error("Failed to complete workout:", error);

    throw error;
  }
}
```

### Logging Messages

```typescript
// Info level
Sentry.captureMessage("User signed up successfully", "info");

// Warning level
Sentry.captureMessage("API response slower than 3 seconds", "warning");

// Error level
Sentry.captureMessage("Database query timeout", "error");
```

### Setting User Context

```typescript
// When user logs in, set their context
Sentry.setUser({
  id: user.id,
  email: user.email,
  // DON'T include: password, tokens, sensitive data
});

// When user logs out
Sentry.setUser(null);
```

---

## 🔐 Security Best Practices

### ✅ DO:
- [ ] Capture errors with full stack traces
- [ ] Include user ID (not email if sensitive)
- [ ] Include error codes and timestamps
- [ ] Log user actions before errors
- [ ] Use Sentry's built-in filtering

### ❌ DON'T:
- [ ] Log passwords, tokens, or API keys
- [ ] Log full email addresses (use IDs instead)
- [ ] Log credit card numbers
- [ ] Log personal health data
- [ ] Log database passwords
- [ ] Log raw request/response bodies with auth headers

### Clean Up with Filters

Sentry has built-in data redaction:

```typescript
// In sentry.config.js - already configured:
integrations: [
  new Sentry.Replay({
    maskAllText: true,      // Hide sensitive text in replays
    blockAllMedia: true,    // Block media in replays
  }),
],

beforeSend(event, hint) {
  // Filter out specific errors
  if (event.exception) {
    const error = hint.originalException;
    if (error?.message?.includes('password')) {
      return null;  // Don't send this error
    }
  }
  return event;
},
```

---

## 📊 Console Logs vs Sentry

### Real-World Scenario

```typescript
async function loginUser(email: string, password: string) {
  // ❌ BAD - Never do this
  console.log("Login attempt:", { email, password });  // Visible in DevTools!

  // ✅ GOOD - Safe to do
  console.log("Login attempt for user");  // Visible in console

  try {
    const result = await authenticate(email, password);

    // ✅ GOOD - Send to Sentry (secure)
    Sentry.captureMessage("User logged in successfully", "info");

    return result;
  } catch (error) {
    // ✅ GOOD - Capture error with safe context
    Sentry.captureException(error, {
      tags: { action: "login" },
      extra: {
        email,  // Safe - just email, no password
        timestamp: new Date().toISOString(),
      },
    });

    throw error;
  }
}
```

### What Happens?

1. **Console.log** → Visible in browser DevTools to user
2. **Sentry.captureMessage** → Sent to secure Sentry server, only visible to team
3. **Sentry.captureException** → Full error details sent to secure server

---

## 🚀 Deployment Notes

### Development (localhost:3000)
- Sentry is **disabled** (check `sentry.config.js`)
- Test component shows test buttons
- API endpoint works for testing

### Production
- Sentry is **enabled** - errors automatically sent
- Test component is **hidden** - not visible to users
- No test errors logged

---

## 📈 Monitoring Your Errors

### In Sentry Dashboard

1. **Issues** tab - See all unique errors
2. **Performance** tab - Track slow operations
3. **Releases** tab - Track errors per version
4. **Team** tab - Manage who can see data

### Setting Up Alerts

1. Go to **Alerts** in Sentry
2. Create new alert rule
3. Example: "Alert me when error rate > 5%"
4. Choose notification method (email, Slack, etc)

---

## 🎓 Key Takeaways

| Concept | What to Know |
|---------|--------------|
| **Console.log** | Visible to ANYONE who opens DevTools. Don't log sensitive data. |
| **Sentry** | Only visible to authenticated team members. Safe for production. |
| **Errors** | Automatically captured in production. No `console.log` needed. |
| **Sensitive Data** | Never log passwords, tokens, API keys, or personal data anywhere. |
| **Stack Traces** | Sentry includes full context. Much better than console.log. |

---

## ❓ FAQ

**Q: Does Sentry slow down my app?**
A: No. Sentry runs asynchronously and has minimal overhead.

**Q: Does Sentry capture console.log?**
A: No. Console.log stays in the browser. Sentry only captures errors and explicit messages.

**Q: Can users see Sentry data?**
A: No. Only authenticated team members can access your Sentry dashboard.

**Q: What happens in development?**
A: Sentry is disabled in development (NODE_ENV=development). Use the test component instead.

**Q: Do I need an auth token?**
A: Optional, but recommended. It lets Sentry upload source maps for better stack traces.

**Q: How do I remove something from Sentry?**
A: Use the `beforeSend` hook in `sentry.config.js` to filter events before sending.

---

## 🔗 Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry SDK Configuration](https://docs.sentry.io/platforms/javascript/configuration/)
- [Best Practices](https://docs.sentry.io/product/best-practices/)
- [Data Privacy](https://docs.sentry.io/product/data-management/)

---

## ✅ Checklist

- [ ] Sentry account created
- [ ] Project created (liftlog-app)
- [ ] DSN copied
- [ ] Auth token created (optional)
- [ ] `.env.local` file created with credentials
- [ ] `npm run dev` started
- [ ] Test errors triggered and confirmed in Sentry dashboard
- [ ] Understood console.log vs Sentry differences
- [ ] Ready to clean up console logs

**Next Steps:** Once verified, move to cleaning up console logs based on what you learned!

