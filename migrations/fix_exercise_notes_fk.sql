-- Migration: Fix exercise_notes foreign key constraint
-- Description: Remove the foreign key constraint on exercise_id since exercises
--              are managed locally in GYM_TEMPLATES, not in the database
-- Date: 2025-10-28

-- Drop the old constraint
ALTER TABLE IF EXISTS exercise_notes
DROP CONSTRAINT IF EXISTS exercise_notes_exercise_id_fkey;

-- Drop the old constraint for custom_rpe too (same issue)
ALTER TABLE IF EXISTS custom_rpe
DROP CONSTRAINT IF EXISTS custom_rpe_exercise_id_fkey;

-- Note: We keep the exercise_id field itself as UUID for data type consistency,
-- but don't enforce a database-level foreign key since exercises come from templates
