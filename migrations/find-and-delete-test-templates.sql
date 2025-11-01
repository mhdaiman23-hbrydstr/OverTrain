-- Find all current templates
-- Run this first to identify which templates need to be deleted
SELECT
  id,
  name,
  created_at,
  owner_user_id,
  is_public
FROM program_templates
ORDER BY created_at DESC;

-- Once you identify the 2 templates to delete, use their IDs in the DELETE statements below:

-- DELETE TEMPLATE 1 (replace UUID_HERE with actual template ID)
-- DELETE FROM program_templates WHERE id = 'UUID_HERE';

-- DELETE TEMPLATE 2 (replace UUID_HERE with actual template ID)
-- DELETE FROM program_templates WHERE id = 'UUID_HERE';

-- Note: Cascading deletes will automatically remove:
-- - program_template_days (days in the template)
-- - program_template_exercises (exercises in those days)
-- - program_progression_config (progression settings for the template)
