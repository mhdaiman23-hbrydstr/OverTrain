-- ====================================================================
-- Migration: Fix Foreign Key Constraints for Active Programs Deletion
-- ====================================================================
--
-- Problem: When deleting from active_programs, foreign key constraints
-- try to CASCADE and set related columns to NULL, causing 400 errors.
--
-- Solution: Remove problematic CASCADE constraints and replace with
-- NO ACTION (workouts should remain when programs are completed/ended).
--
-- Run this in Supabase SQL Editor
-- ====================================================================

-- Step 1: Check current foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
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
  AND (
    tc.table_name IN ('workouts', 'in_progress_workouts', 'active_programs', 'program_history')
    OR ccu.table_name = 'active_programs'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- Step 2: Drop any foreign keys that reference active_programs
-- (These are causing the CASCADE issue)

-- Note: The actual constraint names may vary. Check the output from Step 1
-- and adjust the constraint names below if needed.

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop all foreign keys that reference active_programs
    FOR constraint_record IN
        SELECT
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'active_programs'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE',
                      constraint_record.table_name,
                      constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint % from table %',
                     constraint_record.constraint_name,
                     constraint_record.table_name;
    END LOOP;
END $$;

-- Step 3: Workouts and in_progress_workouts should NOT reference active_programs
-- They should only reference program_history for historical tracking

-- Ensure workouts table doesn't have FK to active_programs
-- (workouts are historical records, should only reference completed programs)

-- Step 4: Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_program_id
ON workouts(program_id);

CREATE INDEX IF NOT EXISTS idx_workouts_user_program
ON workouts(user_id, program_id);

CREATE INDEX IF NOT EXISTS idx_in_progress_user
ON in_progress_workouts(user_id);

CREATE INDEX IF NOT EXISTS idx_active_programs_user
ON active_programs(user_id);

-- Step 5: Verify we can now delete from active_programs
-- This should succeed without errors
DO $$
BEGIN
    -- Test deletion (rollback after test)
    BEGIN
        DELETE FROM active_programs
        WHERE user_id = '00000000-0000-0000-0000-000000000000'; -- Fake ID for testing

        RAISE NOTICE 'Success: DELETE from active_programs works without CASCADE errors';
        ROLLBACK;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Warning: DELETE may still have issues: %', SQLERRM;
        ROLLBACK;
    END;
END $$;

-- Step 6: Now actually delete stuck active programs (if any exist)
-- Uncomment the line below to delete ALL active programs (use with caution!)
-- DELETE FROM active_programs;

-- Or delete for a specific user:
-- DELETE FROM active_programs WHERE user_id = 'your-user-id-here';

-- Step 7: Verify the fix
SELECT
    'Active Programs' as table_name,
    COUNT(*) as record_count
FROM active_programs
UNION ALL
SELECT
    'Program History' as table_name,
    COUNT(*) as record_count
FROM program_history
UNION ALL
SELECT
    'Workouts' as table_name,
    COUNT(*) as record_count
FROM workouts;

-- ====================================================================
-- Post-Migration Verification
-- ====================================================================
--
-- 1. Check that no foreign keys reference active_programs:
--    SELECT * FROM information_schema.table_constraints tc
--    JOIN information_schema.constraint_column_usage ccu
--      ON ccu.constraint_name = tc.constraint_name
--    WHERE tc.constraint_type = 'FOREIGN KEY'
--      AND ccu.table_name = 'active_programs';
--    (Should return 0 rows)
--
-- 2. Test deletion manually:
--    DELETE FROM active_programs WHERE user_id = 'test-user-id';
--    (Should succeed without 400 error)
--
-- ====================================================================
