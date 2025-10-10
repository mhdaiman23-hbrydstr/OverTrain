-- Temporarily allow anonymous template creation for scripts
-- Run this in Supabase SQL Editor

-- Allow anonymous users to create templates (for scripts)
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON program_templates;
CREATE POLICY "Anyone can insert templates" 
  ON program_templates FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage template days" ON program_template_days;
CREATE POLICY "Anyone can manage template days"
  ON program_template_days FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage template exercises" ON program_template_exercises;
CREATE POLICY "Anyone can manage template exercises"
  ON program_template_exercises FOR ALL
  USING (true);

-- Note: You can restore the original policies later if needed
-- This is just for template creation scripts
