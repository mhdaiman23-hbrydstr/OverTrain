-- ====================================================================
-- Fix RLS Policies for active_programs and program_history
-- ====================================================================
-- Problem: Users cannot insert/update rows due to missing RLS policies
-- Solution: Add proper policies for authenticated users
-- ====================================================================

-- ===== ACTIVE PROGRAMS TABLE =====

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can insert own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can update own active programs" ON active_programs;
DROP POLICY IF EXISTS "Users can delete own active programs" ON active_programs;

-- Enable RLS
ALTER TABLE active_programs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own active programs
CREATE POLICY "Users can view own active programs" ON active_programs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own active programs
CREATE POLICY "Users can insert own active programs" ON active_programs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own active programs
CREATE POLICY "Users can update own active programs" ON active_programs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own active programs
CREATE POLICY "Users can delete own active programs" ON active_programs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===== PROGRAM HISTORY TABLE =====

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own program history" ON program_history;
DROP POLICY IF EXISTS "Users can insert own program history" ON program_history;
DROP POLICY IF EXISTS "Users can update own program history" ON program_history;
DROP POLICY IF EXISTS "Users can delete own program history" ON program_history;

-- Enable RLS
ALTER TABLE program_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own program history
CREATE POLICY "Users can view own program history" ON program_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own program history
CREATE POLICY "Users can insert own program history" ON program_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own program history
CREATE POLICY "Users can update own program history" ON program_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own program history
CREATE POLICY "Users can delete own program history" ON program_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- Verification Queries
-- ====================================================================

-- 1. Check that policies are created
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
WHERE tablename IN ('active_programs', 'program_history')
ORDER BY tablename, policyname;

-- 2. Test that RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('active_programs', 'program_history');

-- ====================================================================
-- Post-Migration Instructions
-- ====================================================================
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify policies are created (should show 8 policies total - 4 per table)
-- 3. Test by starting a new program in the app
-- 4. Errors should be resolved
-- ====================================================================
