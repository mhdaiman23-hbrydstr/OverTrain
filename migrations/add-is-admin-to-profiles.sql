-- Migration: Add is_admin field to profiles table
-- Purpose: Enable role-based access control for admin template builder
-- Date: 2025-10-31

-- Add is_admin boolean column with default false
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for efficient admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Set your admin account (replace with your email)
-- Run this after applying migration and update the email to your account
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';

-- Check current admin users
SELECT id, email, is_admin FROM profiles WHERE is_admin = true;
