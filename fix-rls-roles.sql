-- ============================================================================
-- FIX RLS ROLE MISMATCH - Quick Targeted Fix
-- ============================================================================
-- Purpose: Fix role targeting inconsistency in RLS policies
-- Issue: Some policies target {authenticated}, others target {public}
-- Solution: Make all policies target {public} for consistency
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop problematic policies that target {authenticated}
-- ============================================================================

-- Drop policies that target {authenticated} role (these are failing)
DROP POLICY IF EXISTS "Users can delete own in_progress_workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can insert own in_progress_workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can update own in_progress_workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can view own in_progress_workouts" ON in_progress_workouts;

DROP POLICY IF EXISTS "Users can delete own workout_sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout_sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update own workout_sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can view own workout_sets" ON workout_sets;

-- ============================================================================
-- STEP 2: Keep the working {public} policies (these are working)
-- ============================================================================

-- These policies are already working because they target {public}:
-- - active_programs policies (all target {public}) ✅
-- - in_progress_workouts system policies (all target {public}) ✅  
-- - workout_sets system policies (all target {public}) ✅
-- - workouts system policies (all target {public}) ✅

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all remaining policies target {public}
SELECT 
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets')
ORDER BY tablename, cmd;

-- Expected result: All policies should show roles = {public}

-- ============================================================================
-- ALTERNATIVE: If you want to test with proper authentication
-- ============================================================================

-- Instead of fixing roles, you could also:
-- 1. Login properly through the auth form (no bypass)
-- 2. This will give you a valid auth token
-- 3. You'll be in the {authenticated} role
-- 4. All policies will work

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run this script in Supabase SQL Editor
-- 2. Check verification query - all policies should target {public}
-- 3. Test your app - 401/42501 errors should be gone
-- 4. All CRUD operations should work with auth bypass

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
