# Custom Program Creation Wizard - Implementation Plan

**Version:** 1.0
**Date:** 2025-10-21
**Branch:** `feature/custom-program-wizard`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Wizard Flow](#wizard-flow)
4. [UI/UX Specifications](#uiux-specifications)
5. [Technical Implementation](#technical-implementation)
6. [Database Schema Changes](#database-schema-changes)
7. [Validation Rules](#validation-rules)
8. [Race Condition Prevention](#race-condition-prevention)
9. [File Structure](#file-structure)
10. [Testing Plan](#testing-plan)
11. [Success Criteria](#success-criteria)

---

## Overview

Implement a multi-step wizard for users to create custom workout programs either from scratch or by customizing existing templates. The wizard operates in complete isolation from the rest of the app, with all changes stored in memory until the final atomic save to the database.

### Key Features

- ✅ Create program from existing template with full customization
- ✅ Create program from scratch using muscle group → exercise flow
- ✅ Editable day names with safe UI placement
- ✅ Categorized muscle group selection (Upper Push, Upper Pull, Legs, Accessories)
- ✅ Drag-and-drop exercise reordering
- ✅ Randomize exercises for quick program generation
- ✅ Complete isolation from database operations until final save
- ✅ Future-proofed with `is_public` field for community sharing

---

## Architecture Decisions

### 1. Template ID Generation

**For From-Scratch Programs:**
- Use `ProgramForkService.createBlankProgram()` to generate UUID-based template
- Store in Supabase with:
  - `owner_user_id`: Current user's ID
  - `created_from: 'blank'`
  - `origin_template_id: null`
  - `is_public: false` (future-proofing)

**For From-Template Programs:**
- Use `ProgramForkService.forkTemplateToMyProgram()` to clone template
- Maintains lineage with `origin_template_id` and fork metadata

### 2. Wizard State Management - CRITICAL

**Zero Database Calls During Building:**
- ALL wizard state lives in React state only
- Only write to database on final save (atomic transaction)
- Wizard operates in "sandbox" mode - isolated from rest of app
- No navigation events, no `programChanged` events until completion
- User can safely build program without interruptions

**State Structure:**
```typescript
interface ProgramWizardState {
  step: 'source' | 'dayCount' | 'templateSelect' | 'dayBuilder' | 'muscleGroupSelect' | 'exerciseAssign' | 'finalize'
  source: 'template' | 'scratch' | null
  dayCount: number
  selectedTemplateId: string | null
  days: DayInWizard[]
  metadata: ProgramMetadata
  isLoading: boolean
  error: string | null
}
```

### 3. Muscle Group Categories

Organized into four categories for better UX:

- **Upper Push**: Chest, Shoulders, Triceps
- **Upper Pull**: Back, Biceps, Traps
- **Legs**: Quads, Glutes, Hamstrings, Calves
- **Accessories**: Abs, Forearms, Neck, Other

### 4. Day Naming

- Editable via pencil icon (positioned FAR LEFT, away from danger actions)
- Stored in `program_template_days.day_name`
- Default names: "Day 1", "Day 2", etc.
- User can rename to "Push", "Pull", "Legs", etc.

### 5. Future-Proofing: Community Feature

- Add `is_public` field to `program_templates` table
- Default: `false` (private programs)
- Future: Users can share programs in community section
- Hidden from UI for now, but integrated into save flow

---

## Wizard Flow

### Flow A: From Template

```
┌─────────────┐
│   Source    │ User selects "From Template"
│  Selection  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Day Count  │ User selects: 3, 4, 5, or 6 days
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Template   │ ONE-TIME DB load: Show filtered templates
│  Selection  │ User previews & selects template
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     Day     │ ONE-TIME DB load: Full template data
│   Builder   │ User customizes days/exercises (in-memory)
│             │ - Edit day names (pencil icon)
│             │ - Add/remove/reorder exercises
│             │ - Add/delete days
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Finalize   │ User enters metadata & saves
│             │ ATOMIC DB WRITE: All data saved
└─────────────┘
```

### Flow B: From Scratch

```
┌─────────────┐
│   Source    │ User selects "From Scratch"
│  Selection  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Day Count  │ User selects: 3, 4, 5, or 6 days
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Muscle    │ ONE-TIME DB load: Exercise library
│   Groups    │ User selects muscle groups per day
│  Selection  │ (categorized by Upper Push/Pull/Legs/Accessories)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Exercise   │ User assigns exercises to muscle groups
│  Assignment │ (pre-filtered by muscle group)
│             │ - Can randomize per day
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Finalize   │ User enters metadata & saves
│             │ ATOMIC DB WRITE: All data saved
└─────────────┘
```

---

## UI/UX Specifications

### StepSourceSelection

**Layout:**
```
┌────────────────────────────────────────────┐
│                                            │
│  Choose how to create your program         │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │        📋 From Template              │ │
│  │                                      │ │
│  │  Customize an existing program       │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │        ✨ From Scratch               │ │
│  │                                      │ │
│  │  Build your own program              │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

**Features:**
- Two large, tappable cards
- Clear descriptions
- Visual feedback on hover/tap

### StepDayCount

**Layout:**
```
┌────────────────────────────────────────────┐
│                                            │
│  How many days per week do you             │
│  want to train?                            │
│                                            │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐      │
│  │  3  │  │  4  │  │  5  │  │  6  │      │
│  │ days│  │ days│  │ days│  │ days│      │
│  └─────┘  └─────┘  └─────┘  └─────┘      │
│                                            │
│                           [Next]           │
└────────────────────────────────────────────┘
```

**Features:**
- Button group with day counts
- Selected state highlighted
- Next button enabled when selection made

### StepTemplateSelection (From Template Only)

**Layout:**
```
┌────────────────────────────────────────────┐
│  Choose a template to customize            │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Upper/Lower Split                   │ │
│  │  4 DAYS/WEEK - 8 WEEKS               │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Push/Pull/Legs                      │ │
│  │  6 DAYS/WEEK - 8 WEEKS               │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Back]                                    │
└────────────────────────────────────────────┘
```

**Features:**
- Filtered by selected day count
- Click template → shows preview panel with "Customize" button
- Preview shows all days and exercises

### StepDayBuilder (From Template Flow)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Edit your program                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✏️ Day 1 - Push              [🎲 Randomize] [🗑️ Delete] │
│ ┌───────────────────────────────────────────────────┐  │
│ │  ≡ Bench Press                  [↔️ Replace] [🗑️] │  │
│ │  ≡ Chest Press Flat             [↔️ Replace] [🗑️] │  │
│ │  ≡ Cable Fly                    [↔️ Replace] [🗑️] │  │
│ │  ≡ Tricep Overhead Extension    [↔️ Replace] [🗑️] │  │
│ │  ≡ Tricep Pushdown (Ez-Bar)     [↔️ Replace] [🗑️] │  │
│ │  + Add Exercise                                    │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ✏️ Day 2 - Pull              [🎲 Randomize] [🗑️ Delete] │
│ ┌───────────────────────────────────────────────────┐  │
│ │  [Collapsed - click to expand]                    │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ + Add New Day                                          │
│                                                         │
│ [Back]                                     [Next]       │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Editable Day Name**: Pencil icon (FAR LEFT) → click to edit inline or in dialog
- **Collapsible Days**: Click header to expand/collapse
- **Drag Handle**: ≡ symbol for reordering exercises
- **Replace Exercise**: Opens exercise library pre-filtered by muscle group
- **Delete Exercise**: Confirmation dialog
- **Delete Day**: Confirmation dialog, disabled if only day
- **Randomize**: Random exercises from muscle group pool
- **Add New Day**: Creates blank day at end

### StepMuscleGroupSelection (From Scratch Flow)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Select muscle groups for each day                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✏️ Day 1                     [🎲 Randomize] [🗑️ Delete] │
│ ┌───────────────────────────────────────────────────┐  │
│ │  + Add Muscle Group                               │  │
│ │                                                    │  │
│ │  Upper Push (3)                                   │  │
│ │    • Chest     [−] 2 [+]                         │  │
│ │    • Shoulders [−] 1 [+]                         │  │
│ │                                                    │  │
│ │  Legs (2)                                         │  │
│ │    • Quads     [−] 1 [+]                         │  │
│ │    • Glutes    [−] 1 [+]                         │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ✏️ Day 2                     [🎲 Randomize] [🗑️ Delete] │
│ ┌───────────────────────────────────────────────────┐  │
│ │  + Add Muscle Group                               │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ [Back]                                     [Next]       │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Click "+ Add Muscle Group" → opens MuscleGroupPicker dialog
- Selected groups shown with increment/decrement controls
- Grouped by category (Upper Push, Upper Pull, Legs, Accessories)
- Validation: Each day must have at least 1 muscle group

### MuscleGroupPicker Dialog

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Add Muscle Groups                     [✕]  │
├─────────────────────────────────────────────┤
│                                             │
│ Upper Push                                  │
│   ☑ Chest      [−] 2 [+]                   │
│   ☑ Shoulders  [−] 1 [+]                   │
│   ☐ Triceps    [−] 0 [+]                   │
│                                             │
│ Upper Pull                                  │
│   ☐ Back       [−] 0 [+]                   │
│   ☐ Biceps     [−] 0 [+]                   │
│   ☐ Traps      [−] 0 [+]                   │
│                                             │
│ Legs                                        │
│   ☑ Quads      [−] 1 [+]                   │
│   ☑ Glutes     [−] 1 [+]                   │
│   ☐ Hamstrings [−] 0 [+]                   │
│   ☐ Calves     [−] 0 [+]                   │
│                                             │
│ Accessories                                 │
│   ☐ Abs        [−] 0 [+]                   │
│   ☐ Forearms   [−] 0 [+]                   │
│   ☐ Neck       [−] 0 [+]                   │
│   ☐ Other      [−] 0 [+]                   │
│                                             │
│         [Cancel]  [Add 5 Muscle Groups]    │
└─────────────────────────────────────────────┘
```

**Features:**
- Checkbox + count selector per muscle group
- Count disabled if not checked
- Button shows total count: "Add X Muscle Groups"
- Groups by category for easy navigation

### StepExerciseAssignment (From Scratch Flow)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Assign exercises to muscle groups                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✏️ Day 1 - Push              [🎲 Randomize]            │
│ ┌───────────────────────────────────────────────────┐  │
│ │  Upper Push                                       │  │
│ │    💪 Chest     [Choose an exercise ▼]           │  │
│ │    💪 Chest     [Bench Press ✓]                  │  │
│ │    💪 Shoulders [Choose an exercise ▼]           │  │
│ │                                                    │  │
│ │  Legs                                             │  │
│ │    💪 Quads     [Choose an exercise ▼]           │  │
│ │    💪 Glutes    [Hip Thrust ✓]                   │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ✏️ Day 2 - Pull              [🎲 Randomize]            │
│ ┌───────────────────────────────────────────────────┐  │
│ │  [Collapsed - click to expand]                    │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ [Back]                                     [Next]       │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Each muscle group shows placeholders based on count
- Click dropdown → opens ExerciseLibrary pre-filtered by muscle group
- Selected exercises show with checkmark
- Randomize: Auto-fills all unfilled placeholders
- Validation: All placeholders must be filled to proceed

### StepFinalize

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Finalize your program                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Program Name *                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ My Custom Program                                 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Number of Weeks                                        │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐         │
│  │  4  │  │  6  │  │  8  │  │ 10  │  │ 12  │         │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘         │
│                                                         │
│  Deload Week                                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Week 8 (Last Week) ▼                              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Gender                                                 │
│  ☑ Male    ☑ Female                                    │
│                                                         │
│  Experience Level                                       │
│  ○ Beginner    ○ Intermediate    ○ Advanced            │
│                                                         │
│  ────────────────────────────────────────              │
│                                                         │
│  Summary:                                               │
│  • 6 days per week, 8 weeks total                      │
│  • 42 exercises across all days                        │
│  • Deload on week 8                                    │
│                                                         │
│  [Back]                          [Create Program]      │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Required field: Program name (max 100 chars)
- Week selection buttons
- Deload week dropdown (defaults to last week)
- Gender checkboxes (can select multiple)
- Experience radio buttons (single selection)
- Summary section shows program stats
- "Create Program" button triggers atomic save

### Confirmation Dialogs

**Delete Day:**
```
┌────────────────────────────────────┐
│ Delete Day 1?                      │
├────────────────────────────────────┤
│ This will remove all exercises in  │
│ this day.                          │
│                                    │
│        [Cancel]      [Delete]      │
└────────────────────────────────────┘
```

**Delete Exercise:**
```
┌────────────────────────────────────┐
│ Delete Bench Press?                │
├────────────────────────────────────┤
│                                    │
│        [Cancel]      [Delete]      │
└────────────────────────────────────┘
```

**Exit Wizard (if unsaved changes):**
```
┌────────────────────────────────────┐
│ Discard changes?                   │
├────────────────────────────────────┤
│ Your program hasn't been saved yet.│
│                                    │
│  [Keep Editing]    [Discard]       │
└────────────────────────────────────┘
```

**Day Name Editor:**
```
┌────────────────────────────────────┐
│ Edit Day Name                      │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ Push                         │ │
│  └──────────────────────────────┘ │
│                                    │
│        [Cancel]      [Save]        │
└────────────────────────────────────┘
```

---

## Technical Implementation

### Wizard State Management

**Initial Data Load (ONE-TIME):**
```typescript
const loadInitialData = async () => {
  try {
    setLoading(true)

    // Load ALL exercises for library and randomization
    const exercises = await exerciseService.getAllExercises()
    setExercisesCache(exercises)

    // Load templates if "from template" flow
    if (source === 'template') {
      const templates = await ProgramStateManager.getAllTemplates()
      setTemplatesCache(templates)
    }

    setLoading(false)
  } catch (error) {
    setError(error.message)
    // Don't close wizard - let user retry
  }
}
```

**Template Loading (ONE-TIME):**
```typescript
const loadTemplateForCustomization = async (templateId: string) => {
  try {
    setLoading(true)

    // Load full template with exercises
    const template = await ProgramTemplateService.getFullTemplate(templateId)

    // Convert to wizard state (in-memory copy)
    const wizardDays = convertTemplateToWizardDays(template)

    setWizardState(prev => ({
      ...prev,
      selectedTemplateId: templateId,
      days: wizardDays,
      metadata: {
        ...prev.metadata,
        name: `${template.name} (Custom)`,
        weeks: template.weeks,
        deloadWeek: template.deloadWeek || template.weeks,
        gender: template.gender,
        experience: template.experience,
      },
      step: 'dayBuilder',
    }))

    setLoading(false)
  } catch (error) {
    setError(error.message)
  }
}
```

**Exercise Library Filtering (Client-Side):**
```typescript
const getExercisesForMuscleGroup = (muscleGroup: string) => {
  return exercisesCache.filter(ex =>
    ex.muscleGroup.toLowerCase() === muscleGroup.toLowerCase()
  )
}

const randomizeExercisesForDay = (dayIndex: number) => {
  const day = wizardState.days[dayIndex]
  const updatedExercises = day.muscleGroups.flatMap(mg => {
    const availableExercises = getExercisesForMuscleGroup(mg.group)
    const randomExercises = shuffleArray(availableExercises).slice(0, mg.count)
    return randomExercises.map((ex, idx) => ({
      tempId: uuidv4(),
      exerciseLibraryId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      equipmentType: ex.equipmentType,
      order: idx,
      category: determineCategory(ex),
      restTime: 90,
    }))
  })

  // Update wizard state (no database call)
  setWizardState(prev => ({
    ...prev,
    days: prev.days.map((d, i) =>
      i === dayIndex ? { ...d, exercises: updatedExercises } : d
    ),
  }))
}
```

### Atomic Save Flow

**Final Save (ONLY Database Writes):**
```typescript
const handleSaveProgram = async () => {
  try {
    setIsLoading(true)

    const userId = getCurrentUserId()
    const { source, selectedTemplateId, days, metadata } = wizardState

    // 1. Create program template (ONE database call)
    let templateId: string
    if (source === 'scratch') {
      templateId = await ProgramForkService.createBlankProgram(
        userId,
        metadata.name
      )
    } else {
      templateId = await ProgramForkService.forkTemplateToMyProgram(
        selectedTemplateId!,
        userId,
        { nameOverride: metadata.name }
      )
    }

    // 2. Update template metadata (ONE database call)
    await ProgramTemplateService.updateTemplate(templateId, {
      days_per_week: days.length,
      total_weeks: metadata.weeks,
      deload_week: metadata.deloadWeek,
      gender: metadata.gender,
      experience_level: metadata.experience,
      is_public: metadata.isPublic, // Always false for now
    })

    // 3. Batch insert days (ONE database call)
    const dayInserts = days.map(day => ({
      program_template_id: templateId,
      day_number: day.dayNumber,
      day_name: day.dayName,
    }))

    const { data: insertedDays, error: dayError } = await supabase
      .from('program_template_days')
      .upsert(dayInserts)
      .select('id, day_number')

    if (dayError) throw dayError

    // 4. Batch insert exercises (ONE or FEW database calls)
    const exerciseInserts = []
    for (const day of days) {
      const dayId = insertedDays.find(d => d.day_number === day.dayNumber)?.id
      if (!dayId) throw new Error(`Day ${day.dayNumber} not found`)

      day.exercises.forEach(ex => {
        exerciseInserts.push({
          template_day_id: dayId,
          exercise_id: ex.exerciseLibraryId,
          exercise_order: ex.order,
          category: ex.category,
          rest_time_seconds: ex.restTime,
          progression_config: generateProgressionConfig(ex, metadata.weeks),
        })
      })
    }

    if (exerciseInserts.length > 0) {
      const { error: exError } = await supabase
        .from('program_template_exercises')
        .insert(exerciseInserts)

      if (exError) throw exError
    }

    // 5. Clear caches & notify
    ProgramTemplateService.clearCache()
    window.dispatchEvent(new Event("programChanged"))

    // 6. Close wizard & show success
    onComplete(templateId)
    toast({ title: "Program created successfully" })

  } catch (error) {
    console.error('[ProgramWizard] Save failed:', error)
    toast({
      title: "Failed to save program",
      description: error instanceof Error ? error.message : 'Please try again.',
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}
```

### Progression Config Generation

```typescript
const generateProgressionConfig = (
  exercise: ExerciseInWizard,
  totalWeeks: number
) => {
  const progressionTemplate: Record<string, any> = {}

  // Generate progression for each week
  for (let week = 1; week <= totalWeeks; week++) {
    const isDeloadWeek = week === totalWeeks

    progressionTemplate[`week${week}`] = {
      sets: isDeloadWeek ? 2 : 3,
      repRange: exercise.category === 'compound' ? '6-8' : '8-12',
      intensity: isDeloadWeek ? 'deload' : undefined,
    }
  }

  return {
    progressionTemplate,
    autoProgression: {
      enabled: true,
      progressionType: 'weight_based',
      rules: {
        if_all_sets_completed: 'increase_weight',
        if_failed_reps: 'repeat_weight',
        if_failed_twice: 'decrease_weight',
      },
    },
    tier: exercise.category === 'compound' ? 'tier1' : 'tier2',
  }
}
```

---

## Database Schema Changes

### Add is_public Field

```sql
-- Add is_public column to program_templates
ALTER TABLE program_templates
ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Add index for future community feature (query public programs)
CREATE INDEX idx_program_templates_public
ON program_templates(is_public)
WHERE is_public = true;

-- Add comment for documentation
COMMENT ON COLUMN program_templates.is_public IS
'Whether this program is shared in the community section. False by default (private programs). Future feature.';
```

### Migration File

Create: `supabase/migrations/YYYYMMDDHHMMSS_add_program_templates_is_public.sql`

---

## Validation Rules

### Day Validation

- ❌ Cannot save program with 0 days
- ❌ Cannot delete day if it's the only day
- ❌ Each day must have at least 1 exercise (from template) or 1 muscle group (from scratch)
- ✅ Day names can be any string (max 100 chars)
- ✅ Day names can be duplicated (e.g., "Push" for Day 1 and Day 4)
- ✅ Can have different exercise counts per day

### Exercise Validation

- ❌ Cannot proceed from StepExerciseAssignment if any muscle group placeholder is unfilled
- ✅ Can have duplicate exercises across days
- ✅ Can have duplicate exercises within same day (if user adds manually)
- ❌ Exercise name cannot be empty
- ✅ Exercises can be reordered freely

### Program Metadata Validation

- ❌ Program name cannot be empty
- ❌ Program name cannot exceed 100 characters
- ⚠️ Warn if name matches existing program (but allow)
- ❌ Must select at least 1 gender
- ❌ Must select exactly 1 experience level
- ❌ Number of weeks must be between 4-12
- ❌ Deload week must be within program duration

### Validation Helper Functions

```typescript
const validateDay = (day: DayInWizard): string | null => {
  if (!day.dayName.trim()) return "Day name cannot be empty"
  if (day.dayName.length > 100) return "Day name cannot exceed 100 characters"
  if (day.exercises.length === 0) return "Day must have at least 1 exercise"
  return null
}

const validateMetadata = (metadata: ProgramMetadata): string | null => {
  if (!metadata.name.trim()) return "Program name is required"
  if (metadata.name.length > 100) return "Program name cannot exceed 100 characters"
  if (metadata.gender.length === 0) return "Select at least one gender"
  if (metadata.experience.length !== 1) return "Select exactly one experience level"
  if (metadata.weeks < 4 || metadata.weeks > 12) return "Program must be 4-12 weeks"
  if (metadata.deloadWeek < 1 || metadata.deloadWeek > metadata.weeks) {
    return "Deload week must be within program duration"
  }
  return null
}

const canProceedToNextStep = (state: ProgramWizardState): boolean => {
  switch (state.step) {
    case 'source':
      return state.source !== null
    case 'dayCount':
      return state.dayCount > 0
    case 'templateSelect':
      return state.selectedTemplateId !== null
    case 'muscleGroupSelect':
      return state.days.every(day =>
        day.muscleGroups && day.muscleGroups.length > 0
      )
    case 'exerciseAssign':
      return state.days.every(day => day.exercises.length > 0)
    case 'dayBuilder':
      return state.days.length > 0 && state.days.every(day =>
        day.exercises.length > 0
      )
    case 'finalize':
      return validateMetadata(state.metadata) === null
    default:
      return false
  }
}
```

---

## Race Condition Prevention

### Wizard Isolation Rules

1. **Modal Overlay**: Wizard renders as full-screen modal with backdrop (prevents clicking outside)
2. **No Auto-Refresh**: Wizard doesn't listen to `programChanged` events while open
3. **Browser Navigation**: Intercept back button with confirmation dialog if changes exist
4. **State in Memory**: All edits stay in React state until final save
5. **Loading States**: Show spinner during ONE-TIME data loads (templates, exercises)
6. **Error Handling**: If initial data load fails, show error and allow retry (don't auto-close)

### Implementation

**Modal Setup:**
```typescript
<Dialog
  open={isOpen}
  onOpenChange={(open) => {
    if (!open && hasUnsavedChanges) {
      setShowExitConfirmation(true)
    } else {
      onClose()
    }
  }}
  modal={true}
>
  <DialogOverlay className="bg-black/80" />
  <DialogContent
    className="max-w-4xl max-h-[90vh] overflow-y-auto"
    onInteractOutside={(e) => e.preventDefault()} // Prevent closing by clicking outside
    onEscapeKeyDown={(e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        setShowExitConfirmation(true)
      }
    }}
  >
    {/* Wizard content */}
  </DialogContent>
</Dialog>
```

**Browser Back Button:**
```typescript
useEffect(() => {
  if (!isOpen) return

  const handlePopState = (e: PopStateEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setShowExitConfirmation(true)
      // Push state back to keep user in wizard
      window.history.pushState(null, '', window.location.href)
    }
  }

  // Push a dummy state to intercept back button
  window.history.pushState(null, '', window.location.href)
  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}, [isOpen, hasUnsavedChanges])
```

**Event Listener Isolation:**
```typescript
// DON'T listen to these events while wizard is open
useEffect(() => {
  if (isOpen) {
    // Remove global event listeners
    window.removeEventListener('programChanged', handleProgramChanged)
    window.removeEventListener('programEnded', handleProgramEnded)
  }

  return () => {
    // Re-attach when wizard closes
    window.addEventListener('programChanged', handleProgramChanged)
    window.addEventListener('programEnded', handleProgramEnded)
  }
}, [isOpen])
```

---

## File Structure

### New Files

```
components/program-wizard/
├── ProgramWizard.tsx                 # Main orchestrator with modal & stepper
├── types.ts                          # TypeScript types for wizard state
├── constants.ts                      # Muscle group categories, defaults
├── utils.ts                          # Helper functions (validation, conversion)
│
├── steps/
│   ├── StepSourceSelection.tsx       # Choose from template or scratch
│   ├── StepDayCount.tsx              # Select number of training days
│   ├── StepTemplateSelection.tsx     # Show filtered templates (from template only)
│   ├── StepMuscleGroupSelection.tsx  # Select muscle groups per day (from scratch)
│   ├── StepExerciseAssignment.tsx    # Assign exercises to muscle groups (from scratch)
│   ├── StepDayBuilder.tsx            # Customize days/exercises (both flows merge here)
│   └── StepFinalize.tsx              # Enter metadata & save
│
├── components/
│   ├── MuscleGroupPicker.tsx         # Dialog for selecting muscle groups with counts
│   ├── DayNameEditor.tsx             # Inline/dialog editor for day names
│   ├── ExerciseRow.tsx               # Draggable exercise row with actions
│   ├── DaySection.tsx                # Collapsible day section
│   ├── WizardStepper.tsx             # Progress indicator at top
│   └── ConfirmationDialogs.tsx       # Reusable confirmation dialogs
│
└── hooks/
    ├── useWizardState.ts             # Wizard state management hook
    ├── useExerciseCache.ts           # Exercise library caching
    └── useTemplateCache.ts           # Template caching
```

### Modified Files

```
components/programs-section.tsx       # Wire NEW button to open wizard
lib/services/program-fork-service.ts  # Add is_public parameter support
lib/services/program-template-service.ts  # Ensure clearCache is exported
```

### Database Migration

```
supabase/migrations/
└── YYYYMMDDHHMMSS_add_program_templates_is_public.sql
```

---

## Testing Plan

### Manual Testing Scenarios

#### 1. From Template - Full Customization
**Steps:**
1. Click "NEW" button in Programs section
2. Select "From Template"
3. Choose 6 days per week
4. Select a 6-day template
5. Preview template → Click "Customize"
6. Edit day names (e.g., "Day 1" → "Push")
7. Replace 2 exercises
8. Delete 1 exercise
9. Add 2 new exercises
10. Reorder exercises via drag-and-drop
11. Add a 7th day
12. Enter program metadata
13. Save program
14. Verify program appears in My Programs tab
15. Open program and verify all changes persisted

**Expected Result:** ✅ All customizations saved correctly

#### 2. From Template - Add Extra Day
**Steps:**
1. Select 3-day template
2. Customize template
3. Click "+ Add New Day"
4. Add exercises to new day
5. Save program
6. Verify 4-day program created

**Expected Result:** ✅ Program has 4 days with all exercises

#### 3. From Scratch - Full Build
**Steps:**
1. Click "NEW" → "From Scratch"
2. Choose 4 days per week
3. For Day 1: Add Upper Push muscle groups (Chest x3, Shoulders x2, Triceps x1)
4. For Day 2: Add Upper Pull muscle groups (Back x3, Biceps x2)
5. For Day 3: Add Legs muscle groups (Quads x2, Glutes x2, Hamstrings x2)
6. For Day 4: Add Accessories (Abs x2, Calves x2)
7. Assign exercises to all placeholders
8. Edit day names
9. Enter program metadata
10. Save program
11. Verify in My Programs

**Expected Result:** ✅ 4-day program with correct muscle groups and exercises

#### 4. From Scratch - Randomize
**Steps:**
1. Create program from scratch with 6 days
2. Add muscle groups to all days
3. Click "Randomize" on Day 1
4. Verify exercises auto-filled
5. Repeat for all days
6. Save program

**Expected Result:** ✅ All exercises randomly assigned from muscle group pools

#### 5. Validation Edge Cases
**Steps:**
1. Try saving with empty program name → Should block with error
2. Try deleting only day → Should show warning and block
3. Try proceeding from muscle group step with empty day → Should block
4. Try saving with unfilled exercise placeholders → Should block
5. Try entering program name with 150 characters → Should block at 100
6. Try selecting 0 weeks → Should enforce minimum 4 weeks

**Expected Result:** ✅ All validation rules enforced

#### 6. Race Condition Prevention
**Steps:**
1. Open wizard
2. Start building program
3. Try clicking outside modal → Should not close
4. Try pressing Esc → Should show confirmation if changes exist
5. Try pressing browser back button → Should show confirmation
6. Open DevTools → Verify no database calls during building
7. Save program → Verify single atomic write

**Expected Result:** ✅ Wizard isolated, no interruptions, atomic save

#### 7. Exit Wizard with Unsaved Changes
**Steps:**
1. Build partial program
2. Click X or try to close wizard
3. Verify confirmation dialog shows
4. Click "Discard" → Wizard closes, no save
5. Rebuild partial program
6. Click "Keep Editing" → Stay in wizard

**Expected Result:** ✅ Confirmation prevents accidental data loss

### Database Verification

**After Each Save:**
1. Check `program_templates` table:
   - `created_from` is 'blank' or 'template'
   - `owner_user_id` is set correctly
   - `is_public` is false
   - `origin_template_id` is set (if from template) or null (if from scratch)
2. Check `program_template_days` table:
   - Day count matches wizard
   - `day_name` matches user-entered names
   - `day_number` is sequential
3. Check `program_template_exercises` table:
   - Exercise count matches wizard
   - `exercise_order` is correct
   - `exercise_id` matches exercise_library UUID
   - `progression_config` is populated

**SQL Queries for Verification:**
```sql
-- Check program was created
SELECT * FROM program_templates
WHERE owner_user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Check days
SELECT * FROM program_template_days
WHERE program_template_id = 'template-id'
ORDER BY day_number;

-- Check exercises
SELECT ptd.day_number, ptd.day_name, pte.exercise_order, el.name
FROM program_template_exercises pte
JOIN program_template_days ptd ON pte.template_day_id = ptd.id
JOIN exercise_library el ON pte.exercise_id = el.id
WHERE ptd.program_template_id = 'template-id'
ORDER BY ptd.day_number, pte.exercise_order;

-- Verify is_public is false
SELECT id, name, is_public FROM program_templates
WHERE id = 'template-id';
```

### Performance Testing

**Metrics to Verify:**
- Initial wizard load (with exercise cache): < 500ms
- Template selection load: < 300ms
- Template customization load: < 200ms
- Muscle group picker open: < 50ms (client-side)
- Exercise assignment dropdown: < 50ms (pre-cached)
- Randomize exercises: < 100ms (client-side)
- Final save (atomic write): < 2000ms
- Wizard remains responsive during all operations

---

## Success Criteria

### Functional Requirements

✅ User can create custom program from existing template with full customization
✅ User can create program from scratch using muscle group → exercise flow
✅ All programs save to Supabase with proper ownership and metadata
✅ Custom programs appear in My Programs tab immediately after save
✅ Day names are editable with safe UI placement (pencil icon far from delete)
✅ Muscle groups are categorized (Upper Push, Upper Pull, Legs, Accessories)
✅ Deletion actions require confirmation
✅ Wizard operates in complete isolation - no database writes until final save
✅ `is_public` field is added to database (always false for now)

### Technical Requirements

✅ Follows DEVELOPMENT_RULES.md patterns:
  - Pattern 1: Database sync only at end (atomic save)
  - Pattern 3: All state changes persisted before events
  - Pattern 8: Wizard modal keeps state isolated

✅ Zero database calls during wizard building phase
✅ Single atomic transaction for final save
✅ Proper error handling with user-friendly messages
✅ Loading states for all async operations
✅ TypeScript types for all wizard state

### UX Requirements

✅ UI matches LiftLog design system (no emojis, consistent styling)
✅ Responsive design (mobile + desktop)
✅ Clear validation error messages
✅ Confirmation dialogs prevent accidental deletions
✅ Progress indicator shows current step
✅ Back/Next buttons for easy navigation
✅ Can exit wizard safely with confirmation if unsaved changes

### Validation Requirements

✅ All validation rules enforced (see Validation Rules section)
✅ Cannot save invalid program
✅ Cannot proceed to next step with incomplete data
✅ Helpful inline validation messages

### Performance Requirements

✅ Wizard loads in < 500ms
✅ UI remains responsive during all operations
✅ Randomize features execute in < 100ms
✅ Final save completes in < 2000ms

### Testing Requirements

✅ All manual testing scenarios pass
✅ Database verification queries confirm correct data structure
✅ No race conditions observed
✅ No unexpected navigation or refreshes during wizard

---

## Future Enhancements

### Phase 2: Community Feature (Post-MVP)

When implementing community program sharing:

1. **UI Changes:**
   - Add "Make Public" toggle in StepFinalize (show only for experienced users)
   - Add "Community" tab in Programs section
   - Add search/filter in Community tab

2. **Backend Changes:**
   - Update save flow to respect `is_public` setting
   - Add RLS policies for public program access
   - Add program rating/favorites system

3. **Database:**
   - Add `program_ratings` table
   - Add `program_favorites` table
   - Update index on `is_public` to handle large public program datasets

4. **Wizard Changes:**
   - Unhide `is_public` toggle in StepFinalize
   - Add warning about sharing (can't unpublish after others copy)
   - Add "Share" button in My Programs dropdown

### Phase 3: Advanced Customization

- **Progressive Overload Configurator:** Custom progression rules per exercise
- **Superset Builder:** Group exercises into supersets/circuits
- **Rest Period Customization:** Per exercise rest time configuration
- **RPE/RIR Integration:** Intensity-based progression
- **Template Preview:** Visual calendar preview before saving

---

## Appendix

### Glossary

- **Wizard**: Multi-step UI flow for creating programs
- **From Template**: Creating program by customizing existing template
- **From Scratch**: Creating program by selecting muscle groups and exercises
- **Muscle Group**: Category of exercises (e.g., Chest, Back, Quads)
- **Exercise Library**: Database of all available exercises
- **Day Builder**: UI for customizing days and exercises
- **Atomic Save**: All database writes happen in single transaction
- **Sandbox Mode**: Wizard operates in isolation with no external side effects

### References

- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) - Core development patterns
- [CLAUDE.md](./CLAUDE.md) - Project overview and architecture
- Supabase Schema: `program_templates`, `program_template_days`, `program_template_exercises`, `exercise_library`
- Services: `ProgramForkService`, `ProgramTemplateService`, `ExerciseLibraryService`

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Author:** Development Team
**Status:** Ready for Implementation

