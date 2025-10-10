# 🚀 Database-First Templates Deployment Guide

This guide walks you through deploying the program templates system to your Supabase database.

## 📋 Prerequisites

- [x] Supabase project created (ID: `fyhbpkjibjtvltwcavlw`)
- [x] `exercise_library` table already exists in database
- [x] Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🎯 Step-by-Step Deployment

### Step 1: Deploy Schema (5 minutes)

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `fyhbpkjibjtvltwcavlw`
3. **Go to SQL Editor** (left sidebar)
4. **Click "New Query"**
5. **Copy the entire contents** of `program-templates-schema.sql`
6. **Click "Run"** to execute

**Expected Result:**
```
✅ Created table: program_templates
✅ Created table: program_template_days
✅ Created table: program_template_exercises
✅ Created indexes for performance
✅ Enabled Row Level Security (RLS)
✅ Created helper view: program_templates_full
```

**Verify deployment:**
```sql
-- Run this in SQL Editor
SELECT 
  schemaname, 
  tablename 
FROM pg_tables 
WHERE tablename LIKE 'program_template%';
```

You should see 3 tables:
- `program_templates`
- `program_template_days`
- `program_template_exercises`

---

### Step 2: Test Exercise Listing (2 minutes)

Before creating templates, verify you can access the exercise library:

```bash
npx tsx scripts/list-exercises.ts
```

**Expected Output:**
```
📋 Available Exercises in Database

🏋️  CHEST
--------------------------------------------------------------------------------
  ✓ "Bench Press (Barbell)"
    Equipment: Barbell | UUID: abc123...
  ✓ "Incline Bench Press (Dumbbell)"
    Equipment: Dumbbell | UUID: def456...

🏋️  BACK
--------------------------------------------------------------------------------
  ✓ "Bent-Over Row (Barbell)"
    Equipment: Barbell | UUID: ghi789...
  ...

Total: 150+ exercises
```

**Filter by muscle group:**
```bash
npx tsx scripts/list-exercises.ts --muscle-group "Chest"
```

**Filter by equipment:**
```bash
npx tsx scripts/list-exercises.ts --equipment "Barbell"
```

---

### Step 3: Create Test Template (5 minutes)

The `scripts/create-template.ts` file contains a sample 2-week test program.

**Run it:**
```bash
npx tsx scripts/create-template.ts
```

**Expected Output:**
```
🚀 Creating Program Template in Database
================================================================================
Template: 2-Week Test Program
Days per week: 3
Total weeks: 2
================================================================================

🔍 Validating exercise names...
  ✅ "Bench Press (Barbell)" → abc123...
  ✅ "Bent-Over Row (Barbell)" → def456...
  ✅ "Overhead Press (Barbell)" → ghi789...
  ...

✅ All exercises validated!

📝 Creating program_templates entry...
  ✅ Program created: prog-uuid-123

📅 Creating program_template_days...
  ✅ Day 1: Upper Body A → day-uuid-1
     Creating exercises...
       1. Bench Press (Barbell) ✅
       2. Bent-Over Row (Barbell) ✅
       3. Overhead Press (Barbell) ✅
  ✅ Day 2: Lower Body → day-uuid-2
     ...

================================================================================
✅ TEMPLATE CREATED SUCCESSFULLY!
================================================================================

Program ID: prog-uuid-123
```

**Verify in Supabase:**
```sql
-- Run in SQL Editor
SELECT * FROM program_templates;
SELECT * FROM program_template_days;
SELECT * FROM program_template_exercises;
```

---

### Step 4: Create Your Own Templates (10-30 minutes)

**Option A: Modify the Script**

1. Open `scripts/create-template.ts`
2. Edit the `TEMPLATE_DEFINITION` object:
   ```typescript
   const TEMPLATE_DEFINITION = {
     name: "My Custom 4-Week Program",
     description: "Upper/Lower split for intermediate lifters",
     days_per_week: 4,
     total_weeks: 4,
     deload_week: 4,
     gender: ['male'], // or ['female'] or both
     experience_level: ['intermediate'],
     progression_type: 'linear',
     
     days: [
       {
         day_number: 1,
         day_name: "Upper Body A",
         exercises: [
           {
             exercise_name: "Bench Press (Barbell)", // COPY FROM list-exercises.ts
             category: "compound",
             rest_time_seconds: 180,
             progression_config: {
               progressionTemplate: {
                 week1: { sets: 4, repRange: "6-8", intensity: "working" },
                 week2: { sets: 4, repRange: "6-8", intensity: "working" },
                 week3: { sets: 4, repRange: "6-8", intensity: "working" },
                 week4: { sets: 3, repRange: "6-8", intensity: "deload" }
               },
               autoProgression: {
                 enabled: true,
                 progressionType: "weight_based",
                 rules: {
                   if_all_sets_completed: "increase_weight_5",
                   if_failed_reps: "repeat_weight",
                   if_failed_twice: "reduce_weight_10_percent"
                 }
               },
               tier: "tier1"
             }
           },
           // Add more exercises...
         ]
       },
       // Add more days...
     ]
   }
   ```

3. Save and run:
   ```bash
   npx tsx scripts/create-template.ts
   ```

**Option B: Copy & Rename for Multiple Templates**

```bash
# Create multiple template files
cp scripts/create-template.ts scripts/create-template-upper-lower.ts
cp scripts/create-template.ts scripts/create-template-ppl.ts
cp scripts/create-template.ts scripts/create-template-full-body.ts

# Edit each one, then run
npx tsx scripts/create-template-upper-lower.ts
npx tsx scripts/create-template-ppl.ts
npx tsx scripts/create-template-full-body.ts
```

---

### Step 5: Migrate Existing Templates (Optional, 20-40 minutes)

If you want to migrate templates from `lib/gym-templates.ts`:

1. Open `lib/gym-templates.ts`
2. For each template in `GYM_TEMPLATES` array:
   - Copy the structure
   - Convert to `TEMPLATE_DEFINITION` format
   - Validate exercise names against database (use `list-exercises.ts`)
   - Fix any name mismatches
   - Run `create-template.ts`

**Helper Script (TODO: Create migration script):**
```typescript
// scripts/migrate-existing-templates.ts
// This would automate the process above
```

---

### Step 6: Integrate with ProgramStateManager (10 minutes)

Now we need to update `lib/program-state.ts` to use database templates.

**Current code:**
```typescript
import { GYM_TEMPLATES, type GymTemplate } from "./gym-templates"

const template = GYM_TEMPLATES.find((t) => t.id === program.templateId)
```

**New code:**
```typescript
import { programTemplateService } from "./services/program-template-service"
import { GYM_TEMPLATES, type GymTemplate } from "./gym-templates"

// Try database first, fallback to hardcoded templates
const template = await programTemplateService.getTemplate(program.templateId) 
  || GYM_TEMPLATES.find((t) => t.id === program.templateId)
```

This ensures:
- ✅ Database templates load first (new system)
- ✅ Fallback to hardcoded templates (backwards compatibility)
- ✅ Zero downtime during migration

---

### Step 7: Warm Cache on App Startup (5 minutes)

Add cache warming to `app/layout.tsx`:

```typescript
import { programTemplateService } from "@/lib/services/program-template-service"

export default function RootLayout({ children }) {
  useEffect(() => {
    // Warm cache in background (non-blocking)
    programTemplateService.warmCache()
  }, [])

  return (...)
}
```

---

### Step 8: Test in Browser (10 minutes)

1. **Clear cache:**
   ```javascript
   // Open browser console (F12)
   localStorage.clear()
   ```

2. **Refresh app** (Ctrl+F5 or Cmd+Shift+R)

3. **Go to Programs tab**

4. **Verify new templates appear** (should see both database and hardcoded templates)

5. **Start a database template**

6. **Check performance:**
   ```javascript
   // In console
   console.time('template-load')
   await programTemplateService.getTemplate('your-template-id')
   console.timeEnd('template-load')
   // Should be <50ms cached, <200ms uncached
   ```

7. **Test workout logger:**
   - Start a workout from database template
   - Complete sets
   - Complete workout
   - Verify progression works

---

## 🎯 Success Criteria

- [ ] Schema deployed to Supabase (3 tables created)
- [ ] `list-exercises.ts` shows all exercises
- [ ] Test template created successfully
- [ ] ProgramStateManager uses database templates
- [ ] Cache warming on app startup
- [ ] Templates load in <50ms (cached)
- [ ] Workout logger works identically
- [ ] Calendar shows correct weeks/days
- [ ] Progression engine works correctly

---

## 🐛 Troubleshooting

### "Exercise not found in database"

**Problem:** Script reports exercise name doesn't exist.

**Solution:**
1. Run `npx tsx scripts/list-exercises.ts`
2. Copy the EXACT name (including parentheses, capitalization, spaces)
3. Update your template definition

Example:
```typescript
// ❌ Wrong
exercise_name: "bench press"

// ✅ Correct
exercise_name: "Bench Press (Barbell)"
```

---

### "Table 'program_templates' does not exist"

**Problem:** Schema not deployed.

**Solution:**
1. Go to Supabase SQL Editor
2. Run `program-templates-schema.sql`
3. Check for errors in the output

---

### "Templates not showing in UI"

**Problem:** Cache or integration issue.

**Solution:**
1. Check if templates exist:
   ```sql
   SELECT * FROM program_templates WHERE is_active = true;
   ```
2. Clear cache:
   ```javascript
   programTemplateService.clearCache()
   localStorage.removeItem('liftlog_active_program')
   ```
3. Refresh app

---

### "Workout logger broken after switching to database templates"

**Problem:** Data format mismatch.

**Solution:**
1. Check `convertToGymTemplate()` in `program-template-service.ts`
2. Verify it matches the `GymTemplate` interface exactly
3. Log the converted template to console:
   ```typescript
   const template = await programTemplateService.getTemplate(id)
   console.log('Converted template:', template)
   ```

---

### "Performance is slow (>200ms)"

**Problem:** Cache not working or too many queries.

**Solution:**
1. Check cache is enabled:
   ```typescript
   console.log(programTemplateService.cache.size) // Should have entries
   ```
2. Warm cache on startup (see Step 7)
3. Check network tab in DevTools for excessive queries
4. Use the view instead of joins if needed:
   ```sql
   SELECT * FROM program_templates_full WHERE template_id = 'xxx';
   ```

---

## 📊 Performance Benchmarks

**Expected performance:**
- Template list (all): <5ms cached, <100ms uncached
- Full template (single): <10ms cached, <200ms uncached
- Exercise validation: <50ms per exercise
- Template creation: 500-1000ms (normal, only done once)

**Measure in console:**
```javascript
// Test cache performance
console.time('cached')
await programTemplateService.getTemplate('your-id')
console.timeEnd('cached')

// Clear and test uncached
programTemplateService.clearCache()
console.time('uncached')
await programTemplateService.getTemplate('your-id')
console.timeEnd('uncached')
```

---

## 🎉 Next Steps (Future Enhancements)

1. **Admin UI for template creation** (no need for scripts)
2. **Template versioning** (track changes over time)
3. **Community templates** (users can share templates)
4. **Template duplication** (copy and modify existing templates)
5. **Exercise substitution** (swap exercises in existing templates)

---

## 📝 Files Reference

- `program-templates-schema.sql` - Database schema
- `lib/services/program-template-service.ts` - Service with caching
- `scripts/list-exercises.ts` - List available exercises
- `scripts/create-template.ts` - Create new templates
- `lib/program-state.ts` - Integration point (needs update)

---

**Need help?** Check browser console for detailed logs or open an issue.

