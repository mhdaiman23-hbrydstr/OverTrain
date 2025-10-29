-- ============================================================================
-- ANALYSIS: Cascade Delete Impact for Custom Program Templates
-- ============================================================================
-- This file analyzes what WILL and WON'T be deleted when removing custom templates
-- Run all queries in order to understand the full impact
-- ============================================================================

-- ============================================================================
-- PART 1: Understanding the Data Model
-- ============================================================================

-- Show table relationships for program_templates
SELECT
  'TABLE RELATIONSHIPS' as section,
  'program_templates' as parent_table,
  'program_template_days' as child_table,
  'ON DELETE CASCADE' as delete_rule
UNION ALL
SELECT 'TABLE RELATIONSHIPS', 'program_templates', 'program_progression_config', 'ON DELETE CASCADE'
UNION ALL
SELECT 'TABLE RELATIONSHIPS', 'program_template_days', 'program_template_day_exercises', 'ON DELETE CASCADE'
UNION ALL
SELECT 'TABLE RELATIONSHIPS', 'program_templates', 'active_programs (via program_id)', 'NO CASCADE (orphaned reference)'
UNION ALL
SELECT 'TABLE RELATIONSHIPS', 'active_programs', 'workouts', 'NO CASCADE (workouts remain as historical records)'
UNION ALL
SELECT 'TABLE RELATIONSHIPS', 'workouts', 'workout_sets', 'ON DELETE CASCADE';

-- ============================================================================
-- PART 2: What WILL be Cascade Deleted (Safe to Delete)
-- ============================================================================

-- Count template-related data that WILL cascade delete
SELECT
  'DATA THAT WILL CASCAD DELETE' as impact,
  COUNT(*) as count,
  'program_template_days' as table_name
FROM program_template_days ptd
WHERE ptd.program_template_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
UNION ALL
SELECT 'DATA THAT WILL CASCADE DELETE',
  COUNT(*),
  'program_template_day_exercises'
FROM program_template_day_exercises ptde
WHERE ptde.program_template_day_id IN (
  SELECT ptd.id FROM program_template_days ptd
  WHERE ptd.program_template_id IN (
    SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
  )
)
UNION ALL
SELECT 'DATA THAT WILL CASCADE DELETE',
  COUNT(*),
  'program_progression_config'
FROM program_progression_config ppc
WHERE ppc.program_template_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
UNION ALL
SELECT 'DATA THAT WILL CASCADE DELETE',
  COUNT(*),
  'program_templates (custom only)'
FROM program_templates
WHERE owner_user_id IS NOT NULL;

-- ============================================================================
-- PART 3: What WON'T Cascade Delete (Orphaned Data Risk)
-- ============================================================================

-- Active programs referencing custom templates (NOT cascade deleted!)
SELECT
  'DATA THAT WON''T CASCADE' as risk,
  'active_programs (orphaned)' as table_name,
  COUNT(*) as orphaned_count,
  'Template will delete but program reference will break' as consequence
FROM active_programs ap
WHERE ap.program_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
UNION ALL
-- Workouts created from those active programs
SELECT 'DATA THAT WON''T CASCADE',
  'workouts (will remain)',
  COUNT(*),
  'Completed workouts remain in DB (safe to keep)'
FROM workouts w
WHERE w.user_id IN (
  SELECT ap.user_id FROM active_programs ap
  WHERE ap.program_template_id IN (
    SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
  )
)
UNION ALL
-- Workout sets from those workouts
SELECT 'DATA THAT WON''T CASCADE',
  'workout_sets (will remain)',
  COUNT(*),
  'Completed workout data remains (safe to keep)'
FROM workout_sets ws
WHERE ws.workout_id IN (
  SELECT w.id FROM workouts w
  WHERE w.user_id IN (
    SELECT ap.user_id FROM active_programs ap
    WHERE ap.program_template_id IN (
      SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
    )
  )
);

-- ============================================================================
-- PART 4: Detailed Breakdown - Show Exactly What Will Happen
-- ============================================================================

-- Show active programs that reference custom templates
SELECT
  'ACTIVE PROGRAMS AT RISK' as action,
  ap.id,
  ap.user_id,
  ap.program_name,
  pt.name as template_name,
  ap.current_week,
  ap.current_day,
  ap.created_at
FROM active_programs ap
JOIN program_templates pt ON pt.id = ap.program_id
WHERE pt.owner_user_id IS NOT NULL
ORDER BY ap.created_at DESC;

-- Show how many workouts exist per active program
SELECT
  'WORKOUTS FROM CUSTOM PROGRAMS' as action,
  ap.id as active_program_id,
  ap.program_name,
  COUNT(w.id) as completed_workout_count
FROM active_programs ap
LEFT JOIN workouts w ON w.user_id = ap.user_id
WHERE ap.program_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
GROUP BY ap.id, ap.program_name
ORDER BY completed_workout_count DESC;

-- ============================================================================
-- PART 5: RECOMMENDATIONS & CLEANUP STRATEGY
-- ============================================================================

/*
DELETION IMPACT SUMMARY:
========================

✅ WILL BE DELETED (CASCADE):
  - program_templates (custom only, where owner_user_id IS NOT NULL)
  - program_template_days (all related days)
  - program_template_day_exercises (all related exercises)
  - program_progression_config (all related progression settings)

⚠️  WON'T BE DELETED (ORPHANED):
  - active_programs (that reference custom templates)
    → Program will have broken reference to deleted template
    → Consider deleting these manually first (optional)

✅ SAFE TO KEEP (Unaffected):
  - workouts (completed workout history)
  - workout_sets (completed set data)
  - Program history remains intact

RECOMMENDED CLEANUP PROCEDURE:
==============================

OPTION A: Delete Custom Templates ONLY (Leaves Orphaned Programs)
  - Run: DELETE FROM program_templates WHERE owner_user_id IS NOT NULL;
  - Result: Clean templates, orphaned active_programs remain
  - Use if: You want to keep completed workout history but remove template definitions

OPTION B: Delete Custom Templates + Orphaned Programs (Cleaner)
  1. First identify custom template IDs:
     SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL;

  2. Delete active programs referencing those templates:
     DELETE FROM active_programs
     WHERE program_template_id IN (
       SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
     );

  3. Delete custom templates:
     DELETE FROM program_templates WHERE owner_user_id IS NOT NULL;

  4. Keep completed workouts + sets (historical record)

  Result: No orphaned references, workout history preserved

IMPORTANT NOTES:
================
- Workouts table has NO foreign key to program_templates
- Workouts only reference user_id and program_id (historical tracking)
- Deleting templates does NOT delete workout history
- Completed workouts + sets remain in DB (safe and recommended)
- Only active_programs may reference deleted templates (optional cleanup)
*/

-- ============================================================================
-- PART 6: Verify Table Structure
-- ============================================================================

-- Check if workouts actually references active_programs or program_templates
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as references_table,
  ccu.column_name as references_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('workouts', 'active_programs', 'program_templates', 'workout_sets')
ORDER BY tc.table_name, kcu.column_name;
