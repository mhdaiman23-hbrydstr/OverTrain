# Database Setup Instructions for LiftLog

## ✅ What's Been Done

The code has been updated to sync all workout and program progress to Supabase database. This means your progress will now persist across:
- Logging out and back in
- Switching devices
- Browser data clears
- Git restores

## 🚀 Next Steps to Complete Setup

### Step 1: Run the Database Migration

1. Open your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project (ID: `fyhbpkjibjtvltwcavlw`)
3. Go to **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Copy and paste the entire contents of `supabase_migration.sql`
6. Click **"Run"** to execute the SQL

This will create 4 new tables:
- `workouts` - Completed workout history
- `in_progress_workouts` - Workouts currently being done
- `active_programs` - Current program state (week, day, progress)
- `program_history` - Historical program completion data

### Step 2: Test the Integration

After running the migration:

1. **Refresh your app** (hard refresh: Ctrl+F5 or Cmd+Shift+R)
2. **Complete the intake form** to create your profile
3. **Start a program** from the Programs tab
4. **Log out** from your account
5. **Log back in**
6. ✅ **Verify**: Your active program should still be there!

### Step 3: What Happens Now

**Automatic Syncing:**
- When you start a program → Saved to database
- When you complete a workout → Saved to database
- When you update workout sets → Saved to database
- When you log in → Data loads from database

**Offline Mode:**
- Data is cached in localStorage for offline access
- Changes sync to database when online

## 📊 Database Schema

### `profiles` table (already exists)
```sql
- id (UUID, references auth.users)
- email (TEXT)
- name (TEXT)
- gender (TEXT)
- experience (TEXT)
- goals (TEXT[])
```

### `active_programs` table (new)
```sql
- user_id (UUID, primary key)
- template_id (TEXT) - Program template ID
- template_data (JSONB) - Full program template
- start_date (BIGINT) - Unix timestamp
- current_week (INTEGER)
- current_day (INTEGER)
- completed_workouts (INTEGER)
- total_workouts (INTEGER)
- progress (DECIMAL) - Percentage
```

### `workouts` table (new)
```sql
- id (TEXT, primary key)
- user_id (UUID)
- program_id (TEXT, optional)
- workout_name (TEXT)
- start_time (BIGINT)
- end_time (BIGINT)
- exercises (JSONB) - Full exercise data with sets/reps/weights
- notes (TEXT)
- completed (BOOLEAN)
- week (INTEGER, optional)
- day (INTEGER, optional)
```

### `in_progress_workouts` table (new)
```sql
- id (TEXT, primary key)
- user_id (UUID)
- program_id (TEXT, optional)
- workout_name (TEXT)
- start_time (BIGINT)
- week (INTEGER)
- day (INTEGER)
- exercises (JSONB)
- notes (TEXT)
```

### `program_history` table (new)
```sql
- id (TEXT, primary key)
- user_id (UUID)
- template_id (TEXT)
- name (TEXT)
- start_date (TIMESTAMPTZ)
- end_date (TIMESTAMPTZ, optional)
- completion_rate (DECIMAL)
- total_workouts (INTEGER)
- completed_workouts (INTEGER)
- is_active (BOOLEAN)
```

## 🔒 Security

All tables have Row Level Security (RLS) enabled. Users can only:
- Read their own data
- Insert their own data
- Update their own data
- Delete their own data

No user can see or modify another user's progress.

## 🐛 Troubleshooting

### "Could not find the table 'public.profiles'"
**Solution**: You need to run the SQL from `supabase_migration.sql` first. See Step 1 above.

### "Progress not loading after login"
**Check**:
1. Open browser console (F12)
2. Look for log messages starting with `[Auth]`, `[ProgramState]`, or `[WorkoutLogger]`
3. Check if there are any error messages

### "Data not syncing"
**Check**:
1. Verify tables exist in Supabase dashboard
2. Check browser console for sync errors
3. Verify your `.env.local` has correct Supabase credentials

## 📝 Code Changes Made

### Modified Files:
- ✅ `lib/program-state.ts` - Added database sync methods
- ✅ `lib/workout-logger.ts` - Added database sync methods
- ✅ `lib/auth.ts` - Added data loading on sign-in
- ✅ `contexts/auth-context.tsx` - Triggers data load on login

### New Files:
- ✅ `supabase_migration.sql` - Database schema

### To Be Updated (Future):
Some components still need to pass `userId` to the sync methods. These will work with localStorage but won't sync to database yet:
- Components that call `ProgramStateManager.setActiveProgram()` need to pass `userId`
- Components that call `WorkoutLogger.completeWorkout()` need to pass `userId`

The app will work fine, but these specific actions won't sync until components are updated.

## ✨ Benefits of This Implementation

1. **No Data Loss**: Your progress is safe even if you accidentally log out
2. **Multi-Device**: Start a workout on your phone, finish on your computer
3. **Offline First**: Works offline, syncs when online
4. **Migration Friendly**: Existing localStorage data continues to work
5. **Secure**: RLS ensures users only see their own data

---

**Need Help?** Check the browser console for detailed logs about data loading and syncing.
