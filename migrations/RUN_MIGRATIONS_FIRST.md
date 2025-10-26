# Database Migrations - Exercise Notes & Custom RPE Feature

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended for Quick Setup)

1. **Go to Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your LiftLog project
   - Go to SQL Editor → New Query

2. **Run Each Migration File in Order**
   - Copy the SQL from `add_program_progression_config.sql`
   - Paste into SQL Editor
   - Click "RUN"
   - Repeat for remaining files:
     - `add_exercise_notes.sql`
     - `add_exercise_custom_rpe.sql`
     - `add_rpe_rir_display_preference.sql`

3. **Verify Tables Created**
   - Go to the "Tables" panel in Supabase Dashboard
   - Confirm you see:
     - `program_progression_config`
     - `exercise_notes`
     - `exercise_custom_rpe`
   - Check `profiles` table has new column: `rpe_rir_display_mode`

### Option 2: Run Combined Migration

If you prefer to run all at once, use the file: `all_migrations_combined.sql`

This file contains all 4 migrations in the correct order.

---

## Migration Order (IMPORTANT!)

Run in this exact order:

1. **add_program_progression_config.sql**
   - Creates: `program_progression_config` table
   - No dependencies

2. **add_exercise_notes.sql**
   - Creates: `exercise_notes` table
   - References: `profiles`, `exercise_library`
   - Both tables must exist

3. **add_exercise_custom_rpe.sql**
   - Creates: `exercise_custom_rpe` table
   - References: `profiles`, `exercise_library`
   - Both tables must exist

4. **add_rpe_rir_display_preference.sql**
   - Alters: `profiles` table
   - Adds: `rpe_rir_display_mode` column
   - Must run last (alters existing table)

---

## What Each Migration Does

### 1. program_progression_config
Stores RIR/RPE progression patterns for different program block lengths (4-8 weeks).

```
Columns:
- id (UUID)
- program_template_id (UUID, FK → program_templates)
- block_length (INTEGER: 4, 5, 6, 7, or 8)
- week_number (INTEGER)
- rir_value (INTEGER: 0-8)
- rpe_value (DECIMAL: 1-10, supports decimals)
- created_at (TIMESTAMP)
```

### 2. exercise_notes
Stores exercise-specific notes that can be pinned to repeat weekly.

```
Columns:
- id (UUID)
- user_id (UUID, FK → profiles)
- program_instance_id (UUID)
- exercise_id (UUID, FK → exercise_library)
- week (INTEGER)
- note_text (TEXT)
- is_pinned (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. exercise_custom_rpe
Stores per-set RPE recordings independent of block-level progression.

```
Columns:
- id (UUID)
- user_id (UUID, FK → profiles)
- program_instance_id (UUID)
- exercise_id (UUID, FK → exercise_library)
- week (INTEGER)
- set_number (INTEGER)
- rpe_value (DECIMAL: 1-10)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 4. profiles (ALTER)
Adds user preference for intensity display.

```
New Column:
- rpe_rir_display_mode (TEXT: 'rir' | 'rpe' | 'off')
  Default: 'rir'
```

---

## Verification Checklist

After running migrations:

- [ ] `program_progression_config` table exists
- [ ] `exercise_notes` table exists
- [ ] `exercise_custom_rpe` table exists
- [ ] `profiles` table has `rpe_rir_display_mode` column
- [ ] All tables have correct indexes
- [ ] No error messages in Supabase logs

---

## Rollback Instructions

If you need to rollback migrations:

```sql
-- Drop new tables (in reverse order)
DROP TABLE IF EXISTS exercise_custom_rpe CASCADE;
DROP TABLE IF EXISTS exercise_notes CASCADE;
DROP TABLE IF EXISTS program_progression_config CASCADE;

-- Remove new column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS rpe_rir_display_mode;
```

---

## Troubleshooting

### Error: "relation 'exercise_library' does not exist"
- The `exercise_library` table doesn't exist in your Supabase project
- This might be expected if using a different setup
- Contact support or check your schema

### Error: "column already exists"
- Migrations may have already been run
- Check the tables in Supabase Dashboard
- Safe to run again (uses `IF NOT EXISTS`)

### Error: "permission denied"
- Your Supabase API key may not have admin permissions
- Use a service role key (private key) instead of anon key
- Go to Supabase Settings → API → Service Role Key

---

## Next Steps After Migration

1. Run migrations using Option 1 or 2 above
2. Verify all tables created in Supabase Dashboard
3. Return to integration (Phase 5) in the TypeScript code
4. Begin adding components to WorkoutLogger

---

## Timeline

- Migrations: 5-10 minutes
- Integration: 1-2 hours
- Testing: 1 hour
- **Total: 2-3 hours remaining**
