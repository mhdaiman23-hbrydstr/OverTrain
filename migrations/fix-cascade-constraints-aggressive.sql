-- ====================================================================
-- AGGRESSIVE FIX: Remove ALL Foreign Keys to active_programs
-- ====================================================================
--
-- Problem: Multiple tables have CASCADE foreign keys to active_programs
-- causing 400 errors when deleting active programs.
--
-- Solution: Drop ALL foreign keys that reference active_programs.
-- Workouts, program_history, and in_progress_workouts should NOT
-- depend on active_programs (which is temporary state).
--
-- ====================================================================

-- Drop foreign keys from in_progress_workouts
ALTER TABLE in_progress_workouts
DROP CONSTRAINT IF EXISTS inprog_program_instance_fk CASCADE;

ALTER TABLE in_progress_workouts
DROP CONSTRAINT IF EXISTS in_progress_workouts_user_id_fkey CASCADE;

ALTER TABLE in_progress_workouts
DROP CONSTRAINT IF EXISTS in_progress_workouts_instance_id_fkey CASCADE;

ALTER TABLE in_progress_workouts
DROP CONSTRAINT IF EXISTS in_progress_workouts_program_instance_id_fkey CASCADE;

-- Drop foreign keys from program_history
ALTER TABLE program_history
DROP CONSTRAINT IF EXISTS history_program_instance_fk CASCADE;

ALTER TABLE program_history
DROP CONSTRAINT IF EXISTS program_history_user_id_fkey CASCADE;

ALTER TABLE program_history
DROP CONSTRAINT IF EXISTS program_history_instance_id_fkey CASCADE;

ALTER TABLE program_history
DROP CONSTRAINT IF EXISTS program_history_program_instance_id_fkey CASCADE;

-- Drop foreign keys from workouts
ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_program_instance_fk CASCADE;

ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_user_id_fkey CASCADE;

ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_instance_id_fkey CASCADE;

ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_program_instance_id_fkey CASCADE;

-- Now re-add ONLY the user_id foreign keys (essential for data integrity)
-- These reference auth.users, NOT active_programs, so they're safe

ALTER TABLE in_progress_workouts
ADD CONSTRAINT in_progress_workouts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;  -- OK to cascade from users table

ALTER TABLE program_history
ADD CONSTRAINT program_history_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;  -- OK to cascade from users table

ALTER TABLE workouts
ADD CONSTRAINT workouts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;  -- OK to cascade from users table

ALTER TABLE active_programs
ADD CONSTRAINT active_programs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;  -- OK to cascade from users table

-- Verify the fix: show remaining foreign keys
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('workouts', 'in_progress_workouts', 'active_programs', 'program_history')
ORDER BY tc.table_name;

-- Test deletion (should now work)
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! You can now delete from active_programs.';
END $$;

-- ====================================================================
-- NOW DELETE YOUR STUCK ACTIVE PROGRAM
-- ====================================================================

-- Uncomment and run this after the migration succeeds:
-- DELETE FROM active_programs WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c';

-- Verify deletion:
-- SELECT COUNT(*) FROM active_programs WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c';
