-- ============================================================================
-- WORKOUT TRACKING SCHEMA
-- ============================================================================
-- Purpose: Store user workout sessions, sets, and program state
-- Dependencies: profiles table must exist first
-- ============================================================================

-- ============================================================================
-- TABLE 1: active_programs
-- ============================================================================
-- Stores the user's current active program with progress tracking

CREATE TABLE IF NOT EXISTS active_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User relationship
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Program identification
  program_id TEXT NOT NULL,  -- References gym template ID
  program_name TEXT NOT NULL,
  
  -- Progress tracking
  current_week INT NOT NULL DEFAULT 1,
  current_day INT NOT NULL DEFAULT 1,
  
  -- Program metadata
  days_per_week INT NOT NULL,
  total_weeks INT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active program per user
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_active_programs_user 
  ON active_programs(user_id);

COMMENT ON TABLE active_programs IS 'User active program state with progress tracking';
COMMENT ON COLUMN active_programs.program_id IS 'Template ID from gym-templates.ts';
COMMENT ON COLUMN active_programs.current_week IS 'Current week in the program (1-indexed)';
COMMENT ON COLUMN active_programs.current_day IS 'Current day in the program (1-indexed)';

-- ============================================================================
-- TABLE 2: in_progress_workouts
-- ============================================================================
-- Stores workout sessions that are currently being logged

CREATE TABLE IF NOT EXISTS in_progress_workouts (
  id TEXT PRIMARY KEY,  -- Client-generated ID from workout-logger.ts
  
  -- User and program relationship
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id TEXT,  -- Optional: references gym template ID
  
  -- Workout metadata
  workout_name TEXT NOT NULL,
  week INT,
  day INT,
  
  -- Timing
  start_time BIGINT NOT NULL,  -- Timestamp in milliseconds
  
  -- Workout data (JSONB for flexibility)
  -- Structure: Array of exercises with sets
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_user 
  ON in_progress_workouts(user_id);

CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_week_day 
  ON in_progress_workouts(user_id, week, day);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_exercises 
  ON in_progress_workouts USING GIN (exercises);

COMMENT ON TABLE in_progress_workouts IS 'Workout sessions currently being logged';
COMMENT ON COLUMN in_progress_workouts.exercises IS 'JSONB array of exercises with sets data';
COMMENT ON COLUMN in_progress_workouts.start_time IS 'Workout start time in milliseconds since epoch';

-- ============================================================================
-- TABLE 3: workouts (completed workouts)
-- ============================================================================
-- Stores completed workout history

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,  -- Same ID from in_progress_workouts
  
  -- User and program relationship
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id TEXT,  -- Optional: references gym template ID
  
  -- Workout metadata
  workout_name TEXT NOT NULL,
  week INT,
  day INT,
  
  -- Timing
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  duration_minutes INT,
  
  -- Workout data
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status
  completed BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user 
  ON workouts(user_id);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date 
  ON workouts(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workouts_week_day 
  ON workouts(user_id, week, day);

CREATE INDEX IF NOT EXISTS idx_workouts_completed 
  ON workouts(user_id, completed);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_workouts_exercises 
  ON workouts USING GIN (exercises);

COMMENT ON TABLE workouts IS 'Completed workout history';
COMMENT ON COLUMN workouts.duration_minutes IS 'Workout duration calculated from start_time and end_time';
COMMENT ON COLUMN workouts.exercises IS 'JSONB array of exercises with completed sets';

-- ============================================================================
-- TABLE 4: workout_sets
-- ============================================================================
-- Stores individual set completions for analytics and tracking

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,  -- Format: workoutId-exerciseId-setNumber
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,  -- References workouts(id) or in_progress_workouts(id)
  exercise_id TEXT NOT NULL,
  
  -- Exercise info
  exercise_name TEXT NOT NULL,
  set_number INT NOT NULL CHECK (set_number > 0),
  
  -- Set data
  reps INT NOT NULL CHECK (reps >= 0),
  weight NUMERIC(6,2) NOT NULL CHECK (weight >= 0),
  completed BOOLEAN DEFAULT false,
  
  -- Context
  week INT,
  day INT,
  
  -- Timing
  completed_at BIGINT,  -- Timestamp in milliseconds
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user 
  ON workout_sets(user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout 
  ON workout_sets(workout_id);

CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise 
  ON workout_sets(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_sets_completed 
  ON workout_sets(user_id, completed, completed_at DESC);

COMMENT ON TABLE workout_sets IS 'Individual set records for analytics and progress tracking';
COMMENT ON COLUMN workout_sets.id IS 'Composite ID: workoutId-exerciseId-setNumber';
COMMENT ON COLUMN workout_sets.weight IS 'Weight used for the set (in user preferred unit)';

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Reuse existing update_updated_at_column function from profiles

CREATE TRIGGER update_active_programs_updated_at
  BEFORE UPDATE ON active_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_in_progress_workouts_updated_at
  BEFORE UPDATE ON in_progress_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE active_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_progress_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: active_programs
-- ============================================================================

-- Users can read their own active programs
CREATE POLICY "Users can view own active programs"
  ON active_programs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own active programs
CREATE POLICY "Users can insert own active programs"
  ON active_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own active programs
CREATE POLICY "Users can update own active programs"
  ON active_programs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own active programs
CREATE POLICY "Users can delete own active programs"
  ON active_programs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: in_progress_workouts
-- ============================================================================

-- Users can read their own in-progress workouts
CREATE POLICY "Users can view own in-progress workouts"
  ON in_progress_workouts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own in-progress workouts
CREATE POLICY "Users can insert own in-progress workouts"
  ON in_progress_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own in-progress workouts
CREATE POLICY "Users can update own in-progress workouts"
  ON in_progress_workouts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own in-progress workouts
CREATE POLICY "Users can delete own in-progress workouts"
  ON in_progress_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: workouts
-- ============================================================================

-- Users can read their own completed workouts
CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own completed workouts
CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own completed workouts
CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own completed workouts
CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: workout_sets
-- ============================================================================

-- Users can read their own workout sets
CREATE POLICY "Users can view own workout sets"
  ON workout_sets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own workout sets
CREATE POLICY "Users can insert own workout sets"
  ON workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own workout sets
CREATE POLICY "Users can update own workout sets"
  ON workout_sets FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own workout sets
CREATE POLICY "Users can delete own workout sets"
  ON workout_sets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate workout duration
CREATE OR REPLACE FUNCTION calculate_workout_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes := ROUND((NEW.end_time - NEW.start_time) / 60000.0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply duration calculation trigger
CREATE TRIGGER calculate_workout_duration_trigger
  BEFORE INSERT OR UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_workout_duration();

-- Function to set completed_at timestamp
CREATE OR REPLACE FUNCTION set_workout_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply completed_at trigger
CREATE TRIGGER set_workout_completed_at_trigger
  BEFORE UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION set_workout_completed_at();

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify tables created: SELECT * FROM active_programs;
-- 3. Test RLS: Try querying as authenticated user
-- 4. Monitor sync queue errors to ensure they're resolved

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

