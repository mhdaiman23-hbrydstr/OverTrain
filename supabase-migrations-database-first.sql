-- Database-First Architecture Migration for LiftLog
-- This migration creates the necessary tables and indexes for the new database-first approach

-- ============================================================================
-- TABLES FOR DATABASE-FIRST WORKOUT LOGGER
-- ============================================================================

-- In-progress workouts table (for active workout tracking)
CREATE TABLE IF NOT EXISTS in_progress_workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
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

-- Sync queue table (for tracking pending sync operations)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('workout', 'set', 'workout_completion')),
  operation_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User workout preferences (for auto-save settings)
CREATE TABLE IF NOT EXISTS user_workout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_save_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_save_interval_seconds INTEGER NOT NULL DEFAULT 30,
  sync_on_wifi_only BOOLEAN NOT NULL DEFAULT false,
  enable_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- In-progress workouts indexes
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_user_id ON in_progress_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_start_time ON in_progress_workouts(start_time);
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_week_day ON in_progress_workouts(week, day);

-- Workout sets indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_id ON workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed_at ON workout_sets(completed_at);
CREATE INDEX IF NOT EXISTS idx_workout_sets_week_day ON workout_sets(week, day);

-- Sync queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_retry_count ON sync_queue(retry_count);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_workout_preferences_user_id ON user_workout_preferences(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE in_progress_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workout_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for in_progress_workouts
CREATE POLICY "Users can view own in-progress workouts" ON in_progress_workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own in-progress workouts" ON in_progress_workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress workouts" ON in_progress_workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own in-progress workouts" ON in_progress_workouts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for workout_sets
CREATE POLICY "Users can view own workout sets" ON workout_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sets" ON workout_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sets" ON workout_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sets" ON workout_sets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for sync_queue
CREATE POLICY "Users can view own sync queue items" ON sync_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync queue items" ON sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync queue items" ON sync_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync queue items" ON sync_queue
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for user_workout_preferences
CREATE POLICY "Users can view own preferences" ON user_workout_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_workout_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_workout_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_workout_preferences
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
CREATE TRIGGER update_in_progress_workouts_updated_at
  BEFORE UPDATE ON in_progress_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_sets_updated_at
  BEFORE UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_workout_preferences_updated_at
  BEFORE UPDATE ON user_workout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old sync queue items
CREATE OR REPLACE FUNCTION cleanup_old_sync_queue_items()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_queue 
  WHERE created_at < NOW() - INTERVAL '7 days' 
  AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR ANALYTICS AND REPORTING
-- ============================================================================

-- View for workout completion analytics
CREATE OR REPLACE VIEW workout_analytics AS
SELECT 
  w.user_id,
  DATE_TRUNC('week', to_timestamp(w.start_time / 1000)) as workout_week,
  COUNT(*) as total_workouts,
  AVG((w.end_time - w.start_time) / 1000 / 60) as avg_duration_minutes,
  COUNT(DISTINCT w.exercise_id) as unique_exercises
FROM in_progress_workouts w
WHERE w.completed = true
GROUP BY w.user_id, DATE_TRUNC('week', to_timestamp(w.start_time / 1000));

-- View for set performance analytics
CREATE OR REPLACE VIEW set_performance_analytics AS
SELECT 
  s.user_id,
  s.exercise_name,
  AVG(s.weight) as avg_weight,
  MAX(s.weight) as max_weight,
  AVG(s.reps) as avg_reps,
  MAX(s.reps) as max_reps,
  COUNT(*) as total_sets
FROM workout_sets s
WHERE s.completed = true
GROUP BY s.user_id, s.exercise_name;

-- ============================================================================
-- MIGRATION DATA (Optional - migrate existing data if needed)
-- ============================================================================

-- Function to migrate existing workout data to new structure
CREATE OR REPLACE FUNCTION migrate_existing_workout_data()
RETURNS void AS $$
DECLARE
  existing_workouts RECORD;
  new_workout_id TEXT;
BEGIN
  -- This function can be used to migrate data from the old workouts table
  -- to the new in_progress_workouts and workout_sets tables
  
  -- Example migration logic (customize based on existing schema)
  FOR existing_workouts IN 
    SELECT * FROM workouts WHERE completed = false
  LOOP
    -- Generate new workout ID
    new_workout_id := 'migrated-' || existing_workouts.id;
    
    -- Insert into in_progress_workouts
    INSERT INTO in_progress_workouts (
      id, user_id, program_id, workout_name, start_time, 
      week, day, exercises, notes
    ) VALUES (
      new_workout_id,
      existing_workouts.user_id,
      existing_workouts.program_id,
      existing_workouts.workout_name,
      existing_workouts.start_time,
      existing_workouts.week,
      existing_workouts.day,
      existing_workouts.exercises,
      existing_workouts.notes
    );
    
    -- Migrate sets if they exist in a separate table
    -- (Add logic here based on your existing set storage)
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default workout preferences for existing users
INSERT INTO user_workout_preferences (user_id, auto_save_enabled, auto_save_interval_seconds, sync_on_wifi_only, enable_notifications)
SELECT 
  id,
  true,
  30,
  false,
  true
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_workout_preferences WHERE user_workout_preferences.user_id = auth.users.id
);

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed 
  ON workout_sets(user_id, completed_at) 
  WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending 
  ON sync_queue(user_id, created_at) 
  WHERE status = 'pending';

-- Create a GIN index for JSONB exercises array
CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_exercises_gin 
  ON in_progress_workouts USING GIN (exercises);

-- ============================================================================
-- CLEANUP JOB (OPTIONAL - for automated cleanup)
-- ============================================================================

-- Create a function to be called periodically for cleanup
-- This can be called from a cron job or scheduled function
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
  -- Clean up old sync queue items
  PERFORM cleanup_old_sync_queue_items();
  
  -- Additional cleanup tasks can be added here
  -- For example: archiving old completed workouts, optimizing tables, etc.
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE in_progress_workouts IS 'Stores currently active workout sessions that are being tracked in real-time';
COMMENT ON TABLE workout_sets IS 'Stores individual sets completed during workouts, allowing for granular tracking and analytics';
COMMENT ON TABLE sync_queue IS 'Manages background sync operations with retry logic and error handling';
COMMENT ON TABLE user_workout_preferences IS 'Stores user-specific settings for workout logging and sync behavior';

COMMENT ON COLUMN in_progress_workouts.exercises IS 'JSONB array containing exercise data with sets, targets, and completion status';
COMMENT ON COLUMN sync_queue.operation_data IS 'JSONB data containing the operation details to be synced';
COMMENT ON COLUMN sync_queue.retry_count IS 'Number of retry attempts for failed sync operations';

-- Migration complete notification
DO $$
BEGIN
  RAISE NOTICE 'Database-first architecture migration completed successfully!';
  RAISE NOTICE 'Tables created: in_progress_workouts, workout_sets, sync_queue, user_workout_preferences';
  RAISE NOTICE 'Indexes created for optimal performance';
  RAISE NOTICE 'RLS policies implemented for data security';
  RAISE NOTICE 'Triggers and views created for analytics and maintenance';
END $$;
