-- ============================================================================
-- REMOVE DUPLICATE POLICIES - Final Cleanup
-- ============================================================================
-- Purpose: Remove duplicate policies, keep only the system-generated ones
-- Status: All policies now target {public} role ✅
-- Issue: Still have duplicates (human-readable + system-generated names)
-- ============================================================================

-- ============================================================================
-- Remove human-readable policies (keep system-generated ones)
-- ============================================================================

-- active_programs - Remove human-readable duplicates
DROP POLICY IF EXISTS "Users can delete own active program" ON active_programs;
DROP POLICY IF EXISTS "Users can insert own active program" ON active_programs;
DROP POLICY IF EXISTS "Users can read own active program" ON active_programs;
DROP POLICY IF EXISTS "Users can update own active program" ON active_programs;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check final policy count (should be exactly 4 per table)
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets')
GROUP BY tablename
ORDER BY tablename;

-- Expected result:
-- active_programs: 4 policies (active_programs_delete, active_programs_insert, active_programs_select, active_programs_update)
-- in_progress_workouts: 4 policies (in_progress_workouts_delete, in_progress_workouts_insert, in_progress_workouts_select, in_progress_workouts_update)
-- workout_sets: 4 policies (workout_sets_delete, workout_sets_insert, workout_sets_select, workout_sets_update)
-- workouts: 4 policies (workouts_delete, workouts_insert, workouts_select, workouts_update)

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run this script in Supabase SQL Editor
-- 2. Check verification query - should show exactly 4 policies per table
-- 3. Test your app - should work perfectly with auth bypass
-- 4. All 401/42501 errors should be completely gone

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
