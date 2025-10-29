# Custom Workouts Deletion Guide

## ❓ Will It Delete Everything?

**Short answer: NO** - Only the custom program templates are deleted. Completed workouts and sets are safe.

---

## 📊 Data Relationships

```
program_templates (custom, where owner_user_id IS NOT NULL)
    ↓ CASCADE
    ├── program_template_days
    ├── program_template_day_exercises
    └── program_progression_config

active_programs (NO CASCADE - references via program_id column)
    ↓ (optional deletion)
    └── remains as orphaned records

workouts (SAFE - no FK to program_templates)
    ↓ CASCADE
    └── workout_sets
```

---

## ✅ Will Be Deleted (Cascade)

| Table | Count | Why | Recoverable |
|-------|-------|-----|-------------|
| `program_templates` (custom) | ? | Parent deleted | ❌ No |
| `program_template_days` | ? | FK cascade | ❌ No |
| `program_template_day_exercises` | ? | FK cascade | ❌ No |
| `program_progression_config` | ? | FK cascade | ❌ No |

---

## ⚠️ WON'T Be Deleted (Orphaned)

| Table | Status | Impact | Recommendation |
|-------|--------|--------|-----------------|
| `active_programs` | Orphaned | Points to deleted template | Delete manually (Optional) |
| `workouts` | SAFE | Historical record | Keep ✅ |
| `workout_sets` | SAFE | Historical data | Keep ✅ |

---

## 🎯 Two Deletion Options

### Option A: Templates Only (Safest) ✅
**Recommended if:** You want to preserve all user data
- Delete custom program templates
- Active programs become orphaned (break the reference)
- Completed workouts remain
- Can clean orphaned programs later if needed

```sql
DELETE FROM program_templates
WHERE owner_user_id IS NOT NULL;
```

**Impact:**
- ✅ Custom templates gone
- ⚠️ Active programs still exist but reference deleted templates
- ✅ Workouts + sets preserved

---

### Option B: Templates + Orphaned Programs (Cleaner) ⭐
**Recommended if:** You want no orphaned references
- Delete active programs using custom templates first
- Then delete custom templates
- No orphaned data left

```sql
-- Step 1: Delete orphaned active programs
DELETE FROM active_programs
WHERE program_template_id IN (
  SELECT id FROM program_templates WHERE owner_user_id IS NOT NULL
);

-- Step 2: Delete custom templates
DELETE FROM program_templates
WHERE owner_user_id IS NOT NULL;
```

**Impact:**
- ✅ Custom templates gone
- ✅ Orphaned programs gone
- ✅ Workouts + sets preserved

---

## 🔍 What to Check First

Before deleting, run the analysis queries in `/migrations/analyze-custom-workout-cascade.sql`:

1. **How many custom templates exist?**
2. **How many active programs reference them?**
3. **How many workouts would be "orphaned" if we delete programs?**

---

## 🛡️ Data Safety

### Safe (Preserved)
- ✅ Completed workouts (remain in `workouts` table)
- ✅ Completed workout sets (remain in `workout_sets` table)
- ✅ User profiles
- ✅ Built-in program templates

### At Risk (Will Be Deleted)
- ❌ Custom program templates
- ❌ Template structure (days, exercises, progression config)
- ❌ Active programs (optional - delete separately)

### No Direct Impact
- ✅ Workout history (independent of templates)
- ✅ User progress tracking
- ✅ Analytics data

---

## 📋 Recommended Workflow

1. **Backup** (optional but recommended)
   - Export `program_templates` table from Supabase

2. **Analyze**
   - Run analysis queries in `analyze-custom-workout-cascade.sql`
   - Check how many templates/programs/workouts exist

3. **Choose Option**
   - Option A (templates only) = safer, leaves orphaned programs
   - Option B (templates + programs) = cleaner, no orphans

4. **Delete**
   - Uncomment the appropriate section in `delete-custom-workouts.sql`
   - Run in Supabase SQL editor

5. **Verify**
   - Run verification queries to confirm deletions
   - Check `workouts` table still has data

---

## ⚠️ Important Notes

1. **Cascade delete is automatic**
   - You don't manually delete days/exercises/progression configs
   - Postgres handles it automatically

2. **Workouts are independent**
   - Deleting templates does NOT delete workout history
   - Workouts reference `user_id` and `program_id`, not `program_templates.id`

3. **Active programs are optional**
   - They may be orphaned (no matching template)
   - Either leave them or delete with Option B

4. **This is irreversible**
   - Export backup first if you need historical reference
   - Deleted templates cannot be recovered from DB

---

## 🚀 Next Steps

1. Open `migrations/analyze-custom-workout-cascade.sql`
2. Run all analysis queries
3. Review the output to understand what exists
4. Choose Option A or B from `migrations/delete-custom-workouts.sql`
5. Uncomment and execute
6. Run verification queries to confirm
