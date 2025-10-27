# Exercise Notes - Debug Guide

## What You're Seeing

When you create and pin a note, you see:
```
[ExerciseNotes] Sync failed for item 0 ":" {}
```

## What This Means

The note was **successfully saved to your browser's localStorage** ✓ but **failed to sync to Supabase** ✗

**The app still works** - your note is there and will repeat to next week. But it's not backed up to the database yet.

---

## How to Find the Real Error

### Step 1: Open Browser DevTools Console

Press: **F12** → Click **Console** tab

### Step 2: Look for Lines Starting with `[ExerciseNotes]`

Scroll up to find error logs. You should see lines like:

```
[ExerciseNotes] Supabase upsert error: {
  code: "42501",
  message: "new row violates row-level security policy...",
  status: 403,
  details: "...",
  hint: "..."
}
```

OR

```
[ExerciseNotes] Supabase upsert error: {
  code: "42P01",
  message: "relation 'exercise_notes' does not exist",
  ...
}
```

### Step 3: Share the Error Code

**Copy the `code` field and share it with me.**

Common ones:
- `42P01` → Table doesn't exist
- `42501` → Permission/RLS issue
- `PGRST116` → No rows (usually OK)
- Other → Network or database issue

---

## Quick Diagnostic Commands

Run these in the browser console to check status:

### Check if table is accessible
```javascript
const isAccessible = await ExerciseNotesService.isTableAccessible()
console.log('Table accessible:', isAccessible)
```

### Check pending sync items
```javascript
const queue = ExerciseNotesService.getSyncQueue()
console.log('Pending syncs:', queue)
console.log('Count:', queue.length)
```

### Check cached notes
```javascript
const cached = window.localStorage.getItem('liftlog_exercise_notes')
console.log('Cached notes:', JSON.parse(cached || '[]'))
```

### Force retry sync
```javascript
await ExerciseNotesService.retrySyncQueue()
```

---

## What Should Happen (Step by Step)

### Successful Flow:
1. You create note "Good form!" and pin it
2. Console shows: `[ExerciseNotes] Queued save sync, queue size: 1`
3. Console shows: `[ExerciseNotes] Synced note save: abc-123` ← If this appears, it worked!
4. Note appears in localStorage cache ✓
5. Note repeats to next week ✓
6. Note synced to Supabase ✓

### Failing Flow (What You're Seeing):
1. You create note "Good form!" and pin it
2. Console shows: `[ExerciseNotes] Queued save sync, queue size: 1`
3. Console shows: `[ExerciseNotes] Supabase upsert error: { code: "42501", ... }` ← **This is your issue**
4. Console shows: `[ExerciseNotes] Sync failed for item 0` ← This is the summary
5. Note appears in localStorage cache ✓ (still works locally!)
6. Note repeats to next week ✓ (still works locally!)
7. Note NOT in Supabase ✗ (sync failed)

---

## How to Determine Your Specific Issue

### If you see `code: "42501"` (Permission Denied)
→ **RLS Policies are missing**

**Fix:** Add these RLS policies in Supabase Dashboard:

```sql
CREATE POLICY "Users can read their own notes"
ON exercise_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
ON exercise_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON exercise_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON exercise_notes FOR DELETE USING (auth.uid() = user_id);
```

### If you see `code: "42P01"` (Table Doesn't Exist)
→ **Table migration wasn't run**

**Fix:** Create the table in Supabase SQL Editor:

```sql
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

CREATE INDEX IF NOT EXISTS idx_notes_user_program ON exercise_notes(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_notes_exercise_week ON exercise_notes(exercise_id, week);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON exercise_notes(is_pinned) WHERE is_pinned = true;
```

### If you see a network error or timeout
→ **Connection issue**

**Fix:**
- Check your internet connection
- Verify Supabase credentials in `.env.local`
- App will auto-retry when connection restores

### If you see no error (empty `{}`)
→ **Unknown error or error object serialization issue**

**What to do:**
1. Run the diagnostic command above to check table accessibility
2. Share the `isAccessible` result with me
3. Also share any other error logs you see in console

---

## Expected Console Output (Successful)

When everything works, you should see something like:

```
[ExerciseNotes] Hydrating cache for program instance: abc-123-def
[ExerciseNotes] Hydrated 0 notes for program instance
[ExerciseNotes] Queued save sync, queue size: 1
[ExerciseNotes] Processing sync queue, size: 1
[ExerciseNotes] Synced note save: xyz-789
[ExerciseNotes] Sync queue fully processed
```

If you're seeing errors, look for the `[ExerciseNotes] Supabase upsert error` or similar lines.

---

## Next Steps

1. **Open DevTools Console** (F12)
2. **Create a test note** and pin it
3. **Look for error logs** starting with `[ExerciseNotes]`
4. **Copy the error code** from the logs
5. **Share it with me**

Once I know the error code, I can provide the exact fix! 🚀

---

## Remember

- ✅ Your notes are **always saved locally** (localStorage)
- ✅ They **always sync on next week** (local logic)
- ❌ They just **might not backup to Supabase** (if sync fails)
- ✅ The app **continues working perfectly** even if sync fails
- ✅ Sync will **auto-retry** when you refresh or go online

So **nothing is broken** - we just need to fix the Supabase sync!
