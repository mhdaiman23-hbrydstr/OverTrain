# LiftLog Database Setup Guide

## Problem: Data Loss When Changing Ports

When you start your development server on a different port (e.g., `localhost:3000` → `localhost:3001`), your workout data disappears. This is because `localStorage` is tied to the specific origin (protocol + domain + port).

## Solution: Supabase Database Sync

LiftLog now automatically syncs your workout data to Supabase, so your progress persists across:
- Different ports
- Different devices
- Browser cache clears
- New installations

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project (choose a region close to you)
4. Wait for the database to be provisioned (~2 minutes)

### 2. Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase_migration.sql` from this project
3. Paste into the SQL editor
4. Click **Run** to execute the migration

This creates 4 tables:
- `workouts` - Completed workout history
- `in_progress_workouts` - Current workouts in progress
- `active_programs` - Your current active program
- `program_history` - Historical programs

### 3. Configure Environment Variables

1. In Supabase dashboard, go to **Project Settings** → **API**
2. Copy your:
   - **Project URL** (under "Project URL")
   - **Anon/Public Key** (under "Project API keys" → "anon public")

3. Create `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

4. Restart your development server

### 4. Verify Setup

1. Sign in to LiftLog
2. Complete a workout
3. Check browser console for: `[v0] Workout synced to database`
4. In Supabase dashboard → **Table Editor** → **workouts**, you should see your completed workout

## How It Works

### Automatic Sync
Your data syncs automatically:
- ✅ **On sign in** - Loads all your data from database to localStorage
- ✅ **On workout completion** - Syncs completed workout to database
- ✅ **On program changes** - Syncs active program and history

### Data Flow

```
┌─────────────────┐
│   localStorage  │ ← Fast local access
│  (browser only) │
└────────┬────────┘
         │
         ↓ Sync on completion
┌─────────────────┐
│    Supabase     │ ← Persistent storage
│   (cloud DB)    │
└─────────────────┘
         │
         ↓ Load on sign in
┌─────────────────┐
│   localStorage  │ ← Available on any device/port
│  (new session)  │
└─────────────────┘
```

### What Gets Synced

- **Completed Workouts** - Full exercise data, sets, reps, weights, notes
- **In-Progress Workouts** - Current workout state (for resuming later)
- **Active Program** - Current program, week, day, progress
- **Program History** - Past programs with completion rates

## Troubleshooting

### Data Not Syncing

1. **Check console for errors:**
   - Open DevTools (F12) → Console
   - Look for `[WorkoutLogger]` or `[ProgramStateManager]` messages

2. **Verify environment variables:**
   ```bash
   # Should show your Supabase URL and key
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **Check Row Level Security (RLS):**
   - In Supabase → **Authentication** → **Policies**
   - Ensure policies are enabled for all tables
   - Policies should allow users to read/write their own data

### Data Not Loading

1. **Check if signed in:**
   - You must be signed in with Supabase Auth (not localStorage fallback)
   - Email/password should match your Supabase account

2. **Clear and reload:**
   ```javascript
   // In browser console:
   localStorage.clear()
   location.reload()
   ```
   Then sign in again - data should load from database

### Migration Failed

If you get SQL errors:

1. **Table already exists:**
   - Change `CREATE TABLE IF NOT EXISTS` to `CREATE TABLE`
   - Or drop existing tables first (⚠️ loses data):
   ```sql
   DROP TABLE IF EXISTS workouts CASCADE;
   DROP TABLE IF EXISTS in_progress_workouts CASCADE;
   DROP TABLE IF EXISTS active_programs CASCADE;
   DROP TABLE IF EXISTS program_history CASCADE;
   ```

2. **Permission errors:**
   - Ensure you're using the SQL editor as the project owner
   - Check that RLS policies are correctly set

## Alternative: Export/Import (Manual Backup)

If you prefer manual control, you can export/import your localStorage data:

### Export Data
```javascript
// In browser console:
const data = {
  workouts: localStorage.getItem('liftlog_workouts'),
  inProgress: localStorage.getItem('liftlog_in_progress_workouts'),
  activeProgram: localStorage.getItem('liftlog_active_program'),
  programHistory: localStorage.getItem('liftlog_program_history')
}
console.log(JSON.stringify(data))
// Copy the output and save to a file
```

### Import Data
```javascript
// In browser console:
const data = {/* paste your exported data here */}
localStorage.setItem('liftlog_workouts', data.workouts)
localStorage.setItem('liftlog_in_progress_workouts', data.inProgress)
localStorage.setItem('liftlog_active_program', data.activeProgram)
localStorage.setItem('liftlog_program_history', data.programHistory)
location.reload()
```

## Support

If you continue experiencing data loss:
1. Check the browser console for error messages
2. Verify Supabase tables exist and have correct RLS policies
3. Ensure `.env.local` has correct values and server is restarted
4. Open an issue on GitHub with console logs

---

**Note:** The database sync is already implemented in the code. You just need to set up Supabase and configure the environment variables!
