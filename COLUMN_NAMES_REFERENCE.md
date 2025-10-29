# Active Programs Table - Column Names Reference

## The Issue

You were getting error `42703: column ap.template_id does not exist` because the SQL queries were using **wrong column names**.

---

## ✅ CORRECT Column Names in `active_programs` Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who owns the active program |
| **`program_id`** | UUID | **References `program_templates.id`** ← Use this! |
| `program_name` | VARCHAR | Display name of the program |
| `instance_id` | UUID | Instance/session ID for this program run |
| `current_week` | INTEGER | Current week number (1-based) |
| `current_day` | INTEGER | Current day number (1-based) |
| `days_per_week` | INTEGER | Training frequency |
| `total_weeks` | INTEGER | Total weeks in program |
| `start_date` | TIMESTAMP | When program started |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

---

## ❌ WRONG Column Names (Don't Use)

These will cause `42703` errors:

- ❌ `ap.template_id` - **does not exist**
- ❌ `ap.program_template_id` - **does not exist**
- ✅ Use `ap.program_id` instead

---

## Correct SQL Patterns

### Joining to program_templates

```sql
-- CORRECT ✅
JOIN program_templates pt ON pt.id = ap.program_id

-- WRONG ❌ (will error)
JOIN program_templates pt ON pt.id = ap.template_id
JOIN program_templates pt ON pt.id = ap.program_template_id
```

### Filtering by template

```sql
-- CORRECT ✅
WHERE ap.program_id IN (SELECT id FROM program_templates WHERE ...)

-- WRONG ❌ (will error)
WHERE ap.program_template_id IN (...)
WHERE ap.template_id IN (...)
```

---

## Other Related Tables

### program_templates

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `owner_user_id` | UUID | NULL = built-in, NOT NULL = custom |
| `name` | VARCHAR | Template name |
| `created_from` | VARCHAR | How it was created |
| `origin_template_id` | UUID | Parent if forked |
| `is_public` | BOOLEAN | Public sharing flag |

### program_template_days

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `program_template_id` | UUID | References program_templates |
| (other columns) | ... | Day-specific data |

### program_template_day_exercises

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `program_template_day_id` | UUID | References program_template_days |
| (other columns) | ... | Exercise-specific data |

---

## Quick Reference for Joins

```sql
-- Custom program templates with their active instances
SELECT ap.*, pt.name, pt.owner_user_id
FROM active_programs ap
JOIN program_templates pt ON pt.id = ap.program_id
WHERE pt.owner_user_id IS NOT NULL;

-- Find orphaned active programs (no matching template)
SELECT ap.*
FROM active_programs ap
WHERE ap.program_id NOT IN (
  SELECT id FROM program_templates
);

-- Count custom program instances by user
SELECT
  ap.user_id,
  COUNT(DISTINCT ap.program_id) as custom_template_count,
  COUNT(ap.id) as total_instances
FROM active_programs ap
WHERE ap.program_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
)
GROUP BY ap.user_id;
```

---

## All Fixed Queries

All three migration files have been corrected:
- ✅ `delete-custom-workouts.sql` - Fixed all references
- ✅ `analyze-custom-workout-cascade.sql` - Fixed all references
- ✅ `DELETE_CUSTOM_WORKOUTS_SUMMARY.md` - Updated documentation

You can now run any of these queries without the `42703` error!
