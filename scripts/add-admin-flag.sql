-- Add is_admin flag to profiles table for admin-only features
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure there's an index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles (is_admin);
