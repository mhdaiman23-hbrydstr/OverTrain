# Hybrid Progression Strategy Documentation

## Overview

This document outlines the design strategy for implementing hybrid progression programs in LiftLog, where different exercises within the same program can use different progression methods (Linear vs OneRM/Percentage-based).

**Status**: Planning Phase (Not Implemented)

## Use Cases

### Primary Use Case: Powerlifting/Strength Programs

A typical powerlifting program might want:
- **Squat, Bench, Deadlift (SBD)**: Use OneRM percentage-based progression
- **Accessory exercises**: Use linear progression (simpler, less overhead)

### Example Program Structure

```
Program: "Intermediate Strength Builder" (4 weeks)

Day 1 - Lower Body
  - Barbell Back Squat (OneRM: 85%, 87.5%, 90%, 92.5%)
  - Romanian Deadlift (Linear: +2.5% weekly)
  - Leg Press (Linear: +2.5% weekly)
  - Leg Curls (Linear: +1.5% weekly)

Day 2 - Upper Body
  - Barbell Bench Press (OneRM: 80%, 82.5%, 85%, 87.5%)
  - Overhead Press (Linear: +2.5% weekly)
  - Barbell Row (Linear: +2.5% weekly)
  - Tricep Extensions (Linear: +1.5% weekly)

Day 3 - Deadlift Focus
  - Deadlift (OneRM: 80%, 85%, 90%, 95%)
  - Front Squat (Linear: +2.5% weekly)
  - Pull-ups (Linear: +2% weekly)
  - Face Pulls (Linear: +1.5% weekly)
```

## Database Schema Design

### Current State (Linear Progression Only)

```sql
-- Existing tables
linear_progression_tiers (
  id UUID PRIMARY KEY,
  tier_name TEXT,
  min_increment DECIMAL,
  weekly_increase DECIMAL,
  adjustment_bounds DECIMAL,
  max_rep_adjustment INTEGER
)

exercise_library (
  id UUID PRIMARY KEY,
  name TEXT,
  muscle_group TEXT,
  equipment_type TEXT,
  linear_progression_tier_id UUID REFERENCES linear_progression_tiers(id)
)
```

### Future State (Hybrid Support)

#### Option 1: Per-Template-Exercise Override (Recommended)

**Approach**: Add a `progression_override` JSONB field to the `program_template_exercises` table.

```sql
-- Future schema (not implemented)
program_template_exercises (
  id UUID PRIMARY KEY,
  template_day_id UUID,
  exercise_id UUID,
  exercise_order INTEGER,
  progression_config JSONB, -- Existing field
  progression_override JSONB, -- NEW: Override progression method
  rest_time_seconds INTEGER,
  category TEXT
)

-- Example progression_override values:

-- Use OneRM progression for this exercise
progression_override = {
  "type": "one_rm",
  "percentages": [85, 87.5, 90, 92.5], -- Per-week percentages
  "requiresOneRM": true
}

-- Use linear progression with custom rules
progression_override = {
  "type": "linear",
  "tier_id": "uuid-of-custom-tier" -- Optional: override exercise's default tier
}

-- No override (use template default)
progression_override = null
```

**Advantages**:
- Flexible: Each exercise in a template can have its own progression method
- Backward compatible: NULL means use template's default progression
- Easy to implement: Simple JSONB field with clear structure

#### Option 2: Add OneRM Tier to Exercise Library

**Approach**: Similar to `linear_progression_tier_id`, add `one_rm_progression_tier_id` to `exercise_library`.

```sql
-- Future schema (not implemented)
one_rm_progression_tiers (
  id UUID PRIMARY KEY,
  tier_name TEXT,
  start_percentage DECIMAL,
  end_percentage DECIMAL,
  deload_percentage DECIMAL,
  rep_scheme JSONB -- Maps percentage ranges to rep targets
)

exercise_library (
  id UUID PRIMARY KEY,
  name TEXT,
  muscle_group TEXT,
  equipment_type TEXT,
  linear_progression_tier_id UUID REFERENCES linear_progression_tiers(id),
  one_rm_progression_tier_id UUID REFERENCES one_rm_progression_tiers(id) -- NEW
)
```

**Advantages**:
- Symmetric design with linear tiers
- Exercises can have "default" OneRM progression rules

**Disadvantages**:
- Less flexible than per-template overrides
- Doesn't solve the "hybrid within one template" problem

## Progression Resolution Order

When calculating progression for an exercise in a hybrid program, the system should follow this resolution order:

```
1. Exercise-level override (program_template_exercises.progression_override)
   ├─ If type = "one_rm" → Use OneRM progression with specified rules
   ├─ If type = "linear" → Use linear progression (with optional tier override)
   └─ If null → Continue to step 2

2. Template-level config (program_templates.progression_type)
   ├─ If "hybrid" → Check hybrid rules (compound vs accessory)
   ├─ If "percentage" → Use OneRM progression for all exercises
   ├─ If "linear" → Use linear progression for all exercises
   └─ If null → Continue to step 3

3. Default fallback
   └─ Use linear progression with exercise's assigned tier
```

## Implementation Roadmap

### Phase 1: Linear Progression Tiers (✅ Complete)

- [x] Create `linear_progression_tiers` table
- [x] Add `linear_progression_tier_id` to `exercise_library`
- [x] Implement `LinearProgressionTierService`
- [x] Implement `ProgressionTierResolver` with fallback
- [x] Update `ProgressionRouter` to use database tiers

### Phase 2: OneRM Progression Foundation (Future)

- [ ] Create `one_rm_progression_tiers` table
- [ ] Add `one_rm_progression_tier_id` to `exercise_library`
- [ ] Implement `OneRmProgressionTierService`
- [ ] Update `PercentageProgressionEngine` to support tier-based rules
- [ ] Add 1RM calculation/estimation helpers

### Phase 3: Hybrid Program Support (Future)

- [ ] Add `progression_override` JSONB field to `program_template_exercises`
- [ ] Update `ProgramTemplateService` to parse override config
- [ ] Update `ProgressionRouter` to handle exercise-level overrides
- [ ] Add UI for setting progression overrides in template builder
- [ ] Add validation for hybrid configurations

### Phase 4: UI & User Experience (Future)

- [ ] Add progression method indicator in workout logger
- [ ] Show 1RM data input prompts for OneRM exercises
- [ ] Display percentage vs absolute weight in UI
- [ ] Add "switch progression method" option for custom programs

## Code Examples

### Example: Checking for Progression Override

```typescript
// In ProgressionRouter.calculateProgression()

// NEW: Check for exercise-level override first
if (exercise.progressionOverride) {
  if (exercise.progressionOverride.type === 'one_rm') {
    return await this.routeToOneRmEngine(input, exercise.progressionOverride.config)
  } else if (exercise.progressionOverride.type === 'linear') {
    const customTierId = exercise.progressionOverride.tier_id
    const tierRules = customTierId
      ? await linearProgressionTierService.getTierById(customTierId)
      : await ProgressionTierResolver.resolveTierRules(...)

    return await this.routeToLinearEngine(input, undefined, tierRules)
  }
}

// Fall back to template-level progression config
const progressionDecision = resolveProgressionStrategy(activeProgram.template)
// ... existing logic
```

### Example: Hybrid Program Configuration

```typescript
// Template metadata
{
  id: "intermediate-powerlifting-hybrid",
  name: "Intermediate Powerlifting (Hybrid)",
  progressionConfig: {
    type: "hybrid",
    compoundProgression: "percentage", // SBD use OneRM
    accessoryProgression: "linear",     // Everything else uses linear
    compoundExercises: ["squat", "bench press", "deadlift"]
  }
}

// Exercise-specific override (for exceptions)
{
  exercise_id: "uuid-of-front-squat",
  progression_override: {
    type: "one_rm", // Front squat should also use OneRM
    percentages: [70, 75, 80, 85]
  }
}
```

## Testing Strategy

### Unit Tests

- [ ] Test progression override resolution order
- [ ] Test OneRM tier lookup and fallback
- [ ] Test hybrid rules with various exercise combinations

### Integration Tests

- [ ] Test full workout flow with hybrid program
- [ ] Test switching between progression methods mid-program
- [ ] Test progression calculation with missing 1RM data

## Migration Strategy

When implementing hybrid support, ensure:

1. **Zero Breaking Changes**: Existing programs continue to work
2. **Graceful Degradation**: Missing 1RM data falls back to linear
3. **Clear Indicators**: UI shows which progression method is active
4. **Easy Rollback**: Can disable hybrid features without data loss

## Security & Validation

- Validate progression_override JSON schema before saving
- Ensure percentages are within safe ranges (50% - 100%)
- Require 1RM data before allowing OneRM progression
- Add warnings for advanced users about 1RM testing safety

## Related Documentation

- [Progression Tiers (lib/progression-tiers.ts)](../lib/progression-tiers.ts)
- [Progression Router (lib/progression-router.ts)](../lib/progression-router.ts)
- [Linear Progression Engine (lib/progression-engines/linear-engine.ts)](../lib/progression-engines/linear-engine.ts)
- [Percentage Progression Engine (lib/progression-engines/percentage-engine.ts)](../lib/progression-engines/percentage-engine.ts)

---

**Last Updated**: 2025-10-14
**Status**: Planning Document (Not Implemented)
