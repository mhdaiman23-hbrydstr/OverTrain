-- SIMPLE FIX: Just delete the active program directly
-- The workouts will remain (which is correct - we want to keep workout history)

DELETE FROM active_programs 
WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c';

-- Verify it's gone
SELECT COUNT(*) as remaining_active_programs 
FROM active_programs 
WHERE user_id = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c';

-- This should return 0
