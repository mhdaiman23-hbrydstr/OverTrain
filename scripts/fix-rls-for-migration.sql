-- Temporarily allow anonymous inserts for exercise migration
-- Run this in Supabase SQL Editor before running the migration

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON exercise_library;

-- Create temporary policy that allows anyone to insert
CREATE POLICY "Allow anonymous inserts for migration" ON exercise_library FOR INSERT WITH CHECK (true);

-- After migration is complete, run this to restore proper RLS:
-- DROP POLICY "Allow anonymous inserts for migration" ON exercise_library;
-- CREATE POLICY "Authenticated users can insert exercises" ON exercise_library FOR INSERT WITH CHECK (auth.role() = 'authenticated');
