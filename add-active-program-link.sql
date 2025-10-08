-- Add active_program_link column to existing in_progress_workouts table
-- This script safely adds the relationship without affecting existing data

-- ============================================================================
-- STEP 1: Add the column (if it doesn't exist)
-- ============================================================================

DO $$
BEGIN
    -- Check if column exists before adding it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'in_progress_workouts' 
        AND column_name = 'active_program_link'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE in_progress_workouts 
        ADD COLUMN active_program_link UUID;
        
        RAISE NOTICE 'Added active_program_link column to in_progress_workouts table';
    ELSE
        RAISE NOTICE 'active_program_link column already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add the foreign key constraint
-- ============================================================================

DO $$
BEGIN
    -- Check if constraint exists before adding it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_in_progress_workouts_active_program_link'
        AND table_name = 'in_progress_workouts'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE in_progress_workouts 
        ADD CONSTRAINT fk_in_progress_workouts_active_program_link 
        FOREIGN KEY (active_program_link) 
        REFERENCES active_programs(user_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint for active_program_link';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add the index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_in_progress_workouts_active_program_link 
ON in_progress_workouts(active_program_link);

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Check that the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'in_progress_workouts' 
AND column_name = 'active_program_link'
AND table_schema = 'public';

-- Check that the foreign key exists
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'in_progress_workouts'
    AND kcu.column_name = 'active_program_link';

-- Check that the index exists
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'in_progress_workouts' 
    AND indexname = 'idx_in_progress_workouts_active_program_link';

-- ============================================================================
-- STEP 5: Example usage queries
-- ============================================================================

-- Example: Find all workouts for a user's active program
/*
SELECT w.*, ap.template_id, ap.current_week, ap.current_day
FROM in_progress_workouts w
JOIN active_programs ap ON w.active_program_link = ap.user_id
WHERE w.user_id = 'your-user-uuid-here';
*/

-- Example: Get active program info with current workout
/*
SELECT ap.*, w.workout_name, w.start_time, w.week, w.day
FROM active_programs ap
LEFT JOIN in_progress_workouts w ON ap.user_id = w.active_program_link
WHERE ap.user_id = 'your-user-uuid-here';
*/

-- ============================================================================
-- COMPLETION NOTICE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'active_program_link column added successfully!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'What was added:';
    RAISE NOTICE '1. active_program_link column (UUID, nullable)';
    RAISE NOTICE '2. Foreign key to active_programs(user_id)';
    RAISE NOTICE '3. Performance index for quick lookups';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update your application code to use active_program_link';
    RAISE NOTICE '2. Test the relationship with sample data';
    RAISE NOTICE '3. Enjoy your connected active programs and workouts!';
    RAISE NOTICE '=========================================';
END $$;
