-- ====================================================================
-- Fix: Ensure all canonical templates are publicly visible
-- ====================================================================
-- Problem: The add-is-public-to-program-templates migration added the
-- is_public column with DEFAULT false. If templates existed before this
-- migration, they all got is_public=false. The RLS policy requires
-- is_public=true for SELECT, so templates are invisible to users.
--
-- Solution: Set is_public=true for all canonical (non-user-owned) templates
-- ====================================================================

-- Fix canonical templates
UPDATE program_templates
SET is_public = true
WHERE owner_user_id IS NULL
  AND is_public = false;

-- Verify the fix
SELECT id, name, is_public, is_active, owner_user_id
FROM program_templates
WHERE owner_user_id IS NULL
ORDER BY name;
