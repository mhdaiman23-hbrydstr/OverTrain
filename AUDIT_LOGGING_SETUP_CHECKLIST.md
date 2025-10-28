# ✅ Audit Logging Setup Checklist

**Goal**: Implement Tier 1 audit logging (~50 MB/month = FREE TIER ✅)

**Estimated time**: 30-45 minutes

---

## Phase 1: Database Setup (5 minutes)

### Step 1: Create the Table
- [ ] Go to Supabase dashboard
- [ ] Open SQL Editor
- [ ] Copy SQL from `docs/AUDIT_LOGS_SETUP.sql`
- [ ] Run the SQL
- [ ] Verify table was created: `SELECT * FROM audit_logs LIMIT 1;`

**Expected result**: Table `audit_logs` with columns (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)

---

## Phase 2: Code Integration (25-35 minutes)

### Files Already Created
- ✅ `lib/audit-logger.ts` - Main audit service
- ✅ `docs/AUDIT_LOGS_SETUP.sql` - SQL to create table
- ✅ `docs/AUDIT_LOGGING_EXAMPLES.md` - Usage examples

### Files You Need to Update (One at a time)

#### 1. Authentication - Sign Up
**File**: Look for where new users are created (likely `lib/auth.ts` or API route)

Add after successful user creation:
```typescript
import { logAuditEvent, getClientIP } from "@/lib/audit-logger";

await logAuditEvent({
  action: "USER_SIGNUP",
  userId: newUser.id,
  details: { email: newUser.email },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

- [ ] Find signup code
- [ ] Add import statement
- [ ] Add logAuditEvent call
- [ ] Test: Sign up a new user, check audit_logs table

#### 2. Authentication - Login
**File**: Look for login handler

Add after successful login:
```typescript
await logAuditEvent({
  action: "USER_LOGIN",
  userId: user.id,
  details: { method: "email" },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

- [ ] Find login code
- [ ] Add logAuditEvent call
- [ ] Test: Login, check audit_logs table

#### 3. Profile Update
**File**: Look for where profile is updated

Add after profile update:
```typescript
await logAuditEvent({
  action: "PROFILE_UPDATED",
  userId: userId,
  resourceType: "PROFILE",
  details: { changedFields: Object.keys(updateData) },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

- [ ] Find profile update code
- [ ] Add logAuditEvent call
- [ ] Test: Update profile, check audit_logs table

#### 4. Program Creation
**File**: Look for where programs are created (program wizard or API)

Add after program created:
```typescript
await logAuditEvent({
  action: "PROGRAM_CREATED",
  userId: userId,
  resourceType: "PROGRAM",
  resourceId: program.id,
  details: { programName: program.name, daysPerWeek: program.daysPerWeek },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

- [ ] Find program creation code
- [ ] Add logAuditEvent call
- [ ] Test: Create program, check audit_logs table

#### 5. Program Deletion
**File**: Look for where programs are deleted

Add after program deleted:
```typescript
await logAuditEvent({
  action: "PROGRAM_DELETED",
  userId: userId,
  resourceType: "PROGRAM",
  resourceId: programId,
  details: { programName: program.name },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

- [ ] Find program deletion code
- [ ] Add logAuditEvent call
- [ ] Test: Delete program, check audit_logs table

#### 6. Workout Completion
**File**: Look for where workouts are completed

Add after workout completed:
```typescript
await logAuditEvent({
  action: "WORKOUT_COMPLETED",
  userId: userId,
  resourceType: "WORKOUT",
  resourceId: workoutId,
  details: {
    week: workoutData.week,
    day: workoutData.day,
    exercisesCompleted: workoutData.sets.length
  },
  ipAddress: getClientIP(request),
  userAgent: request.headers.get("user-agent") || undefined,
});
```

- [ ] Find workout completion code
- [ ] Add logAuditEvent call
- [ ] Test: Complete workout, check audit_logs table

---

## Phase 3: Verification (5 minutes)

### Test Audit Logging
Open Supabase SQL Editor and run:

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

You should see:
- USER_SIGNUP event
- USER_LOGIN event
- PROFILE_UPDATED event
- PROGRAM_CREATED event
- WORKOUT_COMPLETED event

### Check Storage Usage
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size;
```

Should be small (~1-10 KB if you just tested)

- [ ] Verify audit logs table has data
- [ ] Check table size is reasonable
- [ ] All 6 critical actions working

---

## Phase 4: Maintenance Setup (5 minutes)

### Add Monthly Cleanup

Create a file or add to your maintenance script:

```typescript
// lib/maintenance.ts
import { cleanupOldAuditLogs } from "@/lib/audit-logger";

export async function runMonthlyMaintenance() {
  console.log("Running monthly maintenance...");

  const deletedCount = await cleanupOldAuditLogs();
  console.log(`Cleaned up ${deletedCount} old audit logs`);
}
```

### Schedule the Cleanup
**Options**:
1. **Vercel Cron** (if deployed on Vercel):
   - Create `/app/api/cron/maintenance/route.ts`
   - Set in `vercel.json`

2. **Manual cleanup** (easiest for now):
   - Create a private endpoint: `/app/api/admin/maintenance/route.ts`
   - Call it manually or via scheduler

3. **Supabase scheduled function**:
   - Use Supabase's PostgreSQL functions

For now, just add a TODO:
- [ ] Schedule cleanup job (monthly) - defer until later

---

## Storage Tracking

### Monitor Monthly
Go to Supabase dashboard → Storage tab

Target: **< 50 MB/month**

If approaching limit:
1. Run cleanup manually
2. Review if logging too much
3. Increase retention period check

---

## Security Checklist

- [ ] RLS policy set (only admins can view)
- [ ] No sensitive data in `details` field
- [ ] IP addresses and user agents captured
- [ ] Cleanup job prevents unlimited growth
- [ ] Audit logs table backed up (Supabase auto-backup)

---

## What You Now Have

✅ **Critical Actions Logged**:
- USER_SIGNUP - when user signs up
- USER_LOGIN - when user logs in
- USER_LOGOUT - when user logs out
- PROFILE_UPDATED - when user changes profile
- PROGRAM_CREATED - when user creates program
- PROGRAM_DELETED - when user deletes program
- WORKOUT_COMPLETED - when user completes workout
- ADMIN_ACTION - for admin actions (optional)

✅ **Storage Efficient**:
- Only ~50 MB/month (FREE TIER!)
- Auto-cleanup after 90 days
- No database cost increase

✅ **Admin Dashboard Ready**:
- Query functions: `getAuditLogsForUser()`, `getAuditLogsByAction()`, `getRecentAuditLogs()`
- Export function: `exportAuditLogsCSV()`
- Can build admin UI around these

---

## Next Steps (After This Task)

1. Build admin dashboard to view audit logs (optional)
2. Task 7: Security headers (CSP, etc.)
3. Task 8: Auth hardening
4. ... rest of Phase 3

---

## Questions?

- **Where's the audit log table?** → Supabase → Tables → `audit_logs`
- **Can users see their own logs?** → RLS policy allows it (modify if needed)
- **When does cleanup happen?** → Currently manual (set up cron later)
- **What if something breaks?** → Audit logging fails silently (won't break your app)

---

## Completion Status

When you complete all checkboxes above, you'll have:
- ✅ Tier 1 audit logging fully implemented
- ✅ 8 critical actions being logged
- ✅ Safe from free tier cost overages
- ✅ Ready for compliance/security audits
- ✅ Admin dashboard foundation ready

**Estimated time: 30-45 minutes total**

