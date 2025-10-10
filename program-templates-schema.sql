-- ============================================================================
-- PROGRAM TEMPLATES SCHEMA
-- ============================================================================
-- Purpose: Store workout program templates in database instead of TypeScript
-- Performance: Optimized with indexes for <50ms cached queries
-- Dependencies: exercise_library table must exist first
-- ============================================================================

-- ============================================================================
-- TABLE 1: program_templates
-- ============================================================================
-- Stores program metadata (name, days, weeks, target audience)

CREATE TABLE IF NOT EXISTS program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,

  -- Program Structure
  days_per_week INT NOT NULL CHECK (days_per_week > 0 AND days_per_week <= 7),
  total_weeks INT NOT NULL CHECK (total_weeks > 0 AND total_weeks <= 52),
  deload_week INT CHECK (deload_week > 0 AND deload_week <= total_weeks),

  -- Target Audience
  gender TEXT[] NOT NULL CHECK (array_length(gender, 1) > 0),
  experience_level TEXT[] NOT NULL CHECK (array_length(experience_level, 1) > 0),

  -- Progression Configuration
  progression_type TEXT NOT NULL DEFAULT 'linear' CHECK (progression_type IN ('linear', 'percentage', 'hybrid')),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance: Fast filtering by gender, experience, active status
CREATE INDEX idx_program_templates_filter
  ON program_templates(is_active, gender, experience_level)
  WHERE is_active = true;

-- Performance: Fast lookup by name
CREATE INDEX idx_program_templates_name
  ON program_templates(name)
  WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE program_templates IS 'Workout program templates with metadata';
COMMENT ON COLUMN program_templates.gender IS 'Array of genders: [''male'', ''female'']';
COMMENT ON COLUMN program_templates.experience_level IS 'Array of levels: [''beginner'', ''intermediate'', ''advanced'']';
COMMENT ON COLUMN program_templates.deload_week IS 'Which week is the deload (typically last week)';

-- ============================================================================
-- TABLE 2: program_template_days
-- ============================================================================
-- Stores workout days within each template (e.g., "Upper A", "Lower B")

CREATE TABLE IF NOT EXISTS program_template_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number > 0),
  day_name TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique day numbers per template
  UNIQUE(program_template_id, day_number)
);

-- Performance: Fast lookup of all days for a template
CREATE INDEX idx_template_days_program
  ON program_template_days(program_template_id, day_number);

-- Add comments
COMMENT ON TABLE program_template_days IS 'Workout days within a program template';
COMMENT ON COLUMN program_template_days.day_number IS 'Day order (1, 2, 3, etc.)';
COMMENT ON COLUMN program_template_days.day_name IS 'Human-readable day name (e.g., "Upper Body A")';

-- ============================================================================
-- TABLE 3: program_template_exercises
-- ============================================================================
-- Links exercises from exercise_library to template days with progression config

CREATE TABLE IF NOT EXISTS program_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  template_day_id UUID NOT NULL REFERENCES program_template_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE RESTRICT,

  -- Exercise Order
  exercise_order INT NOT NULL CHECK (exercise_order > 0),

  -- Progression Configuration (stored as JSONB for flexibility)
  -- Structure:
  -- {
  --   "progressionTemplate": {
  --     "week1": { "sets": 3, "repRange": "8-10", "intensity": "working" },
  --     "week2": { "sets": 4, "repRange": "8-10" }
  --   },
  --   "autoProgression": {
  --     "enabled": true,
  --     "progressionType": "weight_based",
  --     "rules": {
  --       "if_all_sets_completed": "increase_weight_5",
  --       "if_failed_reps": "repeat_weight",
  --       "if_failed_twice": "reduce_weight_10_percent"
  --     }
  --   },
  --   "tier": "tier1"
  -- }
  progression_config JSONB NOT NULL,

  -- Exercise Settings
  rest_time_seconds INT DEFAULT 90 CHECK (rest_time_seconds >= 0),
  category TEXT NOT NULL CHECK (category IN ('compound', 'isolation')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique exercise order per day
  UNIQUE(template_day_id, exercise_order)
);

-- Performance: Fast lookup of all exercises for a day
CREATE INDEX idx_template_exercises_day
  ON program_template_exercises(template_day_id, exercise_order);

-- Performance: Fast lookup by exercise (for analytics)
CREATE INDEX idx_template_exercises_exercise
  ON program_template_exercises(exercise_id);

-- Performance: Fast JSONB queries on progression config
CREATE INDEX idx_template_exercises_progression
  ON program_template_exercises USING GIN (progression_config);

-- Add comments
COMMENT ON TABLE program_template_exercises IS 'Exercises within template days with progression configuration';
COMMENT ON COLUMN program_template_exercises.progression_config IS 'JSONB containing progressionTemplate and autoProgression rules';
COMMENT ON COLUMN program_template_exercises.category IS 'Exercise type: compound or isolation';
COMMENT ON COLUMN program_template_exercises.exercise_order IS 'Order in which exercise appears in the workout';

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Reuse existing update_updated_at_column function from exercise_library

CREATE TRIGGER update_program_templates_updated_at
  BEFORE UPDATE ON program_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_template_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active templates (for browsing programs)
CREATE POLICY "Anyone can read active templates"
  ON program_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read template days"
  ON program_template_days FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read template exercises"
  ON program_template_exercises FOR SELECT
  USING (true);

-- Policy: Only authenticated users can manage templates
CREATE POLICY "Authenticated users can insert templates"
  ON program_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update templates"
  ON program_templates FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete templates"
  ON program_templates FOR DELETE
  USING (auth.role() = 'authenticated');

-- Cascade policies for days and exercises (authenticated only)
CREATE POLICY "Authenticated users can manage template days"
  ON program_template_days FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage template exercises"
  ON program_template_exercises FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER VIEWS (Optional - for easy querying)
-- ============================================================================

-- View: Full template with all days and exercises
CREATE OR REPLACE VIEW program_templates_full AS
SELECT
  t.id as template_id,
  t.name as template_name,
  t.description,
  t.days_per_week,
  t.total_weeks,
  t.deload_week,
  t.gender,
  t.experience_level,
  t.progression_type,
  d.id as day_id,
  d.day_number,
  d.day_name,
  e.id as exercise_config_id,
  e.exercise_order,
  e.category,
  e.rest_time_seconds,
  e.progression_config,
  ex.id as exercise_id,
  ex.name as exercise_name,
  ex.muscle_group,
  ex.equipment_type
FROM program_templates t
LEFT JOIN program_template_days d ON t.id = d.program_template_id
LEFT JOIN program_template_exercises e ON d.id = e.template_day_id
LEFT JOIN exercise_library ex ON e.exercise_id = ex.id
WHERE t.is_active = true
ORDER BY t.name, d.day_number, e.exercise_order;

COMMENT ON VIEW program_templates_full IS 'Full template data with all relationships joined (read-only)';

-- ============================================================================
-- VALIDATION FUNCTION
-- ============================================================================

-- Function to validate exercise exists before adding to template
CREATE OR REPLACE FUNCTION validate_exercise_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM exercise_library WHERE id = NEW.exercise_id) THEN
    RAISE EXCEPTION 'Exercise ID % does not exist in exercise_library', NEW.exercise_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger
CREATE TRIGGER validate_exercise_before_insert
  BEFORE INSERT OR UPDATE ON program_template_exercises
  FOR EACH ROW
  EXECUTE FUNCTION validate_exercise_exists();

-- ============================================================================
-- SAMPLE DATA (Optional - uncomment to insert test template)
-- ============================================================================

/*
-- Sample: 2-Week Test Program
INSERT INTO program_templates (name, description, days_per_week, total_weeks, deload_week, gender, experience_level, progression_type)
VALUES (
  '2-Week Test Program',
  'Simple test program for development',
  3,
  2,
  2,
  ARRAY['male', 'female'],
  ARRAY['beginner', 'intermediate', 'advanced'],
  'linear'
) RETURNING id;

-- Note: After inserting template, add days and exercises manually
-- See scripts/create-template.ts for programmatic approach
*/

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify tables created: SELECT * FROM program_templates;
-- 3. Test RLS: Try querying as anonymous user
-- 4. Populate with templates using scripts/create-template.ts

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
