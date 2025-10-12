-- Migration script to add 1RM and preferred unit columns to profiles table
-- Run this script on existing Supabase databases to add the new columns

-- Add the one_rep_max column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS one_rep_max JSONB DEFAULT '{}';

-- Add the preferred_unit column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_unit TEXT CHECK (preferred_unit IN ('metric', 'imperial')) DEFAULT 'metric';

-- Add comments to describe the column structures
COMMENT ON COLUMN profiles.one_rep_max IS 'JSONB object storing user''s one rep max values for main lifts. Structure: {"squat": number, "benchPress": number, "deadlift": number}';
COMMENT ON COLUMN profiles.preferred_unit IS 'User''s preferred weight unit: "metric" for kg or "imperial" for lbs';

-- Update existing profiles to have default 1RM values
UPDATE profiles 
SET one_rep_max = '{"squat": 0, "benchPress": 0, "deadlift": 0}' 
WHERE one_rep_max IS NULL OR one_rep_max = '{}';

-- Update existing profiles to have default unit (metric)
UPDATE profiles 
SET preferred_unit = 'metric' 
WHERE preferred_unit IS NULL;

-- Verify the columns were added successfully
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('one_rep_max', 'preferred_unit');
