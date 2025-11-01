-- ============================================================================
-- MIGRATION: Support Requests Table
-- ============================================================================
-- Stores all incoming support requests, feature requests, and feedback
-- Date: 2025-11-01
-- ============================================================================

-- ============================================================================
-- CREATE support_requests TABLE
-- ============================================================================
-- Stores all user-submitted feedback, bug reports, and feature requests

CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('General Feedback', 'Bug Report', 'Feature Request', 'Support')),
  subject TEXT,
  details TEXT NOT NULL,
  contact_email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for filtering by status and type
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_type ON support_requests(type);

-- Index for filtering by priority and creation date
CREATE INDEX IF NOT EXISTS idx_support_requests_priority ON support_requests(priority);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);

-- Index for admin assignment
CREATE INDEX IF NOT EXISTS idx_support_requests_assigned_to ON support_requests(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own support requests
CREATE POLICY "Users can view own support requests" ON support_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own support requests
CREATE POLICY "Users can insert own support requests" ON support_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all support requests
CREATE POLICY "Admins can view all support requests" ON support_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins can update all support requests
CREATE POLICY "Admins can update all support requests" ON support_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins can delete all support requests
CREATE POLICY "Admins can delete all support requests" ON support_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_support_requests_updated_at 
  BEFORE UPDATE ON support_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  ELSIF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_support_request_resolved_at
  BEFORE UPDATE ON support_requests
  FOR EACH ROW EXECUTE FUNCTION set_resolved_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Table created: support_requests
-- Features:
-- ✓ Stores all types of feedback and support requests
-- ✓ Includes rating system for general feedback
-- ✓ Includes severity levels for bug reports
-- ✓ Status tracking (new, in_progress, resolved, closed)
-- ✓ Priority levels for admin triage
-- ✓ Admin assignment and notes
-- ✓ Row Level Security for users and admins
-- ✓ Automatic timestamp management
-- ============================================================================
