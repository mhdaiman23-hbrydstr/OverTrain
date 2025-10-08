-- Test script to verify the fixed migration
-- Run this after applying the fixed migration to ensure everything works

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check that tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('in_progress_workouts', 'workout_sets')
ORDER BY table_name;

-- 2. Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('in_progress_workouts', 'workout_sets')
ORDER BY tablename;

-- 3. Check that policies exist with correct names
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('in_progress_workouts', 'workout_sets')
ORDER BY tablename, policyname;

-- 4. Check that indexes exist
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('in_progress_workouts', 'workout_sets')
ORDER BY tablename, indexname;

-- 5. Check that triggers exist
SELECT event_object_table, trigger_name, action_timing, action_condition, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('in_progress_workouts', 'workout_sets')
ORDER BY event_object_table, trigger_name;

-- 6. Test basic table structure (should not error)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'in_progress_workouts'
ORDER BY ordinal_position;

-- 6b. Check that active_program_link column exists and has correct foreign key
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'in_progress_workouts'
    AND kcu.column_name = 'active_program_link';

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'workout_sets'
ORDER BY ordinal_position;

-- ============================================================================
-- FUNCTIONALITY TEST (Optional - requires actual user context)
-- ============================================================================

-- Note: These tests would need to be run with actual user authentication
-- They are provided as examples of how to test RLS functionality

/*
-- Test RLS policies (requires auth context)
-- This would test that users can only see their own data
SET ROLE authenticated; -- or use actual user context

-- Test insert permissions
INSERT INTO in_progress_workouts (id, user_id, workout_name, start_time)
VALUES ('test-workout', auth.uid(), 'Test Workout', EXTRACT(EPOCH FROM NOW()) * 1000);

-- Test select permissions
SELECT * FROM in_progress_workouts WHERE user_id = auth.uid();

-- Test update permissions
UPDATE in_progress_workouts 
SET notes = 'Test note' 
WHERE user_id = auth.uid() AND id = 'test-workout';

-- Test delete permissions
DELETE FROM in_progress_workouts 
WHERE user_id = auth.uid() AND id = 'test-workout';
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration verification completed!';
  RAISE NOTICE 'Check the results above to ensure:';
  RAISE NOTICE '1. Tables exist: in_progress_workouts, workout_sets';
  RAISE NOTICE '2. RLS is enabled on both tables';
  RAISE NOTICE '3. Policies exist with "read" naming convention';
  RAISE NOTICE '4. Indexes are created for performance';
  RAISE NOTICE '5. Triggers exist for updated_at timestamps';
  RAISE NOTICE '6. No foreign key errors (programs table dependency removed)';
END $$;
