# LiftLog Design System Specification

## "LiftLog Performance" - Nike x Strava x Whoop Aesthetic

### Brand Identity

**Voice**: Motivational yet grounded in science. Direct, short sentences.  
**Tone**: Intelligent intensity — smart training meets hard work.  
**Vibe**: Think Nike x Strava x Whoop. Minimal, modern, data-driven edge.  
**Emotion**: Determination. Mastery. Unbreakable focus.

---

## 1. Color System

### Light Theme (Primary Mode)
```css
:root {
  /* === CORE COLORS === */
  --jet-black: oklch(0.15 0 0);           /* Primary text, intense elements */
  --matte-white: oklch(1 0 0);            /* Main background */
  --graphite-grey: oklch(0.85 0.01 240);  /* Subtle borders, secondary UI */
  --signal-red: oklch(0.55 0.2 20);       /* High effort, alerts, CTAs */
  --volt-green: oklch(0.65 0.15 140);     /* Success, completed sets */
  
  /* === SEMANTIC TOKENS === */
  --background: var(--matte-white);
  --foreground: var(--jet-black);
  --primary: var(--signal-red);
  --primary-foreground: var(--matte-white);
  --secondary: var(--graphite-grey);
  --secondary-foreground: var(--jet-black);
  --accent: var(--graphite-grey);
  --accent-foreground: var(--jet-black);
  --destructive: var(--signal-red);
  --destructive-foreground: var(--matte-white);
  --success: var(--volt-green);
  --success-foreground: var(--matte-white);
  --muted: oklch(0.95 0 0);
  --muted-foreground: oklch(0.5 0 0);
  --border: var(--graphite-grey);
  --input: oklch(0.98 0 0);
  --ring: var(--signal-red);
  
  /* === TRAINING ZONES (Data-Driven) === */
  --zone-warmup: oklch(0.75 0.15 40);     /* Orange - Warmup sets */
  --zone-endurance: oklch(0.65 0.15 200);  /* Blue - Endurance work */
  --zone-strength: oklch(0.55 0.2 20);    /* Red - Strength training */
  --zone-power: oklch(0.65 0.2 340);      /* Purple - Power movements */
  --zone-recovery: oklch(0.75 0.15 140);   /* Green - Recovery periods */
  
  /* === GRADIENTS === */
  --energy-gradient: linear-gradient(135deg, 
    var(--zone-strength), 
    var(--zone-warmup), 
    oklch(0.75 0.15 60)
  );
  
  --progress-gradient: linear-gradient(90deg,
    var(--zone-recovery) 0%,
    var(--zone-endurance) 25%,
    var(--zone-warmup) 50%,
    var(--zone-strength) 75%,
    var(--zone-power) 100%
  );
  
  --card-gradient: linear-gradient(135deg, 
    var(--matte-white) 0%, 
    oklch(0.98 0 0) 100%
  );
  
  /* === TYPOGRAPHY === */
  --font-primary: 'Montserrat', ui-sans-serif, system-ui;
  --font-mono: 'JetBrains Mono', ui-monospace;
  
  /* === SPACING SYSTEM === */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
  
  /* === BORDER RADIUS === */
  --radius-xs: 0.125rem;   /* 2px */
  --radius-sm: 0.25rem;    /* 4px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  
  /* === SHADOWS === */
  --shadow-xs: 0 1px 2px 0 oklch(0.15 0.01 240 / 0.05);
  --shadow-sm: 0 1px 3px 0 oklch(0.15 0.01 240 / 0.1), 0 1px 2px 0 oklch(0.15 0.01 240 / 0.06);
  --shadow-md: 0 4px 6px -1px oklch(0.15 0.01 240 / 0.1), 0 2px 4px -1px oklch(0.15 0.01 240 / 0.06);
  --shadow-lg: 0 10px 15px -3px oklch(0.15 0.01 240 / 0.1), 0 4px 6px -2px oklch(0.15 0.01 240 / 0.05);
  --shadow-xl: 0 20px 25px -5px oklch(0.15 0.01 240 / 0.1), 0 10px 10px -5px oklch(0.15 0.01 240 / 0.04);
  --shadow-intense: 0 4px 20px oklch(0.55 0.2 20 / 0.15);
  --shadow-success: 0 4px 20px oklch(0.65 0.15 140 / 0.15);
  
  /* === ANIMATION CURVES === */
  --ease-athletic: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-intense: cubic-bezier(0.17, 0.67, 0.83, 0.67);
}
```

### Dark Theme (Training Mode)
```css
.dark {
  /* === CORE COLORS (Dark Mode) === */
  --jet-black: oklch(0.95 0 0);           /* Light text on dark */
  --matte-white: oklch(0.12 0 0);         /* Dark background */
  --graphite-grey: oklch(0.25 0.01 240);  /* Elevated surfaces */
  --signal-red: oklch(0.65 0.2 20);       /* More intense red */
  --volt-green: oklch(0.75 0.15 140);     /* Brighter green */
  
  /* === SEMANTIC TOKENS (Dark Mode) === */
  --background: var(--matte-white);
  --foreground: var(--jet-black);
  --primary: var(--signal-red);
  --secondary: var(--graphite-grey);
  --muted: oklch(0.18 0.01 240);
  --muted-foreground: oklch(0.65 0.01 240);
  --border: oklch(0.2 0.01 240);
  --input: var(--graphite-grey);
  
  /* === ENHANCED DARK MODE EFFECTS === */
  --shadow-intense: 0 4px 20px oklch(0.65 0.2 20 / 0.25);
  --shadow-success: 0 4px 20px oklch(0.75 0.15 140 / 0.25);
  
  /* === DARK MODE GRADIENTS === */
  --card-gradient: linear-gradient(135deg, 
    var(--matte-white) 0%, 
    oklch(0.15 0.01 240) 100%
  );
}
```

---

## 2. Typography System

### Font Imports
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

### Typography Scale
```css
@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground font-primary;
    font-feature-settings: 'ss01' on, 'ss02' on;
    line-height: 1.6;
  }
  
  /* === HEADINGS === */
  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold tracking-tight;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }
  
  h1 { 
    @apply text-3xl md:text-4xl font-bold; 
    font-weight: 800;
  }
  h2 { 
    @apply text-2xl md:text-3xl font-bold; 
    font-weight: 800;
  }
  h3 { 
    @apply text-xl md:text-2xl font-semibold; 
    font-weight: 700;
  }
  h4 { 
    @apply text-lg md:text-xl font-semibold; 
    font-weight: 600;
  }
  h5 { 
    @apply text-base md:text-lg font-medium; 
    font-weight: 600;
  }
  h6 { 
    @apply text-sm md:text-base font-medium; 
    font-weight: 500;
  }
  
  /* === BODY TEXT === */
  p {
    @apply text-base leading-relaxed;
    max-width: 65ch; /* Optimal reading length */
  }
  
  /* === DATA-DRIVEN TYPOGRAPHY === */
  .data-metric {
    @apply font-mono text-sm font-medium tabular-nums;
    letter-spacing: 0.025em;
  }
  
  .data-large {
    @apply font-mono text-2xl md:text-3xl font-bold tabular-nums;
    letter-spacing: -0.025em;
  }
  
  .data-xl {
    @apply font-mono text-4xl md:text-5xl font-black tabular-nums;
    letter-spacing: -0.05em;
  }
  
  /* === UI TEXT === */
  .ui-label {
    @apply text-xs font-medium uppercase tracking-wider;
    letter-spacing: 0.1em;
  }
  
  .ui-caption {
    @apply text-xs text-muted-foreground;
    font-weight: 400;
  }
  
  /* === INTENSE COPY === */
  .copy-intense {
    @apply font-medium leading-tight;
    font-weight: 600;
    line-height: 1.3;
  }
  
  .copy-direct {
    @apply text-sm font-medium;
    line-height: 1.4;
  }
}
```

---

## 3. Component Design System

### Button Variants
```tsx
// components/ui/button.tsx - Extended variants
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        // === PRIMARY ACTIONS ===
        default: "bg-signal-red hover:bg-signal-red/90 text-matte-white shadow-intense hover:shadow-xl",
        workout: "bg-signal-red hover:bg-signal-red/90 text-matte-white shadow-intense font-semibold",
        
        // === SECONDARY ACTIONS ===
        secondary: "bg-graphite-grey hover:bg-graphite-grey/80 text-jet-black shadow-md",
        outline: "border-2 border-graphite-grey bg-transparent hover:bg-graphite-grey/10 text-jet-black",
        
        // === SUCCESS STATES ===
        success: "bg-volt-green hover:bg-volt-green/90 text-matte-white shadow-success",
        completed: "bg-volt-green hover:bg-volt-green/90 text-matte-white shadow-success",
        
        // === TRAINING ZONES ===
        "zone-warmup": "bg-zone-warmup hover:bg-zone-warmup/90 text-matte-white",
        "zone-endurance": "bg-zone-endurance hover:bg-zone-endurance/90 text-matte-white",
        "zone-strength": "bg-zone-strength hover:bg-zone-strength/90 text-matte-white",
        "zone-power": "bg-zone-power hover:bg-zone-power/90 text-matte-white",
        "zone-recovery": "bg-zone-recovery hover:bg-zone-recovery/90 text-matte-white",
        
        // === GHOST/UTILITY ===
        ghost: "hover:bg-graphite-grey/20 text-jet-black",
        destructive: "bg-signal-red hover:bg-signal-red/90 text-matte-white",
        
        // === DATA DRIVEN ===
        metric: "bg-transparent border border-graphite-grey hover:border-signal-red text-jet-black font-mono",
        progress: "bg-progress-gradient hover:opacity-90 text-matte-white font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-6 text-lg",
        xl: "h-14 px-8 text-xl font-bold",
        icon: "h-10 w-10",
        compact: "h-8 px-2 text-xs",
        data: "h-8 px-3 font-mono text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Card System
```tsx
// components/ui/exercise-card.tsx
export function ExerciseCard({ 
  children, 
  status = "pending", 
  zone = "strength",
  intensity = "normal",
  ...props 
}) {
  return (
    <Card 
      className={cn(
        "exercise-card transition-all duration-200 border-2",
        // Status-based styling
        status === "completed" && "border-volt-green/30 bg-volt-green/5",
        status === "current" && "border-signal-red/50 bg-signal-red/5 shadow-intense",
        status === "warmup" && "border-zone-warmup/30 bg-zone-warmup/5",
        status === "pending" && "border-graphite-grey/30 hover:border-graphite-grey/50",
        
        // Intensity-based effects
        intensity === "high" && "shadow-lg hover:shadow-xl",
        intensity === "maximum" && "shadow-intense hover:shadow-2xl",
        
        // Zone-based accents
        zone === "strength" && "border-l-4 border-l-signal-red",
        zone === "endurance" && "border-l-4 border-l-zone-endurance",
        zone === "power" && "border-l-4 border-l-zone-power",
        zone === "warmup" && "border-l-4 border-l-zone-warmup",
        zone === "recovery" && "border-l-4 border-l-zone-recovery"
      )}
      {...props}
    >
      {children}
    </Card>
  )
}

// components/ui/data-card.tsx
export function DataCard({ 
  children, 
  metric, 
  label, 
  trend, 
  zone = "neutral",
  ...props 
}) {
  return (
    <Card 
      className={cn(
        "data-card border-0 bg-card-gradient",
        zone === "strength" && "text-signal-red",
        zone === "endurance" && "text-zone-endurance",
        zone === "power" && "text-zone-power",
        zone === "recovery" && "text-volt-green"
      )}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className={cn(
              "data-large",
              zone === "strength" && "text-signal-red",
              zone === "endurance" && "text-zone-endurance",
              zone === "power" && "text-zone-power",
              zone === "recovery" && "text-volt-green"
            )}>
              {metric}
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-volt-green" />
              ) : (
                <TrendingDown className="h-4 w-4 text-signal-red" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend > 0 ? "text-volt-green" : "text-signal-red"
              )}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### Dialog System
```tsx
// components/ui/workout-dialog.tsx
export function WorkoutDialog({ 
  children, 
  size = "default", 
  intensity = "normal",
  ...props 
}) {
  return (
    <Dialog {...props}>
      <DialogContent className={cn(
        "workout-dialog border-2 bg-card-gradient",
        // Size variants
        size === "compact" && "max-w-md mx-4",
        size === "default" && "max-w-lg mx-4",
        size === "medium" && "max-w-2xl mx-4",
        size === "large" && "max-w-4xl mx-4",
        size === "fullscreen" && "max-w-[95vw] h-[90vh]",
        
        // Intensity-based styling
        intensity === "high" && "border-signal-red/30 shadow-intense",
        intensity === "maximum" && "border-signal-red/50 shadow-2xl",
        
        // Responsive base
        "w-[95vw] md:w-full"
      )}>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

---

## 4. Animation & Interaction Design

### Animation Utilities
```css
@layer utilities {
  /* === ATHLETIC ANIMATIONS === */
  .transition-athletic {
    transition: all 0.2s var(--ease-athletic);
  }
  
  .transition-smooth {
    transition: all 0.3s var(--ease-smooth);
  }
  
  .transition-intense {
    transition: all 0.15s var(--ease-intense);
  }
  
  /* === ENERGY PULSES === */
  .pulse-energy {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .pulse-intense {
    animation: pulse-intense 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  @keyframes pulse-intense {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.9; 
      transform: scale(1.05);
    }
  }
  
  /* === SURFACE TEXTURES === */
  .metallic-surface {
    background: linear-gradient(135deg, 
      oklch(0.95 0 0) 0%, 
      oklch(0.9 0 0) 50%, 
      oklch(0.95 0 0) 100%
    );
    box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.1);
  }
  
  .rubberized-surface {
    background: linear-gradient(180deg, 
      oklch(0.15 0 0) 0%, 
      oklch(0.12 0 0) 100%
    );
    box-shadow: inset 0 1px 0 oklch(0 0 0 / 0.2);
  }
  
  /* === ZONE INDICATORS === */
  .zone-glow-strength {
    box-shadow: 0 0 20px oklch(0.55 0.2 20 / 0.3);
  }
  
  .zone-glow-endurance {
    box-shadow: 0 0 20px oklch(0.65 0.15 200 / 0.3);
  }
  
  .zone-glow-power {
    box-shadow: 0 0 20px oklch(0.65 0.2 340 / 0.3);
  }
  
  /* === PROGRESS ANIMATIONS === */
  .progress-fill {
    animation: progress-fill 1s var(--ease-smooth) forwards;
  }
  
  @keyframes progress-fill {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
  
  /* === INTERACTION STATES === */
  .hover-lift {
    transition: transform 0.2s var(--ease-athletic);
  }
  
  .hover-lift:hover {
    transform: translateY(-2px);
  }
  
  .active-press {
    transition: transform 0.1s var(--ease-intense);
  }
  
  .active-press:active {
    transform: scale(0.98);
  }
}
```

---

## 5. Responsive Design Strategy

### Mobile-First Approach
```css
/* === BASE (Mobile First) === */
.exercise-card {
  @apply p-3 border-2;
}

.data-large {
  @apply text-2xl;
}

.workout-dialog {
  @apply w-[95vw] mx-4;
}

/* === TABLET (768px+) === */
@media (min-width: 768px) {
  .exercise-card {
    @apply p-4;
  }
  
  .data-large {
    @apply text-3xl;
  }
  
  .workout-dialog {
    @apply w-full max-w-2xl;
  }
}

/* === DESKTOP (1024px+) === */
@media (min-width: 1024px) {
  .data-large {
    @apply text-4xl;
  }
  
  .workout-dialog {
    @apply max-w-4xl;
  }
}
```

### Targeted Mobile Overrides (Where Absolutely Necessary)
```css
/* === CRITICAL MOBILE FIXES ONLY === */
/* Use sparingly - only where Tailwind utilities can't achieve the exact result */

@media (max-width: 390px) {
  /* iPhone SE and similar small devices */
  .workout-completion-dialog {
    max-width: 95vw;
    padding: 12px;
  }
  
  .exercise-action-button {
    min-height: 44px; /* Touch target minimum */
    min-width: 44px;
  }
  
  .data-large {
    font-size: 1.5rem; /* Smaller on very small screens */
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  /* Tablet specific refinements */
  .data-large {
    font-size: 2rem; /* Slightly smaller on tablet */
  }
  
  .exercise-card {
    padding: 14px; /* Between mobile and desktop */
  }
}
```

---

## 6. Component Usage Guidelines

### Button Hierarchy
1. **Primary** (`default`, `workout`) - Main actions (Start Workout, Save)
2. **Secondary** (`secondary`, `outline`) - Alternative actions
3. **Success** (`success`, `completed`) - Positive feedback actions
4. **Zone** (`zone-*`) - Training zone specific actions
5. **Utility** (`ghost`, `metric`) - Secondary utility actions

### Card Hierarchy
1. **ExerciseCard** - Individual exercise displays with status states
2. **DataCard** - Metrics and performance data
3. **Card** - General content containers

### Dialog Hierarchy
- `compact`: Small confirmations, quick actions
- `default`: Standard dialogs, forms
- `medium`: Complex forms, detailed views
- `large`: Analytics, comprehensive views
- `fullscreen`: Mobile-first experiences

### Color Usage Rules
- **Signal Red**: High effort, danger, primary CTAs, current workout
- **Volt Green**: Success, completed sets, positive feedback
- **Graphite Grey**: Secondary elements, borders, disabled states
- **Jet Black**: Primary text, high contrast elements
- **Matte White**: Main backgrounds, clean canvas

---

## 7. Implementation Plan

### Phase 1: Foundation Setup (Week 1)
1. **Update CSS Variables**
   - Replace existing color tokens
   - Add new spacing, typography, and shadow systems
   - Implement gradient definitions

2. **Typography Implementation**
   - Add font imports
   - Update typography scale
   - Implement data-driven typography classes

3. **Base Component Updates**
   - Update Button component with new variants
   - Modify Card component with new patterns
   - Create Dialog variants

### Phase 2: Component Refactoring (Week 2-3)
1. **Exercise Components**
   - Refactor exercise cards with new status states
   - Implement zone-based styling
   - Add intensity-based effects

2. **Data Display Components**
   - Create DataCard component
   - Implement metric displays
   - Add progress indicators

3. **Navigation & Layout**
   - Update navigation components
   - Implement responsive patterns
   - Add mobile-specific optimizations

### Phase 3: Advanced Features (Week 4)
1. **Animation Implementation**
   - Add athletic animations
   - Implement zone glows
   - Create progress animations

2. **Dark Mode Enhancement**
   - Optimize dark theme colors
   - Add dark-specific effects
   - Test contrast ratios

3. **Mobile Optimization**
   - Implement targeted mobile fixes
   - Test touch interactions
   - Optimize performance

### Phase 4: Testing & Refinement (Week 5)
1. **Cross-Device Testing**
   - Test on various screen sizes
   - Verify touch interactions
   - Check performance

2. **Accessibility Audit**
   - Verify contrast ratios
   - Test keyboard navigation
   - Check screen reader compatibility

3. **Documentation**
   - Create component documentation
   - Document usage patterns
   - Create style guide

---

## 8. Success Metrics

### Before Implementation
- Inconsistent color usage
- Mixed component patterns
- 100+ lines of mobile overrides
- No unified design language

### After Implementation
- 100% design token usage
- Consistent component patterns
- < 20 lines of necessary mobile overrides
- Unified Nike x Strava x Whoop aesthetic

### Measurable Goals
- **Design Consistency**: 90%+ components use design tokens
- **Mobile Performance**: Reduced CSS bundle size by 25%
- **Development Speed**: 50% faster component development
- **User Experience**: Improved visual hierarchy and clarity

---

## 9. Maintenance Guidelines

### Adding New Components
1. Always use design tokens
2. Follow established patterns
3. Include responsive variants
4. Document usage guidelines

### Color Updates
1. Modify CSS variables only
2. Test both light and dark themes
3. Verify accessibility compliance
4. Update documentation

### Mobile Overrides
1. Use only when absolutely necessary
2. Document the reason for each override
3. Test on actual devices
4. Consider alternative solutions first

---

## 10. Quick Reference

### Common Patterns
```tsx
// Primary action button
<Button variant="workout" size="lg" className="shadow-intense">
  Start Workout
</Button>

// Exercise card with status
<ExerciseCard status="current" zone="strength" intensity="high">
  <ExerciseContent />
</ExerciseCard>

// Data display
<DataCard metric="245 lbs" label="Personal Record" trend={12} zone="strength" />

// Dialog
<WorkoutDialog size="medium" intensity="high">
  <WorkoutContent />
</WorkoutDialog>
```

### Utility Classes
```css
/* Text */
.text-intense    /* Bold, impactful text */
.text-data       /* Monospace for metrics */
.text-label      /* Uppercase labels */

/* Effects */
.hover-lift     /* Elevates on hover */
.pulse-energy   /* Subtle pulsing animation */
.zone-glow-*    /* Training zone glow effects */

/* Surfaces */
.metallic-surface   /* Metallic texture */
.rubberized-surface /* Rubber texture */
```

---

*This design system specification serves as the complete reference for implementing the LiftLog Performance design system. Follow the phases systematically and maintain consistency with the established patterns.*
