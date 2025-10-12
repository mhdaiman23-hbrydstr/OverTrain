-- Add bodyweight field to profiles table
ALTER TABLE profiles 
ADD COLUMN bodyweight DECIMAL(5,1);

-- Add comment to describe the field
COMMENT ON COLUMN profiles.bodyweight IS 'User bodyweight in preferred unit (kg or lbs)';
