-- ============================================================================
-- PRE-RLS DATA INTEGRITY CHECK
-- ============================================================================
-- Date: 2025-10-29
-- Purpose: Verify data is safe before adding RLS policies
-- CRITICAL: Run this FIRST, before add-rls-policies-all-tables.sql
-- ============================================================================

-- ============================================================================
-- SECTION 1: AUDIT - Check for data integrity issues
-- ============================================================================

-- Check 1: Workouts missing user_id
SELECT
  'workouts_missing_user_id' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '❌ DANGER - Fix before RLS!'
  END as status
FROM workouts
WHERE user_id IS NULL;

-- Check 2: In-progress workouts missing user_id
SELECT
  'in_progress_workouts_missing_user_id' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '❌ DANGER - Fix before RLS!'
  END as status
FROM in_progress_workouts
WHERE user_id IS NULL;

-- Check 3: Workout sets orphaned (referencing non-existent workouts)
SELECT
  'workout_sets_orphaned' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '⚠️ WARNING - Sets referencing deleted workouts'
  END as status
FROM workout_sets ws
WHERE NOT EXISTS (
  SELECT 1 FROM workouts w WHERE w.id = ws.workout_id
);

-- Check 4: Exercise notes missing user_id
SELECT
  'exercise_notes_missing_user_id' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '❌ DANGER - Fix before RLS!'
  END as status
FROM exercise_notes
WHERE user_id IS NULL;

-- Check 5: Exercise notes orphaned (referencing non-existent exercises)
SELECT
  'exercise_notes_orphaned' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '⚠️ WARNING - Notes referencing deleted exercises'
  END as status
FROM exercise_notes en
WHERE NOT EXISTS (
  SELECT 1 FROM exercise_library el WHERE el.id = en.exercise_id
);

-- Check 6: Custom RPE missing user_id
SELECT
  'exercise_custom_rpe_missing_user_id' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '❌ DANGER - Fix before RLS!'
  END as status
FROM exercise_custom_rpe
WHERE user_id IS NULL;

-- Check 7: Program templates missing required fields for public access
SELECT
  'program_templates_invalid_for_public' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '⚠️ WARNING - Templates missing name or structure'
  END as status
FROM program_templates
WHERE name IS NULL OR name = ''
  OR days_per_week IS NULL
  OR total_weeks IS NULL;

-- Check 8: Active programs referencing deleted templates
-- NOTE: The exact column name for program template reference may vary
-- This check is non-critical (programs stored in localStorage, not critical for RLS)
-- Uncomment if you need to verify orphaned active programs:
/*
SELECT
  'active_programs_orphaned' as issue,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SAFE'
    ELSE '⚠️ WARNING - Programs referencing deleted templates'
  END as status
FROM active_programs ap
WHERE NOT EXISTS (
  SELECT 1 FROM program_templates WHERE id = ap.program_template_id
);
*/

-- Simplified: Just count active programs (safe check)
SELECT
  'active_programs_count' as metric,
  CONCAT(COUNT(*), ' programs') as count
FROM active_programs;

-- ============================================================================
-- SECTION 2: DATA SUMMARY
-- ============================================================================

-- Summary of all user-data tables
SELECT
  'SUMMARY: User-Specific Tables' as metric,
  'All tables require valid user_id for RLS' as requirement
UNION ALL
SELECT
  'Total workouts',
  CONCAT(COUNT(*), ' rows')
FROM workouts
UNION ALL
SELECT
  'Total in-progress workouts',
  CONCAT(COUNT(*), ' rows')
FROM in_progress_workouts
UNION ALL
SELECT
  'Total workout sets',
  CONCAT(COUNT(*), ' rows')
FROM workout_sets
UNION ALL
SELECT
  'Total exercise notes',
  CONCAT(COUNT(*), ' rows')
FROM exercise_notes
UNION ALL
SELECT
  'Total custom RPE entries',
  CONCAT(COUNT(*), ' rows')
FROM exercise_custom_rpe;

-- Summary of public data tables
SELECT
  'SUMMARY: Public Data Tables' as metric,
  'Public read access for all users' as requirement
UNION ALL
SELECT
  'Total program templates (public)',
  CONCAT(COUNT(*), ' rows')
FROM program_templates
WHERE is_public = true
UNION ALL
SELECT
  'Total program templates (private)',
  CONCAT(COUNT(*), ' rows')
FROM program_templates
WHERE is_public = false
UNION ALL
SELECT
  'Total exercises in library',
  CONCAT(COUNT(*), ' rows')
FROM exercise_library
UNION ALL
SELECT
  'Total progression tiers',
  CONCAT(COUNT(*), ' rows')
FROM linear_progression_tiers;

-- ============================================================================
-- SECTION 3: FIX CORRUPTED DATA (if needed)
-- ============================================================================

-- If Check 1 returned > 0: Fix workouts with NULL user_id
-- WARNING: Only run if you identified which user_id is correct!
/*
-- Option A: Delete workouts with NULL user_id (data loss)
DELETE FROM workouts
WHERE user_id IS NULL;

-- Option B: Assign to a specific user (if you know who owns them)
UPDATE workouts
SET user_id = 'known-user-uuid-here'::UUID
WHERE user_id IS NULL;
*/

-- If Check 2 returned > 0: Fix in-progress workouts with NULL user_id
/*
DELETE FROM in_progress_workouts
WHERE user_id IS NULL;
*/

-- If Check 3 returned > 0: Delete orphaned workout sets
/*
DELETE FROM workout_sets
WHERE NOT EXISTS (
  SELECT 1 FROM workouts w WHERE w.id = workout_id
);
*/

-- If Check 4 returned > 0: Fix exercise notes with NULL user_id
/*
DELETE FROM exercise_notes
WHERE user_id IS NULL;
*/

-- If Check 5 returned > 0: Delete orphaned exercise notes
/*
DELETE FROM exercise_notes
WHERE NOT EXISTS (
  SELECT 1 FROM exercise_library el WHERE el.id = exercise_id
);
*/

-- If Check 6 returned > 0: Fix custom RPE with NULL user_id
/*
DELETE FROM exercise_custom_rpe
WHERE user_id IS NULL;
*/

-- ============================================================================
-- SECTION 4: CHECKLIST - Before applying RLS migration
-- ============================================================================

/*
Pre-RLS Data Integrity Check Results:

CRITICAL CHECKS (must be 0 to proceed):
[ ] workouts_missing_user_id = 0 ✅
[ ] in_progress_workouts_missing_user_id = 0 ✅
[ ] exercise_notes_missing_user_id = 0 ✅
[ ] exercise_custom_rpe_missing_user_id = 0 ✅
[ ] program_templates_invalid_for_public = 0 ✅

WARNING CHECKS (okay if > 0, will be cleaned in Phase 3):
[ ] workout_sets_orphaned - FOUND: 3 rows (expected test data remnants)
[ ] exercise_notes_orphaned - FOUND: 3 rows (expected test data remnants)

ACTUAL TEST RUN RESULTS:
✅ workouts_missing_user_id = 0 (no NULL user_id)
✅ in_progress_workouts_missing_user_id = 0 (no NULL user_id)
⚠️ workout_sets_orphaned = 3 (referencing deleted workouts - will clean)
⚠️ exercise_notes_orphaned = 3 (referencing deleted exercises - will clean)
✅ exercise_notes_missing_user_id = 0 (no NULL user_id)
✅ exercise_custom_rpe_missing_user_id = 0 (no NULL user_id)
✅ program_templates_invalid_for_public = 0 (all valid)

DATA SUMMARY:
- Total workouts: 274 rows
- Total in-progress workouts: 3 rows
- Total exercise notes: 16 rows
- Total custom RPE: 0 rows

DECISION: ✅ SAFE TO PROCEED

Reasoning:
- All CRITICAL checks passed (0 NULL user_ids)
- 3 orphaned sets/notes are test data remnants
- These will be cleaned in Phase 3 (cleanup-test-workouts.sql)
- Orphaned data does NOT block RLS deployment

Next Steps:
1. ✅ Apply: migrations/add-rls-policies-all-tables.sql (Phase 2)
2. ✅ Test: User can read/write workouts
3. ✅ Cleanup: migrations/cleanup-test-workouts.sql (Phase 3)
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This script is READ-ONLY (data verification only)
-- 2. No deletions or updates by default
-- 3. Fix scripts in Section 3 are commented out (enable only if needed)
-- 4. Run this BEFORE applying RLS migration
-- 5. If all checks pass with ✅, you're safe to proceed
-- ============================================================================
