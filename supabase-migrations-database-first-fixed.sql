-- Database-First Architecture Migration for LiftLog (FIXED VERSION)
-- This migration creates the necessary tables and indexes for the new database-first approach
-- Fixed: Removed foreign key reference, handled existing policies, removed optional tables

-- ============================================================================
-- TABLES FOR DATABASE-FIRST WORKOUT LOGGER
-- ============================================================================

-- In-progress workouts table (for active workout tracking)
CREATE TABLE IF NOT EXISTS in_progress_workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Add active_program_link to establish relationship with active_programs
  -- Since active_programs has user_id as primary key, we can reference it
  active_program_link UUID REFERENCES active_programs(user_id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  start_time BIGINT NOT NULL,
  week INTEGER,
  day INTEGER,
  exercises JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout sets table (for individual set tracking)
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL REFERENCES in_progress_workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at BIGINT,
  notes TEXT,
  week INTEGER,
  day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- In-progress workouts indexes
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_user_id ON in_progress_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_start_time ON in_progress_workouts(start_time);
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_week_day ON in_progress_workouts(week, day);
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_active_program_link ON in_progress_workouts(active_program_link);

-- Workout sets indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed_at ON workout_sets(completed_at);
CREATE INDEX IF NOT EXISTS idx_workout_sets_week_day ON workout_sets(week, day);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Handle Existing Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE in_progress_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can insert own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can update own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can delete own in-progress workouts" ON in_progress_workouts;

DROP POLICY IF EXISTS "Users can read own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON workout_sets;

-- RLS policies for in_progress_workouts (using "read" to match your existing naming)
CREATE POLICY "Users can read own in-progress workouts" ON in_progress_workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own in-progress workouts" ON in_progress_workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress workouts" ON in_progress_workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own in-progress workouts" ON in_progress_workouts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for workout_sets (using "read" to match your existing naming)
CREATE POLICY "Users can read own workout sets" ON workout_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sets" ON workout_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sets" ON workout_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sets" ON workout_sets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_in_progress_workouts_updated_at ON in_progress_workouts;
CREATE TRIGGER update_in_progress_workouts_updated_at
  BEFORE UPDATE ON in_progress_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_sets_updated_at ON workout_sets;
CREATE TRIGGER update_workout_sets_updated_at
  BEFORE UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed 
  ON workout_sets(user_id, completed_at) 
  WHERE completed = true;

-- Create a GIN index for JSONB exercises array
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_exercises_gin 
  ON in_progress_workouts USING GIN (exercises);

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE in_progress_workouts IS 'Stores currently active workout sessions that are being tracked in real-time';
COMMENT ON TABLE workout_sets IS 'Stores individual sets completed during workouts, allowing for granular tracking and analytics';
COMMENT ON COLUMN in_progress_workouts.exercises IS 'JSONB array containing exercise data with sets, targets, and completion status';

-- Migration complete notification
DO $$
BEGIN
  RAISE NOTICE 'Database-first architecture migration (FIXED) completed successfully!';
  RAISE NOTICE 'Tables: in_progress_workouts, workout_sets';
  RAISE NOTICE 'Indexes created for optimal performance';
  RAISE NOTICE 'RLS policies implemented with correct naming';
  RAISE NOTICE 'Triggers created for updated_at timestamps';
  RAISE NOTICE 'Removed dependency on non-existent programs table';
END $$;
