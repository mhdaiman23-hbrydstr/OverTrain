-- ============================================================================
-- COMBINED MIGRATION: Exercise Notes & Custom RPE Feature
-- ============================================================================
-- Run this file in Supabase SQL Editor to set up all new tables at once
-- Date: 2025-10-26
-- ============================================================================

-- ============================================================================
-- 1. CREATE program_progression_config TABLE
-- ============================================================================
-- Stores RIR/RPE progression patterns for program blocks (4-8 weeks)

CREATE TABLE IF NOT EXISTS program_progression_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  block_length INTEGER NOT NULL CHECK (block_length IN (4, 5, 6, 7, 8)),
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  rir_value INTEGER NOT NULL CHECK (rir_value >= 0 AND rir_value <= 8),
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 2 AND rpe_value <= 10),
  UNIQUE(program_template_id, block_length, week_number),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prog_config_template ON program_progression_config(program_template_id);
CREATE INDEX IF NOT EXISTS idx_prog_config_block_len ON program_progression_config(block_length);

-- ============================================================================
-- 2. CREATE exercise_notes TABLE
-- ============================================================================
-- Stores exercise-specific notes with pinning for week-to-week carryover

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

CREATE INDEX IF NOT EXISTS idx_notes_user_program ON exercise_notes(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_notes_exercise_week ON exercise_notes(exercise_id, week);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON exercise_notes(is_pinned) WHERE is_pinned = true;

-- ============================================================================
-- 3. CREATE exercise_custom_rpe TABLE
-- ============================================================================
-- Stores per-set RPE recordings independent of block-level progression
-- Supports decimal RPE values (8.5, 9.5, etc.)

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

CREATE INDEX IF NOT EXISTS idx_custom_rpe_user_program ON exercise_custom_rpe(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_week ON exercise_custom_rpe(exercise_id, week);
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_prog ON exercise_custom_rpe(exercise_id, program_instance_id);

-- ============================================================================
-- 4. ALTER profiles TABLE
-- ============================================================================
-- Add RIR/RPE display preference to existing profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  rpe_rir_display_mode TEXT DEFAULT 'rir' CHECK (rpe_rir_display_mode IN ('rir', 'rpe', 'off'));

CREATE INDEX IF NOT EXISTS idx_profiles_rpe_rir_mode ON profiles(rpe_rir_display_mode);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables created and indexed successfully!
--
-- Tables created:
-- ✓ program_progression_config
-- ✓ exercise_notes
-- ✓ exercise_custom_rpe
-- ✓ profiles (updated with new column)
--
-- Next steps:
-- 1. Verify tables in Supabase Dashboard
-- 2. Begin Phase 5: Component Integration
-- ============================================================================
