-- Debug query to check if auth.uid() matches your user_id
-- Run this to see what Supabase thinks your authenticated user ID is

SELECT
    auth.uid() as "Current auth.uid()",
    '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::uuid as "Your user_id",
    auth.uid() = '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c'::uuid as "Do they match?";

-- Also check if you have an active session
SELECT
    auth.uid() IS NULL as "Is auth.uid() NULL?";

-- If auth.uid() is NULL, you're not authenticated properly
-- If they don't match, you're authenticated as a different user
