-- Migration: Add exercise_custom_rpe table
-- Description: Stores per-set RPE recordings independent of block-level progression
-- Supports decimal RPE values (8.5, 9.5, etc.)
-- Date: 2025-10-26

CREATE TABLE IF NOT EXISTS exercise_custom_rpe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 1 AND rpe_value <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_instance_id, exercise_id, week, set_number)
);

-- Create index for efficient lookups by user and program
CREATE INDEX IF NOT EXISTS idx_custom_rpe_user_program ON exercise_custom_rpe(user_id, program_instance_id);

-- Create index for efficient lookups by exercise and week
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_week ON exercise_custom_rpe(exercise_id, week);

-- Create index for lookups by exercise and program
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_prog ON exercise_custom_rpe(exercise_id, program_instance_id);
