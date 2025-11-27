-- Migration: Add RPC function for user account deletion
-- Purpose: Allow users to delete their own accounts from native/static apps
-- Security: Function uses SECURITY DEFINER to bypass RLS and delete from auth.users
-- Date: 2024-01-27

-- Create RPC function to delete user's own account
-- This function can only be called by authenticated users and will delete their own account
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to delete from auth.users
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  user_email text;
  result json;
BEGIN
  -- Get the current user's ID from auth context
  user_id := auth.uid();

  -- Check if user is authenticated
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get user email for logging (before deletion)
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;

  -- Log the deletion attempt in audit_logs table (if exists)
  BEGIN
    INSERT INTO audit_logs (action, user_id, details, created_at)
    VALUES (
      'ACCOUNT_DELETED',
      user_id,
      json_build_object('email', user_email, 'deletedAt', now()),
      now()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Audit table doesn't exist, continue anyway
      NULL;
  END;

  -- Delete the user from auth.users
  -- This will CASCADE delete all related data in profiles, workouts, etc.
  DELETE FROM auth.users WHERE id = user_id;

  -- Build success response
  result := json_build_object(
    'success', true,
    'message', 'Account successfully deleted',
    'deletedUserId', user_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'errorCode', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_account() IS
'Allows authenticated users to delete their own account. This action is permanent and cannot be undone. All user data (profile, workouts, programs, etc.) will be deleted via CASCADE constraints.';
