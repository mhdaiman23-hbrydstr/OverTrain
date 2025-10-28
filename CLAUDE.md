# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OverTrain: Go One More is a Next.js 14 fitness tracking application with Supabase authentication. It provides gender-specific workout programs, progress tracking, and analytics for gym workouts.

## Development Commands

```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Run ESLint
npm run test         # Run all tests with Vitest
npm run test -- --run # Run tests once (no watch mode)
```

Note: TypeScript and ESLint errors are ignored during builds (see next.config.mjs).

## Testing

**Test Structure**:
```
tests/
├── workout-logger.smoke.test.tsx        # Integration smoke test for workout logger
├── one-rm-context.test.tsx              # Unit tests for OneRmProvider
├── workout-logger-components.test.tsx   # Component unit tests
└── progression-router.registry.test.ts  # Progression router logic tests
```

**Test Coverage**:
- Workout logger component rendering and interactions
- OneRmProvider context with lookup logic
- Connection status banners
- Week access and progression note banners
- Progression strategy routing and registry

**Running Tests**:
- All tests: `npm run test -- --run`
- Specific file: `npm run test -- --run tests/one-rm-context.test.tsx`
- Watch mode: `npm run test` (interactive)

## Architecture

### Core Data Flow

1. **Authentication Flow**: `AuthContext` → `AuthService` → Supabase Auth → `profiles` table
2. **Program Management**: `ProgramStateManager` manages active programs in localStorage (`liftlog_active_program`)
3. **Workout Tracking**: `WorkoutLogger` manages in-progress workouts (`liftlog_in_progress_workouts`) and history (`liftlog_workouts`)
4. **Analytics**: `AnalyticsEngine` processes workout history for progress metrics

### State Management

- **Auth State**: React Context (`contexts/auth-context.tsx`) provides user authentication state
- **Program State**: Managed via `lib/program-state.ts` using localStorage with events (`programChanged` event)
- **Workout State**: In-progress workouts stored per week/day in localStorage, moved to history on completion

### Key Architecture Patterns

**Program-to-Workout Flow**:
1. User selects program from `GYM_TEMPLATES` (lib/gym-templates.ts)
2. `ProgramStateManager.setActiveProgram()` creates ActiveProgram with current week/day tracking
3. `ProgramStateManager.getCurrentWorkout()` converts template format to workout logger format
4. `WorkoutLogger.startWorkout()` creates WorkoutSession with pre-initialized sets
5. On completion: `WorkoutLogger.completeWorkout()` → `ProgramStateManager.completeWorkout()` advances week/day

**Workout State Lifecycle**:
- In-progress workouts are stored with week/day keys
- Multiple in-progress workouts can exist simultaneously (different week/day combinations)
- Completed workouts move from in-progress to history
- Progress recalculation finds first incomplete workout to set currentWeek/currentDay

**Data Transformations**:
- `GymTemplate` (gym-templates.ts) → WorkoutDay exercises → `WorkoutSession` (workout-logger.ts)
- Exercise format: `{ exerciseName, category, progressionTemplate }` → `{ exerciseId, exerciseName, targetSets, targetReps, targetRest, sets[] }`

### localStorage Keys

**Critical**: All program-related code must use `liftlog_active_program` (not `liftlog_program_state`):
- `liftlog_user` - Current authenticated user
- `liftlog_users` - Mock user database (legacy, being replaced by Supabase)
- `liftlog_active_program` - Active program state with week/day tracking
- `liftlog_in_progress_workouts` - Array of in-progress WorkoutSessions
- `liftlog_workouts` - Completed workout history
- `liftlog_program_progress` - Program progress data
- `liftlog_program_history` - Historical programs with completion rates

### Component Structure

**View Routing** (in app/page.tsx):
- `currentView` state controls which section renders: `dashboard | programs | workout | analytics | train | profile`
- Bottom navigation updates view on mobile
- Sidebar navigation on desktop (lg breakpoint)

**Auth-Gated Views**:
- No user → Landing page with sign-in/sign-up
- User without gender → IntakeForm (collects gender, experience, goals)
- User with gender → Main app views

**Workout Logger Refactored Architecture** (as of 2025-10-08):

The WorkoutLogger has been refactored into a modular component architecture:

```
components/workout-logger/
├── workout-logger.tsx              # Main orchestrator (wraps with OneRmProvider)
├── components/                     # UI components (extracted from monolith)
│   ├── WorkoutHeader.tsx          # Header with program info, calendar, menu
│   ├── ConnectionStatusBanner.tsx  # Network status indicator
│   ├── WeekAccessBanner.tsx       # Week blocking messages
│   ├── ProgressionNoteBanner.tsx  # Progression guidance display
│   ├── ExerciseGroups.tsx         # Exercise list renderer
│   ├── CompletionBar.tsx          # Workout completion actions
│   └── WorkoutDialogs.tsx         # All dialog components
├── hooks/                          # Business logic hooks
│   ├── use-workout-session.ts     # Core workout state & event handlers
│   ├── use-connection-status.ts   # Network status monitoring
│   └── use-one-rm-persistence.ts  # 1RM data persistence
├── contexts/                       # React contexts
│   └── one-rm-context.tsx         # OneRmProvider for 1RM data
└── types.ts                        # Shared TypeScript types
```

**Provider Pattern for 1RM Data**:
The `OneRmProvider` context manages one-rep-max values across the workout logger:
- Provides `getOneRepMax(exerciseId, fallbackName)` for lookups
- Auto-sorts by `dateTested` to always return most recent entry
- Persistence hook (`use-one-rm-persistence`) syncs with localStorage
- Consumed by progression engines for percentage-based calculations

**Progression Router Architecture**:
- `lib/progression-router.ts` contains `resolveProgressionStrategy()` helper
- Registry-based routing with template overrides and fallbacks
- Detailed telemetry logging for debugging progression decisions
- Progression engines can consume 1RM data via router payloads

### Database Schema (Supabase)

```sql
-- profiles table structure
{
  id: UUID (references auth.users),
  email: TEXT,
  name: TEXT,
  gender: TEXT,
  experience: TEXT,
  goals: TEXT[]
}
```

### Environment Setup

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Path Aliases

Uses `@/*` for root-level imports (configured in tsconfig.json):
```typescript
import { AuthService } from "@/lib/auth"
import { Button } from "@/components/ui/button"
```

## Important Implementation Notes

### Analytics Safety

Always check for division by zero in analytics calculations:
- `lib/analytics.ts` lines 168, 250 validate denominators before division
- Return 0 or "stable" when insufficient data exists

### Workout Data Integrity

- Always validate workout data has week/day before saving
- Check for corrupted data (missing sets array) before using existing workouts
- Sets must be pre-initialized when creating WorkoutSession, not added dynamically

### Program State Events

When program state changes, dispatch `programChanged` event:
```typescript
window.dispatchEvent(new Event("programChanged"))
```

Components can listen to refresh UI when programs change.
