-- Fix RLS policies for database tables
-- This allows authenticated users to read exercise data and manage their own data

-- ============================================
-- EXERCISE_LIBRARY TABLE
-- ============================================
ALTER TABLE IF EXISTS exercise_library ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read exercise library" ON exercise_library;
DROP POLICY IF EXISTS "Public read access to exercise library" ON exercise_library;
DROP POLICY IF EXISTS "Authenticated users can read exercise library" ON exercise_library;
DROP POLICY IF EXISTS "Anon users can read exercise library" ON exercise_library;

-- Allow all authenticated users to read exercise library
CREATE POLICY "Authenticated users can read exercise library"
ON exercise_library
FOR SELECT
TO authenticated
USING (true);

-- Allow anon users to read as well (exercises are public data)
CREATE POLICY "Anon users can read exercise library"
ON exercise_library
FOR SELECT
TO anon
USING (true);

-- ============================================
-- ACTIVE_PROGRAMS TABLE (if exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'active_programs') THEN
    ALTER TABLE active_programs ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own active programs" ON active_programs;
    DROP POLICY IF EXISTS "Users can insert own active programs" ON active_programs;
    DROP POLICY IF EXISTS "Users can update own active programs" ON active_programs;
    DROP POLICY IF EXISTS "Users can delete own active programs" ON active_programs;

    -- Users can only see their own active programs
    EXECUTE 'CREATE POLICY "Users can view own active programs" ON active_programs FOR SELECT TO authenticated USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert own active programs" ON active_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own active programs" ON active_programs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own active programs" ON active_programs FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;
