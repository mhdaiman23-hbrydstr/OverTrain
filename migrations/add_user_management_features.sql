-- ============================================================================
-- MIGRATION: User Management Features
-- ============================================================================
-- Adds device tracking, ban functionality, and enhanced user management
-- Date: 2025-11-01
-- ============================================================================

-- ============================================================================
-- ALTER profiles TABLE
-- ============================================================================

-- Add device tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Add ban functionality
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add active program tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_program_id UUID REFERENCES active_programs(id) ON DELETE SET NULL;

-- ============================================================================
-- CREATE user_login_history TABLE
-- ============================================================================
-- Tracks user login history for analytics and security

CREATE TABLE IF NOT EXISTS user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for device type queries
CREATE INDEX IF NOT EXISTS idx_profiles_device_type ON profiles(device_type);

-- Index for ban status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);

-- Index for login history queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON user_login_history(login_time DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS for login history
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own login history
CREATE POLICY "Users can view own login history" ON user_login_history
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all login history
CREATE POLICY "Admins can view all login history" ON user_login_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: System can insert login records
CREATE POLICY "System can insert login records" ON user_login_history
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update login count on successful login
CREATE OR REPLACE FUNCTION increment_login_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.success = true THEN
    UPDATE profiles 
    SET login_count = COALESCE(login_count, 0) + 1,
        last_sign_in_at = NEW.login_time,
        last_login_ip = NEW.ip_address,
        device_type = NEW.device_type
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_user_login_count
  AFTER INSERT ON user_login_history
  FOR EACH ROW EXECUTE FUNCTION increment_login_count();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Table created: user_login_history
-- Columns added to profiles: device_type, last_login_ip, login_count, is_banned, banned_at, ban_reason, banned_by, active_program_id
-- Features:
-- ✓ Device type tracking
-- ✓ IP address tracking
-- ✓ Login count tracking
-- ✓ Ban/unban functionality
-- ✓ Login history for security analytics
-- ✓ Active program tracking
-- ✓ Row Level Security for login history
-- ✓ Automatic login count updates
-- ============================================================================
