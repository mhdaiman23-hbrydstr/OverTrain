-- ============================================================================
-- CLEANUP MIGRATION: Delete All Custom Workouts
-- ============================================================================
-- Date: 2025-10-29
-- Purpose: Remove all user-created program templates (custom workouts)
-- Impact: Deletes custom programs but preserves built-in templates and history
-- ============================================================================

-- ============================================================================
-- SECTION 1: ANALYSIS QUERIES (Run first to verify what will be deleted)
-- ============================================================================

-- Show all custom workout templates
SELECT
  'Custom Templates (will be deleted)' as action,
  pt.id,
  pt.name,
  pt.owner_user_id,
  p.email,
  p.name as owner_name,
  pt.created_from,
  pt.origin_template_id,
  pt.is_public,
  pt.created_at
FROM program_templates pt
LEFT JOIN profiles p ON p.id = pt.owner_user_id
WHERE pt.owner_user_id IS NOT NULL
ORDER BY pt.created_at DESC;

-- Count custom templates by user
SELECT
  'Custom templates by user' as metric,
  p.email,
  p.name,
  COUNT(pt.id) as template_count
FROM program_templates pt
LEFT JOIN profiles p ON p.id = pt.owner_user_id
WHERE pt.owner_user_id IS NOT NULL
GROUP BY p.id, p.email, p.name
ORDER BY template_count DESC;

-- Check for active programs using custom templates
SELECT
  'Active Programs using custom templates' as action,
  ap.id,
  ap.user_id,
  p.email,
  ap.program_name,
  pt.name as template_name,
  pt.owner_user_id as template_owner_id,
  ap.created_at
FROM active_programs ap
JOIN program_templates pt ON pt.id = ap.program_id
LEFT JOIN profiles p ON p.id = ap.user_id
WHERE pt.owner_user_id IS NOT NULL
ORDER BY ap.created_at DESC;

-- Count total custom templates and related data
SELECT
  'Total custom templates' as metric,
  COUNT(*) as count
FROM program_templates
WHERE owner_user_id IS NOT NULL
UNION ALL
SELECT
  'Total template days (custom)',
  COUNT(*)
FROM program_template_days ptd
WHERE ptd.program_template_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
UNION ALL
SELECT
  'Total template day exercises (custom)',
  COUNT(*)
FROM program_template_day_exercises ptde
WHERE ptde.program_template_day_id IN (
  SELECT ptd.id FROM program_template_days ptd
  WHERE ptd.program_template_id IN (
    SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
  )
)
UNION ALL
SELECT
  'Total progression configs (custom)',
  COUNT(*)
FROM program_progression_config ppc
WHERE ppc.program_template_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
UNION ALL
SELECT
  'Active programs using custom templates',
  COUNT(*)
FROM active_programs ap
WHERE ap.program_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
);

-- ============================================================================
-- SECTION 2: PRE-DELETION RECOMMENDATIONS
-- ============================================================================
-- WARNING: Review the analysis above before proceeding with deletion!
--
-- Key impacts:
-- 1. All custom program templates will be deleted (owner_user_id IS NOT NULL)
-- 2. Template days and exercises will cascade delete automatically
-- 3. Active programs referencing custom templates will be orphaned
--    (Consider manually checking/cleaning these first)
-- 4. Completed workouts will remain (they reference active_programs, not templates)
-- 5. No user profile data is deleted
--
-- RECOMMENDATION:
-- - Export "Active Programs using custom templates" before deleting
-- - Consider if you want to keep/delete those active programs separately
-- - This deletion is IRREVERSIBLE - backup data if needed

-- ============================================================================
-- SECTION 3: CASCADE DELETE IMPACT ANALYSIS
-- ============================================================================
-- What WILL be deleted:
--   ✅ program_templates (custom only)
--   ✅ program_template_days (CASCADE)
--   ✅ program_template_day_exercises (CASCADE)
--   ✅ program_progression_config (CASCADE)
--
-- What WON'T be deleted:
--   ⚠️  active_programs (orphaned - optional cleanup)
--   ✅ workouts (remain as historical records)
--   ✅ workout_sets (remain as historical records)

-- ============================================================================
-- SECTION 4: DELETION OPTION A - Templates Only (Safest)
-- ============================================================================
-- Delete custom program templates but keep all user data
-- Active programs will be orphaned (optional to clean separately)

/*
-- First verify the count
SELECT
  'Custom templates to delete' as metric,
  COUNT(*) as count
FROM program_templates
WHERE owner_user_id IS NOT NULL;

-- Execute deletion
DELETE FROM program_templates
WHERE owner_user_id IS NOT NULL;

-- Verify deletion was successful
SELECT
  'Total custom templates after cleanup' as metric,
  COUNT(*) as count
FROM program_templates
WHERE owner_user_id IS NOT NULL;

SELECT
  'Remaining templates (built-in only)' as metric,
  COUNT(*) as count
FROM program_templates
WHERE owner_user_id IS NULL;
*/

-- ============================================================================
-- SECTION 5: DELETION OPTION B - Templates + Orphaned Programs (Cleaner)
-- ============================================================================
-- Delete custom templates AND the active programs that reference them
-- This prevents orphaned references (programs pointing to non-existent templates)
-- Completed workouts + sets remain (safe - no reference to templates)

/*
-- Step 1: Identify orphaned programs (will be deleted)
SELECT
  'WILL BE DELETED: orphaned active programs' as action,
  ap.id,
  ap.user_id,
  ap.program_name,
  pt.name as template_name
FROM active_programs ap
JOIN program_templates pt ON pt.id = ap.program_id
WHERE pt.owner_user_id IS NOT NULL;

-- Step 2: Delete orphaned active programs (those using custom templates)
DELETE FROM active_programs
WHERE program_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
);

-- Step 3: Delete custom program templates (triggers CASCADE)
DELETE FROM program_templates
WHERE owner_user_id IS NOT NULL;

-- Step 4: Verify cleanup
SELECT
  'Custom templates remaining' as metric,
  COUNT(*) as count
FROM program_templates
WHERE owner_user_id IS NOT NULL
UNION ALL
SELECT 'Orphaned active programs remaining',
  COUNT(*)
FROM active_programs ap
WHERE ap.program_id NOT IN (
  SELECT id FROM program_templates
);

-- Step 5: Verify completed data remains
SELECT 'Completed workouts (preserved)' as section,
  COUNT(*) as count
FROM workouts
UNION ALL
SELECT 'Workout sets (preserved)',
  COUNT(*)
FROM workout_sets;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. CASCADE delete automatically handles template-related tables:
--    - program_template_days
--    - program_template_day_exercises
--    - program_progression_config
--
-- 2. Workouts table does NOT reference program_templates directly
--    → Workouts only reference user_id and program_id (for history)
--    → Safe to delete templates without affecting workout records
--
-- 3. Active programs that reference deleted templates will be orphaned
--    → Either:
--       a) Leave them (minimal impact if no longer actively used)
--       b) Delete them using Option B above (cleaner approach)
--
-- 4. Completed workouts + sets remain intact (recommended to preserve)
--    → Historical data is preserved regardless of template deletion
--
-- 5. This is a data-destructive operation - consider backup first
-- ============================================================================
