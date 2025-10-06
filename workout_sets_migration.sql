-- ============================================================================
-- WORKOUT SETS TABLE MIGRATION
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to enable real-time set logging
-- 
-- This table stores individual set completions as they happen during workouts,
-- providing real-time sync and detailed analytics capabilities.
-- ============================================================================

-- Create workout_sets table
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at BIGINT NOT NULL,
  notes TEXT,
  week INTEGER,
  day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own sets
CREATE POLICY "Users can read own workout sets"
  ON public.workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sets"
  ON public.workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sets"
  ON public.workout_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sets"
  ON public.workout_sets FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON public.workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON public.workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_week_day ON public.workout_sets(user_id, week, day);
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed_at ON public.workout_sets(completed_at);

-- Trigger for automatic updated_at timestamp
-- Note: This assumes the handle_updated_at() function already exists from the main migration
-- If not, uncomment the function creation below:

-- CREATE OR REPLACE FUNCTION public.handle_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE TRIGGER workout_sets_updated_at
  BEFORE UPDATE ON public.workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the table was created successfully:

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'workout_sets') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'workout_sets';

-- Verify RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'workout_sets';

-- Verify policies exist:
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'workout_sets';

