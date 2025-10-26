-- Migration: Add RIR/RPE display preference to profiles table
-- Description: Allows users to toggle between RIR, RPE, or no intensity label display
-- Date: 2025-10-26

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  rpe_rir_display_mode TEXT DEFAULT 'rir' CHECK (rpe_rir_display_mode IN ('rir', 'rpe', 'off'));

-- Create index for preference lookups (rarely needed but good for data analysis)
CREATE INDEX IF NOT EXISTS idx_profiles_rpe_rir_mode ON profiles(rpe_rir_display_mode);
