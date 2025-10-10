# 🧪 Database Templates Testing Guide

This guide provides step-by-step testing procedures to verify the database-first templates system works correctly.

## 📋 Pre-Test Checklist

Before testing, ensure:

- [x] Schema deployed to Supabase (`program-templates-schema.sql` executed)
- [x] At least one template created in database (run `scripts/create-template.ts`)
- [x] App is running (`npm run dev`)
- [x] Browser console is open (F12) to see logs

## 🧪 Test Suite

### Test 1: Schema Verification (Database)

**Objective:** Verify tables exist and are accessible

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   SELECT 
     t.id,
     t.name,
     t.days_per_week,
     t.total_weeks,
     COUNT(DISTINCT d.id) as day_count,
     COUNT(e.id) as exercise_count
   FROM program_templates t
   LEFT JOIN program_template_days d ON t.id = d.program_template_id
   LEFT JOIN program_template_exercises e ON d.id = e.template_day_id
   WHERE t.is_active = true
   GROUP BY t.id, t.name, t.days_per_week, t.total_weeks;
   ```

**Expected Result:**
- At least 1 template returned
- `day_count` matches `days_per_week`
- `exercise_count` > 0
- No errors

**Status:** ✅ Pass / ❌ Fail

---

### Test 2: Template Service (Console)

**Objective:** Verify programTemplateService loads templates correctly

**Steps:**
1. Open browser console (F12)
2. Run:
   ```javascript
   // Import service
   const { programTemplateService } = await import('./lib/services/program-template-service.js')
   
   // Test getAllTemplates
   console.time('getAllTemplates')
   const templates = await programTemplateService.getAllTemplates()
   console.timeEnd('getAllTemplates')
   console.log('Templates:', templates)
   
   // Test getFullTemplate (use your template ID)
   console.time('getFullTemplate')
   const fullTemplate = await programTemplateService.getFullTemplate('your-template-id')
   console.timeEnd('getFullTemplate')
   console.log('Full template:', fullTemplate)
   
   // Test cache (should be <10ms)
   console.time('cached')
   const cached = await programTemplateService.getFullTemplate('your-template-id')
   console.timeEnd('cached')
   ```

**Expected Result:**
- `getAllTemplates` completes in <200ms (first time), <10ms (cached)
- `getFullTemplate` completes in <200ms (first time), <10ms (cached)
- Cached query is <10ms ✅
- Templates have correct structure (id, name, days, weeks, schedule)

**Status:** ✅ Pass / ❌ Fail

**Performance Metrics:**
- First load: ____ ms
- Cached load: ____ ms

---

### Test 3: Cache Warming (App Startup)

**Objective:** Verify cache warms on app startup

**Steps:**
1. Clear cache:
   ```javascript
   localStorage.clear()
   location.reload()
   ```
2. Watch console for cache warming log:
   ```
   [TemplateCacheWarmer] Cache warmed successfully
   ```
3. Check cache size:
   ```javascript
   const { programTemplateService } = await import('./lib/services/program-template-service.js')
   console.log('Cache size:', programTemplateService.cache.size)
   ```

**Expected Result:**
- Cache warming log appears within 1-2 seconds
- Cache size > 0
- No errors during warming

**Status:** ✅ Pass / ❌ Fail

---

### Test 4: Programs Section UI

**Objective:** Verify database templates appear in UI

**Steps:**
1. Navigate to **Programs** tab
2. Look for your test template in the list
3. Check that both database and hardcoded templates appear
4. Verify template cards show correct info:
   - Name
   - Days per week
   - Duration (weeks)
   - Experience level badge
   - Gender badge

**Expected Result:**
- Database template appears ✅
- Hardcoded templates still appear ✅
- No duplicates (if same ID)
- Template info is correct
- Console logs: `[ProgramState] Loaded X templates from database`

**Status:** ✅ Pass / ❌ Fail

---

### Test 5: Template Selection

**Objective:** Verify selecting a database template works

**Steps:**
1. In Programs tab, click on your database template
2. Template detail view should open
3. Verify details are correct:
   - Program name
   - Description
   - Schedule (days and exercises)
   - Sets/reps shown correctly

**Expected Result:**
- Detail view opens smoothly
- All data displays correctly
- No console errors

**Status:** ✅ Pass / ❌ Fail

---

### Test 6: Starting a Program

**Objective:** Verify starting a database template creates active program

**Steps:**
1. Click "Start Program" on your database template
2. Confirm in dialog (if prompted)
3. Navigate to **Train** tab
4. Check that workout appears
5. Verify in console:
   ```javascript
   const active = ProgramStateManager.getActiveProgram()
   console.log('Active program:', active)
   console.log('Template ID:', active.templateId)
   console.log('Has schedule:', !!active.template.schedule)
   ```

**Expected Result:**
- Active program set successfully
- Console log: `[ProgramState] Loaded template from database: your-id`
- Train tab shows current workout
- Active program has template data
- `localStorage.getItem('liftlog_active_program')` contains template

**Status:** ✅ Pass / ❌ Fail

---

### Test 7: Workout Logger (Critical!)

**Objective:** Verify workout logger works UNCHANGED with database templates

**Steps:**
1. With database template active, go to Train tab
2. Click "Start Workout"
3. Log some sets:
   - Set weight
   - Set reps
   - Mark as completed
4. Complete the workout
5. Check workout history:
   ```javascript
   const history = WorkoutLogger.getWorkoutHistory()
   console.log('Latest workout:', history[history.length - 1])
   ```

**Expected Result:**
- Workout logger opens ✅
- Exercises display correctly ✅
- Sets can be logged ✅
- Workout completes successfully ✅
- History contains completed workout ✅
- No errors in console ✅

**Status:** ✅ Pass / ❌ Fail

---

### Test 8: Progression Router

**Objective:** Verify progression engine works with database templates

**Steps:**
1. Complete a workout from database template
2. Check next workout for progression:
   ```javascript
   const active = ProgramStateManager.getActiveProgram()
   const nextWorkout = ProgramStateManager.getCurrentWorkout()
   console.log('Next workout:', nextWorkout)
   ```
3. Verify:
   - Week advances correctly
   - Day advances correctly
   - Sets/reps adjust based on progression rules

**Expected Result:**
- Progression rules apply correctly
- Console logs from progression router show correct strategy
- No errors during progression calculation

**Status:** ✅ Pass / ❌ Fail

---

### Test 9: Workout Calendar

**Objective:** Verify calendar displays correctly with database templates

**Steps:**
1. Open workout calendar (click calendar icon in Train tab)
2. Check that:
   - Correct number of weeks display
   - Current week is highlighted
   - Completed workouts are marked
   - Future workouts are visible

**Expected Result:**
- Calendar renders correctly ✅
- Week count matches template ✅
- Navigation works ✅
- No console errors ✅

**Status:** ✅ Pass / ❌ Fail

---

### Test 10: Template Filtering

**Objective:** Verify filtering works with database templates

**Steps:**
1. In Programs tab, open filter menu
2. Apply filters:
   - Experience level
   - Days per week
   - Gender
   - Duration
3. Verify database templates are included in filtered results

**Expected Result:**
- Filters apply to both database and hardcoded templates
- Database templates filter correctly by metadata
- No errors

**Status:** ✅ Pass / ❌ Fail

---

### Test 11: Performance Benchmarks

**Objective:** Measure and verify performance meets requirements

**Steps:**
1. Clear cache and reload
2. Measure initial load:
   ```javascript
   const { programTemplateService } = await import('./lib/services/program-template-service.js')
   
   programTemplateService.clearCache()
   
   console.time('initial-load')
   await programTemplateService.getTemplate('your-id')
   console.timeEnd('initial-load')
   
   console.time('cached-load')
   await programTemplateService.getTemplate('your-id')
   console.timeEnd('cached-load')
   ```

**Expected Performance:**
- Initial load: <200ms ✅
- Cached load: <50ms ✅
- getAllTemplates: <100ms (initial), <5ms (cached) ✅
- UI feels instant (no perceivable delay) ✅

**Actual Performance:**
- Initial load: ____ ms
- Cached load: ____ ms
- getAllTemplates (initial): ____ ms
- getAllTemplates (cached): ____ ms

**Status:** ✅ Pass / ❌ Fail

---

### Test 12: Offline Behavior

**Objective:** Verify fallback to hardcoded templates when database unavailable

**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Reload the app
4. Check Programs tab

**Expected Result:**
- App still works ✅
- Hardcoded templates still display ✅
- Console shows: `[ProgramState] Failed to load database templates`
- No app crash ✅

**Status:** ✅ Pass / ❌ Fail

---

### Test 13: Data Integrity

**Objective:** Verify converted data matches expected format

**Steps:**
1. Load a database template
2. Inspect the converted format:
   ```javascript
   const { programTemplateService } = await import('./lib/services/program-template-service.js')
   const template = await programTemplateService.getTemplate('your-id')
   
   console.log('Template structure:', {
     id: template.id,
     name: template.name,
     days: template.days,
     weeks: template.weeks,
     gender: template.gender,
     experience: template.experience,
     scheduleKeys: Object.keys(template.schedule),
     firstDay: template.schedule.day1,
     firstExercise: template.schedule.day1.exercises[0]
   })
   ```

**Expected Result:**
- All fields present ✅
- `schedule` has dayN keys ✅
- Each day has `name` and `exercises` ✅
- Exercises have all required fields:
  - `id`
  - `exerciseName` (exact name from DB)
  - `exerciseLibraryId` (UUID)
  - `category`
  - `progressionTemplate`
  - `autoProgression`
  - `restTime`

**Status:** ✅ Pass / ❌ Fail

---

### Test 14: Migration Script

**Objective:** Verify existing templates can be migrated

**Steps:**
1. Run migration script:
   ```bash
   npx tsx scripts/migrate-gym-templates.ts
   ```
2. Check output for validation results
3. Verify templates appear in database
4. Refresh app and check Programs tab

**Expected Result:**
- Script validates all exercises ✅
- Reports missing exercises (if any)
- Migrates valid templates ✅
- No duplicate entries created ✅
- Migrated templates appear in UI ✅

**Status:** ✅ Pass / ❌ Fail

---

## 🐛 Common Issues & Solutions

### Issue 1: Templates not appearing in UI

**Symptoms:**
- Programs tab shows only hardcoded templates
- No database templates visible

**Diagnosis:**
```javascript
const { programTemplateService } = await import('./lib/services/program-template-service.js')
const dbTemplates = await programTemplateService.getAllGymTemplates()
console.log('DB templates:', dbTemplates)
```

**Solutions:**
1. Check Supabase connection (network tab)
2. Verify RLS policies allow read access
3. Check console for errors
4. Verify `is_active = true` on templates

---

### Issue 2: Slow performance (>200ms)

**Symptoms:**
- Template loading feels sluggish
- Console shows load times >200ms

**Diagnosis:**
```javascript
const { programTemplateService } = await import('./lib/services/program-template-service.js')
console.log('Cache size:', programTemplateService.cache.size)
console.log('Cache valid:', programTemplateService.isCacheValid('all_templates'))
```

**Solutions:**
1. Clear cache and warm it: `programTemplateService.warmCache()`
2. Check Supabase performance (SQL Editor query timing)
3. Verify indexes exist on tables
4. Check network latency (DevTools → Network)

---

### Issue 3: Workout logger broken

**Symptoms:**
- Exercises don't load
- Sets can't be logged
- Console errors in progression router

**Diagnosis:**
```javascript
const active = ProgramStateManager.getActiveProgram()
console.log('Template structure:', active.template)
console.log('Has schedule:', !!active.template.schedule)
console.log('First day:', active.template.schedule.day1)
```

**Solutions:**
1. Verify data conversion in `convertToGymTemplate()`
2. Check exercise names match exactly
3. Verify all required fields present
4. Test with hardcoded template first (isolate issue)

---

### Issue 4: Exercise names not found

**Symptoms:**
- Migration fails with "exercise not found"
- Validation reports missing exercises

**Diagnosis:**
```bash
npx tsx scripts/list-exercises.ts | grep "Bench Press"
```

**Solutions:**
1. Get exact name from database
2. Update template definition
3. Check for typos, extra spaces, capitalization
4. Verify exercise exists in `exercise_library`

---

## 📊 Test Results Summary

| Test | Status | Performance | Notes |
|------|--------|-------------|-------|
| 1. Schema Verification | ⬜ | - | |
| 2. Template Service | ⬜ | ___ms / ___ms | |
| 3. Cache Warming | ⬜ | - | |
| 4. Programs UI | ⬜ | - | |
| 5. Template Selection | ⬜ | - | |
| 6. Starting Program | ⬜ | - | |
| 7. Workout Logger | ⬜ | - | |
| 8. Progression Router | ⬜ | - | |
| 9. Workout Calendar | ⬜ | - | |
| 10. Template Filtering | ⬜ | - | |
| 11. Performance | ⬜ | ___ms / ___ms | |
| 12. Offline Behavior | ⬜ | - | |
| 13. Data Integrity | ⬜ | - | |
| 14. Migration Script | ⬜ | - | |

**Overall Status:** ⬜ All Pass / ⚠️ Some Issues / ❌ Failed

---

## ✅ Sign-Off

After completing all tests:

- [ ] All critical tests pass (1-9)
- [ ] Performance meets requirements (<50ms cached, <200ms uncached)
- [ ] Workout logger works identically to hardcoded templates
- [ ] No console errors during normal usage
- [ ] Migration script works for existing templates

**Tester:** _______________  
**Date:** _______________  
**Version:** _______________  

---

## 🎉 Next Steps (After All Tests Pass)

1. **Deploy to Production:**
   - Run migration script on production DB
   - Monitor performance metrics
   - Watch for errors in production logs

2. **Deprecate Hardcoded Templates (Optional):**
   - Keep as fallback for now
   - Gradually migrate users to database templates
   - Remove hardcoded templates in future release

3. **Admin UI (Future):**
   - Build template creation UI
   - Add template editing
   - Version control for templates

4. **Community Templates (Future):**
   - Allow users to create templates
   - Template sharing/discovery
   - Rating and reviews

