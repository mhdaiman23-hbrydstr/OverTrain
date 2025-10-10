# Exercise Library Schema Deployment Guide

## 🎯 Objective
Deploy the `exercise_library` table schema to your Supabase database to enable the new exercise library system.

## 📋 SQL Schema

```sql
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
```

## 🚀 Deployment Steps

### Step 1: Access Supabase Dashboard
1. Go to https://app.supabase.com
2. Sign in to your account
3. Navigate to your project: `https://fyhbpkjibjtvltwcavlw.supabase.co`

### Step 2: Open SQL Editor
1. In the left sidebar, click on "SQL Editor"
2. Click "New query" to open a new SQL editor tab

### Step 3: Execute Schema
1. Copy the entire SQL schema from above
2. Paste it into the SQL editor
3. Click the "Run" button (or press Ctrl+Enter)
4. Wait for the execution to complete

### Step 4: Verify Deployment
1. In the left sidebar, click on "Table Editor"
2. You should see `exercise_library` in the list of tables
3. Click on `exercise_library` to verify the table structure
4. The table should be empty (0 rows) but have the correct columns:
   - `id` (UUID)
   - `name` (TEXT)
   - `muscle_group` (TEXT)
   - `equipment_type` (TEXT)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

## ✅ Verification Commands

After deployment, you can verify the schema by running these commands:

### Check Table Exists
```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'exercise_library';
```

### Check Indexes
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'exercise_library';
```

### Check RLS Policies
```sql
SELECT policyname, tablename, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'exercise_library';
```

## 🔄 Next Steps

After successfully deploying the schema:

1. **Run the migration script** to populate the table with exercise data:
   ```bash
   npx ts-node scripts/migrate-exercise-library.ts
   ```

2. **Test the service** to verify everything works:
   ```bash
   node test-exercise-library-integration.html
   ```

3. **Update the application** to use the new exercise library service

## 🚨 Troubleshooting

### Permission Errors
If you get permission errors, ensure you're using the correct Supabase project and have admin privileges.

### Table Already Exists
If the table already exists, the `CREATE TABLE IF NOT EXISTS` statement should handle it safely.

### RLS Issues
If RLS policies cause issues, you can temporarily disable them for testing:
```sql
ALTER TABLE exercise_library DISABLE ROW LEVEL SECURITY;
```

## 📞 Support

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Verify your environment variables are correct
3. Ensure you have the necessary permissions

---

**Status**: ⏳ Waiting for manual schema deployment
**Next Action**: Deploy schema via Supabase SQL Editor, then run migration script
