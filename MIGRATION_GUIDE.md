# 🗄️ Database Migration Guide

## Quick Start (Copy-Paste)

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your LiftLog project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query" button

### Step 2: Copy All Migrations At Once
**Copy everything from this SQL block:**

```sql
-- Migration: Exercise Notes & Custom RPE Feature
-- Run this in Supabase SQL Editor

-- 1. Create program_progression_config table
CREATE TABLE IF NOT EXISTS program_progression_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  block_length INTEGER NOT NULL CHECK (block_length IN (4, 5, 6, 7, 8)),
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  rir_value INTEGER NOT NULL CHECK (rir_value >= 0 AND rir_value <= 8),
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 2 AND rpe_value <= 10),
  UNIQUE(program_template_id, block_length, week_number),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prog_config_template ON program_progression_config(program_template_id);
CREATE INDEX IF NOT EXISTS idx_prog_config_block_len ON program_progression_config(block_length);

-- 2. Create exercise_notes table
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

-- 3. Create exercise_custom_rpe table
CREATE TABLE IF NOT EXISTS exercise_custom_rpe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 1 AND rpe_value <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_instance_id, exercise_id, week, set_number)
);

CREATE INDEX IF NOT EXISTS idx_custom_rpe_user_program ON exercise_custom_rpe(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_week ON exercise_custom_rpe(exercise_id, week);
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_prog ON exercise_custom_rpe(exercise_id, program_instance_id);

-- 4. Alter profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  rpe_rir_display_mode TEXT DEFAULT 'rir' CHECK (rpe_rir_display_mode IN ('rir', 'rpe', 'off'));

CREATE INDEX IF NOT EXISTS idx_profiles_rpe_rir_mode ON profiles(rpe_rir_display_mode);

-- All done! Tables created successfully.
```

### Step 3: Paste & Run
1. Paste the SQL above into the SQL Editor
2. Click the blue "RUN" button
3. Wait for completion (should say "Success" in green)

### Step 4: Verify
1. Click on "Tables" in the left sidebar
2. Scroll down and confirm you see:
   - ✅ `program_progression_config`
   - ✅ `exercise_notes`
   - ✅ `exercise_custom_rpe`
   - ✅ `profiles` (should have new column)

---

## What Was Created

### Table 1: program_progression_config
**Purpose:** RIR/RPE progression patterns for different week blocks

| Column | Type | Example |
|--------|------|---------|
| id | UUID | 550e8400-e29b-41d4-a716-446655440000 |
| program_template_id | UUID | (links to program_templates) |
| block_length | INTEGER | 6 |
| week_number | INTEGER | 1, 2, 3, etc. |
| rir_value | INTEGER | 3 (Reps in Reserve) |
| rpe_value | DECIMAL | 7.0 (Rate of Perceived Exertion) |

---

### Table 2: exercise_notes
**Purpose:** User notes on exercises, can be pinned to repeat weekly

| Column | Type | Example |
|--------|------|---------|
| id | UUID | 550e8400-e29b-41d4-a716-446655440001 |
| user_id | UUID | (links to profiles) |
| program_instance_id | UUID | Unique program run ID |
| exercise_id | UUID | (links to exercise_library) |
| week | INTEGER | 1, 2, 3, etc. |
| note_text | TEXT | "Focus on hip drive" |
| is_pinned | BOOLEAN | true (repeats weekly) |

---

### Table 3: exercise_custom_rpe
**Purpose:** Per-set RPE logging independent from block-level

| Column | Type | Example |
|--------|------|---------|
| id | UUID | 550e8400-e29b-41d4-a716-446655440002 |
| user_id | UUID | (links to profiles) |
| program_instance_id | UUID | Unique program run ID |
| exercise_id | UUID | (links to exercise_library) |
| week | INTEGER | 1, 2, 3, etc. |
| set_number | INTEGER | 1, 2, 3 (which set) |
| rpe_value | DECIMAL | 8.5 (perceived effort) |

---

### Table 4: profiles (Updated)
**New Column Added:**

| Column | Type | Values |
|--------|------|--------|
| rpe_rir_display_mode | TEXT | 'rir' \| 'rpe' \| 'off' |

---

## Troubleshooting

### ❌ Error: "relation 'exercise_library' does not exist"
**Solution:** You may not have the `exercise_library` table.
- Check your Supabase Dashboard → Tables
- If missing, create it first or contact support
- The feature requires this table to link exercises

### ❌ Error: "permission denied"
**Solution:** Your Supabase API key may not have permission.
- Go to Supabase Settings → API
- Copy the "Service Role Secret" (not the anon key)
- Use this key instead

### ❌ Error: "column already exists" on ALTER TABLE
**Solution:** Migrations may have already been run.
- This is safe and expected if you re-run
- Just click "RUN" again, it will complete successfully

### ✅ Success Message
You should see a green "Success" message with details like:
```
Query Successful

Rows returned: 0
Execution time: 234ms
```

---

## Timeline

| Phase | Task | Time |
|-------|------|------|
| ⏳ **Migration** | Run SQL in Supabase | **5 min** |
| ✅ **Verify** | Check tables exist | **2 min** |
| 🚀 **Next** | Begin Phase 5 Integration | After confirmation |

---

## Next Steps After Migration

Once you see the green "Success" message:

1. **Confirm tables exist** (as shown in Verification above)
2. **Come back here and let me know** ✅ Ready
3. **Then we'll integrate** the components into WorkoutLogger

Total remaining time: **2-3 hours**

---

## Questions?

If you hit any errors:
1. Copy the exact error message
2. Note which migration failed
3. Let me know and we'll troubleshoot

Ready to run migrations? 🚀
