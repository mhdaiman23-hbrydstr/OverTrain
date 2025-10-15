-- Create Linear Progression Tiers Table
-- This table stores configurable progression tier rules for linear progression
-- Each tier defines how weight should increase week-over-week for different exercise categories

CREATE TABLE IF NOT EXISTS linear_progression_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT UNIQUE NOT NULL,
  min_increment DECIMAL(5,2) NOT NULL CHECK (min_increment > 0),
  weekly_increase DECIMAL(6,4) NOT NULL CHECK (weekly_increase >= 0 AND weekly_increase <= 1),
  adjustment_bounds DECIMAL(5,4) NOT NULL CHECK (adjustment_bounds >= 0 AND adjustment_bounds <= 1),
  max_rep_adjustment INTEGER NOT NULL CHECK (max_rep_adjustment >= 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on tier_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_linear_progression_tiers_name ON linear_progression_tiers(tier_name);

-- Enable Row Level Security
ALTER TABLE linear_progression_tiers ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view progression tiers)
CREATE POLICY "Public read access to progression tiers"
  ON linear_progression_tiers
  FOR SELECT
  TO public, anon, authenticated
  USING (true);

-- Authenticated users can insert/update/delete (admin operations)
CREATE POLICY "Authenticated users can insert progression tiers"
  ON linear_progression_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update progression tiers"
  ON linear_progression_tiers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete progression tiers"
  ON linear_progression_tiers
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant explicit table permissions
GRANT SELECT ON linear_progression_tiers TO anon;
GRANT SELECT ON linear_progression_tiers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON linear_progression_tiers TO authenticated;

-- Create updated_at trigger
CREATE TRIGGER update_linear_progression_tiers_updated_at
  BEFORE UPDATE ON linear_progression_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
SELECT 'linear_progression_tiers table created successfully' AS status;
