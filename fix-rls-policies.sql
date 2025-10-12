-- ============================================================================
-- FIX RLS POLICIES - Remove Duplicates and Ensure Consistency
-- ============================================================================
-- Purpose: Clean up duplicate RLS policies and ensure all tables have proper policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Remove ALL existing policies (clean slate)
-- ============================================================================

-- Remove all policies from active_programs
DROP POLICY IF EXISTS "Users can read own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can insert own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can update own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can delete own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can view own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can insert own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can update own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can delete own active programs" ON active_programs;
DROP POLICY IF EXISTS "active_programs_select_own" ON active_programs;
DROP POLICY IF EXISTS "active_programs_insert_own" ON active_programs;
DROP POLICY IF EXISTS "active_programs_update_own" ON active_programs;
DROP POLICY IF EXISTS "active_programs_delete_own" ON active_programs;

-- Remove all policies from in_progress_workouts
DROP POLICY IF EXISTS "Users can read own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can insert own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can update own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can delete own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can view own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can insert own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can update own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can delete own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "ipw_select_own" ON in_progress_workouts;
DROP POLICY IF EXISTS "ipw_insert_own" ON in_progress_workouts;
DROP POLICY IF EXISTS "ipw_update_own" ON in_progress_workouts;
DROP POLICY IF EXISTS "ipw_delete_own" ON in_progress_workouts;

-- Remove all policies from workouts
DROP POLICY IF EXISTS "Users can read own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can view own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
DROP POLICY IF EXISTS "workouts_select_own" ON workouts;
DROP POLICY IF EXISTS "workouts_insert_own" ON workouts;
DROP POLICY IF EXISTS "workouts_update_own" ON workouts;
DROP POLICY IF EXISTS "workouts_delete_own" ON workouts;

-- Remove all policies from workout_sets
DROP POLICY IF EXISTS "Users can read own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can view own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_select_own" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_insert_own" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_update_own" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_delete_own" ON workout_sets;

-- ============================================================================
-- STEP 2: Create Clean, Consistent Policies
-- ============================================================================

-- ============================================================================
-- active_programs policies
-- ============================================================================

CREATE POLICY "active_programs_select"
  ON active_programs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "active_programs_insert"
  ON active_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "active_programs_update"
  ON active_programs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "active_programs_delete"
  ON active_programs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- in_progress_workouts policies
-- ============================================================================

CREATE POLICY "in_progress_workouts_select"
  ON in_progress_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "in_progress_workouts_insert"
  ON in_progress_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "in_progress_workouts_update"
  ON in_progress_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "in_progress_workouts_delete"
  ON in_progress_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- workouts policies (FIX: Add missing INSERT, UPDATE, DELETE)
-- ============================================================================

CREATE POLICY "workouts_select"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "workouts_insert"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_update"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "workouts_delete"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- workout_sets policies
-- ============================================================================

CREATE POLICY "workout_sets_select"
  ON workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "workout_sets_insert"
  ON workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_sets_update"
  ON workout_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "workout_sets_delete"
  ON workout_sets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all tables have exactly 4 policies each (SELECT, INSERT, UPDATE, DELETE)
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets')
GROUP BY tablename
ORDER BY tablename;

-- Check policy details
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
WHERE tablename IN ('active_programs', 'in_progress_workouts', 'workouts', 'workout_sets')
ORDER BY tablename, policyname;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run this script in Supabase SQL Editor
-- 2. Check the verification queries to ensure 4 policies per table
-- 3. Test with proper authentication (no auth bypass)
-- 4. Monitor console for 401/42501 errors - they should be gone!

-- Expected result: Each table should have exactly 4 policies:
-- - table_select
-- - table_insert  
-- - table_update
-- - table_delete

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
