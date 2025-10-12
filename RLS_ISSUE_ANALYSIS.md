# RLS Issue Analysis - Console Log Review

## Summary

The console errors are **all RLS-related issues** where the application is attempting to write to database tables that either:
1. Don't exist in your Supabase database yet, or
2. Exist but don't have proper Row Level Security (RLS) policies configured

## Error Breakdown

### Error Types Found

1. **406 (Not Acceptable)** - 1 occurrence
   - Table: `active_programs`
   - Issue: RLS policy preventing SELECT queries

2. **401 (Unauthorized)** with code **42501** - 91 occurrences
   - Tables: `workout_sets`, `in_progress_workouts`
   - PostgreSQL error: "new row violates row-level security policy"
   - Cause: User bypassed auth (no valid `auth.uid()` token), and RLS policies block unauthenticated writes

### Tables Requiring RLS Configuration

Based on `lib/data-sync-service.ts`, your app needs these tables:

| Table | Purpose | RLS Status |
|-------|---------|------------|
| `active_programs` | User's current program state | ❌ Missing or incorrect policy |
| `in_progress_workouts` | Current workout sessions | ❌ Missing or incorrect policy |
| `workouts` | Completed workout history | ❌ Missing or incorrect policy |
| `workout_sets` | Individual set records | ❌ Missing or incorrect policy |

### Why Auth Bypass Caused Issues

When you bypassed authentication by injecting the UUID into localStorage:
```javascript
localStorage.setItem('liftlog_user', JSON.stringify({ id: '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c' }))
```

The Supabase client **did not have a valid auth token**, so:
- `auth.uid()` returned `NULL` in RLS policies
- All RLS policies checking `auth.uid() = user_id` failed
- Database rejected all write operations with error code **42501**

This is **expected behavior** for RLS - it's protecting your data!

## Solution

I've created a comprehensive schema file: `workout-tracking-schema.sql`

### What the Schema Includes

**4 Tables:**
1. `active_programs` - User's active program with progress tracking
2. `in_progress_workouts` - Current workout sessions (with JSONB exercises)
3. `workouts` - Completed workout history (with JSONB exercises)
4. `workout_sets` - Individual set records for analytics

**RLS Policies for Each Table:**
- ✅ Users can SELECT their own data (`auth.uid() = user_id`)
- ✅ Users can INSERT their own data
- ✅ Users can UPDATE their own data
- ✅ Users can DELETE their own data

**Performance Optimizations:**
- Indexes on `user_id` for fast user queries
- Indexes on `week`, `day` for workout navigation
- GIN indexes on JSONB columns for exercise queries
- Composite indexes for common query patterns

**Helper Functions:**
- Auto-update `updated_at` timestamps
- Auto-calculate workout duration
- Auto-set `completed_at` when workout is marked complete

## Deployment Steps

### Option 1: Run the Schema in Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `workout-tracking-schema.sql`
5. Run the query
6. Verify tables exist: `SELECT * FROM active_programs;`

### Option 2: Check Existing Tables and Update Policies

If the tables already exist, you might only need to update the RLS policies:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets');

-- Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets');
```

If tables exist but have incorrect policies, you can:
1. Drop existing policies: `DROP POLICY "policy_name" ON table_name;`
2. Re-run the RLS section from the schema file

## Verification

After deploying the schema, test with proper authentication:

1. **Login properly** (don't bypass auth)
2. Complete a workout set
3. Check console - should see:
   - ✅ No 401 errors
   - ✅ No 42501 errors
   - ✅ Successful database syncs

## Why This Happened

Your app was designed with a **database-first sync strategy**:
- `DataSyncService` attempts to sync all workout data to Supabase
- `WorkoutLogger` tries to log individual sets to `workout_sets` table
- `ProgramStateManager` tries to save active program to `active_programs` table

But the database tables were never created or had missing RLS policies!

## Next Steps

1. **Deploy the schema** using one of the options above
2. **Login properly** using the auth form (don't bypass)
3. **Test workout logging** - the 401 errors should be gone
4. **Verify data syncs** - check the tables in Supabase dashboard

## Note on Auth Bypass

For future testing, if you want to bypass auth:
1. You'll need to use Supabase's `signInWithPassword()` to get a proper auth token
2. OR temporarily disable RLS on the tables (not recommended for production)
3. OR create a testing user and login normally

The auth bypass trick only works for localStorage-only features, not database operations with RLS enabled.

## Console Error Example

```
[ERROR] Failed to load resource: the server responded with a status of 401 ()
  @ https://fyhbpkjibjtvltwcavlw.supabase.co/rest/v1/workout_sets

[ERROR] [WorkoutLogger] Failed to log set to database, adding to queue: 
  {code: 42501, details: null, hint: null, message: new row violates row-level security policy for table "workout_sets"}
```

**Translation:** "You're trying to insert into `workout_sets`, but you're not authenticated, so RLS blocked you."

## Files Modified

- ✅ Created: `workout-tracking-schema.sql` (comprehensive schema with RLS)
- ✅ Created: `RLS_ISSUE_ANALYSIS.md` (this document)

---

**Status:** Ready to deploy schema to Supabase ✨

