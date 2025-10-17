-- Fix foreign key constraints to prevent cascade issues
-- Run this in Supabase SQL Editor

-- Step 1: Check existing constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('workouts', 'in_progress_workouts')
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name IN ('program_instance_id', 'user_id');

-- Step 2: Find the problematic constraint name
-- Look for the constraint that references active_programs or has CASCADE delete

-- Step 3: Drop and recreate the constraint
-- Replace 'constraint_name_here' with the actual constraint name from Step 1

-- Example (adjust based on your actual constraint names):
-- ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_some_fkey CASCADE;
-- ALTER TABLE in_progress_workouts DROP CONSTRAINT IF EXISTS in_progress_workouts_some_fkey CASCADE;

-- Step 4: Don't re-add constraints that reference active_programs
-- Workouts should NOT have a foreign key to active_programs
-- They should only reference program_history for historical tracking

-- Step 5: Add proper indexes for performance (optional)
CREATE INDEX IF NOT EXISTS idx_workouts_program_instance
ON workouts(program_instance_id);

CREATE INDEX IF NOT EXISTS idx_in_progress_program_instance
ON in_progress_workouts(program_instance_id);

-- Step 6: Test deletion works now
-- DELETE FROM active_programs WHERE user_id = 'test-user-id';
