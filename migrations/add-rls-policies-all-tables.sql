-- ============================================================================
-- ADD ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ============================================================================
-- Date: 2025-10-29
-- Purpose: Ensure proper data isolation for users and role-based access
-- Status: Part of workout cleanup and production template import prep
--
-- ⚠️ CRITICAL: PRE-FLIGHT REQUIREMENTS
-- ============================================================================
-- 1. Run pre-rls-data-integrity-check.sql FIRST
-- 2. All integrity checks must show ✅ SAFE
-- 3. If any check fails, do NOT apply this migration
-- 4. Fix corrupted data using pre-flight check script
-- 5. Re-verify all checks pass before proceeding
-- ============================================================================

-- ============================================================================
-- SECTION 1: USER-SPECIFIC TABLES (user_id-based isolation)
-- ============================================================================

-- ===== exercise_notes TABLE =====
-- User-specific exercise notes with pinning support
-- Users can only see/edit their own notes

DROP POLICY IF EXISTS "Users can view own exercise notes" ON exercise_notes;
DROP POLICY IF EXISTS "Users can insert own exercise notes" ON exercise_notes;
DROP POLICY IF EXISTS "Users can update own exercise notes" ON exercise_notes;
DROP POLICY IF EXISTS "Users can delete own exercise notes" ON exercise_notes;

ALTER TABLE exercise_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise notes" ON exercise_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise notes" ON exercise_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise notes" ON exercise_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise notes" ON exercise_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===== exercise_custom_rpe TABLE =====
-- User-specific custom RPE values for exercises
-- Users can only see/edit their own RPE data

DROP POLICY IF EXISTS "Users can view own custom RPE" ON exercise_custom_rpe;
DROP POLICY IF EXISTS "Users can insert own custom RPE" ON exercise_custom_rpe;
DROP POLICY IF EXISTS "Users can update own custom RPE" ON exercise_custom_rpe;
DROP POLICY IF EXISTS "Users can delete own custom RPE" ON exercise_custom_rpe;

ALTER TABLE exercise_custom_rpe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom RPE" ON exercise_custom_rpe
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom RPE" ON exercise_custom_rpe
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom RPE" ON exercise_custom_rpe
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom RPE" ON exercise_custom_rpe
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===== workouts TABLE =====
-- Completed workouts - user-specific
-- Users can only see/edit their own workouts

DROP POLICY IF EXISTS "Users can view own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workouts" ON workouts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON workouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON workouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===== in_progress_workouts TABLE =====
-- Active workout sessions - user-specific
-- Users can only see/edit their own in-progress workouts

DROP POLICY IF EXISTS "Users can view own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can insert own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can update own in-progress workouts" ON in_progress_workouts;
DROP POLICY IF EXISTS "Users can delete own in-progress workouts" ON in_progress_workouts;

ALTER TABLE in_progress_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own in-progress workouts" ON in_progress_workouts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own in-progress workouts" ON in_progress_workouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress workouts" ON in_progress_workouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own in-progress workouts" ON in_progress_workouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===== workout_sets TABLE =====
-- Individual set data within workouts - user-specific through workout reference
-- Users can only see/edit sets from their own workouts

DROP POLICY IF EXISTS "Users can view own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can insert own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update own workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can delete own workout sets" ON workout_sets;

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Create temporary function to get user_id from workout_id
-- Note: workout_id might be TEXT or UUID, so cast explicitly
CREATE OR REPLACE FUNCTION get_workout_user_id(workout_id TEXT)
RETURNS UUID AS $$
  SELECT user_id FROM workouts WHERE id = workout_id::UUID
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE POLICY "Users can view own workout sets" ON workout_sets
  FOR SELECT
  USING (auth.uid() = get_workout_user_id(workout_id));

CREATE POLICY "Users can insert own workout sets" ON workout_sets
  FOR INSERT
  WITH CHECK (auth.uid() = get_workout_user_id(workout_id));

CREATE POLICY "Users can update own workout sets" ON workout_sets
  FOR UPDATE
  USING (auth.uid() = get_workout_user_id(workout_id))
  WITH CHECK (auth.uid() = get_workout_user_id(workout_id));

CREATE POLICY "Users can delete own workout sets" ON workout_sets
  FOR DELETE
  USING (auth.uid() = get_workout_user_id(workout_id));

-- ============================================================================
-- SECTION 2: SHARED/PUBLIC DATA TABLES (public read, restricted write)
-- ============================================================================

-- ===== exercise_library TABLE =====
-- Master list of exercises - public read, admin-only write
-- Note: Requires service role for insertion/update

DROP POLICY IF EXISTS "Everyone can view exercises" ON exercise_library;
DROP POLICY IF EXISTS "Admins can manage exercises" ON exercise_library;

ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view exercises" ON exercise_library
  FOR SELECT
  USING (true);

-- Admins/service role can manage
-- (This requires service role bypass - cannot enforce with user-based policy)
-- Note: This table should be managed through service role or manual admin work

-- ===== linear_progression_tiers TABLE =====
-- Exercise progression tiers - public read, admin-only write

DROP POLICY IF EXISTS "Everyone can view progression tiers" ON linear_progression_tiers;

ALTER TABLE linear_progression_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view progression tiers" ON linear_progression_tiers
  FOR SELECT
  USING (true);

-- ===== program_templates TABLE =====
-- Fitness program templates - public read (is_public=true), owner/admin write

DROP POLICY IF EXISTS "Everyone can view public program templates" ON program_templates;
DROP POLICY IF EXISTS "Users can view own program templates" ON program_templates;
DROP POLICY IF EXISTS "Users can create program templates" ON program_templates;
DROP POLICY IF EXISTS "Users can update own program templates" ON program_templates;
DROP POLICY IF EXISTS "Users can delete own program templates" ON program_templates;

ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

-- Public templates visible to everyone
CREATE POLICY "Everyone can view public program templates" ON program_templates
  FOR SELECT
  USING (is_public = true);

-- Users can view their own templates (public or private)
CREATE POLICY "Users can view own program templates" ON program_templates
  FOR SELECT
  USING (is_public = true OR auth.uid() = owner_user_id);

-- Users can insert templates (will set owner_user_id)
CREATE POLICY "Users can create program templates" ON program_templates
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id OR owner_user_id IS NULL);

-- Users can update only their own templates
CREATE POLICY "Users can update own program templates" ON program_templates
  FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Users can delete only their own templates
CREATE POLICY "Users can delete own program templates" ON program_templates
  FOR DELETE
  USING (auth.uid() = owner_user_id);

-- ===== program_template_days TABLE =====
-- Days within program templates - visibility tied to program_templates

DROP POLICY IF EXISTS "Users can view program template days" ON program_template_days;
DROP POLICY IF EXISTS "Users can insert program template days" ON program_template_days;
DROP POLICY IF EXISTS "Users can update program template days" ON program_template_days;
DROP POLICY IF EXISTS "Users can delete program template days" ON program_template_days;

ALTER TABLE program_template_days ENABLE ROW LEVEL SECURITY;

-- Create function to check if user owns the template
-- Note: template_id might be TEXT or UUID, so accept TEXT and cast
CREATE OR REPLACE FUNCTION user_owns_template(template_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT
    (auth.uid() = owner_user_id) OR is_public
  FROM program_templates
  WHERE id = template_id::UUID
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE POLICY "Users can view program template days" ON program_template_days
  FOR SELECT
  USING (user_owns_template(program_template_id));

CREATE POLICY "Users can insert program template days" ON program_template_days
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_templates
      WHERE id = program_template_id
      AND auth.uid() = owner_user_id
    )
  );

CREATE POLICY "Users can update program template days" ON program_template_days
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM program_templates
      WHERE id = program_template_id
      AND auth.uid() = owner_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_templates
      WHERE id = program_template_id
      AND auth.uid() = owner_user_id
    )
  );

CREATE POLICY "Users can delete program template days" ON program_template_days
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM program_templates
      WHERE id = program_template_id
      AND auth.uid() = owner_user_id
    )
  );

-- ===== program_template_exercises TABLE =====
-- Exercises within template days - visibility tied to program_templates

DROP POLICY IF EXISTS "Users can view program template exercises" ON program_template_exercises;
DROP POLICY IF EXISTS "Users can insert program template exercises" ON program_template_exercises;
DROP POLICY IF EXISTS "Users can update program template exercises" ON program_template_exercises;
DROP POLICY IF EXISTS "Users can delete program template exercises" ON program_template_exercises;

ALTER TABLE program_template_exercises ENABLE ROW LEVEL SECURITY;

-- Create function to get template_id from template_day_id
-- Note: day_id might be TEXT or UUID, so accept TEXT and cast
CREATE OR REPLACE FUNCTION get_template_id_from_day(day_id TEXT)
RETURNS UUID AS $$
  SELECT program_template_id FROM program_template_days WHERE id = day_id::UUID
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE POLICY "Users can view program template exercises" ON program_template_exercises
  FOR SELECT
  USING (user_owns_template(get_template_id_from_day(template_day_id)));

CREATE POLICY "Users can insert program template exercises" ON program_template_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_template_days ptd
      JOIN program_templates pt ON pt.id = ptd.program_template_id
      WHERE ptd.id = template_day_id
      AND auth.uid() = pt.owner_user_id
    )
  );

CREATE POLICY "Users can update program template exercises" ON program_template_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM program_template_days ptd
      JOIN program_templates pt ON pt.id = ptd.program_template_id
      WHERE ptd.id = template_day_id
      AND auth.uid() = pt.owner_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_template_days ptd
      JOIN program_templates pt ON pt.id = ptd.program_template_id
      WHERE ptd.id = template_day_id
      AND auth.uid() = pt.owner_user_id
    )
  );

CREATE POLICY "Users can delete program template exercises" ON program_template_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM program_template_days ptd
      JOIN program_templates pt ON pt.id = ptd.program_template_id
      WHERE ptd.id = template_day_id
      AND auth.uid() = pt.owner_user_id
    )
  );

-- ============================================================================
-- SECTION 3: TEMPLATE-LEVEL CONFIGURATION (public read)
-- ============================================================================

-- ===== program_progression_config TABLE =====
-- RIR/RPE progression patterns for blocks
-- Public read (templates are public), but no user-specific write needed

DROP POLICY IF EXISTS "Everyone can view progression config" ON program_progression_config;

ALTER TABLE program_progression_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view progression config" ON program_progression_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM program_templates
      WHERE id = program_template_id
      AND is_public = true
    )
    OR
    EXISTS (
      SELECT 1 FROM program_templates
      WHERE id = program_template_id
      AND auth.uid() = owner_user_id
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Helper functions created (user_owns_template, get_template_id_from_day, get_workout_user_id)
-- 2. All user-specific tables have strict user_id isolation
-- 3. Public templates visible to all authenticated users
-- 4. Private templates only visible to owner
-- 5. Service role can bypass RLS for admin operations
-- ============================================================================
