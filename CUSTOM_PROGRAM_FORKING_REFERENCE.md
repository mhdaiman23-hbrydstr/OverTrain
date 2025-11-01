# Custom Program Forking Feature Reference

**Status**: ✅ Fully Implemented
**Introduced**: Commit a728ea2 (October 19, 2025)
**Feature Flag**: `MY_PROGRAMS_ENABLED = true`

---

## What This Feature Does

When a user **replaces an exercise using the "Repeat to future workouts" option**, the system automatically:

1. **Forks the template** → Creates a user-owned copy in the database
2. **Marks as custom** → Sets `isCustom = true`
3. **Moves to "My Programs"** → Program appears under user's custom programs
4. **Adds suffix** → Name becomes `{OriginalName} (Custom)`
5. **Preserves active run** → Current program instance continues uninterrupted
6. **Applies replacement** → Exercise change saved for future weeks

---

## Code Flow

### **Entry Point**: Exercise Replacement in Logger

File: `components/workout-logger/hooks/use-workout-session.ts`

```typescript
// When user clicks "Replace Exercise" + "Repeat to future workouts"
const completedWorkout = await ProgramStateManager.applyFutureExerciseReplacement({
  dayNumber: workout.day || 1,
  fromExerciseId: previousExerciseLibraryId,
  fromExerciseName: targetOldName,
  toExercise: {
    id: selectedExercise.id,
    name: selectedExercise.name,
    muscleGroup: selectedExercise.muscleGroup,
    equipmentType: selectedExercise.equipmentType,
  },
})
```

### **Core Logic**: applyFutureExerciseReplacement()

File: `lib/program-state.ts` (lines 788-898)

**Step 1: Ensure Custom Template**
```typescript
// Line 806
await this.ensureCustomTemplateForActiveProgram()
// ↓
// If NOT already custom:
// - Forks the template via programForkService.forkTemplateToMyProgram()
// - Adds "(Custom)" suffix
// - Reppoints active program to new template ID
// - Sets isCustom = true
// If already custom:
// - Returns immediately (no re-fork)
```

**Step 2: Update Database (Supabase)**
```typescript
// Line 818
await programForkService.replaceExerciseInstances({
  templateId: activeProgram.templateId,  // Now points to forked template
  toExerciseId: toExercise.id,
  dayNumber: dayNumber,
  fromExerciseId: fromExerciseId,
})
// ↓
// Updates program_template_exercises table for all future weeks
```

**Step 3: Update In-Memory Template**
```typescript
// Lines 861-880 (NEW in commit 9fdeac5)
// Apply replacement to all days and weeks in memory
activeProgram.template.schedule[dayKey].exercises =
  exercises.map(applyExerciseReplacement)

// Apply to all future weeks
for (let week = currentWeek; week <= totalWeeks; week++) {
  activeProgram.template.schedule[dayKey].exercises =
    exercises.map(applyExerciseReplacement)
}
```

**Step 4: Persist Active Program**
```typescript
// Line 884
await this.saveActiveProgram(activeProgram)
// ↓
// Saves to localStorage AND Supabase (via syncToDatabase)

// Line 885
window.dispatchEvent(new Event("programChanged"))
// ↓
// Triggers UI refresh in programs-section, workout-logger, etc.
```

---

## Related Services

### **ProgramForkService** (lib/services/program-fork-service.ts)

**Purpose**: Handles deep cloning of templates and database mutations

**Key Methods**:
- `forkTemplateToMyProgram(templateId, ownerUserId, options)`
  - Deep clones: `program_templates` → `program_template_days` → `program_template_exercises`
  - Sets ownership: `owner_user_id = userId`
  - Sets lineage: `origin_template_id = original template`
  - Returns: New template ID

- `replaceExerciseInstances(params)`
  - Updates all exercise rows in `program_template_exercises`
  - Matches by: `exercise_id`, `day_number`, or `exercise_library_id`
  - Applies to all weeks (via loop in caller)

- `createBlankProgram(ownerUserId, name?)`
  - Creates minimal 1-week/1-day skeleton
  - Sets `created_from = 'blank'`

### **ProgramTemplateService** (lib/services/program-template-service.ts)

**Purpose**: Manages template queries and caching

**Key Methods**:
- `getMyPrograms(userId)`
  - Query: `SELECT * WHERE owner_user_id = userId`
  - Returns: User-owned + forked templates
  - Does NOT include canonical templates

- `getAllTemplates()`
  - Query: `SELECT * WHERE owner_user_id IS NULL AND origin_template_id IS NULL`
  - Returns: Canonical (admin-created) templates only
  - Does NOT include user-owned copies

---

## Database Schema

**Table**: `program_templates` (additive migration)

```sql
-- Ownership
owner_user_id UUID NULL REFERENCES profiles(id) ON DELETE CASCADE
  → NULL = canonical (admin-owned)
  → SET = user-owned copy

-- Lineage tracking
origin_template_id UUID NULL REFERENCES program_templates(id)
  → Original template this was forked from
  → NULL for canonical or blank programs

origin_version INT NULL
  → Version snapshot at fork time (for future rebase feature)

-- Metadata
forked_at TIMESTAMPTZ NULL
  → When the fork was created

origin_name_snapshot TEXT NULL
  → Original template name (for display)

origin_author_snapshot TEXT NULL
  → Original author name (if available)

created_from TEXT DEFAULT 'template'
  → 'template' = forked from canonical
  → 'blank' = user created from scratch
  → 'import' = future: imported from file
```

**Indexes**:
```sql
CREATE INDEX idx_program_templates_owner_user_id ON program_templates(owner_user_id)
CREATE INDEX idx_program_templates_origin_template_id ON program_templates(origin_template_id)
```

---

## UI Integration

### **Programs Section** (components/programs-section.tsx)

**Behavior**:
1. Shows two tabs: "Canonical" and "My Programs"
2. "My Programs" populated by `ProgramStateManager.getMyPrograms()`
3. When active program is custom (`isCustom = true`), default to "My Programs" tab
4. Forked programs show origin template link + "Created on" date
5. Delete button removes ownership (keeps in DB for history, removes from "My Programs")

**Smart Tab Routing** (line 229):
```typescript
// If current program is a custom program, show My Programs tab by default
const defaultTab = currentProgram?.isCustom ? 'my-programs' : 'canonical'
```

---

## ActiveProgram State Structure

```typescript
interface ActiveProgram {
  templateId: string              // Points to canonical OR forked template
  template: GymTemplate           // Full template object
  instanceId: string              // Unique instance ID
  currentWeek: number
  currentDay: number
  completedWorkouts: number
  totalWorkouts: number
  progress: number

  // CUSTOM PROGRAM FIELDS (NEW)
  isCustom?: boolean              // true if forked
  originTemplateId?: string       // Original template (if forked)
  templateMetadata?: {
    name: string
    forkedAt?: number
    originTemplateName?: string
  }
}
```

---

## Flow Diagram

```
User logs workout & replaces exercise with "Repeat"
           ↓
[applyFutureExerciseReplacement called]
           ↓
ensureCustomTemplateForActiveProgram()
           ↓
        IF NOT custom:
           ↓
     programForkService.forkTemplateToMyProgram()
           ↓
     Database: INSERT new program_templates row
     Database: INSERT cloned program_template_days
     Database: INSERT cloned program_template_exercises
           ↓
     programStateManager.repointActiveProgramToTemplate()
           ↓
     localStorage: Update activeProgram.templateId
     localStorage: Set isCustom = true
           ↓
        THEN:
           ↓
     programForkService.replaceExerciseInstances()
           ↓
     Database: UPDATE program_template_exercises
           ↓
     In-memory: Update template.schedule[day].exercises
           ↓
     saveActiveProgram()
           ↓
     localStorage: Save updated activeProgram
     Supabase: Sync via syncToDatabase()
           ↓
     dispatchEvent("programChanged")
           ↓
     UI: Refresh programs-section (shows in "My Programs" now)
     UI: Refresh workout-logger (if open)
           ↓
     Complete!
```

---

## Testing This Feature

### **Test 1: Basic Forking**
```
1. Select a canonical template (not in "My Programs")
2. Start a workout
3. Replace an exercise with "Repeat to future workouts"
4. Go to Programs → "My Programs" tab
5. VERIFY: Program now appears as "{Name} (Custom)"
6. VERIFY: Original program still in "Canonical" tab
7. VERIFY: Current workout unaffected
```

### **Test 2: Future Week Replacement**
```
1. Complete the forked workout
2. Start next week's workout
3. VERIFY: Replacement exercise appears (not original)
4. VERIFY: Muscle group displays correctly
5. VERIFY: Can log weights and complete
```

### **Test 3: Multiple Replacements**
```
1. Fork program by replacing exercise 1
2. In same week, replace exercise 2 with repeat
3. VERIFY: Program STAYS custom (no re-fork)
4. VERIFY: Both replacements apply to future weeks
5. Check "My Programs" - should still show 1 custom copy, not multiple
```

### **Test 4: Repointing Verification**
```
1. Note active program's templateId
2. Replace exercise with repeat (should fork)
3. Check localStorage:
   JSON.parse(localStorage.getItem('liftlog_active_program'))
4. VERIFY: templateId changed to new forked template ID
5. VERIFY: isCustom = true
```

---

## Recent Changes (Commit 9fdeac5)

**Enhancement**: Applied exercise replacement to ALL future weeks, not just current week

**Before**: Replacement only affected the current day for future weeks
**After**: Now loops through all weeks and applies to the same day in each week

**Code Location**: lib/program-state.ts, lines 867-880

**Impact**:
- ✅ "Repeat to future workouts" now actually repeats across all weeks
- ✅ Muscle group is now preserved in the replacement
- ✅ Future weeks show correct exercise + metadata

---

## Known Limitations & Future Work

**Current Limitations**:
- No rebase mechanism (if canonical template changes, fork doesn't auto-update)
- Deep clone means storage duplication (templates fully copied, not referenced)
- Can't merge changes back to canonical

**Future Enhancements** (from CUSTOM_PROGRAM_IMPLEMENTATION.md):
- Rebase mechanism: Merge upstream canonical changes into fork
- Overlay/patch model: Reference instead of deep clone (saves storage)
- Multi-day replace: Manage replacements across multiple days in one operation
- Per-run snapshots: Immutable copy of program at run start

---

## Related Files

**Core Implementation**:
- `lib/program-state.ts` - State management and forking logic
- `lib/services/program-fork-service.ts` - Database fork operations
- `lib/services/program-template-service.ts` - Template queries
- `lib/feature-flags.ts` - Feature flag (`MY_PROGRAMS_ENABLED`)

**Database**:
- `migrations/add-custom-program-fields.sql` - Schema changes

**UI**:
- `components/programs-section.tsx` - My Programs tab and forked program display
- `components/workout-logger/hooks/use-workout-session.ts` - Replacement trigger

**Documentation**:
- `docs/CUSTOM_PROGRAM_IMPLEMENTATION.md` - Full architecture and design

---

## How to Verify It's Working

**In Console**:
```javascript
// Check active program state
JSON.parse(localStorage.getItem('liftlog_active_program'))
// Look for: isCustom: true, originTemplateId: "..."

// Check My Programs list
const programs = await ProgramStateManager.getMyPrograms()
console.log(programs)  // Should include forked programs
```

**In UI**:
1. Programs page shows "My Programs" tab
2. Forked programs appear under My Programs
3. Original templates still in "Canonical" tab
4. Program pill shows "(Custom)" in name
5. Future weeks show replaced exercises
