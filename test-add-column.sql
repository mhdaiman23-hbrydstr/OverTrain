-- Test script to verify active_program_link column was added successfully
-- Run this after executing add-active-program-link.sql

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check that the column exists in the table
SELECT 'Column exists check:' as test_type,
       CASE 
         WHEN COUNT(*) > 0 THEN '✅ PASS - active_program_link column exists'
         ELSE '❌ FAIL - active_program_link column missing'
       END as result
FROM information_schema.columns 
WHERE table_name = 'in_progress_workouts' 
AND column_name = 'active_program_link'
AND table_schema = 'public';

-- 2. Check column properties
SELECT 'Column properties:' as test_type,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'in_progress_workouts' 
AND column_name = 'active_program_link'
AND table_schema = 'public';

-- 3. Check that the foreign key constraint exists
SELECT 'Foreign key check:' as test_type,
       CASE 
         WHEN COUNT(*) > 0 THEN '✅ PASS - Foreign key constraint exists'
         ELSE '❌ FAIL - Foreign key constraint missing'
       END as result
FROM information_schema.table_constraints 
WHERE constraint_name = 'fk_in_progress_workouts_active_program_link'
AND table_name = 'in_progress_workouts'
AND table_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- 4. Check foreign key details
SELECT 'Foreign key details:' as test_type,
       tc.constraint_name,
       tc.constraint_type,
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

-- 5. Check that the index exists
SELECT 'Index check:' as test_type,
       CASE 
         WHEN COUNT(*) > 0 THEN '✅ PASS - Index exists'
         ELSE '❌ FAIL - Index missing'
       END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'in_progress_workouts' 
    AND indexname = 'idx_in_progress_workouts_active_program_link';

-- 6. Check index details
SELECT 'Index details:' as test_type,
       indexname, 
       indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'in_progress_workouts' 
    AND indexname = 'idx_in_progress_workouts_active_program_link';

-- 7. Test basic functionality (should not error)
SELECT 'Basic functionality test:' as test_type,
       CASE 
         WHEN COUNT(*) >= 0 THEN '✅ PASS - Table is accessible'
         ELSE '❌ FAIL - Table access error'
       END as result
FROM in_progress_workouts;

-- 8. Show all columns in the table for reference
SELECT 'All columns in in_progress_workouts:' as test_type,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'in_progress_workouts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Add-Column Verification Complete!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'If all tests show ✅ PASS, then:';
    RAISE NOTICE '1. active_program_link column was added successfully';
    RAISE NOTICE '2. Foreign key constraint is working';
    RAISE NOTICE '3. Performance index was created';
    RAISE NOTICE '4. Table is accessible and ready for use';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now use the relationship in your application!';
    RAISE NOTICE '=========================================';
END $$;
