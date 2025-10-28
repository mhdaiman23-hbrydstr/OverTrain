-- Audit Logs Table (Tier 1: Minimal)
-- Only logs critical actions to stay in free tier
-- Auto-cleanup: 90-day retention

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Row Level Security: Only admins can view audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can only see their own logs (if needed for user viewing)
-- But typically only admins should see these
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (
    auth.uid() = user_id OR
    -- Admin check: Users with is_admin = TRUE
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Policy: Only authenticated users can insert (via API)
CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Cleanup: Delete logs older than 90 days (run this monthly or via cron)
-- IMPORTANT: Test this in a dev environment first!
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Estimated storage with Tier 1 logging:
-- 5 critical actions per user per day
-- 1,000 users = 5,000 rows/day
-- 5,000 rows × 280 bytes ≈ 1.4 MB/day
-- 1.4 MB/day × 30 days ≈ 42 MB/month
-- 42 MB/month × 12 months ≈ 504 MB/year = FREE TIER ✅
