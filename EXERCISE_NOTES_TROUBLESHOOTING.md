# Exercise Notes - Troubleshooting & Setup Guide

## Current Status

The `ExerciseNotesService` has been updated with:
- ✅ Supabase as source of truth
- ✅ localStorage caching for fast performance
- ✅ Background sync queue for offline support
- ✅ Graceful error handling
- ✅ Improved error logging

## Error You're Seeing

```
[ExerciseNotes] Failed to hydrate cache: {}
[ExerciseNotes] Failed to fetch week notes: {}
```

**This happens when:** The Supabase table `exercise_notes` doesn't exist or isn't accessible.

---

## Fix Steps

### Step 1: Verify Supabase Table Exists

**In Browser Console**, run:
```javascript
// Check if table is accessible
const isAccessible = await ExerciseNotesService.isTableAccessible()
console.log('Table accessible:', isAccessible)
```

**OR** Check in Supabase Dashboard:
1. Go to your Supabase project
2. Click **SQL Editor**
3. Run:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name = 'exercise_notes'
   ```
4. If it returns nothing → table doesn't exist

### Step 2: Create the Table (If Missing)

If table doesn't exist, run the migration in Supabase SQL Editor:

```sql
-- Create exercise_notes table
CREATE TABLE IF NOT EXISTS exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_instance_id, exercise_id, week)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_notes_user_program ON exercise_notes(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_notes_exercise_week ON exercise_notes(exercise_id, week);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON exercise_notes(is_pinned) WHERE is_pinned = true;
```

### Step 3: Check RLS Policies

By default, Supabase has restrictive RLS. You need to allow reads/writes for authenticated users.

In Supabase Dashboard → **Authentication** → **Policies**:

Add these policies if they don't exist:

```sql
-- Allow users to read their own notes
CREATE POLICY "Users can read their own notes"
ON exercise_notes FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own notes
CREATE POLICY "Users can insert their own notes"
ON exercise_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notes
CREATE POLICY "Users can update their own notes"
ON exercise_notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own notes
CREATE POLICY "Users can delete their own notes"
ON exercise_notes FOR DELETE
USING (auth.uid() = user_id);
```

### Step 4: Verify Environment Variables

Check that your `.env.local` has:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## How to Monitor Errors

The console now logs detailed error information with this format:

```javascript
// Error with details
{
  code: "42P01",  // PostgreSQL error code
  message: "relation 'exercise_notes' does not exist",
  details: "...",
  hint: "..."
}
```

**Common Codes:**
- `42P01` → Table doesn't exist
- `PGRST116` → No rows found (this is OK)
- `42501` → Permission denied (RLS policy issue)

---

## Expected Behavior (After Fixes)

### Scenario 1: Table Exists & Accessible ✓
```
[ExerciseNotes] Hydrating cache for program instance: abc-123
[ExerciseNotes] Hydrated 5 notes for program instance
```

### Scenario 2: Table Doesn't Exist Yet (First Time) ✓
```
[ExerciseNotes] Hydrating cache for program instance: abc-123
[ExerciseNotes] Table not found or empty, starting with clean cache
```
→ App continues working with localStorage only
→ When you add a note, it queues for Supabase
→ When table is created later, sync completes

### Scenario 3: Offline Mode ✓
```
[ExerciseNotes] Queued save sync, queue size: 1
[ExerciseNotes] Synced note save: xyz-456  // Once online
```

---

## Testing the Implementation

### Test 1: Add a Note
1. Go to a workout exercise
2. Click "Notes" dropdown
3. Add note: "Test note"
4. Pin it
5. Check **localStorage**: `window.localStorage.getItem('liftlog_exercise_notes')`

### Test 2: Verify Week-to-Week Repeat
1. Add pinned note in Week 1
2. Go to Week 2
3. Open same exercise
4. Note should appear automatically ✓

### Test 3: Check Sync Queue
```javascript
// In console
ExerciseNotesService.getSyncQueue()
// Should be empty [] if synced
// Should have items if offline or sync failed
```

### Test 4: Force Retry Sync
```javascript
// In console - manually retry pending syncs
await ExerciseNotesService.retrySyncQueue()
```

---

## Common Issues & Solutions

| Issue | Error Code | Cause | Solution |
|-------|-----------|-------|----------|
| "Sync failed for item 0" | (empty) | Usually RLS or table issue | See below for specifics |
| "Table not found" | `42P01` | Migration wasn't run | Run SQL from Step 2 above |
| "Permission denied" | `42501` | RLS policies missing or wrong | Add policies from Step 3 above |
| "Relation does not exist" | `42P01` | Table hasn't been created | Run migration in Step 2 |
| Notes don't sync | Network error | Offline or connection issue | App will retry automatically on reconnect |
| Notes appear on reload | N/A | Cache is working | This is expected - cache is restored from localStorage |
| Old notes mixed with new | N/A | Legacy data issue | Already handled - filtered by `program_instance_id` |

## Sync Queue Error Details

When you see: **"[ExerciseNotes] Sync failed for item 0"**

Look for additional error logs right before it. They will show:

```
[ExerciseNotes] Supabase upsert error: {
  code: "42501",
  message: "new row violates row-level security policy...",
  status: 403,
  details: "...",
  hint: "..."
}
```

**Error Code Reference:**
- `42P01` → Table doesn't exist → Create table
- `42501` → RLS policy violation → Add/check RLS policies
- `PGRST116` → No rows found → This is OK, just means no data
- Network errors → Check internet connection
- Other codes → Database error - check PostgreSQL docs

---

## Advanced Debugging

### Check Full Error Details
Open browser DevTools → Console and look for lines starting with `[ExerciseNotes]`

### Inspect localStorage Cache
```javascript
// Notes cache
JSON.parse(window.localStorage.getItem('liftlog_exercise_notes'))

// Sync queue (pending changes)
JSON.parse(window.localStorage.getItem('liftlog_exercise_notes_sync_queue'))

// Cache metadata
JSON.parse(window.localStorage.getItem('liftlog_exercise_notes_meta'))
```

### Clear Everything (Fresh Start)
```javascript
// Clear all note data and restart
ExerciseNotesService.clearLocalStorage()
// Refresh page
location.reload()
```

### Enable Detailed Logging
In `exercise-notes-service.ts`, all console logs are prefixed with `[ExerciseNotes]` for easy filtering.

---

## Architecture Reminder

```
┌─────────────────────────────────────────┐
│ Read Request (getNote)                  │
└──────────────┬──────────────────────────┘
               │
        ┌──────v──────┐
        │ Cache Hit?  │
        └──────┬──────┘
         YES ├──────────→ Return (instant)
             │
         NO  └──────┐
                    v
            Supabase Query
                    │
        ┌───────────v──────────┐
        │ Success? Cache & Return
        │ Error?   Return null
        └───────────────────────┘

┌─────────────────────────────────────────┐
│ Write Request (saveNote)                │
└──────────────┬──────────────────────────┘
               │
        ┌──────v────────┐
        │ Save Locally  │ ← instant
        │ (localStorage)│
        └──────┬────────┘
               │
        ┌──────v───────────┐
        │ Queue for Sync   │
        │ (fire-and-forget)│
        └──────┬───────────┘
               │
        ┌──────v──────────────┐
        │ Background Sync     │
        │ to Supabase         │
        │ (retry on fail)     │
        └─────────────────────┘
```

---

## Next Steps

1. **Verify table exists** (Step 1-2)
2. **Check RLS policies** (Step 3)
3. **Watch console logs** for errors with actual details
4. **Test adding a note** and check localStorage
5. **Let me know any error codes** you see in console

Once you confirm the table exists and is accessible, the implementation will work perfectly!

---

**Questions?** Check the error code in the console and cross-reference with the "Common Issues" table above.
