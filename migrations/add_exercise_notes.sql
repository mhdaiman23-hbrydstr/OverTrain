-- Migration: Add exercise_notes table
-- Description: Stores exercise-specific notes with pinning for week-to-week carryover
-- Date: 2025-10-26

CREATE TABLE IF NOT EXISTS exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_instance_id, exercise_id, week)
);

-- Create index for efficient lookups by user and program
CREATE INDEX IF NOT EXISTS idx_notes_user_program ON exercise_notes(user_id, program_instance_id);

-- Create index for efficient lookups by exercise and week
CREATE INDEX IF NOT EXISTS idx_notes_exercise_week ON exercise_notes(exercise_id, week);

-- Create index for pinned notes lookups
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON exercise_notes(is_pinned) WHERE is_pinned = true;
