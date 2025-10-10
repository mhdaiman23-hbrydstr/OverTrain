-- Exercise Library Table Schema
-- This table stores all exercises with their basic information

CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON exercise_library(name);
CREATE INDEX IF NOT EXISTS idx_exercise_library_muscle_group ON exercise_library(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment_type ON exercise_library(equipment_type);

-- RLS Policies
-- Anyone can read exercises (for workout logging and browsing)
CREATE POLICY "Anyone can read exercises" ON exercise_library FOR SELECT USING (true);

-- Only authenticated users can manage exercises (for future admin features)
CREATE POLICY "Authenticated users can insert exercises" ON exercise_library FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update exercises" ON exercise_library FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete exercises" ON exercise_library FOR DELETE USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_exercise_library_updated_at 
    BEFORE UPDATE ON exercise_library 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE exercise_library IS 'Central repository of all exercises available in the application';
COMMENT ON COLUMN exercise_library.id IS 'Unique identifier for the exercise (UUID)';
COMMENT ON COLUMN exercise_library.name IS 'Human-readable exercise name, must be unique';
COMMENT ON COLUMN exercise_library.muscle_group IS 'Primary muscle group targeted by the exercise';
COMMENT ON COLUMN exercise_library.equipment_type IS 'Type of equipment required for the exercise';
COMMENT ON COLUMN exercise_library.created_at IS 'When the exercise was added to the library';
COMMENT ON COLUMN exercise_library.updated_at IS 'When the exercise was last modified';
