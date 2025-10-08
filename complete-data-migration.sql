-- Complete Data Migration: Link Workouts to Active Programs
-- Based on clarified business rules:
-- 1. Keep existing workouts without programs as NULL (for manual linking)
-- 2. Programs complete -> workouts become historical in Programs > History
-- 3. One active program per user at a time

-- ============================================================================
-- STEP 1: Analyze Current Data State
-- ============================================================================

-- Count workouts with and without active programs
SELECT 'Data Analysis' as step,
       COUNT(*) as total_workouts,
       COUNT(CASE WHEN active_program_link IS NULL THEN 1 END) as workouts_without_program,
       COUNT(CASE WHEN active_program_link IS NOT NULL THEN 1 END) as workouts_with_program,
       COUNT(CASE WHEN user_id IN (SELECT user_id FROM active_programs) THEN 1 END) as workouts_with_matching_program,
       COUNT(DISTINCT user_id) as unique_users_with_workouts
FROM in_progress_workouts;

-- Count active programs
SELECT 'Active Programs' as step,
       COUNT(*) as total_active_programs,
       COUNT(DISTINCT user_id) as unique_users_with_programs
FROM active_programs;

-- Show which users have workouts but no active programs
SELECT 'Users with Workouts but No Active Program' as step,
       user_id,
       COUNT(*) as workout_count,
       MIN(start_time) as first_workout,
       MAX(start_time) as latest_workout
FROM in_progress_workouts 
WHERE user_id NOT IN (SELECT user_id FROM active_programs)
GROUP BY user_id
ORDER BY workout_count DESC;

-- ============================================================================
-- STEP 2: Link Workouts to Active Programs (where possible)
-- ============================================================================

-- Link workouts to active programs for users who have both
UPDATE in_progress_workouts 
SET active_program_link = user_id 
WHERE user_id IN (SELECT user_id FROM active_programs)
AND active_program_link IS NULL;

-- Show results of linking
SELECT 'Linking Results' as step,
       COUNT(*) as workouts_updated
FROM in_progress_workouts 
WHERE active_program_link = user_id
AND user_id IN (SELECT user_id FROM active_programs);

-- ============================================================================
-- STEP 3: Add Foreign Key Constraint (with proper error handling)
-- ============================================================================

-- First, create the constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_in_progress_workouts_active_program_link'
        AND table_name = 'in_progress_workouts'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE in_progress_workouts 
        ADD CONSTRAINT fk_in_progress_workouts_active_program_link 
        FOREIGN KEY (active_program_link) 
        REFERENCES active_programs(user_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify the Migration
-- ============================================================================

-- Check final state
SELECT 'Final State' as step,
       COUNT(*) as total_workouts,
       COUNT(CASE WHEN active_program_link IS NULL THEN 1 END) as unlinked_workouts,
       COUNT(CASE WHEN active_program_link IS NOT NULL THEN 1 END) as linked_workouts,
       COUNT(CASE WHEN active_program_link = user_id THEN 1 END) as correctly_linked_workouts
FROM in_progress_workouts;

-- Test the relationship with a sample query
SELECT 'Sample Relationship Test' as step,
       w.user_id,
       w.workout_name,
       w.week,
       w.day,
       ap.template_id,
       ap.current_week,
       ap.current_day
FROM in_progress_workouts w
LEFT JOIN active_programs ap ON w.active_program_link = ap.user_id
WHERE w.active_program_link IS NOT NULL
LIMIT 5;

-- ============================================================================
-- STEP 5: Create Helper Functions for Application Logic
-- ============================================================================

-- Function to get user's current active program
CREATE OR REPLACE FUNCTION get_user_active_program(p_user_id UUID)
RETURNS TABLE (
    template_id TEXT,
    current_week INTEGER,
    current_day INTEGER,
    template_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT ap.template_id, ap.current_week, ap.current_day, ap.template_data
    FROM active_programs ap
    WHERE ap.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can start workout
CREATE OR REPLACE FUNCTION can_user_start_workout(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- User can start workout if they have an active program
    RETURN EXISTS (
        SELECT 1 FROM active_programs 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create workout with automatic program linking
CREATE OR REPLACE FUNCTION create_workout_with_program(
    p_workout_id TEXT,
    p_user_id UUID,
    p_workout_name TEXT,
    p_week INTEGER DEFAULT NULL,
    p_day INTEGER DEFAULT NULL,
    p_exercises JSONB DEFAULT '[]'::jsonb,
    p_notes TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_active_program_exists BOOLEAN;
BEGIN
    -- Check if user has active program
    SELECT EXISTS (
        SELECT 1 FROM active_programs 
        WHERE user_id = p_user_id
    ) INTO v_active_program_exists;
    
    IF NOT v_active_program_exists THEN
        RAISE EXCEPTION 'User must have an active program to start a workout';
    END IF;
    
    -- Create workout with automatic program link
    INSERT INTO in_progress_workouts (
        id, user_id, active_program_link, workout_name, 
        start_time, week, day, exercises, notes
    ) VALUES (
        p_workout_id,
        p_user_id,
        p_user_id, -- Link to active program
        p_workout_name,
        EXTRACT(EPOCH FROM NOW()) * 1000,
        p_week,
        p_day,
        p_exercises,
        p_notes
    );
    
    RETURN p_workout_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Business Logic Examples
-- ============================================================================

-- Example: Get user's current workout with program context
/*
SELECT 
    w.id as workout_id,
    w.workout_name,
    w.week as workout_week,
    w.day as workout_day,
    w.start_time,
    ap.template_id as program_template,
    ap.current_week as program_week,
    ap.current_day as program_day
FROM in_progress_workouts w
JOIN active_programs ap ON w.active_program_link = ap.user_id
WHERE w.user_id = 'user-uuid-here'
ORDER BY w.start_time DESC
LIMIT 1;
*/

-- Example: Get user's workout history (including completed programs)
/*
SELECT 
    w.workout_name,
    w.week,
    w.day,
    w.start_time,
    CASE 
        WHEN ap.user_id IS NOT NULL THEN ap.template_id
        ELSE 'No Active Program'
    END as program_context
FROM in_progress_workouts w
LEFT JOIN active_programs ap ON w.active_program_link = ap.user_id
WHERE w.user_id = 'user-uuid-here'
ORDER BY w.start_time DESC;
*/

-- ============================================================================
-- COMPLETION NOTICE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Data Migration Complete!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'What was done:';
    RAISE NOTICE '1. Linked existing workouts to active programs where possible';
    RAISE NOTICE '2. Added foreign key constraint';
    RAISE NOTICE '3. Created helper functions for application logic';
    RAISE NOTICE '4. Preserved workouts without programs (NULL values)';
    RAISE NOTICE '';
    RAISE NOTICE 'Business Rules Implemented:';
    RAISE NOTICE '- Users must have active program to start workouts';
    RAISE NOTICE '- One active program per user';
    RAISE NOTICE '- Workouts without programs preserved as NULL';
    RAISE NOTICE '- Program completion moves workouts to history';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update application to use helper functions';
    RAISE NOTICE '2. Manually link any remaining NULL workouts';
    RAISE NOTICE '3. Test workflow end-to-end';
    RAISE NOTICE '=========================================';
END $$;
