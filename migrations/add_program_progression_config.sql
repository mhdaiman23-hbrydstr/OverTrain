-- Migration: Add program_progression_config table
-- Description: Stores RIR/RPE progression patterns for program blocks
-- Date: 2025-10-26

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

-- Create index for efficient lookups by template
CREATE INDEX IF NOT EXISTS idx_prog_config_template ON program_progression_config(program_template_id);

-- Create index for efficient lookups by block length
CREATE INDEX IF NOT EXISTS idx_prog_config_block_len ON program_progression_config(block_length);
