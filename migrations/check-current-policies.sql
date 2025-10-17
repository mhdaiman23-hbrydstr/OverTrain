-- Check what policies currently exist for active_programs and program_history
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
WHERE tablename IN ('active_programs', 'program_history')
ORDER BY tablename, policyname;
