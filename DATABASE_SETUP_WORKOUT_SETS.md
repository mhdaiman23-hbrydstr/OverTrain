# Workout Sets Table Setup Guide

## Overview

The `workout_sets` table enables real-time logging of individual set completions during workouts. This provides:

- ✅ Real-time sync to database as sets are completed
- ✅ Detailed analytics on set-by-set performance
- ✅ Complete user isolation via Row Level Security (RLS)
- ✅ Offline support with automatic sync when reconnected

## Prerequisites

Before running the migration, ensure:

1. You have access to your Supabase SQL Editor
2. The main migration (`supabase_migration.sql`) has been run, which includes the `handle_updated_at()` function
3. Users table exists in `auth.users` (created automatically by Supabase Auth)

## Setup Instructions

### Option 1: Run Standalone Migration File

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `workout_sets_migration.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Option 2: Run SQL Directly

Copy and paste the following SQL into your Supabase SQL Editor:

```sql
-- Create workout_sets table
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at BIGINT NOT NULL,
  notes TEXT,
  week INTEGER,
  day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workout sets"
  ON public.workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sets"
  ON public.workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sets"
  ON public.workout_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sets"
  ON public.workout_sets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON public.workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON public.workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_week_day ON public.workout_sets(user_id, week, day);
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed_at ON public.workout_sets(completed_at);

CREATE TRIGGER workout_sets_updated_at
  BEFORE UPDATE ON public.workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

## Verification

After running the migration, verify it was successful:

### 1. Check Table Exists

```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'workout_sets') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'workout_sets';
```

**Expected result:** One row with `workout_sets` and `14` columns.

### 2. Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'workout_sets';
```

**Expected result:** `rowsecurity` should be `true`.

### 3. Verify Policies

```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'workout_sets';
```

**Expected result:** Four policies:
- `Users can read own workout sets`
- `Users can insert own workout sets`
- `Users can update own workout sets`
- `Users can delete own workout sets`

### 4. Verify Indexes

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'workout_sets';
```

**Expected result:** At least 5 indexes including:
- `workout_sets_pkey` (primary key)
- `idx_workout_sets_user_id`
- `idx_workout_sets_workout_id`
- `idx_workout_sets_week_day`
- `idx_workout_sets_completed_at`

## User Isolation & Security

The `workout_sets` table ensures complete user data isolation through multiple layers:

### 1. Database-Level Foreign Key
```sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```
- Each set record is permanently linked to a specific user
- If a user account is deleted, all their sets are automatically deleted
- Cannot insert sets without a valid user_id

### 2. Row Level Security (RLS) Policies
All CRUD operations check: `auth.uid() = user_id`

This means:
- Users can **ONLY** see their own sets
- Users can **ONLY** insert sets with their own user_id
- Users can **ONLY** update/delete their own sets
- Even if malicious code attempts to access another user's data, Supabase RLS blocks it at the database level

### 3. Indexed Queries
All indexes include `user_id`, ensuring:
- Fast queries are automatically scoped to the authenticated user
- No performance penalty for multi-tenant data isolation

## Troubleshooting

### Error: "function handle_updated_at() does not exist"

**Solution:** Run the main migration file first (`supabase_migration.sql`), which creates this function. Or uncomment the function creation in `workout_sets_migration.sql`:

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Error: "permission denied for schema public"

**Solution:** Ensure you're running the SQL as a database admin/owner. In Supabase, use the SQL Editor (not the API).

### RLS Policies Not Working

**Solution:** 
1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'workout_sets';`
2. Check you're authenticated: `SELECT auth.uid();` (should return your user UUID)
3. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'workout_sets';`

### "Sync error" Still Appears in App

**Possible causes:**
1. Table not created yet - verify using queries above
2. User not authenticated - check `auth.uid()` in SQL Editor
3. RLS policies blocking insert - temporarily disable RLS to test (NOT for production):
   ```sql
   ALTER TABLE public.workout_sets DISABLE ROW LEVEL SECURITY; -- Testing only!
   ```
4. Network issues - check browser console for detailed error messages

## Testing

After setup, test the sync by:

1. Start a workout in the app
2. Log a set (mark it complete)
3. Check for the green "Set synced to database" banner
4. Verify in Supabase dashboard:
   ```sql
   SELECT * FROM public.workout_sets 
   WHERE user_id = auth.uid() 
   ORDER BY completed_at DESC 
   LIMIT 5;
   ```

## Next Steps

Once the table is created:
- ✅ The "Sync error" banner should disappear
- ✅ Sets will sync in real-time as you complete them
- ✅ You'll see a brief "Set synced to database" confirmation
- ✅ Offline sets will automatically sync when you reconnect

## Support

If you continue to experience issues:
1. Check browser console (F12) for detailed error messages
2. Verify environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Check Supabase logs for RLS policy rejections

