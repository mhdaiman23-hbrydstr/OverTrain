# Add Active Program Link - Simple Instructions

## Problem
You got the error: `ERROR: 42703: column "active_program_link" does not exist`

This happens because the `in_progress_workouts` table already exists but doesn't have the `active_program_link` column.

## Solution: Add Column to Existing Table

Instead of recreating the table, we'll safely add the column to your existing table.

## Files You Need

1. **`add-active-program-link.sql`** - The main script to add the column
2. **`test-add-column.sql`** - Verification script to confirm it worked
3. **`ADD_COLUMN_INSTRUCTIONS.md`** - These instructions

## Step-by-Step Instructions

### Step 1: Add the Column
Run this script in your Supabase SQL editor:
```sql
-- Copy and paste the entire contents of add-active-program-link.sql
```

**What this does:**
- ✅ Adds `active_program_link` column (UUID, nullable)
- ✅ Creates foreign key to `active_programs(user_id)`
- ✅ Adds performance index
- ✅ Won't error if column already exists
- ✅ Preserves all existing data

### Step 2: Verify It Worked
Run this script to confirm everything is working:
```sql
-- Copy and paste the entire contents of test-add-column.sql
```

**Expected results:**
- ✅ All tests should show "✅ PASS"
- ✅ Column exists with correct properties
- ✅ Foreign key constraint is working
- ✅ Index was created
- ✅ Table is accessible

### Step 3: Test the Relationship
Use these example queries to test the new relationship:

```sql
-- Find all workouts for a user's active program
SELECT w.*, ap.template_id, ap.current_week, ap.current_day
FROM in_progress_workouts w
JOIN active_programs ap ON w.active_program_link = ap.user_id
WHERE w.user_id = 'your-user-uuid-here';

-- Get active program info with current workout
SELECT ap.*, w.workout_name, w.start_time, w.week, w.day
FROM active_programs ap
LEFT JOIN in_progress_workouts w ON ap.user_id = w.active_program_link
WHERE ap.user_id = 'your-user-uuid-here';
```

## What the Relationship Does

### Before
- `active_programs` table tracked user's current program
- `in_progress_workouts` table tracked current workout
- **No connection** between them

### After
- `active_programs` table tracks user's current program
- `in_progress_workouts` table tracks current workout
- **Direct connection** via `active_program_link` column
- You can easily query program info with workout data

### Benefits
1. **Data Integrity**: Workouts always link to valid active programs
2. **Easy Queries**: Simple JOINs to get complete workout context
3. **Automatic Cleanup**: Deleted programs set workout links to NULL
4. **Performance**: Optimized indexes for fast lookups

## How to Use in Your Application

### When creating a new workout:
```sql
INSERT INTO in_progress_workouts (
    id, 
    user_id, 
    active_program_link,  -- Set this to the user's ID
    workout_name, 
    start_time,
    week,
    day
) VALUES (
    'workout-id',
    'user-uuid',
    'user-uuid',  -- Same as user_id to link to active_programs
    'Workout Name',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    1,
    1
);
```

### When querying workouts with program info:
```sql
SELECT 
    w.*,
    ap.template_id,
    ap.current_week,
    ap.current_day,
    ap.template_data
FROM in_progress_workouts w
JOIN active_programs ap ON w.active_program_link = ap.user_id
WHERE w.user_id = 'user-uuid';
```

## Troubleshooting

### If you get errors:
1. **Make sure `active_programs` table exists** - the foreign key needs it
2. **Check that you're running the scripts in order** - add column first, then test
3. **Ensure you have sufficient permissions** - need ALTER TABLE rights

### If tests show ❌ FAIL:
1. **Check the error message** in the test results
2. **Verify the `active_programs` table exists** and has `user_id` as primary key
3. **Make sure you ran the add-column script completely**

## Next Steps

1. ✅ Run `add-active-program-link.sql`
2. ✅ Run `test-add-column.sql` to verify
3. ✅ Test with the example queries
4. ✅ Update your application code to use the new relationship
5. ✅ Enjoy your connected active programs and workouts!

## Quick Reference

| Table | Column | References |
|-------|--------|------------|
| `in_progress_workouts` | `active_program_link` | `active_programs(user_id)` |

| Index | Purpose |
|-------|---------|
| `idx_in_progress_workouts_active_program_link` | Fast JOIN performance |

The add-column approach is **safe, fast, and preserves all your existing data** while adding the relationship you wanted!
