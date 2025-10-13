-- ============================================================================
-- RLS DIAGNOSTIC SCRIPT
-- ============================================================================
-- Purpose: Check current state of RLS policies and identify issues
-- ============================================================================

-- Check if tables exist
SELECT
  table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_programs') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (VALUES ('active_programs'), ('in_progress_workouts'), ('workouts'), ('workout_sets')) AS t(table_name);

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity = true THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets')
ORDER BY tablename;

-- Check current policies
SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets')
GROUP BY tablename
ORDER BY tablename;

-- Detailed policy information
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'active_programs'
ORDER BY policyname;

-- Check table structure for active_programs
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'active_programs'
ORDER BY ordinal_position;

-- Test query (should work if RLS is properly configured)
-- This will fail if auth.uid() returns NULL
SELECT
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED - auth.uid() is NULL'
    ELSE '✅ AUTHENTICATED - User ID: ' || auth.uid()::text
  END as auth_status;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

-- Tables: All should exist
-- RLS Status: All should be ENABLED
-- Policy Count: Each table should have exactly 4 policies
-- Active Programs Policies:
--   - active_programs_delete
--   - active_programs_insert
--   - active_programs_select
--   - active_programs_update

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If policy count is 0: Policies were not created
-- If policy count > 4: Duplicate policies exist (run fix-rls-policies.sql)
-- If auth_status is NOT AUTHENTICATED: Session issue, not RLS issue
-- If policies exist but still getting 406: Check if policies use correct column names

-- ============================================================================
-- END OF DIAGNOSTIC
-- ============================================================================
