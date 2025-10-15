-- Add Linear Progression Tier Column to Exercise Library
-- This migration adds a foreign key reference from exercises to progression tiers
-- Exercises can be manually assigned a tier, or fall back to heuristic-based tier selection

-- Add the column (NULL initially until tiers are assigned)
ALTER TABLE exercise_library
ADD COLUMN IF NOT EXISTS linear_progression_tier_id UUID REFERENCES linear_progression_tiers(id) ON DELETE SET NULL;

-- Create index for fast lookups when joining exercises with tiers
CREATE INDEX IF NOT EXISTS idx_exercise_library_tier_id ON exercise_library(linear_progression_tier_id);

-- Add comment explaining the column
COMMENT ON COLUMN exercise_library.linear_progression_tier_id IS 'Foreign key to linear_progression_tiers. Defines progression rules for this exercise. NULL means use heuristic-based tier selection.';

-- Verify the column was added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'exercise_library'
  AND column_name = 'linear_progression_tier_id';

-- Show exercises without tier assignment (should be all exercises initially)
SELECT
  COUNT(*) AS exercises_without_tier,
  'Column added successfully. Run assign-tiers-to-exercises.ts to populate.' AS next_step
FROM exercise_library
WHERE linear_progression_tier_id IS NULL;
