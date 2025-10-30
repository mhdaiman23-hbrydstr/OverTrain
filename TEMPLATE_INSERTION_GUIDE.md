# Template Insertion Guide

## Overview

Your production template insertion process is now ready. The **RIR/RPE progression logic is automatically applied** when you provide template specifications.

## What Happens Automatically

When you provide templates with:
- **Total weeks** (e.g., 8 weeks)
- **Days per week** (e.g., 3 days)
- **Exercise list** with rep ranges and rest times

The system **automatically generates and inserts**:

1. ✅ `program_templates` record (master template)
2. ✅ `program_template_days` records (workout days)
3. ✅ `program_template_exercises` records (exercises per day)
4. ✅ `program_progression_config` records with RIR/RPE values

## RIR/RPE Progression Patterns

Your template has 8 weeks, so it uses the **8-week linear progression pattern**:

| Week | RIR | RPE | Notes |
|------|-----|-----|-------|
| 1 | 3 | 7.0 | Technical focus, controlled intensity |
| 2 | 3 | 7.0 | Build consistency |
| 3 | 2 | 8.0 | Increase demand |
| 4 | 2 | 8.0 | Maintain intensity |
| 5 | 1 | 9.0 | Push harder, fewer reps in reserve |
| 6 | 1 | 9.0 | Maintain challenge |
| 7 | 0 | 10.0 | Go to failure, maximum effort |
| 8 | 8 | 2.0 | **DELOAD** (recovery week) |

### RIR (Reps In Reserve)
- RIR 3 = Could do 3 more reps (77% intensity)
- RIR 1 = Could do 1 more rep (93% intensity)
- RIR 0 = Failure (100% intensity)
- RIR 8 = Easy/Recovery (20% intensity)

### RPE (Rate of Perceived Exertion)
- RPE 7.0 = Moderate effort
- RPE 9.0 = Hard effort
- RPE 10.0 = Maximum effort
- RPE 2.0 = Very light (recovery)

## Current Template Status

### ✅ Template: 3 Day Full Body Beginner

**Specs:**
- Duration: 8 weeks
- Frequency: 3 days per week
- Experience: Beginner
- Gender: Male & Female
- Total Exercises: 18 (6 per day)
- Progression Type: Linear

**Workout Structure:**
- **Day 1 (Full Body A)**: Squat emphasis with upper body
- **Day 2 (Full Body B)**: Deadlift emphasis with accessories
- **Day 3 (Full Body C)**: Accessory/Hypertrophy focus

**Database Status:**
- Migration File: `migrations/insert-3day-fullbody-beginner.sql`
- Status: Ready for Supabase insertion
- RIR/RPE: Auto-generated for 8-week block ✅

## How to Apply the Template

### Step 1: Open Supabase SQL Editor
- Log into your Supabase dashboard
- Go to SQL Editor
- Create new query

### Step 2: Copy the Migration Script
Copy the entire content from:
```
migrations/insert-3day-fullbody-beginner.sql
```

### Step 3: Execute in Supabase
- Paste the SQL into the editor
- Click "Run" or "Execute"
- Wait for confirmation

### Step 4: Verify Insertion
The script includes verification queries at the bottom. After insertion, you'll see:

```
✅ Template created (1 row)
✅ RIR/RPE config (8 rows - one per week)
✅ Workout days (3 rows)
✅ Total exercises (18 rows)
```

## What Users Will See

After insertion, when users:

1. **Select the template** in Program Wizard:
   - Template name: "3 Day Full Body Beginner"
   - 3 days per week, 8 weeks total
   - For beginners, both males & females

2. **View the calendar**:
   - Each week shows the RIR/RPE label (Week 1: RIR 3, Week 8: RIR 8 for deload)
   - User can toggle display preference (RIR vs RPE)
   - Week 8 is marked as DELOAD

3. **Start a workout**:
   - Pre-populated exercises with correct sets/reps/rest
   - RIR/RPE guidance for effort level
   - All 18 exercises ready to log

## RIR/RPE Display in App

### Calendar Modal
The `workout-calendar.tsx` component displays RIR/RPE based on user preference:
- Users can toggle: **Settings → RIR/RPE Display**
- Default: Shows RPE (Rate of Perceived Exertion)
- Alternative: Shows RIR (Reps In Reserve)

### Workout Logger
The `workout-logger.tsx` component shows:
- Current week's RIR/RPE target
- Help text explaining effort level
- Progress note banner with guidance

### Analytics
The `analytics.ts` calculates actual RPE from workouts and compares to targets.

## Troubleshooting

### Template Not Appearing?
1. Check insertion completed without errors
2. Verify `program_templates` row exists:
   ```sql
   SELECT * FROM program_templates WHERE name = '3 Day Full Body Beginner';
   ```

### RIR/RPE Values Missing?
1. Check `program_progression_config` has 8 rows:
   ```sql
   SELECT COUNT(*) FROM program_progression_config
   WHERE program_template_id = '<template_id>';
   ```

### Exercises Not Showing?
1. Verify all exercise UUIDs are correct:
   ```sql
   SELECT * FROM program_template_exercises
   WHERE template_day_id IN (
     SELECT id FROM program_template_days
     WHERE program_template_id = '<template_id>'
   );
   ```

## Adding More Templates

To add another template:

1. **Prepare your data**:
   - Template name, weeks, days/week
   - Exercise list with IDs
   - Genders & experience levels

2. **Calculate block structure**:
   - 8 weeks → 1 block of 8-week pattern
   - 12 weeks → 2 blocks of 6-week patterns (weeks 1-6, 7-12)
   - 16 weeks → 2 blocks of 8-week patterns (weeks 1-8, 9-16)

3. **Generate new migration**:
   - Create `migrations/insert-{template-name}.sql`
   - Follow same pattern as `insert-3day-fullbody-beginner.sql`
   - I can help generate this from CSV

## Key Design Decisions

### Why Auto-Generate RIR/RPE?
- Ensures consistency across all templates
- Prevents manual errors
- Matches sports science periodization principles
- Deload week (RIR 8 / RPE 2) is always final week

### Block Length Assumption
- Default: 6-week blocks (if total weeks is 12, 18, 24, etc.)
- Custom: 4, 5, 7, or 8-week blocks supported
- Deload: Always last week of each block

### Exercise UUIDs
- All exercises must have valid `exercise_library` UUIDs
- App looks up exercises during template selection
- Invalid UUIDs will cause silent failures

## Next Steps

1. ✅ Created migration script
2. 🔄 **Run in Supabase SQL Editor** (next step)
3. ✅ Verify insertion with verification queries
4. ✅ Test in app (select template, start workout)
5. 📋 Add more templates (repeat process)

---

## Reference: SQL Structure

The three main tables that store templates:

### `program_templates`
- Master template record
- Fields: name, description, days_per_week, total_weeks, progression_type, is_public

### `program_template_days`
- Workout days in each template
- Fields: program_template_id, day_number, day_name

### `program_template_exercises`
- Exercises in each day
- Fields: template_day_id, exercise_library_id, exercise_name, exercise_order, target_sets, target_rep_range, rest_seconds, category

### `program_progression_config` (NEW - RIR/RPE)
- Progression intensity per week
- Fields: program_template_id, block_length, week_number, rir_value, rpe_value
- **This is auto-generated based on block length**

---

Questions? Check `Planning_Files/FEATURE_PLAN_EXERCISE_NOTES_AND_RPE.md` for detailed RIR/RPE architecture.
