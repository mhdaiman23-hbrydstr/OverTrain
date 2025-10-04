-- LiftLog Database Schema Migration
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- 1. WORKOUTS HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT,
  workout_name TEXT NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  week INTEGER,
  day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_week_day ON public.workouts(user_id, week, day);

-- ============================================================================
-- 2. IN-PROGRESS WORKOUTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.in_progress_workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT,
  workout_name TEXT NOT NULL,
  start_time BIGINT NOT NULL,
  week INTEGER,
  day INTEGER,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.in_progress_workouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own in-progress workouts"
  ON public.in_progress_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own in-progress workouts"
  ON public.in_progress_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress workouts"
  ON public.in_progress_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own in-progress workouts"
  ON public.in_progress_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_in_progress_user_id ON public.in_progress_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_in_progress_week_day ON public.in_progress_workouts(user_id, week, day);

-- Unique constraint: one in-progress workout per week/day
CREATE UNIQUE INDEX IF NOT EXISTS idx_in_progress_unique_week_day
  ON public.in_progress_workouts(user_id, week, day);

-- ============================================================================
-- 3. ACTIVE PROGRAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.active_programs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_data JSONB, -- Store the full template for reference
  start_date BIGINT NOT NULL,
  current_week INTEGER NOT NULL DEFAULT 1,
  current_day INTEGER NOT NULL DEFAULT 1,
  completed_workouts INTEGER NOT NULL DEFAULT 0,
  total_workouts INTEGER NOT NULL,
  progress DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.active_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own active program"
  ON public.active_programs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active program"
  ON public.active_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active program"
  ON public.active_programs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own active program"
  ON public.active_programs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. PROGRAM HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.program_history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  completion_rate DECIMAL NOT NULL DEFAULT 0,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  completed_workouts INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.program_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own program history"
  ON public.program_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own program history"
  ON public.program_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own program history"
  ON public.program_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own program history"
  ON public.program_history FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_history_user_id ON public.program_history(user_id);
CREATE INDEX IF NOT EXISTS idx_program_history_active ON public.program_history(user_id, is_active);

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER in_progress_workouts_updated_at
  BEFORE UPDATE ON public.in_progress_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER active_programs_updated_at
  BEFORE UPDATE ON public.active_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER program_history_updated_at
  BEFORE UPDATE ON public.program_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. WORKOUT SETS TABLE (for real-time set logging)
-- ============================================================================
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

-- Enable RLS
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON public.workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON public.workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_week_day ON public.workout_sets(user_id, week, day);
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed_at ON public.workout_sets(completed_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER in_progress_workouts_updated_at
  BEFORE UPDATE ON public.in_progress_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER active_programs_updated_at
  BEFORE UPDATE ON public.active_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER program_history_updated_at
  BEFORE UPDATE ON public.program_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER workout_sets_updated_at
  BEFORE UPDATE ON public.workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. VERIFY TABLES
-- ============================================================================
-- Run this to verify all tables were created successfully:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('workouts', 'in_progress_workouts', 'active_programs', 'program_history', 'workout_sets');
