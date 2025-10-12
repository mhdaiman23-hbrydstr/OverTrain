-- Fix Exercise Library RLS Policies for 406 Errors
-- Run this SQL in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read exercises" ON exercise_library;
DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON exercise_library;
DROP POLICY IF EXISTS "Authenticated users can update exercises" ON exercise_library;
DROP POLICY IF EXISTS "Authenticated users can delete exercises" ON exercise_library;

-- Recreate SELECT policy with explicit role permissions
-- This fixes 406 errors by explicitly granting access to anon role
CREATE POLICY "Public read access to exercises" 
  ON exercise_library 
  FOR SELECT 
  TO public, anon, authenticated
  USING (true);

-- Keep admin policies for authenticated users only
CREATE POLICY "Authenticated users can insert exercises" 
  ON exercise_library 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercises" 
  ON exercise_library 
  FOR UPDATE 
  TO authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete exercises" 
  ON exercise_library 
  FOR DELETE 
  TO authenticated
  USING (true);

-- Verify RLS is still enabled
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;

-- Grant explicit table permissions to anon role
GRANT SELECT ON exercise_library TO anon;
GRANT SELECT ON exercise_library TO authenticated;

-- Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'exercise_library';

