# RLS Safe Deployment Checklist

**Status**: Ready to Deploy (with Pre-Flight Check)
**Date**: 2025-10-29
**Branch**: `feat/workout-cleanup-and-rls`

---

## Why We're Doing This Safely

### The Problem With Previous RLS Attempts

**What Went Wrong**:
- RLS was added to tables without verifying data integrity
- Existing workouts had NULL or mismatched `user_id` values
- Policy: `auth.uid() = user_id` would fail if `user_id` was NULL
- Result: Users couldn't read their own workouts → App broke

**Why This Happened**:
```
Table: workouts (before RLS)
Row 1: { id: 'abc', user_id: null, ... }        ← Corrupted!
Row 2: { id: 'def', user_id: 'user-xyz', ... }  ← Good

Add RLS Policy: USING (auth.uid() = user_id)

Query: SELECT * FROM workouts
User 'user-xyz' tries to read Row 1:
  Is auth.uid() (user-xyz) = user_id (null)? NO ❌
  Row 1 filtered out

User 'user-xyz' tries to read Row 2:
  Is auth.uid() (user-xyz) = user_id (user-xyz)? YES ✓
  Row 2 returned

Result: User sees missing workouts, confusion, bugs reported
```

### Why This Approach is Different

✅ **Pre-Flight Data Integrity Check**
- Verifies ALL workouts have valid `user_id` before RLS
- Catches NULL, orphaned, and corrupted data
- Script can fix data or reject deployment

✅ **Service Role Already In Use**
- Admin operations use service role (bypasses RLS)
- Existing code already handles this pattern
- No breaking changes needed

✅ **Error Handling Ready**
- Code catches RLS violations (error 42501)
- Exercise notes service: Already has RLS error handlers
- Won't crash silently

✅ **Gradual Rollout**
- Only enforcing RLS on properly-structured data
- Can rollback by dropping policies (no schema changes)
- Helper functions for complex checks

---

## Three-Phase Deployment

### Phase 1: Pre-Flight Check (MUST DO FIRST)

**File**: `migrations/pre-rls-data-integrity-check.sql`

**Actions**:
```sql
1. Run integrity checks (read-only, safe)
2. Review output for any ❌ DANGER items
3. If found: Fix using provided scripts or delete
4. Re-run to verify all ✅ SAFE
```

**Expected Output** (all should be ✅):
```
✅ workouts_missing_user_id = 0
✅ in_progress_workouts_missing_user_id = 0
✅ workout_sets_orphaned = 0
✅ exercise_notes_missing_user_id = 0
✅ exercise_notes_orphaned = 0
✅ exercise_custom_rpe_missing_user_id = 0
✅ program_templates_invalid_for_public = 0
✅ active_programs_orphaned = 0
```

**If ANY fails**:
```
❌ DO NOT proceed to Phase 2
❌ DO NOT apply RLS policies
❌ Fix using provided scripts
❌ Re-run check until all ✅
```

**Time**: 5 minutes

**Risk**: None (read-only)

---

### Phase 2: Apply RLS Policies

**File**: `migrations/add-rls-policies-all-tables.sql`

**Prerequisites**:
- ✅ All Phase 1 checks passed
- ✅ Data verified clean

**Actions**:
```sql
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire migration file
3. Run in SQL Editor
4. Review output (should show all policies created)
```

**Verification** (run queries at end of migration):
```sql
-- Should show 25+ policies created
SELECT COUNT(*) FROM pg_policies

-- Should show all tables with RLS enabled
SELECT * FROM pg_tables WHERE rowsecurity = true
```

**What Gets Created**:

| Category | Tables | Policy Count |
|----------|--------|--------------|
| User-Specific | 5 tables | 20 policies (4 per table) |
| Public Templates | 3 tables | 15 policies (5 per table) |
| Public Reference | 2 tables | 2 policies (1 per table) |
| Config | 1 table | 1 policy |
| Helper Functions | - | 3 functions |
| **Total** | **11 tables** | **38 items** |

**Time**: 2-5 minutes (depends on data volume)

**Risk**: Low
- No data deleted
- No schema changes
- Policies can be dropped to rollback
- Service role unaffected (admin operations work)

---

### Phase 3: Cleanup Test Data

**File**: `migrations/cleanup-test-workouts.sql`

**Prerequisites**:
- ✅ Phase 2 complete
- ✅ App working (test user can access workouts)

**Actions**:
```sql
1. Run SECTION 1 (analysis queries)
   - Count workouts by status
   - Identify test users
   - Review output carefully

2. If output looks correct:
   - Uncomment SECTION 2 (cleanup operations)
   - Run selected cleanup queries
   - Or run full script if confident

3. Run SECTION 4 (verification)
   - Verify counts reduced
   - Check VACUUM completed
```

**Conservative Cleanup** (won't delete production data):
```sql
-- Delete very old abandoned sessions (30+ days)
DELETE FROM in_progress_workouts
WHERE created_at < NOW() - INTERVAL '30 days'

-- Delete incomplete old workouts (7+ days, marked test)
DELETE FROM workouts
WHERE (completed = false OR skipped = true)
  AND created_at < NOW() - INTERVAL '7 days'
  AND notes ILIKE '%test%'
```

**Full Cleanup** (only if you're very confident):
```sql
-- Provided template in Section 3 to delete all data for specific test user
-- Requires manually specifying user UUID first
```

**Time**: 5-10 minutes

**Risk**: Medium
- Deletes data (but conservative approach)
- Analysis queries first (safe decision making)
- Backup first (export to CSV in Supabase UI)

---

## Testing After Deployment

### Test 1: User Can Read Own Workouts

```typescript
// In browser console while logged in as User A:
const { data, error } = await supabase
  .from('workouts')
  .select('*')

// Should work: data has workouts
// Should NOT show: User B's workouts
```

**Expected**: ✅ See your workouts, not others'

### Test 2: User Cannot Read Other User's Workouts

```sql
-- In Supabase SQL Editor as admin (service role):
-- Manually run as User B (set different auth token)
SELECT * FROM workouts WHERE user_id != 'user-a-uuid'

-- User B should see: only their own workouts
-- User B should NOT see: User A's workouts
```

**Expected**: ✅ RLS policy filters correctly

### Test 3: Admin/Service Role Still Works

```typescript
// Admin operations should work normally
// Verified if template import/deletion doesn't error
```

**Expected**: ✅ Admin operations unaffected

### Test 4: Public Templates Visible

```sql
-- Any authenticated user should see public templates
SELECT * FROM program_templates WHERE is_public = true

-- User should see: public templates
-- User should NOT see: other user's private templates
```

**Expected**: ✅ Public templates visible, private ones hidden

---

## Rollback Plan

### If Phase 2 Breaks App

**Option A: Drop All Policies** (fastest, but loses RLS)
```sql
-- In Supabase SQL Editor (as admin/service role):
DROP POLICY "Users can view own workouts" ON workouts;
DROP POLICY "Users can insert own workouts" ON workouts;
-- ... repeat for all 38 policies

-- Or, drop all at once:
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE in_progress_workouts DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

**Option B: Fix Specific Policy** (if you identify the issue)
```sql
-- Find problematic policy
SELECT * FROM pg_policies WHERE tablename = 'workouts'

-- Drop just that policy
DROP POLICY "problematic-policy-name" ON workouts

-- Replace with corrected version
CREATE POLICY "fixed-policy" ON workouts ...
```

**Option C: Revert to Previous Backup**
- If using version control, revert branch
- If using Supabase backup, restore snapshot

### If Phase 3 Deletes Wrong Data

**Recovery**:
1. Restore from Supabase backup (automatic daily backups)
2. Or restore from exported CSV (manual backup)
3. Rerun analysis queries to prevent next time

---

## Pre-Deployment Checklist

- [ ] On branch `feat/workout-cleanup-and-rls`
- [ ] Reviewed this entire document
- [ ] Have Supabase dashboard access
- [ ] Know how to access SQL Editor
- [ ] Have backup plan in place
- [ ] Scheduled during low-traffic time
- [ ] Team notified of maintenance window

---

## Deployment Day Steps

### Morning (Communicate)
- [ ] Notify users: "Database maintenance 2pm - 3pm EST, brief downtime possible"
- [ ] Close any running workouts/sessions in app
- [ ] Take backup of critical data manually

### Deployment (Execute)
- [ ] Step 1: Run pre-flight check (5 min)
  - [ ] All ✅ checks pass?
  - [ ] If not, fix and re-check
- [ ] Step 2: Apply RLS policies (5 min)
  - [ ] All policies created?
  - [ ] No error messages?
- [ ] Step 3: Test app (5 min)
  - [ ] User can login? ✅
  - [ ] User can view workouts? ✅
  - [ ] User cannot view other's workouts? ✅
- [ ] Step 4: Cleanup (5-10 min)
  - [ ] Review analysis output
  - [ ] Run cleanup (or skip if keeping test data)
  - [ ] Verify counts

### Evening (Confirm)
- [ ] Monitor error logs for 24 hours
- [ ] Search for error code 42501 (RLS violations)
- [ ] If problems found, initiate rollback
- [ ] If all good, notify team: "RLS deployment complete"

---

## Success Criteria

✅ **Deployment Successful** if:
- All pre-flight checks showed ✅ SAFE
- All 38 policies created without errors
- Users can access their own workouts
- Users cannot access other users' workouts
- Admin operations still work
- Public templates visible to all users
- Private templates only visible to owner
- No "Insufficient privileges" errors in logs

❌ **Deployment Failed** if:
- Pre-flight checks showed ❌ DANGER
- RLS policy creation had errors
- Users cannot access their own data
- Admin operations fail
- Error code 42501 appears in logs frequently

---

## Files Reference

| File | Purpose | When to Use |
|------|---------|-----------|
| `pre-rls-data-integrity-check.sql` | Verify data before RLS | Phase 1 (FIRST) |
| `add-rls-policies-all-tables.sql` | Apply all RLS policies | Phase 2 (after Phase 1 ✅) |
| `cleanup-test-workouts.sql` | Delete old test data | Phase 3 (after Phase 2 ✅) |
| `CLEANUP_AND_RLS_STRATEGY.md` | Detailed strategy doc | Reference |
| `RLS_SAFE_DEPLOYMENT_CHECKLIST.md` | This file | Deployment guide |

---

## Questions?

**Q: Will RLS slow down queries?**
A: Minimal impact (~1-5ms per query). RLS is just an extra WHERE clause.

**Q: Can we rollback after deployment?**
A: Yes, drop policies using `DROP POLICY` commands. Schema unchanged, no data affected.

**Q: What if we skip the pre-flight check?**
A: **Don't**. That's how we broke things before. It takes 5 minutes and prevents catastrophe.

**Q: Will admin operations break?**
A: No. Service role bypasses RLS. Admin routes continue working.

**Q: How do we test if RLS is working?**
A: Use SQL Editor to query as different users (different auth tokens). One user shouldn't see another's data.

---

## Emergency Contact

If deployment breaks production:
1. Drop all RLS policies (provided rollback script)
2. Restore from backup if data lost
3. Investigate what went wrong
4. Fix in dev, test thoroughly
5. Re-deploy with confidence

---

**Status**: Ready to deploy
**Last Updated**: 2025-10-29
**Next Step**: Run pre-flight check
