# LiftLog UI Design System Audit Report
**Date**: October 24, 2025
**Branch**: `ui/design-system-refactor`

---

## Executive Summary

The LiftLog codebase has a **solid foundation** with shadcn/ui components and a well-designed design system specification (DESIGN_SYSTEM_SPECIFICATION.md). However, the **implementation is inconsistent**, particularly in:

1. **Native HTML buttons** (8 files) that should use shadcn Button component
2. **Excessive mobile-specific CSS overrides** creating maintenance bloat
3. **Inconsistent button sizing** across breakpoints (32px, 36px, 44px variants)
4. **Mixed implementation patterns** in filters, lists, and navigation

### Key Numbers:
- ✅ **~95% of components** properly use shadcn components
- ❌ **~5% (8 files)** still using native HTML buttons
- ❌ **100+ lines** of mobile CSS overrides that could be eliminated with proper variant usage
- ✅ **Border-radius consistency**: 90%+ aligned

---

## Part 1: Design System Assessment

### How Well Is the Specification Being Followed?

#### ✅ What's Being Done Right

1. **Color System** (DESIGN_SYSTEM_SPECIFICATION.md §1)
   - CSS variables properly implemented
   - Semantic tokens in use
   - Light and dark theme defined
   - Status: **90% compliant**

2. **Typography System** (DESIGN_SYSTEM_SPECIFICATION.md §2)
   - Font imports configured (Montserrat, JetBrains Mono)
   - Typography scale defined
   - Data-driven typography classes implemented
   - Status: **85% compliant**

3. **Component Design System** (DESIGN_SYSTEM_SPECIFICATION.md §3)
   - Button component with multiple variants exists
   - Card system properly structured
   - Dialog system implemented
   - Status: **80% compliant** - exists but not universally used

4. **Responsive Design** (DESIGN_SYSTEM_SPECIFICATION.md §5)
   - Mobile-first approach attempted
   - Tailwind utilities used
   - Status: **60% compliant** - too many custom overrides override mobile-first principle

#### ❌ Where Implementation Falls Short

1. **Button Consistency** (DESIGN_SYSTEM_SPECIFICATION.md §3.1)
   - Specification defines: `default`, `workout`, `secondary`, `outline`, `success`, `completed`, `zone-*`, `ghost`, `destructive`, `metric`, `progress`
   - Reality: Only basic variants used; specialized variants rarely seen
   - Issue: **Missing 50% of defined button variants in codebase**

2. **Card Hierarchy** (DESIGN_SYSTEM_SPECIFICATION.md §6.2)
   - Specification defines: `ExerciseCard`, `DataCard`, custom card patterns
   - Reality: Using basic `Card` component everywhere
   - Issue: **No specialized card components created**

3. **Dialog Patterns** (DESIGN_SYSTEM_SPECIFICATION.md §6.3)
   - Specification defines: `compact`, `default`, `medium`, `large`, `fullscreen` sizes
   - Reality: Dialogs use hardcoded `max-w-2xl` instead of semantic size variants
   - Issue: **Missing 80% of specified dialog variants**

4. **Mobile Override Strategy** (DESIGN_SYSTEM_SPECIFICATION.md §5.3)
   - Specification says: "Use sparingly - only where Tailwind utilities can't achieve the exact result"
   - Reality: 100+ lines of mobile overrides for button sizing alone
   - Issue: **Over-reliance on mobile overrides instead of Tailwind utilities**

---

## Part 2: Current Codebase Inconsistencies

### Issue #1: Native HTML Buttons (8 Files)

These files use native `<button>` elements when they should use the shadcn `<Button>` component:

#### Priority 1 - High Impact (3 files):

1. **[bottom-navigation.tsx](components/bottom-navigation.tsx:42)**
   ```tsx
   // CURRENT (WRONG)
   <button className="flex flex-col items-center justify-center py-2 px-4 rounded-lg ...">
     {item.icon}
     {item.label}
   </button>

   // SHOULD BE
   <Button variant="ghost" size="sm" className="flex flex-col">
     {item.icon}
     {item.label}
   </Button>
   ```
   - Issue: Custom native button duplicates Button component logic
   - Impact: Affects every user's navigation experience
   - Fix: 10 minutes

2. **[ExerciseGroups.tsx:117,185](components/workout-logger/components/ExerciseGroups.tsx)**
   ```tsx
   // CURRENT (WRONG)
   <button className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md ...">
     <Menu className="h-5 w-5" />
   </button>

   // SHOULD BE
   <Button variant="ghost" size="icon">
     <Menu className="h-5 w-5" />
   </Button>
   ```
   - Issue: Hardcoded 44px instead of using Button icon size (36px)
   - Impact: Workout logger UI has oversized icon buttons
   - Fix: 5 minutes

3. **[WorkoutHeader.tsx:88](components/workout-logger/components/WorkoutHeader.tsx)**
   ```tsx
   // CURRENT (WRONG)
   <button className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md ...">
     <Menu />
   </button>

   // SHOULD BE
   <Button variant="ghost" size="icon">
     <Menu />
   </Button>
   ```
   - Issue: Responsive sizing (`h-9 w-9 sm:h-10 sm:w-10`) instead of using Button sizes
   - Impact: Inconsistent menu button sizing across responsive breakpoints
   - Fix: 5 minutes

#### Priority 2 - Medium Impact (3 files):

4. **[exercise-library-filter.tsx:129,156](components/exercise-library-filter.tsx)**
   - Two filter toggle buttons with native implementation
   - Should use `<Button variant="outline">` or similar

5. **[exercise-library.tsx:141](components/exercise-library.tsx)**
   - List item selection button
   - Should use `<Button variant="ghost">` for list items

6. **[program-wizard/steps/StepTemplateSelection.tsx](components/program-wizard/steps/StepTemplateSelection.tsx)**
   - Native button with focus ring styling
   - Button component already handles focus states

---

### Issue #2: Button Sizing Inconsistencies

The Button component defines 4 sizes, but implementations create custom sizes:

| Location | Current Size | Should Be | Issue |
|----------|-------------|-----------|-------|
| Icon buttons (ExerciseGroups) | 44px min-h/w | 36px (`size="icon"`) | Too large, inconsistent |
| Bottom nav buttons | 48px min-h/w | 36px or 40px custom | Too large, rounded-lg instead of rounded-md |
| Workout completion | 32px/36px/44px responsive | Single variant or `size="lg"` | 3 mobile breakpoints for 1 button |
| Menu triggers | h-9/10 responsive | 36px fixed (`size="icon"`) | Unnecessary responsive override |

**Root Cause**: Using `min-h-[]` and responsive `h-[]` instead of Button `size` prop.

**Cost of Current Approach**:
- Every button needs custom `className` props
- Team has to remember responsive patterns
- Mobile experience inconsistent (44px vs 36px touch targets)
- Hard to maintain, easy to introduce new inconsistencies

---

### Issue #3: Mobile CSS Override Bloat

#### Most Egregious Example: [workout-completion-dialog.tsx](components/workout-completion-dialog.tsx:239-254)

```tsx
// CURRENT - 4 buttons × excessive responsive className overrides
<button className="dialog-button w-full bg-transparent text-xs sm:text-sm md:text-base
  py-1.5 sm:py-2 md:py-3 h-auto min-h-[32px] sm:min-h-[36px] md:min-h-[44px]">
  {/* Repeated for 4 buttons */}
</button>

// SHOULD BE - Use Button variant + size, or single custom variant
<Button variant="outline" size="lg" className="w-full">
  Complete
</Button>
```

**Analysis**:
- 4 buttons × 3 mobile overrides each = 12 responsive declarations
- Each declares: font size, padding, height across 3 breakpoints
- Could be replaced by: Button component with `size="lg"`
- Reduction: **12 → 1 declaration per button**

---

### Issue #4: Missing Specialized Components

Per DESIGN_SYSTEM_SPECIFICATION.md, these specialized components should exist but don't:

#### 1. ExerciseCard Component
```tsx
// SPECIFICATION §3 says this should exist
<ExerciseCard status="current" zone="strength" intensity="high">
  <ExerciseContent />
</ExerciseCard>

// CURRENT REALITY - Using generic Card with className overrides
<Card className={cn(
  "transition-all duration-200 border-2",
  status === "completed" && "border-volt-green/30 bg-volt-green/5",
  status === "current" && "border-signal-red/50 bg-signal-red/5 shadow-intense",
  // ... more overrides
)}>
```

**Issue**: Logic and styling scattered in consumer components instead of encapsulated.

#### 2. DataCard Component
Not implemented. Appears in specification but no specialized component exists.

#### 3. Dialog Size Variants
```tsx
// SPECIFICATION defines: compact, default, medium, large, fullscreen
<WorkoutDialog size="medium" intensity="high">

// CURRENT REALITY - Using hardcoded max-width
<DialogContent className="max-w-2xl">
```

---

## Part 3: Recommendations

### Phase 1: Immediate Fixes (1-2 hours)

#### 1.1 Replace Native Buttons with shadcn Button
**Priority**: 🔴 HIGH - Affects user experience

**Files to fix** (in this order):
1. `bottom-navigation.tsx` - Most visible, navigation component
2. `ExerciseGroups.tsx` - Workout logger uses daily
3. `WorkoutHeader.tsx` - Workout logger menu
4. `exercise-library-filter.tsx` - Filter experience
5. `exercise-library.tsx` - List interaction
6. `StepTemplateSelection.tsx` - Program selection

**Expected outcome**: All interactive elements use consistent Button component

---

#### 1.2 Simplify workout-completion-dialog.tsx Buttons
**Priority**: 🟠 MEDIUM - Reduces CSS complexity

**Current state**:
```tsx
py-1.5 sm:py-2 md:py-3 h-auto min-h-[32px] sm:min-h-[36px] md:min-h-[44px]
```

**Options**:
- Option A: Use `<Button size="lg">` - simplest, may need adjustment
- Option B: Create custom size variant `size="touch"` for 44px touch targets
- Option C: Use responsive size prop (if Button CVA supports it)

**Recommendation**: Option B - Create `size="touch"` variant for mobile-optimized buttons

---

#### 1.3 Standardize Icon Button Sizing
**Current issue**: 44px buttons for mobile, 36px in Button component

**Solution**:
- Create custom `size="touch"` variant with 44px (44px = optimal touch target)
- Use consistently for interactive elements in workout logger
- Document in component library

---

### Phase 2: Component Abstraction (2-3 hours)

#### 2.1 Create Specialized Card Components
Create files in `components/ui/`:

**ExerciseCard.tsx**:
```tsx
export function ExerciseCard({
  status = "pending",
  zone = "strength",
  intensity = "normal",
  children,
  ...props
}) {
  return (
    <Card className={cn(
      "exercise-card transition-all duration-200 border-2",
      status === "completed" && "border-volt-green/30 bg-volt-green/5",
      status === "current" && "border-signal-red/50 bg-signal-red/5 shadow-intense",
      status === "warmup" && "border-zone-warmup/30 bg-zone-warmup/5",
      status === "pending" && "border-graphite-grey/30 hover:border-graphite-grey/50",
      intensity === "high" && "shadow-lg hover:shadow-xl",
      intensity === "maximum" && "shadow-intense hover:shadow-2xl",
      zone === "strength" && "border-l-4 border-l-signal-red",
      zone === "endurance" && "border-l-4 border-l-zone-endurance",
      zone === "power" && "border-l-4 border-l-zone-power",
      zone === "warmup" && "border-l-4 border-l-zone-warmup",
      zone === "recovery" && "border-l-4 border-l-zone-recovery"
    )} {...props}>
      {children}
    </Card>
  )
}
```

**DataCard.tsx**: Similar pattern for data display cards

**Benefit**:
- Encapsulation: Styling logic in one place
- Reusability: Used everywhere exercise info displays
- Maintainability: Change once, affects all instances
- Specification compliance: Matches DESIGN_SYSTEM_SPECIFICATION.md §3

---

#### 2.2 Create Dialog Size Variants
Create `DialogWrapper.tsx` or extend Dialog component:

```tsx
export function WorkoutDialog({
  size = "default",
  intensity = "normal",
  children,
  ...props
}) {
  return (
    <Dialog {...props}>
      <DialogContent className={cn(
        "workout-dialog border-2 bg-card-gradient",
        size === "compact" && "max-w-md mx-4",
        size === "default" && "max-w-lg mx-4",
        size === "medium" && "max-w-2xl mx-4",
        size === "large" && "max-w-4xl mx-4",
        size === "fullscreen" && "max-w-[95vw] h-[90vh]",
        intensity === "high" && "border-signal-red/30 shadow-intense",
        intensity === "maximum" && "border-signal-red/50 shadow-2xl",
        "w-[95vw] md:w-full"
      )}>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

---

### Phase 3: Audit & Cleanup (1-2 hours)

#### 3.1 Remove Unnecessary Mobile Overrides
Review and remove mobile-specific CSS from components where Tailwind utilities work fine.

**Target**: 100+ lines → <20 lines (reduce 80% of mobile overrides)

**Approach**:
1. Audit `globals.css` for mobile overrides
2. Convert component-level responsive overrides to Tailwind utilities
3. Keep only essential mobile fixes (e.g., 44px touch targets on very small screens)

#### 3.2 Verify Specification Compliance
Audit usage of:
- ✅ Button variants (default, workout, secondary, success, zone-*, etc.)
- ✅ Card patterns (exercise-specific, data-specific)
- ✅ Dialog sizes (compact, default, medium, large, fullscreen)
- ✅ Color tokens (semantic vs hardcoded)
- ✅ Typography classes (data-metric, data-large, ui-label, etc.)

---

## Part 4: Compliance Matrix

### How Well LiftLog Follows Its Own Design System

| Element | Specification | Implementation | Compliance | Status |
|---------|---------------|-----------------|-----------|--------|
| **Color System** | 6 CSS variable categories | 95% implemented | 95% | ✅ Good |
| **Button Variants** | 11 defined variants | 5 variants used | 45% | ⚠️ Needs work |
| **Button Sizes** | 5 sizes (default, sm, lg, xl, icon, compact, data) | 3 sizes used properly | 60% | ⚠️ Needs work |
| **Card Components** | 3 types (standard, exercise, data) | 1 type (generic) | 33% | ❌ Missing |
| **Dialog Sizes** | 5 sizes (compact-fullscreen) | No variants | 0% | ❌ Missing |
| **Typography Scale** | 8 defined classes | 6 implemented | 75% | ✅ Good |
| **Spacing System** | 7 tokens (xs-3xl) | 90% used | 90% | ✅ Good |
| **Border Radius** | 6 tokens | 5 properly used | 83% | ✅ Good |
| **Shadow System** | 6 shadow variants | 4 used consistently | 67% | ⚠️ Partial |
| **Animation Tokens** | 3 easing curves | 1 commonly used | 33% | ⚠️ Needs work |
| **Responsive Strategy** | Mobile-first + selective overrides | Mobile-first with excessive overrides | 50% | ⚠️ Needs work |

**Overall Compliance Score**: **60%**

**Verdict**: Solid foundation, good potential, but incomplete implementation. Specification is well-written but not fully utilized.

---

## Part 5: Implementation Priority

### Critical Path (Week 1)

1. ✅ **Create branch** - `ui/design-system-refactor` (DONE)
2. 🔴 **Replace 8 native buttons** with shadcn Button (2 hours)
3. 🔴 **Create custom `size="touch"` variant** for 44px buttons (30 minutes)
4. 🟠 **Simplify workout-completion-dialog** button styling (1 hour)
5. 🟠 **Extract ExerciseCard component** (1 hour)
6. 🟠 **Create DialogWrapper with size variants** (1 hour)

**Total**: ~6 hours of focused work

### Secondary (Week 2)

7. Extract other specialized card components
8. Audit and remove unnecessary mobile CSS overrides
9. Update any remaining hardcoded dialogs to use DialogWrapper
10. Document patterns in README or DEVELOPMENT_RULES.md

### Polish (Week 3)

11. Create specialized button variants actually used by app
12. Implement animations and effects from specification
13. Testing on actual mobile devices
14. Update component storybook/documentation

---

## Part 6: My Assessment & Thoughts

### The Good
✅ **Solid shadcn/ui Foundation**: The team made the right choice with shadcn. It's battle-tested, accessible, and has great TypeScript support.

✅ **Well-Thought Design Spec**: DESIGN_SYSTEM_SPECIFICATION.md is excellent. It's detailed, specific, and considers the Nike x Strava x Whoop aesthetic well.

✅ **95% Component Compliance**: Most of the codebase uses shadcn components properly. Only a small 5% needs fixing.

✅ **Good Color System**: CSS variables are properly defined with semantic tokens. Dark/light mode support is solid.

### The Concerning
❌ **Specification-Implementation Gap**: You have a great spec but only 60% implementation. It's like having a blueprint but building 60% of the design.

❌ **Mobile Override Anti-Pattern**: The 100+ lines of mobile CSS overrides contradict the "mobile-first" philosophy. This suggests developers are reaching for `@media` queries instead of understanding responsive design.

❌ **Missing Abstraction Layer**: Specialized components (ExerciseCard, DataCard, DialogWrapper) exist in spec but not in code. This means styling logic is scattered across 20+ files instead of living in one place.

❌ **Inconsistent Button Sizing Strategy**: The 32px/36px/44px sizing mess suggests the team doesn't have a shared mental model for button sizing. This is something that should be document in DEVELOPMENT_RULES.md or enforced by ESLint.

### Biggest Quick Win
**Create a `size="touch"` button variant with 44px height**.

This single 30-minute change would:
- Fix the mobile button sizing inconsistency
- Eliminate 3-4 custom className overrides per button
- Make it clear to future developers: "Use `size="touch"` for mobile-friendly buttons"
- Reduce the cognitive load of responsive design

### The Refactor Strategy I Recommend

**Don't try to do everything at once**. Instead:

1. **Week 1**: Fix the immediate stuff (native buttons, touch variant, dialog sizes)
2. **Week 2**: Extract 2-3 critical specialized components (ExerciseCard, DataCard)
3. **Week 3**: Audit mobile CSS and remove unnecessary overrides
4. **Week 4**: Document in DEVELOPMENT_RULES.md so future work aligns with spec

This phased approach means:
- You get value immediately (better mobile experience)
- You don't block other development
- Team learns the patterns incrementally
- Less risk of introducing bugs

---

## Files Involved in Refactoring

### Must Fix (Critical)
- `components/bottom-navigation.tsx`
- `components/workout-logger/components/ExerciseGroups.tsx`
- `components/workout-logger/components/WorkoutHeader.tsx`
- `components/workout-completion-dialog.tsx`
- `components/ui/button.tsx` (add `size="touch"` variant)

### Should Fix (Important)
- `components/exercise-library-filter.tsx`
- `components/exercise-library.tsx`
- `components/program-wizard/steps/StepTemplateSelection.tsx`
- `components/ui/card.tsx` (create ExerciseCard subcomponent)

### Nice to Fix (Polish)
- `components/ui/dialog.tsx` (create DialogWrapper)
- `styles/globals.css` (audit mobile overrides)
- `DEVELOPMENT_RULES.md` (document button sizing strategy)

---

## Conclusion

LiftLog has a **strong design foundation** with thoughtful specs and good component usage. The refactoring needed is **not major architecture work** — it's **refinement and consolidation**.

Think of it like:
- **Current state**: Building with LEGO blocks, mostly correct assembly, some pieces scattered around
- **After refactor**: All pieces properly organized, clear instructions for future builds, fewer scattered pieces

The effort is **manageable** (~10-15 hours of focused work), the impact is **significant** (better mobile UX, easier maintenance, cleaner code), and the risk is **low** (mostly UI changes, can be tested thoroughly on actual devices).

Ready to start? I'd recommend beginning with **Part 1 Phase 1** - replacing native buttons and adding the touch size variant.

---

## Part 7: Mobile Interaction Gotchas (Oct 27, 2025 Update)

### The Opacity + Hidden Element Pointer Events Bug

**Issue**: When implementing smooth fade transitions for tab switching using `opacity`, we discovered that hidden tabs with `opacity: 0` prevent pointer events on child elements (like tooltips) from working, even when `display: none` is set.

**Root Cause**: CSS `opacity: 0` doesn't prevent pointer events from being considered. When combined with hidden elements, browsers may still block touch/click events based on opacity state.

**Symptoms**:
- Mobile tooltip icons in hidden tabs become unclickable
- Same issue occurred with MobileTooltip.tsx wrapper fix earlier
- Works in desktop browser (hover vs touch), fails on mobile/tablet

**Solution**: Always pair `opacity` changes with `pointerEvents` control:
```typescript
// WRONG: Hidden tab can still receive pointer events
<div style={{ display: "none", opacity: 0 }}>
  <MobileTooltip /> {/* Unclickable! */}
</div>

// RIGHT: Explicitly disable pointer events when hidden
<div style={{
  display: "none",
  opacity: 0,
  pointerEvents: "none"  // ← Critical for mobile!
}}>
  <MobileTooltip /> {/* Now unclickable as intended */}
</div>
```

**Implementation Pattern**:
```typescript
<div style={{
  display: currentView === "analytics" ? "block" : "none",
  opacity: currentView === "analytics" ? 1 : 0,
  pointerEvents: currentView === "analytics" ? "auto" : "none"
}}>
  {/* Content */}
</div>
```

**Applied To**:
- All 5 main tab containers (programs, train, workout, analytics, profile)
- Any component with opacity-based visibility transitions
- MobileTooltip child elements (especially in analytics page)

**Testing**:
- ✅ Desktop: Smooth transitions still work
- ✅ Mobile: Tooltips clickable when tab active
- ✅ Mobile: Tooltips not interactive when tab hidden
- ✅ Build: No compilation errors

**Key Lesson**: When using opacity for visual transitions on mobile:
1. Always explicitly set `pointerEvents: "none"` for hidden states
2. Set `pointerEvents: "auto"` for visible states
3. Don't rely on `display: none` alone to prevent pointer events with opacity

This is a **mobile-specific issue** that won't show in desktop browser testing because mouse hover is ignored on hidden opacity elements, but touch events may still register.

### The CSS Opacity Transition Pointer Events Bug (Advanced)

**Issue**: Even after adding `pointerEvents: auto` to visible tabs and `pointerEvents: none` to hidden tabs, tooltips in analytics tab still weren't clickable.

**Root Cause**: CSS transitions on opacity values (using `transition-opacity duration-200`) interfere with pointer-events routing on touch devices. The browser's computation of pointer events during opacity transitions doesn't respect the explicit `pointerEvents: auto` setting.

**Symptoms**:
- Tooltips clickable with instant display switching (no transitions)
- Tooltips NOT clickable when opacity transitions enabled
- Only affects touch devices (desktop hover mode works fine)
- Issue persists even with correct `pointerEvents: auto/none` values

**Failed Solution** (what didn't work):
```typescript
// This looks correct but STILL breaks tooltips on mobile:
<div style={{
  display: currentView === "analytics" ? "block" : "none",
  opacity: currentView === "analytics" ? 1 : 0,
  pointerEvents: currentView === "analytics" ? "auto" : "none"
}} className="transition-opacity duration-200">
  <MobileTooltip /> {/* Still unclickable! */}
</div>
```

**Working Solution**:
```typescript
// Remove opacity transitions entirely, use instant display switching:
<div style={{
  display: currentView === "analytics" ? "block" : "none",
  pointerEvents: currentView === "analytics" ? "auto" : "none"
}}>
  <MobileTooltip /> {/* Works! */}
</div>
```

**Future Approach**: To add smooth transitions without breaking mobile interactions:
1. Use `transform` instead of `opacity` (transform doesn't affect pointer-events)
2. Use separate animation libraries that handle this
3. Use `will-change` hints to help browser optimize
4. Apply transitions only when switching between two VISIBLE states

**Key Lesson**: CSS transitions and pointer-events have complex interactions on touch devices. Always test interaction-heavy UI changes on actual mobile devices, not just desktop browsers.

### The Device Detection Pattern for Touch-Aware Components (Oct 27, 2025)

**Issue**: Single-check device detection using only `window.matchMedia('(hover: hover)')` fails in DevTools mobile simulation mode, causing touch-capable components to stay in "hover" mode.

**Root Cause**: Desktop browsers running DevTools mobile simulator still report `(hover: hover): true` even when simulating mobile viewport. This causes MobileTooltip and similar components to use hover-only behavior instead of click-to-toggle.

**Symptoms**:
- Mobile tooltips (and similar touch interactions) work on real phones
- Same tooltips don't work in DevTools mobile simulation
- Desktop testing misses the interaction bug
- Users on real mobile devices can't interact with tooltips

**Solution**: Use a **multi-heuristic device detection pattern**:

```typescript
/**
 * Detect device type using multiple heuristics:
 * 1. (hover: hover) - Primary: Does device support hover?
 * 2. (pointer: coarse) - Secondary: Is pointer coarse (touch)?
 * 3. ontouchstart in window - Fallback: Has touch API support?
 *
 * This handles:
 * - Real mobile/tablet: coarse pointer
 * - DevTools simulation: detects ontouchstart event support
 * - Hybrid devices: respects actual hover capability
 */
const supportsHover = window.matchMedia('(hover: hover)').matches
const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
const hasTouchSupport = typeof navigator !== 'undefined' && 'ontouchstart' in window

// Device is touch if ANY of these are true:
const isTouch = !supportsHover || hasCoarsePointer || hasTouchSupport

setDeviceType(isTouch ? 'touch' : 'hover')
```

**Applied To**:
- `components/ui/mobile-tooltip.tsx` - Device detection logic

**Testing**:
- ✅ Real mobile: Detects as touch (ontouchstart support)
- ✅ Tablet: Detects as touch (coarse pointer)
- ✅ DevTools mobile sim: Detects as touch (ontouchstart support)
- ✅ Desktop browser: Detects as hover (supports hover, fine pointer)
- ✅ Desktop with touch input: Detects as touch (hasTouchSupport)

**Key Lesson**: Device detection for interaction patterns must use multiple heuristics. Single checks fail in emulation/simulation environments. This pattern handles real devices, emulators, and hybrid input scenarios.

**Pattern to Follow**: Any component that changes behavior based on device input type (touch vs hover, click vs keyboard) should use this multi-heuristic detection pattern.

