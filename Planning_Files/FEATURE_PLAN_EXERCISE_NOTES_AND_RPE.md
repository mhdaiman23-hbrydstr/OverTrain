# Feature Plan: Exercise Notes, Custom RPE, and RIR/RPE Progression Labels

## Overview
This feature adds four major improvements to the workout logger:
1. RIR/RPE progression labels on the calendar modal based on program block length
2. User preference toggle for RIR vs RPE display
3. Sticky exercise notes with pinning for week-to-week carryover
4. Per-set custom RPE logging independent of block-level progression

---

## 1. RIR/RPE PROGRESSION PATTERNS

### Pattern Definition
Different block lengths (4-8 weeks) follow a periodized progression pyramid, ending with deload (RIR 8 / RPE 2).

Both RIR and RPE are stored separately (RPE supports decimal values like 8.5, 9.5):

```
4 Weeks:
  W1: RIR 2  → RPE 8
  W2: RIR 1  → RPE 9
  W3: RIR 0  → RPE 10
  W4: RIR 8  → RPE 2 (Deload)

5 Weeks:
  W1: RIR 3  → RPE 7
  W2: RIR 1  → RPE 9
  W3: RIR 1  → RPE 9
  W4: RIR 0  → RPE 10
  W5: RIR 8  → RPE 2 (Deload)

6 Weeks:
  W1: RIR 3  → RPE 7
  W2: RIR 3  → RPE 7
  W3: RIR 2  → RPE 8
  W4: RIR 1  → RPE 9
  W5: RIR 0  → RPE 10
  W6: RIR 8  → RPE 2 (Deload)

7 Weeks:
  W1: RIR 3  → RPE 7
  W2: RIR 3  → RPE 7
  W3: RIR 2  → RPE 8
  W4: RIR 2  → RPE 8
  W5: RIR 1  → RPE 9
  W6: RIR 0  → RPE 10
  W7: RIR 8  → RPE 2 (Deload)

8 Weeks:
  W1: RIR 3  → RPE 7
  W2: RIR 3  → RPE 7
  W3: RIR 2  → RPE 8
  W4: RIR 2  → RPE 8
  W5: RIR 1  → RPE 9
  W6: RIR 1  → RPE 9
  W7: RIR 0  → RPE 10
  W8: RIR 8  → RPE 2 (Deload)
```

### Storage Approach
Store both RIR and RPE values (independently) in `program_progression_config` table and `GymTemplate` interface. RPE can be decimal (8.5, 9.5, etc.) for fine-grained effort tracking. User preference determines which label displays on the calendar modal.

---

## 2. DATABASE SCHEMA CHANGES

### New Tables

#### `program_progression_config`
Stores RIR/RPE progression patterns for program blocks. Both RIR and RPE are stored independently (RPE supports decimals).

```sql
CREATE TABLE program_progression_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  block_length INTEGER NOT NULL CHECK (block_length IN (4, 5, 6, 7, 8)),
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  rir_value INTEGER NOT NULL CHECK (rir_value >= 0 AND rir_value <= 8),
  rpe_value DECIMAL(3,1) NOT NULL CHECK (rpe_value >= 2 AND rpe_value <= 10),
  UNIQUE(program_template_id, block_length, week_number),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prog_config_template ON program_progression_config(program_template_id);
```

#### `exercise_notes`
Stores exercise-specific notes with pinning for week-to-week carryover.

```sql
CREATE TABLE exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_instance_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_user_program ON exercise_notes(user_id, program_instance_id);
CREATE INDEX idx_notes_exercise_week ON exercise_notes(exercise_id, week);
```

#### `exercise_custom_rpe`
Stores per-set RPE recordings independent of block-level progression. Supports decimal RPE values (8.5, 9.5, etc.).

```sql
CREATE TABLE exercise_custom_rpe (
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

CREATE INDEX idx_custom_rpe_user_program ON exercise_custom_rpe(user_id, program_instance_id);
CREATE INDEX idx_custom_rpe_exercise_week ON exercise_custom_rpe(exercise_id, week);
```

### Profile Table Updates

Add user preference for RIR/RPE display:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  rpe_rir_display_mode TEXT DEFAULT 'rir' CHECK (rpe_rir_display_mode IN ('rir', 'rpe', 'off'));
```

### Update `program_templates` Table

Add RIR/RPE progression pattern reference:

```sql
ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS
  progression_pattern_config JSONB DEFAULT NULL;
```

This can store the block-length to RIR mapping inline if preferred over separate table.

---

## 3. TYPESCRIPT TYPE DEFINITIONS

### New Interfaces

```typescript
// In lib/types.ts or new file lib/types/progression.ts

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

export interface UserRpeRirPreference {
  displayMode: 'rir' | 'rpe' | 'off'
}

// Updated WorkoutExercise interface
export interface WorkoutExercise {
  // ... existing fields ...
  notes?: ExerciseNote
  customRpePerSet?: {
    [setNumber: number]: number // set 1 → RPE 9, set 2 → RPE 8, etc.
  }
  blockLevelRir?: number  // From program progression
  blockLevelRpe?: number  // Calculated from RIR
}

// Updated GymTemplate interface
export interface GymTemplate {
  // ... existing fields ...
  rirRpeProgression?: RirRpeProgression
}
```

---

## 3.5 DEFAULT PROGRESSION PATTERNS (Hardcoded)

The `ProgressionConfigService` will have these patterns built-in as fallback when no database config exists:

```typescript
// Default 4-week pattern
{
  blockLength: 4,
  weeks: [
    { week: 1, rir: 2, rpe: 8 },
    { week: 2, rir: 1, rpe: 9 },
    { week: 3, rir: 0, rpe: 10 },
    { week: 4, rir: 8, rpe: 2 }
  ]
}

// Default 5-week pattern
{
  blockLength: 5,
  weeks: [
    { week: 1, rir: 3, rpe: 7 },
    { week: 2, rir: 1, rpe: 9 },
    { week: 3, rir: 1, rpe: 9 },
    { week: 4, rir: 0, rpe: 10 },
    { week: 5, rir: 8, rpe: 2 }
  ]
}

// Default 6-week pattern
{
  blockLength: 6,
  weeks: [
    { week: 1, rir: 3, rpe: 7 },
    { week: 2, rir: 3, rpe: 7 },
    { week: 3, rir: 2, rpe: 8 },
    { week: 4, rir: 1, rpe: 9 },
    { week: 5, rir: 0, rpe: 10 },
    { week: 6, rir: 8, rpe: 2 }
  ]
}

// Default 7-week pattern
{
  blockLength: 7,
  weeks: [
    { week: 1, rir: 3, rpe: 7 },
    { week: 2, rir: 3, rpe: 7 },
    { week: 3, rir: 2, rpe: 8 },
    { week: 4, rir: 2, rpe: 8 },
    { week: 5, rir: 1, rpe: 9 },
    { week: 6, rir: 0, rpe: 10 },
    { week: 7, rir: 8, rpe: 2 }
  ]
}

// Default 8-week pattern
{
  blockLength: 8,
  weeks: [
    { week: 1, rir: 3, rpe: 7 },
    { week: 2, rir: 3, rpe: 7 },
    { week: 3, rir: 2, rpe: 8 },
    { week: 4, rir: 2, rpe: 8 },
    { week: 5, rir: 1, rpe: 9 },
    { week: 6, rir: 1, rpe: 9 },
    { week: 7, rir: 0, rpe: 10 },
    { week: 8, rir: 8, rpe: 2 }
  ]
}
```

These patterns are applied to all programs unless explicitly overridden via database.

---

## 4. IMPLEMENTATION MODULES

### Module 1: Progression Config Service
**File**: `lib/services/progression-config-service.ts`

Handles RIR/RPE progression pattern management. Both RIR and RPE are stored and retrieved independently.

```typescript
export class ProgressionConfigService {
  // Get RIR value for a given week and block length
  static getRirForWeek(blockLength: number, weekNumber: number): number | null

  // Get RPE value for a given week and block length (supports decimals)
  static getRpeForWeek(blockLength: number, weekNumber: number): number | null

  // Get both RIR and RPE for a week
  static getProgressionForWeek(blockLength: number, weekNumber: number): ProgressionWeekConfig | null

  // Get entire progression pattern for a block length
  static getProgressionPattern(blockLength: number): RirRpeProgression

  // Sync patterns to database for a template
  static syncProgressionPattern(templateId: string, blockLength: number, pattern: ProgressionWeekConfig[]): Promise<void>

  // Load patterns from database for a template and block length
  static loadProgressionPattern(templateId: string, blockLength: number): Promise<RirRpeProgression | null>

  // Load default patterns (hardcoded 4-8 week templates)
  static getDefaultProgressionPattern(blockLength: number): RirRpeProgression
}
```

### Module 2: Exercise Notes Service
**File**: `lib/services/exercise-notes-service.ts`

Manages exercise notes with pinning and persistence.

```typescript
export class ExerciseNotesService {
  // Create or update note
  static async saveNote(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number,
    noteText: string,
    isPinned: boolean
  ): Promise<ExerciseNote>

  // Get note for exercise in specific week
  static async getNote(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number
  ): Promise<ExerciseNote | null>

  // Get pinned note and apply to next week
  static async getPinnedNoteForWeek(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    currentWeek: number
  ): Promise<ExerciseNote | null>

  // Delete note
  static async deleteNote(noteId: string): Promise<void>

  // Batch fetch notes for all exercises in a week
  static async getNotesForWeek(
    userId: string,
    programInstanceId: string,
    week: number
  ): Promise<ExerciseNote[]>
}
```

### Module 3: Custom RPE Service
**File**: `lib/services/custom-rpe-service.ts`

Manages per-set RPE logging.

```typescript
export class CustomRpeService {
  // Save custom RPE for a specific set
  static async saveCustomRpe(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number,
    setNumber: number,
    rpeValue: number
  ): Promise<ExerciseCustomRpe>

  // Get custom RPE for a set
  static async getCustomRpe(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number,
    setNumber: number
  ): Promise<ExerciseCustomRpe | null>

  // Get all custom RPEs for an exercise in a week
  static async getExerciseRpesForWeek(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number
  ): Promise<ExerciseCustomRpe[]>

  // Delete custom RPE
  static async deleteCustomRpe(customRpeId: string): Promise<void>
}
```

### Module 4: User Preference Service
**File**: `lib/services/user-preference-service.ts`

Manages RIR/RPE display preference.

```typescript
export class UserPreferenceService {
  // Get user's RIR/RPE display preference
  static async getRpeRirDisplayMode(userId: string): Promise<'rir' | 'rpe' | 'off'>

  // Update preference
  static async setRpeRirDisplayMode(userId: string, mode: 'rir' | 'rpe' | 'off'): Promise<void>
}
```

### Module 5: Progression Label Helper
**File**: `lib/utils/progression-label.ts`

Utility functions for generating labels based on block length, week, and display preference.

```typescript
export function getProgressionLabel(
  blockLength: number,
  weekNumber: number,
  displayMode: 'rir' | 'rpe' | 'off'
): string {
  // Returns: "RIR 3", "RPE 7", "RPE 8.5", or empty string
  // Queries ProgressionConfigService for both values, displays based on mode
}

export function getProgressionLabelWithValues(
  blockLength: number,
  weekNumber: number,
  displayMode: 'rir' | 'rpe' | 'off'
): { label: string; rir: number | null; rpe: number | null } {
  // Returns object with label string and both raw values for flexible UI rendering
}

export function formatRpeValue(rpe: number): string {
  // Format RPE for display: "8", "8.5", "9", etc.
  return rpe % 1 === 0 ? rpe.toString() : rpe.toFixed(1)
}
```

---

## 5. UI COMPONENTS

### Component 1: RIR/RPE Label (Calendar Modal)
**File**: `components/workout-logger/components/progression-label.tsx`

Displays in the calendar modal week header. Shows RIR or RPE based on user preference (or off).

```typescript
interface ProgressionLabelProps {
  blockLength: number
  weekNumber: number
  displayMode: 'rir' | 'rpe' | 'off'
}

export function ProgressionLabel({ blockLength, weekNumber, displayMode }: ProgressionLabelProps) {
  // Queries ProgressionConfigService for RIR and RPE values
  // Renders label based on displayMode:
  //   'rir': "Week 1 · RIR 3"
  //   'rpe': "Week 1 · RPE 7.5"
  //   'off': "Week 1"
}
```

### Component 2: Exercise Notes Banner
**File**: `components/workout-logger/components/exercise-notes-banner.tsx`

Displays above exercise name when notes exist.

```typescript
interface ExerciseNotesBannerProps {
  exerciseId: string
  noteText: string
  isPinned: boolean
  onEdit: () => void
}

export function ExerciseNotesBanner({ noteText, isPinned, onEdit }: ExerciseNotesBannerProps) {
  // Yellow banner with note preview
  // Click to open edit dialog
}
```

### Component 3: Exercise Notes Dialog
**File**: `components/workout-logger/components/exercise-notes-dialog.tsx`

Modal for editing exercise notes with pin toggle.

```typescript
interface ExerciseNotesDialogProps {
  exerciseId: string
  week: number
  initialNote?: ExerciseNote
  onSave: (noteText: string, isPinned: boolean) => Promise<void>
  onDelete?: () => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export function ExerciseNotesDialog({ ... }: ExerciseNotesDialogProps) {
  // Textarea for notes
  // Checkbox for "Pin this note to repeat each week"
  // Save/Delete/Cancel buttons
}
```

### Component 4: Custom RPE Box
**File**: `components/workout-logger/components/exercise-custom-rpe-box.tsx`

Small box next to exercise name for recording custom RPE.

```typescript
interface ExerciseCustomRpeBoxProps {
  exerciseId: string
  week: number
  exerciseName: string
  targetSets: number
  hasCustomRpe: boolean
  onOpen: () => void
}

export function ExerciseCustomRpeBox({ ... }: ExerciseCustomRpeBoxProps) {
  // Grey box by default
  // Shows RPE status when filled
  // Click to open RPE dialog
}
```

### Component 5: Custom RPE Dialog
**File**: `components/workout-logger/components/custom-rpe-dialog.tsx`

Modal for logging per-set RPE values. Supports decimal values (8.5, 9.5, etc.).

```typescript
interface CustomRpeDialogProps {
  exerciseId: string
  exerciseName: string
  week: number
  targetSets: number
  displayMode: 'rir' | 'rpe'
  initialRpes?: { [setNumber: number]: number }
  onSave: (rpesBySet: { [setNumber: number]: number }) => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export function CustomRpeDialog({ ... }: CustomRpeDialogProps) {
  // For each set: Input field or slider for RPE value (1-10)
  // Supports decimal input (8.5, 9.5, etc.)
  // Optional: Show block-level RPE/RIR for reference
  // Save button
  // Cancel button
}
```

### Component 6: RIR/RPE Preference Toggle (Profile)
**File**: `components/profile/rpe-rir-preference-toggle.tsx`

In Training tab under profile settings.

```typescript
interface RpeRirPreferenceToggleProps {
  currentMode: 'rir' | 'rpe' | 'off'
  onSave: (mode: 'rir' | 'rpe' | 'off') => Promise<void>
}

export function RpeRirPreferenceToggle({ ... }: RpeRirPreferenceToggleProps) {
  // Radio buttons: "Show RIR", "Show RPE", "Off"
  // Save button
}
```

---

## 6. LOCALSTORAGE STRUCTURE

Extend workout session storage to include notes and custom RPE:

```typescript
interface WorkoutSession {
  // ... existing fields ...

  exercises: WorkoutExercise[]
}

interface WorkoutExercise {
  // ... existing fields ...

  // Exercise notes for this week
  notes?: {
    id: string
    noteText: string
    isPinned: boolean
    createdAt: number
  }

  // Custom RPE per set (setNumber -> RPE value)
  customRpeBySet?: {
    [setNumber: string]: number
  }
}

// localStorage key: liftlog_in_progress_workouts_{userId}
// All notes and custom RPE values sync to database
```

---

## 7. DATA FLOW DIAGRAMS

### RIR/RPE Label Flow
```
User Opens Calendar Modal
  ↓
WorkoutLogger reads activeProgram.template.totalWeeks (block length)
  ↓
ProgressionLabel component mounts with blockLength and weekNumber
  ↓
ProgressionLabel queries:
  - ProgressionConfigService.getRirForWeek(blockLength, weekNumber)
  - ProgressionConfigService.getRpeForWeek(blockLength, weekNumber)
  ↓
UserPreferenceService.getRpeRirDisplayMode() gets display preference
  ↓
ProgressionLabel renders based on displayMode:
  - 'rir': "Week 3 · RIR 2"
  - 'rpe': "Week 3 · RPE 8" or "Week 3 · RPE 8.5"
  - 'off': "Week 3"
```

### Exercise Notes Flow
```
User Clicks on Exercise
  ↓
ExerciseCustomRpeBox or ExerciseNotesBanner renders
  ↓
(If notes exist) ExerciseNotesBanner shows with "Click to edit"
  ↓
User clicks banner → ExerciseNotesDialog opens
  ↓
User edits text and toggles pin → onSave()
  ↓
ExerciseNotesService.saveNote() saves to database
  ↓
localStorage updated with notes
  ↓
ExerciseNotesBanner re-renders

When advancing to next week:
  ↓
ExerciseNotesService.getPinnedNoteForWeek() checks for pinned notes
  ↓
If pinned, auto-create note for week N+1
```

### Custom RPE Flow
```
User Clicks on ExerciseCustomRpeBox
  ↓
CustomRpeDialog opens with set count
  ↓
User enters RPE for each set (or subset)
  ↓
onSave() called with RPE values by set
  ↓
CustomRpeService.saveCustomRpe() saves each set's RPE
  ↓
localStorage updated
  ↓
ExerciseCustomRpeBox shows active state
```

### Profile Preference Flow
```
User goes to Profile → Training Tab
  ↓
RpeRirPreferenceToggle renders current mode
  ↓
User selects "Show RPE" or "Show RIR"
  ↓
UserPreferenceService.setRpeRirDisplayMode() saves to database
  ↓
profiles table updated
  ↓
All ProgressionLabel components re-render globally
```

---

## 8. MIGRATION STRATEGY

### Phase 1: Database Setup
1. Create new tables (program_progression_config, exercise_notes, exercise_custom_rpe)
2. Add column to profiles (rpe_rir_display_mode)
3. Populate progression patterns for existing templates
4. Run RLS policies for new tables

### Phase 2: Backend Services
1. Implement ProgressionConfigService
2. Implement ExerciseNotesService
3. Implement CustomRpeService
4. Implement UserPreferenceService
5. Create API routes if using serverless functions

### Phase 3: UI Components
1. Implement progression label component
2. Implement exercise notes banner and dialog
3. Implement custom RPE box and dialog
4. Implement profile preference toggle

### Phase 4: Integration
1. Update WorkoutLogger to include new components
2. Update calendar modal with progression labels
3. Update exercise list UI with notes banner + RPE box
4. Update profile/training tab with preference toggle

### Phase 5: Testing & Polish
1. Unit tests for services
2. Integration tests for workflows
3. UI polish and styling
4. Performance optimization

---

## 9. STYLING NOTES

### Color Scheme (Match App Theme)

**Exercise Notes Banner**:
- Background: `bg-yellow-600/20` (semi-transparent yellow)
- Border: `border-l-4 border-yellow-500`
- Text: `text-yellow-100`
- Padding: `px-3 py-2`
- Font: Small, semi-bold

**Custom RPE Box**:
- Default (empty): `bg-gray-700 hover:bg-gray-600`
- Filled (has RPE): `bg-blue-600 hover:bg-blue-500`
- Border: `rounded-md border border-gray-600`
- Size: `w-12 h-8` (small, inline with exercise name)
- Text: Centered, monospace font for RPE number

**Progression Label**:
- Font: `text-xs font-mono text-gray-400`
- Display next to week number: `Week 1 · RIR 3`
- Optional: Color-coded by intensity (green low, red high)

**Dialogs**:
- Use existing modal styling from app
- Textarea with proper contrast
- Checkbox with label for pinning
- Standard button styling

---

## 10. TESTING CHECKLIST

- [ ] RIR/RPE labels display correctly for all block lengths
- [ ] User can toggle between RIR/RPE display globally
- [ ] Exercise notes persist across sessions
- [ ] Pinned notes appear in next week automatically
- [ ] Unpinned notes don't carry over
- [ ] Notes disappear when exercise is replaced
- [ ] Custom RPE can be logged per set
- [ ] Custom RPE displays with correct styling
- [ ] Notes banner appears when notes exist
- [ ] Clicking banner opens edit dialog
- [ ] Offline persistence (localStorage) works
- [ ] Data syncs to Supabase correctly
- [ ] No data loss on program end
- [ ] UI responsive on mobile and desktop

---

## 11. TECHNICAL CONSIDERATIONS

### Performance
- Batch load notes and RPE for entire week to reduce queries
- Cache progression patterns in memory
- Lazy load dialogs (don't render until opened)

### Data Integrity
- Validate RIR values before saving (0-8 range, or custom range)
- Validate RPE values (1-10 range)
- Ensure notes are deleted with exercise replacement
- Cascade delete notes/RPE when program instance is deleted

### Accessibility
- Proper ARIA labels on dialogs and buttons
- Keyboard navigation for RPE input
- Clear visual feedback on form submission

### Backwards Compatibility
- Don't require RIR/RPE progression (display "off" by default until user sets preference)
- Handle programs without progression patterns gracefully
- localStorage migration for existing workout sessions

---

## 12. ROLLOUT PLAN

1. **Internal Testing**: Test with dev users for 1 week
2. **Beta Release**: Release to willing beta users with opt-in
3. **Full Release**: Release to all users with feature toggle
4. **Documentation**: Update user guide with feature explanation
5. **Support**: Monitor for issues and user feedback

---

## Summary

This feature adds professional-grade training data capture to LiftLog, enabling users to:
- Track periodized training intensity with standardized RIR/RPE labels
- Pin important coaching notes for consistency
- Log actual RPE to capture effort levels beyond prescribed intensity
- Personalize their intensity display preference

Total estimated effort: **40-60 engineering hours** (including all components, testing, and polish)
