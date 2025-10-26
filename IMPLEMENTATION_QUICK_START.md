# Implementation Quick Start Guide

This guide provides a step-by-step walkthrough for implementing the Exercise Notes & Custom RPE feature. Start here and follow the order.

---

## Phase 1: Foundation (Database & Types)

### Step 1.1: Create Type Definitions
**File**: `lib/types/progression.ts` (NEW)

```typescript
export interface ProgressionWeekConfig {
  week: number
  rir: number
  rpe: number  // Can be decimal: 8.5, 9.5, etc.
}

export interface RirRpeProgression {
  blockLength: 4 | 5 | 6 | 7 | 8
  weeks: ProgressionWeekConfig[]
}

export interface ExerciseNote {
  id: string
  userId: string
  programInstanceId: string
  exerciseId: string
  week: number
  noteText: string
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

export interface ExerciseCustomRpe {
  id: string
  userId: string
  programInstanceId: string
  exerciseId: string
  week: number
  setNumber: number
  rpeValue: number
  createdAt: number
  updatedAt: number
}

export type RpeRirDisplayMode = 'rir' | 'rpe' | 'off'
```

### Step 1.2: Export Types
**File**: `lib/types.ts` (UPDATE)

Add to imports:
```typescript
export * from './types/progression'
```

### Step 1.3: Create Database Migrations
**Files**: `migrations/` directory (NEW)

Create migration for `program_progression_config`:
```sql
-- migrations/add_program_progression_config.sql

CREATE TABLE IF NOT EXISTS program_progression_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  block_length INTEGER NOT NULL CHECK (block_length IN (4, 5, 6, 7, 8)),
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  rir_value INTEGER NOT NULL CHECK (rir_value >= 0 AND rir_value <= 8),
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 2 AND rpe_value <= 10),
  UNIQUE(program_template_id, block_length, week_number),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prog_config_template ON program_progression_config(program_template_id);
```

Create migration for `exercise_notes`:
```sql
-- migrations/add_exercise_notes.sql

CREATE TABLE IF NOT EXISTS exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_instance_id, exercise_id, week)
);

CREATE INDEX IF NOT EXISTS idx_notes_user_program ON exercise_notes(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_notes_exercise_week ON exercise_notes(exercise_id, week);
```

Create migration for `exercise_custom_rpe`:
```sql
-- migrations/add_exercise_custom_rpe.sql

CREATE TABLE IF NOT EXISTS exercise_custom_rpe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 1 AND rpe_value <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_instance_id, exercise_id, week, set_number)
);

CREATE INDEX IF NOT EXISTS idx_custom_rpe_user_program ON exercise_custom_rpe(user_id, program_instance_id);
CREATE INDEX IF NOT EXISTS idx_custom_rpe_exercise_week ON exercise_custom_rpe(exercise_id, week);
```

Create migration to add preference to profiles:
```sql
-- migrations/add_rpe_rir_display_preference.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  rpe_rir_display_mode TEXT DEFAULT 'rir' CHECK (rpe_rir_display_mode IN ('rir', 'rpe', 'off'));
```

---

## Phase 2: Services

### Step 2.1: Progression Config Service
**File**: `lib/services/progression-config-service.ts` (NEW)

This is the core service for RIR/RPE management. Reference the full template in `FEATURE_PLAN_EXERCISE_NOTES_AND_RPE.md` Section 4.

Key methods:
- `getDefaultProgressionPattern(blockLength)` - Returns hardcoded default
- `getProgressionForWeek(blockLength, weekNumber)` - Returns {rir, rpe}
- `getRirForWeek(blockLength, weekNumber)` - Quick lookup
- `getRpeForWeek(blockLength, weekNumber)` - Quick lookup

**Hardcoded defaults**: Use the patterns from `FEATURE_PLAN_EXERCISE_NOTES_AND_RPE.md` Section 3.5

### Step 2.2: Exercise Notes Service
**File**: `lib/services/exercise-notes-service.ts` (NEW)

Key methods:
- `saveNote(userId, programInstanceId, exerciseId, week, noteText, isPinned)`
- `getNote(userId, programInstanceId, exerciseId, week)`
- `getPinnedNoteForWeek(userId, programInstanceId, exerciseId, currentWeek)` - Auto-repeat logic
- `deleteNote(noteId)`
- `getNotesForWeek(userId, programInstanceId, week)` - Batch load

### Step 2.3: Custom RPE Service
**File**: `lib/services/custom-rpe-service.ts` (NEW)

Key methods:
- `saveCustomRpe(userId, programInstanceId, exerciseId, week, setNumber, rpeValue)`
- `getCustomRpe(userId, programInstanceId, exerciseId, week, setNumber)`
- `getExerciseRpesForWeek(userId, programInstanceId, exerciseId, week)`
- `deleteCustomRpe(customRpeId)`

### Step 2.4: User Preference Service
**File**: `lib/services/user-preference-service.ts` (NEW)

Key methods:
- `getRpeRirDisplayMode(userId)` - Get current preference
- `setRpeRirDisplayMode(userId, mode)` - Update preference

Use the profiles table column added in Step 1.3.

---

## Phase 3: Utilities

### Step 3.1: Progression Label Utilities
**File**: `lib/utils/progression-label.ts` (NEW)

```typescript
import { ProgressionConfigService } from '@/lib/services/progression-config-service'

export function getProgressionLabel(
  blockLength: number,
  weekNumber: number,
  displayMode: 'rir' | 'rpe' | 'off'
): string {
  if (displayMode === 'off') return ''

  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)
  if (!config) return ''

  if (displayMode === 'rir') {
    return `RIR ${config.rir}`
  } else {
    return `RPE ${formatRpeValue(config.rpe)}`
  }
}

export function getProgressionLabelWithValues(
  blockLength: number,
  weekNumber: number,
  displayMode: 'rir' | 'rpe' | 'off'
) {
  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)

  return {
    label: getProgressionLabel(blockLength, weekNumber, displayMode),
    rir: config?.rir ?? null,
    rpe: config?.rpe ?? null
  }
}

export function formatRpeValue(rpe: number): string {
  return rpe % 1 === 0 ? rpe.toString() : rpe.toFixed(1)
}
```

---

## Phase 4: UI Components

### Step 4.1: Progression Label Component
**File**: `components/workout-logger/components/progression-label.tsx` (NEW)

```typescript
'use client'

import { ProgressionConfigService } from '@/lib/services/progression-config-service'
import { formatRpeValue } from '@/lib/utils/progression-label'

interface ProgressionLabelProps {
  blockLength: number
  weekNumber: number
  displayMode: 'rir' | 'rpe' | 'off'
}

export function ProgressionLabel({
  blockLength,
  weekNumber,
  displayMode
}: ProgressionLabelProps) {
  if (displayMode === 'off') return null

  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)
  if (!config) return null

  const label = displayMode === 'rir'
    ? `RIR ${config.rir}`
    : `RPE ${formatRpeValue(config.rpe)}`

  return (
    <span className="text-xs font-mono text-gray-400 ml-2">
      · {label}
    </span>
  )
}
```

### Step 4.2: Exercise Notes Banner
**File**: `components/workout-logger/components/exercise-notes-banner.tsx` (NEW)

Simple banner component that displays above exercise name:

```typescript
'use client'

interface ExerciseNotesBannerProps {
  noteText: string
  isPinned: boolean
  onEdit: () => void
}

export function ExerciseNotesBanner({
  noteText,
  isPinned,
  onEdit
}: ExerciseNotesBannerProps) {
  return (
    <button
      onClick={onEdit}
      className="w-full px-3 py-2 mb-2 bg-yellow-600/20 border-l-4 border-yellow-500 rounded text-yellow-100 text-sm hover:bg-yellow-600/30 transition"
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold mt-0.5">NOTE</span>
        <span className="flex-1 text-left">{noteText}</span>
        {isPinned && <span className="text-xs">📌</span>}
      </div>
    </button>
  )
}
```

### Step 4.3: Exercise Notes Dialog
**File**: `components/workout-logger/components/exercise-notes-dialog.tsx` (NEW)

Modal for creating/editing notes with pin checkbox:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ExerciseNotesDialogProps {
  exerciseId: string
  exerciseName: string
  initialNote?: {
    noteText: string
    isPinned: boolean
  }
  onSave: (noteText: string, isPinned: boolean) => Promise<void>
  onDelete?: () => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export function ExerciseNotesDialog({
  exerciseName,
  initialNote,
  onSave,
  onDelete,
  isOpen,
  onClose
}: ExerciseNotesDialogProps) {
  const [noteText, setNoteText] = useState(initialNote?.noteText || '')
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned || false)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(noteText, isPinned)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsLoading(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-lg font-bold mb-4">Notes: {exerciseName}</h2>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add coaching notes, form cues, or reminders..."
          className="w-full h-32 p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 mb-4"
        />

        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">
            Pin this note to repeat each week
          </span>
        </label>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isLoading || !noteText.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Save Note
          </Button>
          {onDelete && (
            <Button
              onClick={handleDelete}
              disabled={isLoading}
              variant="destructive"
            >
              Delete
            </Button>
          )}
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.4: Custom RPE Box
**File**: `components/workout-logger/components/exercise-custom-rpe-box.tsx` (NEW)

Small clickable box next to exercise name:

```typescript
'use client'

interface ExerciseCustomRpeBoxProps {
  exerciseName: string
  hasCustomRpe: boolean
  rpeValue?: number
  onOpen: () => void
}

export function ExerciseCustomRpeBox({
  exerciseName,
  hasCustomRpe,
  rpeValue,
  onOpen
}: ExerciseCustomRpeBoxProps) {
  return (
    <button
      onClick={onOpen}
      title={`Set custom RPE for ${exerciseName}`}
      className={`w-12 h-8 rounded border font-semibold text-sm transition ${
        hasCustomRpe
          ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
          : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
      }`}
    >
      {hasCustomRpe && rpeValue ? (
        <span>{rpeValue.toFixed(1)}</span>
      ) : (
        <span>RPE</span>
      )}
    </button>
  )
}
```

### Step 4.5: Custom RPE Dialog
**File**: `components/workout-logger/components/custom-rpe-dialog.tsx` (NEW)

Modal for logging per-set RPE:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CustomRpeDialogProps {
  exerciseName: string
  targetSets: number
  displayMode: 'rir' | 'rpe'
  blockLevelRpe?: number
  initialRpes?: { [setNumber: number]: number }
  onSave: (rpesBySet: { [setNumber: number]: number }) => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export function CustomRpeDialog({
  exerciseName,
  targetSets,
  displayMode,
  blockLevelRpe,
  initialRpes,
  onSave,
  isOpen,
  onClose
}: CustomRpeDialogProps) {
  const [rpeValues, setRpeValues] = useState<{ [key: number]: number }>(
    initialRpes || {}
  )
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(rpeValues)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-lg font-bold mb-4">RPE by Set: {exerciseName}</h2>

        {blockLevelRpe && (
          <div className="mb-4 p-3 bg-gray-800 rounded text-sm text-gray-300">
            Block level: RPE {blockLevelRpe.toFixed(1)}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {Array.from({ length: targetSets }, (_, i) => i + 1).map((set) => (
            <div key={set} className="flex items-center gap-3">
              <span className="w-12 text-sm font-semibold">Set {set}:</span>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={rpeValues[set] ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined
                  setRpeValues(prev => {
                    if (val === undefined) {
                      const { [set]: _, ...rest } = prev
                      return rest
                    }
                    return { ...prev, [set]: val }
                  })
                }}
                placeholder="RPE (1-10)"
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 text-center"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Save RPE
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.6: RIR/RPE Preference Toggle
**File**: `components/profile/rpe-rir-preference-toggle.tsx` (NEW)

In the Training tab of profile settings:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RpeRirDisplayMode } from '@/lib/types'

interface RpeRirPreferenceToggleProps {
  currentMode: RpeRirDisplayMode
  onSave: (mode: RpeRirDisplayMode) => Promise<void>
}

export function RpeRirPreferenceToggle({
  currentMode,
  onSave
}: RpeRirPreferenceToggleProps) {
  const [mode, setMode] = useState<RpeRirDisplayMode>(currentMode)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(mode)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Intensity Display</h3>

      <div className="space-y-3 mb-6">
        {(['rir', 'rpe', 'off'] as const).map((option) => (
          <label key={option} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="intensity-display"
              value={option}
              checked={mode === option}
              onChange={() => setMode(option)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              {option === 'rir' && 'Show RIR (Reps in Reserve)'}
              {option === 'rpe' && 'Show RPE (Rate of Perceived Exertion)'}
              {option === 'off' && 'Off'}
            </span>
          </label>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading || mode === currentMode}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        Save Preference
      </Button>
    </div>
  )
}
```

---

## Phase 5: Integration

### Step 5.1: Update WorkoutLogger
**File**: `components/workout-logger/workout-logger.tsx` (UPDATE)

Add these props/state:
- Load user's `rpeRirDisplayMode` preference
- Pass progression label props to calendar modal
- Pass exercise note/RPE data to exercise components

### Step 5.2: Update Calendar Modal
Add ProgressionLabel component to week header.

### Step 5.3: Update Exercise List
Add:
- ExerciseNotesBanner (if note exists)
- ExerciseCustomRpeBox next to exercise name
- Open dialogs on interaction

### Step 5.4: Update Profile Component
Add RpeRirPreferenceToggle to Training tab.

---

## Phase 6: Testing Checklist

After implementation, verify:

- [ ] RIR labels display for all block lengths (4-8 weeks)
- [ ] RPE labels display correctly (including decimals like 8.5)
- [ ] User can toggle display preference globally
- [ ] Exercise notes persist across sessions
- [ ] Pinned notes auto-appear in next week
- [ ] Notes disappear when exercise is replaced
- [ ] Custom RPE can be logged per set
- [ ] Custom RPE displays in correct color/style
- [ ] Notes banner appears and is clickable
- [ ] All dialogs open/close smoothly
- [ ] Data syncs to Supabase
- [ ] No data loss on program end
- [ ] UI responsive on mobile and desktop
- [ ] Offline persistence (localStorage) works

---

## Database Migration Checklist

Before deploying to production, ensure:

1. [ ] Run all migration files in correct order
2. [ ] Verify table structure in Supabase
3. [ ] Confirm indexes exist
4. [ ] Test unique constraints
5. [ ] Add RLS policies (separate PR)
6. [ ] Create API functions if using serverless

---

## Notes

- All services use localStorage first for speed, then sync to Supabase
- Default RIR/RPE patterns are hardcoded - no database lookup needed on cold start
- RPE dialog supports decimal input (1.0 to 10.0 with 0.5 increments recommended)
- Notes are truly optional - all features degrade gracefully if missing

---

## Troubleshooting

**Q: How do I set custom RPE for a specific exercise?**
A: Click the grey RPE box next to the exercise name, enter RPE for each set, save.

**Q: Will my notes carry over to the next program?**
A: No. Notes are per-instance. If you start the same program again, it's a new instance with no notes. However, pinned notes within a program will repeat each week.

**Q: What if a user doesn't set a preference?**
A: Default is 'rir' (show RIR labels). User can change anytime in profile.

**Q: Can custom RPE be fractional?**
A: Yes! RPE accepts 8.5, 9.5, etc. Block-level RPE also supports decimals.

