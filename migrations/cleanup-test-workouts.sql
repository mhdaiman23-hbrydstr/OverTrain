-- ============================================================================
-- CLEANUP MIGRATION: Remove Test/Dev Workouts
-- ============================================================================
-- Date: 2025-10-29
-- Purpose: Clean up test data before production template imports
-- Status: Part of cleanup phase before production rollout
-- ============================================================================

-- ============================================================================
-- SECTION 1: ANALYSIS QUERIES (Run first to verify what will be deleted)
-- ============================================================================

-- Count current workouts by status
SELECT
  'Total workouts' as metric,
  COUNT(*) as count
FROM workouts
UNION ALL
SELECT
  'Completed workouts',
  COUNT(*)
FROM workouts
WHERE completed = true
UNION ALL
SELECT
  'Incomplete/abandoned workouts',
  COUNT(*)
FROM workouts
WHERE completed = false
UNION ALL
SELECT
  'In-progress workouts',
  COUNT(*)
FROM in_progress_workouts
UNION ALL
SELECT
  'Total workout sets',
  COUNT(*)
FROM workout_sets;

-- Identify users with test data
SELECT DISTINCT
  w.user_id,
  p.email,
  p.name,
  COUNT(w.id) as workout_count,
  MIN(w.created_at) as first_workout,
  MAX(w.created_at) as last_workout
FROM workouts w
LEFT JOIN profiles p ON p.id = w.user_id
GROUP BY w.user_id, p.email, p.name
ORDER BY workout_count DESC;

-- Check for active programs
SELECT
  ap.user_id,
  p.email,
  ap.program_name,
  ap.current_week,
  ap.current_day,
  ap.days_per_week,
  ap.total_weeks,
  ap.start_date,
  ap.created_at
FROM active_programs ap
LEFT JOIN profiles p ON p.id = ap.user_id
ORDER BY ap.created_at DESC;

-- ============================================================================
-- SECTION 2: CLEANUP OPERATIONS
-- ============================================================================
-- IMPORTANT: Review analysis queries above before running these deletions!
-- These operations are DESTRUCTIVE and cannot be easily undone.

-- Option 1: Delete all test workouts (if you have a way to identify them)
-- Adjust WHERE clause based on your test user IDs or created_at dates

-- BACKUP FIRST: Consider exporting data to CSV before deleting
-- In Supabase UI: click table → Export data

-- Delete in-progress workouts (usually safe - these are incomplete sessions)
DELETE FROM in_progress_workouts
WHERE created_at < NOW() - INTERVAL '30 days'
  OR (created_at < NOW() - INTERVAL '7 days' AND notes ILIKE '%test%');

-- Delete incomplete/abandoned workouts from test periods
DELETE FROM workouts
WHERE completed = false
  AND created_at < NOW() - INTERVAL '7 days'
  AND notes ILIKE '%test%';

-- Note: active_programs are typically kept for user reference
-- Only delete if you're sure you want to remove program history
-- Example: delete very old active programs (90+ days)
-- DELETE FROM active_programs
-- WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================================================
-- SECTION 3: DELETE ALL DATA EXCEPT SPECIFIED USERS
-- ============================================================================
-- WARNING: This will delete ALL data for users NOT in the whitelist!
-- Only run if you are completely sure you want to remove all other user data.

-- First, verify which users will be KEPT
SELECT
  'USERS TO KEEP (NOT DELETED)' as action,
  id,
  email,
  name
FROM profiles
WHERE id IN (
  '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
  'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
);

-- Verify which users will be DELETED
SELECT
  'USERS TO DELETE' as action,
  id,
  email,
  name,
  (SELECT COUNT(*) FROM workouts WHERE user_id = profiles.id) as workout_count
FROM profiles
WHERE id NOT IN (
  '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
  'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
);

-- ============================================================================
-- DESTRUCTIVE: Delete all data for users NOT in whitelist
-- ============================================================================
-- UNCOMMENT BELOW ONLY IF YOU ARE 100% SURE!

/*
DO $$
BEGIN
  -- Delete in dependency order (child tables first)
  DELETE FROM exercise_custom_rpe
  WHERE user_id NOT IN (
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
    'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
  );

  DELETE FROM exercise_notes
  WHERE user_id NOT IN (
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
    'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
  );

  DELETE FROM workout_sets
  WHERE workout_id IN (
    SELECT id FROM workouts
    WHERE user_id NOT IN (
      '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
      'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
    )
  );

  DELETE FROM workouts
  WHERE user_id NOT IN (
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
    'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
  );

  DELETE FROM in_progress_workouts
  WHERE user_id NOT IN (
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
    'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
  );

  DELETE FROM active_programs
  WHERE user_id NOT IN (
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
    'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
  );

  DELETE FROM program_history
  WHERE user_id NOT IN (
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
    'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
  );

  RAISE NOTICE 'Deleted all data for users NOT in whitelist';
END $$;
*/

-- ============================================================================
-- SECTION 4: VERIFY CLEANUP
-- ============================================================================

-- Verify which users remain
SELECT
  'REMAINING USERS' as section,
  id,
  email,
  name,
  (SELECT COUNT(*) FROM workouts WHERE user_id = profiles.id) as workout_count
FROM profiles
WHERE id IN (
  '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
  'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
);

-- Verify data counts after cleanup
SELECT
  'Total workouts after cleanup' as metric,
  COUNT(*) as count
FROM workouts
UNION ALL
SELECT
  'In-progress workouts after cleanup',
  COUNT(*)
FROM in_progress_workouts
UNION ALL
SELECT
  'Total workout sets after cleanup',
  COUNT(*)
FROM workout_sets
UNION ALL
SELECT
  'Total users remaining',
  COUNT(*)
FROM profiles
WHERE id IN (
  '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::UUID,
  'ca1fb2f8-60ab-46ce-9743-31260ebbcacc'::UUID
);

-- ============================================================================
-- SECTION 5: POST-CLEANUP MAINTENANCE
-- ============================================================================

-- Reclaim storage (optional - Postgres vacuum)
VACUUM ANALYZE workouts;
VACUUM ANALYZE in_progress_workouts;
VACUUM ANALYZE workout_sets;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration includes analysis queries to identify test data
-- 2. Actual deletions are conservative - only old incomplete workouts
-- 3. Section 3 provides a template for user-specific cleanup
-- 4. Review analysis output before running destructive operations
-- 5. Consider exporting data before cleanup as backup
-- 6. Use VACUUM to reclaim storage after large deletions
-- ============================================================================
