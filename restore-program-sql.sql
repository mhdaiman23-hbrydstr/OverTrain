-- SQL Script to restore program state for testing
-- This will delete the Week 6, Day 3 completion and reset the active program state

-- Step 1: Delete the Week 6, Day 3 workout completion
DELETE FROM workouts 
WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c' 
AND week = 6 
AND day = 3 
AND completed = true;

-- Step 2: Reset active program to Week 6, Day 2
UPDATE active_programs 
SET current_week = 6, 
    current_day = 2, 
    completed_workouts = 17
WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c';

-- Step 3: Update program history to mark as active again
UPDATE program_history 
SET is_active = true,
    completed_workouts = 17,
    completion_rate = 94.4,
    end_date = NULL
WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c' 
AND template_id = 'fullbody-3day-beginner-female'
AND NOT is_active;

-- Step 4: Verify the changes
SELECT 
    ap.current_week,
    ap.current_day,
    ap.completed_workouts,
    ap.total_workouts,
    ph.is_active,
    ph.completed_workouts as history_completed,
    ph.completion_rate
FROM active_programs ap
LEFT JOIN program_history ph ON ap.user_id = ph.user_id AND ap.template_id = ph.template_id
WHERE ap.user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c';

-- Step 5: Check remaining workouts for Week 6
SELECT week, day, completed, workout_name 
FROM workouts 
WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c' 
AND week = 6 
ORDER BY day;
