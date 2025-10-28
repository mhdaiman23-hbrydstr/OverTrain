# Audit Logging Examples

This shows where and how to use the audit logger in your API routes.

## Overview

```typescript
import { logAuditEvent, getClientIP } from "@/lib/audit-logger";

// Log a critical action
await logAuditEvent({
  action: "PROGRAM_CREATED",
  userId: user.id,
  resourceType: "PROGRAM",
  resourceId: program.id,
  details: {
    programName: program.name,
    daysPerWeek: program.daysPerWeek,
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

---

## 1. User Authentication

### Sign Up
**File**: `lib/auth.ts` or `app/api/auth/signup/route.ts`

```typescript
// After successful signup
await logAuditEvent({
  action: "USER_SIGNUP",
  userId: newUser.id,
  details: {
    email: newUser.email,
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

### Login
**File**: `lib/auth.ts` or `app/api/auth/login/route.ts`

```typescript
// After successful login
await logAuditEvent({
  action: "USER_LOGIN",
  userId: user.id,
  details: {
    method: "email", // or 'google', 'github', etc.
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

### Logout
**File**: `app/api/auth/logout/route.ts` (if you have one)

```typescript
// When user logs out
await logAuditEvent({
  action: "USER_LOGOUT",
  userId: currentUser.id,
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

---

## 2. Profile Updates

**File**: `app/api/profile/update/route.ts` or similar

```typescript
// When user updates profile (gender, goals, etc.)
await logAuditEvent({
  action: "PROFILE_UPDATED",
  userId: userId,
  resourceType: "PROFILE",
  details: {
    changedFields: Object.keys(updateData),
    updates: updateData, // Log what changed
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

---

## 3. Program Management

### Create Program
**File**: `app/api/programs/create/route.ts` or `components/program-wizard/ProgramWizard.tsx` (in API call)

```typescript
// When user creates a program
const program = await createProgram(templateData);

await logAuditEvent({
  action: "PROGRAM_CREATED",
  userId: userId,
  resourceType: "PROGRAM",
  resourceId: program.id,
  details: {
    programName: program.name,
    source: "template", // or "custom"
    daysPerWeek: program.daysPerWeek,
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

### Delete Program
**File**: `app/api/programs/delete/route.ts`

```typescript
// When user deletes a program
await logAuditEvent({
  action: "PROGRAM_DELETED",
  userId: userId,
  resourceType: "PROGRAM",
  resourceId: programId,
  details: {
    programName: program.name,
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

---

## 4. Workout Completion

**File**: `app/api/workouts/complete/route.ts` or wherever workout completion happens

```typescript
// When user completes a workout
await logAuditEvent({
  action: "WORKOUT_COMPLETED",
  userId: userId,
  resourceType: "WORKOUT",
  resourceId: workoutId,
  details: {
    programId: workoutData.programId,
    week: workoutData.week,
    day: workoutData.day,
    exercisesCompleted: workoutData.sets.length,
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

---

## 5. Admin Actions

**File**: Any admin endpoint

```typescript
// When admin does something (optional, for extra audit trail)
await logAuditEvent({
  action: "ADMIN_ACTION",
  userId: adminId,
  resourceType: "ADMIN",
  details: {
    adminAction: "USER_DATA_EXPORT",
    targetUserId: targetUserId,
    reason: "GDPR Request",
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

---

## Querying Audit Logs

### Get logs for a specific user (Admin only!)
```typescript
import { getAuditLogsForUser } from "@/lib/audit-logger";

const logs = await getAuditLogsForUser(userId);
```

### Get logs by action type
```typescript
import { getAuditLogsByAction } from "@/lib/audit-logger";

const loginLogs = await getAuditLogsByAction("USER_LOGIN");
```

### Get recent logs
```typescript
import { getRecentAuditLogs } from "@/lib/audit-logger";

const recentLogs = await getRecentAuditLogs(7); // Last 7 days
```

### Export as CSV
```typescript
import { exportAuditLogsCSV } from "@/lib/audit-logger";

const csv = await exportAuditLogsCSV(30); // Last 30 days
```

---

## Maintenance: Cleanup Old Logs

**Run this monthly** to keep database size under control:

```typescript
import { cleanupOldAuditLogs } from "@/lib/audit-logger";

// In a cron job or scheduled task
const deletedCount = await cleanupOldAuditLogs();
console.log(`Deleted ${deletedCount} old audit logs`);
```

Or manually in Supabase SQL editor:
```sql
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Storage Estimation (Tier 1)

```
5 critical actions per user per day
1,000 users = 5,000 rows/day

5,000 rows × 280 bytes ≈ 1.4 MB/day
× 30 days = 42 MB/month
× 12 months = 504 MB/year

✅ FREE TIER FOREVER (500 MB included)
```

---

## Security Notes

1. **RLS Policy**: Only admins can view audit logs
2. **Never log**: Passwords, tokens, API keys, credit cards
3. **Safe to log**: User IDs, action types, resource names
4. **IP Address**: Captured automatically (shows location/device)
5. **User Agent**: Helpful for detecting suspicious activity

---

## What NOT to Log

❌ Don't log:
- Page views
- Button clicks
- Form changes (only log submission)
- Component renders
- Tab switches
- API requests that aren't user actions

These would cause database bloat and cost money.

✅ Only log 8 critical actions (as listed in CRITICAL_ACTIONS)

---

## Implementation Checklist

- [ ] Run SQL in `AUDIT_LOGS_SETUP.sql` (create table in Supabase)
- [ ] Import `logAuditEvent` in auth flows
- [ ] Add logging to: signup, login, profile update
- [ ] Add logging to: program create/delete, workout complete
- [ ] Test audit logging is working
- [ ] Add cleanup job (run monthly)
- [ ] Create admin dashboard to view logs (optional)
- [ ] Document in your team wiki/docs

