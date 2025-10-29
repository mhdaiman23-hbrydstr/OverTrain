# Workout Cleanup & RLS Implementation Strategy

**Status**: Preparation Phase
**Date**: 2025-10-29
**Branch**: `feat/workout-cleanup-and-rls`

## Overview

This document outlines the strategy for:
1. **Cleaning up existing test/dev workouts** from the database
2. **Implementing proper Row Level Security (RLS)** for all tables
3. **Preparing for production template imports** with user-accessible template library

---

## Part 1: Row Level Security (RLS) Implementation

### Current Status

**Tables WITH RLS**:
- ✅ `active_programs` - User can view/edit own programs
- ✅ `program_history` - User can view/edit own history
- ✅ `profiles` - User can view own profile

**Tables WITHOUT RLS** (Unrestricted):
- ❌ `exercise_custom_rpe` - User-specific RPE data
- ❌ `exercise_notes` - User-specific exercise notes
- ❌ `linear_progression_tiers` - Public reference data
- ❌ `program_progression_config` - Likely unused; template-level config
- ❌ `program_templates_full` - View; no RLS needed
- ❌ `workouts` - User-specific workout history
- ❌ `in_progress_workouts` - User-specific active workouts
- ❌ `workout_sets` - User-specific set data
- ❌ `program_templates` - Public/shared templates
- ❌ `program_template_days` - Template components
- ❌ `program_template_exercises` - Exercise components
- ❌ `exercise_library` - Public exercise reference

### RLS Policy Categories

#### Category A: User-Specific Data (Strict User Isolation)

These tables contain user personal data and require strict `auth.uid() = user_id` isolation:

| Table | Policy | User Access |
|-------|--------|-------------|
| `exercise_notes` | `user_id` | View/edit only own notes |
| `exercise_custom_rpe` | `user_id` | View/edit only own RPE data |
| `workouts` | `user_id` | View/edit only own workouts |
| `in_progress_workouts` | `user_id` | View/edit only own sessions |
| `workout_sets` | Via workout reference | View/edit sets from own workouts |

**Policy Pattern**:
```sql
-- SELECT: View own data
USING (auth.uid() = user_id)

-- INSERT: Create own data
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Modify own data
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

-- DELETE: Remove own data
USING (auth.uid() = user_id)
```

#### Category B: Public Templates (Public Read, Owner Write)

These tables contain shared program templates that all users can see, but only owners can edit:

| Table | Policy | Access |
|-------|--------|--------|
| `program_templates` | `is_public` + `owner_user_id` | Public read, owner edit |
| `program_template_days` | Inherits from parent | Visible with template |
| `program_template_exercises` | Inherits from parent | Visible with template |

**Policy Pattern**:
```sql
-- SELECT: Public templates + own templates
USING (is_public = true OR auth.uid() = owner_user_id)

-- INSERT: Create own templates
WITH CHECK (auth.uid() = owner_user_id)

-- UPDATE/DELETE: Edit only own templates
USING (auth.uid() = owner_user_id)
```

#### Category C: Public Reference Data (Read-Only for Users)

These tables contain shared exercise/progression data that all users can read but not modify:

| Table | Policy | Access |
|-------|--------|--------|
| `exercise_library` | No restriction | Public read, service role only write |
| `linear_progression_tiers` | No restriction | Public read, service role only write |
| `program_progression_config` | Inherits from template | Read-only for users |

**Policy Pattern**:
```sql
-- SELECT: Everyone can view
USING (true)

-- INSERT/UPDATE/DELETE: Service role only (no user policy)
```

### Helper Functions Created

To support complex RLS policies, the following functions are created:

```sql
-- Check if user owns a template
user_owns_template(template_id UUID) → BOOLEAN
Returns: (auth.uid() = owner_user_id) OR is_public

-- Get user_id from workout_id
get_workout_user_id(workout_id UUID) → UUID
Returns: user_id FROM workouts WHERE id = workout_id

-- Get template_id from template_day_id
get_template_id_from_day(day_id UUID) → UUID
Returns: program_template_id FROM program_template_days WHERE id = day_id
```

### Migration File

**File**: `migrations/add-rls-policies-all-tables.sql`

**Structure**:
- Section 1: User-specific table policies (5 tables)
- Section 2: Public/shared data policies (8 tables)
- Section 3: Template config policies (1 table)
- Verification queries to check RLS status

**To Apply**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire migration file
3. Run in SQL Editor
4. Verify output shows "RLS enabled" for all tables

---

## Part 2: Test Workout Cleanup

### Why Clean Up?

- **Fresh Start**: Remove clutter from development/testing
- **Data Integrity**: Ensure only production-grade workouts remain
- **Performance**: Reduce dataset size for faster queries
- **Quality**: Clean slate for new template imports

### What Will Be Cleaned

**In-Progress Workouts**:
- Incomplete/abandoned workout sessions
- Older than 30 days (likely abandoned)
- Clearly marked as test data

**Incomplete Workouts**:
- Skipped or uncompleted workouts
- Older than 7 days
- Marked as test in notes

**Test Programs**:
- Private test programs from 7+ days ago
- Programs with no production value

### Cleanup Safety

**Before Running**:
1. ✅ Run analysis queries first (included in migration)
2. ✅ Review output to identify test data
3. ✅ Export workout data as backup (Supabase UI → Export)
4. ✅ Document which test users to remove

**Analysis Queries** (in `cleanup-test-workouts.sql`):
```sql
-- Count workouts by status
-- Identify users with test data
-- Check for incomplete/test programs
```

**Cleanup Steps**:
1. Delete in-progress workouts (conservative: 30+ days old)
2. Delete incomplete workouts (conservative: 7+ days, marked test)
3. Delete test programs (conservative: 7+ days, private)
4. Verify counts reduced appropriately
5. VACUUM to reclaim storage

### Workout Data Structure

**User-Specific Workouts**:
```
workouts
├── id: UUID
├── user_id: UUID (← RLS isolation point)
├── program_id: UUID
├── week: INTEGER
├── day: INTEGER
├── exercises: (referenced via workout_sets)
└── created_at: TIMESTAMP

workout_sets
├── id: UUID
├── workout_id: UUID (← Links back to user via workouts.user_id)
├── exercise_id: UUID
├── set_number: INTEGER
├── weight: NUMERIC
└── created_at: TIMESTAMP
```

**Key Points**:
- All workouts tied to `user_id` (RLS enforcement point)
- Deletion cascades properly via foreign keys
- Sets deleted when workouts deleted
- No orphaned data concerns

---

## Part 3: Production Template Import Preparation

### Current Template System

**Templates Stored In**:
- `program_templates` table (Supabase)
- `program_template_days` (days within template)
- `program_template_exercises` (exercises within days)
- `exercise_library` (exercise catalog)

**Template Accessibility**:
- `is_public = true` → Visible to all users
- `is_public = false` + `owner_user_id = <user>` → Only owner sees
- `owner_user_id = null` → System templates (built-in)

### Import Strategy

#### Phase 1: Current (Setup RLS)
- ✅ Apply RLS policies from `add-rls-policies-all-tables.sql`
- ✅ Clean up test workouts
- ✅ Verify no data access issues

#### Phase 2: Next (Import Templates)
- Identify production templates to import
- Create import service/script
- Bulk insert templates with proper foreign keys
- Set `is_public = true` for user access
- Verify exercise_library has all referenced exercises

#### Phase 3: After (User Experience)
- Users see template library on signup
- Can select templates to start programs
- Selection adds to `active_programs` with new instance
- Workouts created from template on each program day

### Template Import Considerations

**Foreign Key Dependencies**:
- `program_templates` → `program_template_days` (1:many)
- `program_template_days` → `program_template_exercises` (1:many)
- `program_template_exercises` → `exercise_library` (via `exercise_id`)
- `program_progression_config` → `program_templates` (optional)

**Required Fields**:
```javascript
// program_templates
{
  name: string,
  description: string,
  days_per_week: number,
  total_weeks: number,
  gender: string[], // ["male", "female", "all"]
  experience_level: string[], // ["beginner", "intermediate", "advanced"]
  is_public: true, // For user access
  owner_user_id: null, // System templates
  created_from: "template", // Or "import", "blank"
  is_active: true // Enable for selection
}

// program_template_days
{
  program_template_id: UUID,
  day_number: number,
  day_name: string // "Day 1", "Chest Day", etc.
}

// program_template_exercises
{
  template_day_id: UUID,
  exercise_id: UUID, // Must exist in exercise_library
  exercise_order: number,
  progression_config: JSONB, // Auto-progression rules
  rest_time_seconds: number,
  category: "compound" | "isolation"
}

// exercise_library
{
  name: string,
  muscle_group: string,
  equipment_type: string,
  linear_progression_tier_id: UUID // Optional, for 1RM calculations
}
```

**Import Checklist**:
- [ ] All exercises exist in `exercise_library`
- [ ] All templates have `is_public = true`
- [ ] All templates have `is_active = true`
- [ ] Foreign key relationships verified
- [ ] No duplicate template names
- [ ] Gender/experience filters appropriate

### User Template Selection Flow

```
User Signs In
    ↓
No Active Program?
    ↓
Browse Program Templates (is_public = true)
    ↓
Select Template
    ↓
Create ActiveProgram instance
    ├── templateId
    ├── instanceId (unique per start)
    ├── startDate
    └── currentWeek/currentDay = 1
    ↓
Show First Workout
    ↓
Start Working Out
```

---

## Migration Files Reference

### 1. `add-rls-policies-all-tables.sql`

**Purpose**: Add RLS to all tables
**Size**: ~500 lines
**Time to apply**: < 5 minutes
**Risk**: Low (read-only policies won't break existing data)

**Contents**:
- Sections 1-3: RLS policies for all table categories
- Verification queries: Confirm policies applied
- Helper functions: Support complex policies

**To apply**:
```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste entire file
4. Run
5. Verify output
```

### 2. `cleanup-test-workouts.sql`

**Purpose**: Remove test/dev workouts
**Size**: ~200 lines
**Time to apply**: Varies (review + 5-10 min cleanup)
**Risk**: Medium (destructive operations, but with analysis first)

**Contents**:
- Section 1: Analysis queries (safe, view-only)
- Section 2: Cleanup operations (commented, use selectively)
- Section 3: User-specific cleanup template (commented)
- Section 4: Verification queries

**To apply**:
```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run Section 1 analysis queries first
4. Review output for test users
5. Run Section 2 cleanup operations (selective)
6. Run Section 4 verification
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Create feature branch `feat/workout-cleanup-and-rls`
- [ ] Review RLS migration logic
- [ ] Identify test users in analysis query output
- [ ] Backup workout data (export as CSV)
- [ ] Schedule during low-traffic period

### Deployment
- [ ] Apply `add-rls-policies-all-tables.sql` in Supabase
- [ ] Run analysis queries in `cleanup-test-workouts.sql`
- [ ] Apply cleanup operations (conservative approach)
- [ ] Verify RLS policies working (test queries)
- [ ] Run verification queries

### Post-Deployment
- [ ] Monitor error logs for RLS violations
- [ ] Test user can access own workouts
- [ ] Test user cannot access other user's data
- [ ] Test public templates visible to all users
- [ ] Test private templates only visible to owner

### Rollback Plan
- If RLS breaks app: Drop policies (must be in transaction)
- If cleanup removes wrong data: Restore from backup
- All operations reversible; no schema changes

---

## Next Steps

1. **Apply RLS** → Run `add-rls-policies-all-tables.sql`
2. **Clean Data** → Run `cleanup-test-workouts.sql` (analysis first)
3. **Verify** → Test user access patterns
4. **Commit** → Create PR with migration files
5. **Prepare Templates** → Identify production templates to import
6. **Import** → Create import script/service for Phase 2

---

## References

- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
- **Migration Files**:
  - `migrations/add-rls-policies-all-tables.sql`
  - `migrations/cleanup-test-workouts.sql`
- **Related Files**:
  - `CLAUDE.md` - Project architecture
  - `lib/services/` - Data access services

---

## Appendix: RLS Troubleshooting

### Issue: "Insufficient privileges" error

**Cause**: RLS policy denying access
**Solution**:
1. Check `user_id` matches `auth.uid()`
2. For public data, verify `is_public = true` or ownership
3. Check helper functions exist

### Issue: Can't insert workout

**Cause**: INSERT policy not allowing new rows
**Solution**:
1. Verify `WITH CHECK (auth.uid() = user_id)`
2. Ensure user authenticated
3. Check `user_id` is set correctly

### Issue: Can see other user's data

**Cause**: RLS policy too permissive
**Solution**:
1. Review SELECT policy USING clause
2. Verify `auth.uid() = user_id` (not `true`)
3. Check no public policies accidentally created

### Issue: Template not visible

**Cause**: Template not public or ownership wrong
**Solution**:
1. Verify `is_public = true` in program_templates
2. Or verify `auth.uid() = owner_user_id`
3. Check public templates policy applied

---

**Status**: Ready for implementation
**Last Updated**: 2025-10-29
**Next Review**: After successful RLS deployment
