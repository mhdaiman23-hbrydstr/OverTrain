# LiftLog Developer Guide

**Technical documentation for developers working on LiftLog**

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context + localStorage
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel (recommended)

### Project Structure
```
LiftLog/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main app shell with view routing
│   ├── layout.tsx         # Root layout with providers
│   └── admin/             # Admin template builder
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── workout-logger/    # Workout logging system
│   ├── templates/         # Admin template builder
│   └── profile/           # User profile components
├── lib/
│   ├── auth.ts            # Authentication service
│   ├── supabase.ts        # Supabase client
│   ├── program-state.ts   # Active program management
│   ├── workout-logger.ts  # Core workout logic
│   ├── progression-*.ts  # Progression system
│   └── services/          # Data services
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
└── tests/                 # Test suite
```

---

## 🔧 Core Systems

### 1. Authentication System
**File**: `lib/auth.ts`, `contexts/auth-context.tsx`

**Simple Explanation**: Handles user login/signup and protects routes

**Key Functions**:
```typescript
// Sign up new user
AuthService.signUp(email: string, password: string): Promise<User>

// Sign in existing user  
AuthService.signIn(email: string, password: string): Promise<User>

// Sign out user
AuthService.signOut(): Promise<void>

// Get current user
AuthService.getCurrentUser(): User | null
```

**How It Works**:
1. User enters email/password
2. Supabase validates credentials
3. JWT token stored in localStorage
4. AuthContext provides user state to entire app
5. Protected routes check authentication status

### 2. Program Management
**File**: `lib/program-state.ts`

**Simple Explanation**: Manages user's workout programs and progress

**Key Functions**:
```typescript
// Set active program for user
ProgramStateManager.setActiveProgram(template: GymTemplate): void

// Get current workout for today
ProgramStateManager.getCurrentWorkout(): WorkoutDay | null

// Mark workout as completed
ProgramStateManager.completeWorkout(): void

// Calculate program progress
ProgramStateManager.getProgress(): ProgramProgress
```

**Data Flow**:
1. User selects program template
2. Template converted to active program with week/day tracking
3. Current workout extracted from program
4. Progress updates stored in localStorage
5. Completion advances to next workout

### 3. Workout Logging System
**File**: `lib/workout-logger.ts`, `components/workout-logger/`

**Simple Explanation**: Tracks sets, reps, and weights during workouts

**Key Functions**:
```typescript
// Start new workout session
WorkoutLogger.startWorkout(workoutDay: WorkoutDay): WorkoutSession

// Log a set
WorkoutLogger.logSet(sessionId: string, exerciseId: string, set: SetData): void

// Complete workout
WorkoutLogger.completeWorkout(sessionId: string): CompletedWorkout

// Get workout history
WorkoutLogger.getHistory(userId: string): CompletedWorkout[]
```

**Component Architecture**:
```
workout-logger.tsx (main orchestrator)
├── components/
│   ├── WorkoutHeader.tsx
│   ├── ExerciseGroups.tsx
│   ├── CompletionBar.tsx
│   └── WorkoutDialogs.tsx
├── hooks/
│   ├── use-workout-session.ts
│   └── use-connection-status.ts
└── contexts/
    └── one-rm-context.tsx
```

### 4. Progression System
**Files**: `lib/progression-*.ts`

**Simple Explanation**: Calculates weight increases based on performance

**Key Functions**:
```typescript
// Calculate next week's weights
ProgressionCalculator.calculateProgressedTargets(
  exerciseId: string,
  currentWeek: number,
  exerciseTemplate: ExerciseTemplate
): ProgressedExerciseData

// Adaptive progression with user choice
ProgressionCalculator.calculateAdaptiveProgression(
  exerciseId: string,
  userWeightAdjustment?: number
): AdaptiveProgressionResult

// Get exercise tier for progression rules
getExerciseTier(exerciseName: string, category: string): ProgressionTier
```

**Progression Tiers**:
- `large_compound`: +5lbs min, 2.5% weekly (squat, deadlift)
- `medium_compound`: +2.5lbs min, 2.5% weekly (bench, rows)
- `small_compound`: +2.5lbs min, 2.0% weekly (pull-ups, dips)
- `large_isolation`: +2.5lbs min, 2.0% weekly (leg extensions)
- `small_isolation`: +1lb min, 1.5% weekly (curls, raises)

### 5. Analytics Engine
**File**: `lib/analytics.ts`

**Simple Explanation**: Processes workout data for progress insights

**Key Functions**:
```typescript
// Calculate strength gains
AnalyticsEngine.getStrengthProgress(userId: string, exerciseId: string): StrengthProgress

// Get training volume trends
AnalyticsEngine.getVolumeTrends(userId: string, weeks: number): VolumeData[]

// Calculate personal records
AnalyticsEngine.getPersonalRecords(userId: string): PersonalRecord[]

// Generate progress report
AnalyticsEngine.generateProgressReport(userId: string): ProgressReport
```

---

## 📊 Database Schema

### Core Tables
```sql
-- User profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  name TEXT,
  gender TEXT,
  experience TEXT,
  goals TEXT[]
);

-- Exercise library (259 exercises)
CREATE TABLE exercise_library (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  muscle_groups TEXT[],
  equipment TEXT[],
  progression_tier TEXT
);

-- Program templates
CREATE TABLE program_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  weeks INTEGER,
  days INTEGER,
  gender TEXT[],
  experience TEXT[],
  schedule JSONB
);

-- User's active programs
CREATE TABLE active_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  template_id TEXT REFERENCES program_templates(id),
  current_week INTEGER,
  current_day INTEGER,
  start_date DATE,
  template_data JSONB
);

-- Workout history
CREATE TABLE workout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  program_id UUID REFERENCES active_programs(id),
  week INTEGER,
  day INTEGER,
  exercises JSONB,
  completed_at TIMESTAMP
);
```

---

## 🔄 Data Flow Patterns

### 1. Authentication Flow
```
User Input → AuthService → Supabase Auth → JWT Token → AuthContext → App State
```

### 2. Program Selection Flow
```
Template Selection → ProgramStateManager → localStorage → Active Program → Current Workout
```

### 3. Workout Logging Flow
```
Workout Start → WorkoutSession → Set Logging → Progression Calculation → Workout Complete → History
```

### 4. Progress Calculation Flow
```
Workout History → Analytics Engine → Progress Metrics → UI Charts
```

---

## 🎨 UI Component System

### Design Principles
- **Mobile-First**: All components designed for phones first
- **Touch-Friendly**: Large tap targets (44px minimum)
- **Responsive**: Adapts to tablets and desktops
- **Accessible**: Proper ARIA labels and keyboard navigation

### Component Library
Based on **shadcn/ui** with custom extensions:

#### Core Components
- `Button` - Primary/secondary/outline variants
- `Card` - Section containers with headers
- `Dialog` - Modal overlays for forms
- `Input` - Form inputs with validation
- `Select` - Dropdown selections
- `Tabs` - Content switching
- `Toast` - Notifications

#### Custom Components
- `WorkoutLogger` - Main workout interface
- `ExerciseCard` - Individual exercise display
- `ProgressChart` - Strength/volume visualization
- `ProgramCard` - Program selection display
- `AnalyticsDashboard` - Progress overview

### Styling System
```css
/* Tailwind CSS with custom theme */
:root {
  --primary: 222.2 84% 4.9%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 96%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

/* Mobile-first responsive utilities */
@screen sm { /* Small tablets */ }
@screen md { /* Tablets */ }
@screen lg { /* Desktops */ }
@screen xl { /* Large desktops */ }
```

---

## 🔧 Development Workflow

### Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd LiftLog

# Install dependencies
npm install

# Environment variables
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Start development server
npm run dev
# App runs on http://localhost:3003
```

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test -- --run # Run tests once
```

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Flat config with Next.js rules
- **Prettier**: Consistent formatting (when added)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`

---

## 🧪 Testing Strategy

### Test Structure
```
tests/
├── workout-logger.smoke.test.tsx     # Integration tests
├── one-rm-context.test.tsx           # Unit tests
├── progression-router.registry.test.ts # Logic tests
└── components/                       # Component tests
```

### Running Tests
```bash
# Run all tests once
npm run test -- --run

# Run specific test file
npm run test -- --run tests/workout-logger.smoke.test.tsx

# Watch mode for development
npm run test
```

### Test Coverage
- ✅ Workout logger integration
- ✅ OneRm context functionality
- ✅ Progression router logic
- ✅ Component rendering
- ✅ User interactions

---

## 🚀 Deployment

### Production Build
```bash
# Build optimized version
npm run build

# Output in .next/ directory
# Static assets in .next/static/
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] Exercise library populated
- [ ] Build completes successfully
- [ ] All tests passing
- [ ] Performance optimized

### Vercel Deployment (Recommended)
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main
4. Custom domain configuration (optional)

---

## 🔍 Debugging & Monitoring

### Development Tools
```javascript
// Enable debug logging
window.LL.setDebug(true)

// View active program
JSON.parse(localStorage.getItem('liftlog_active_program'))

// Jump to specific week (testing)
let p = JSON.parse(localStorage.getItem('liftlog_active_program'))
p.currentWeek = 6
localStorage.setItem('liftlog_active_program', JSON.stringify(p))

// Clear all data
localStorage.clear()
```

### Error Handling
- **Error Boundaries**: Catch React rendering errors
- **Connection Monitoring**: Handle offline/online states
- **Validation**: Input validation before API calls
- **Fallbacks**: Graceful degradation for failures

### Performance Monitoring
- **Bundle Analysis**: `npm run analyze` (when configured)
- **Lighthouse**: Web vitals and performance scores
- **Database Queries**: Supabase query performance
- **User Analytics**: Vercel Analytics (when configured)

---

## 🔐 Security Considerations

### Authentication Security
- **JWT Tokens**: Secure token storage in localStorage
- **Row Level Security**: Supabase RLS policies
- **Input Validation**: Zod schemas for all inputs
- **HTTPS Only**: Production deployments only

### Data Protection
- **User Isolation**: RLS ensures users only see their data
- **Input Sanitization**: Prevent XSS attacks
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Rate Limiting**: API rate limiting (when configured)

---

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Bundle Size**: Tree shaking and dead code elimination
- **Caching**: Service worker for offline support

### Database Optimization
- **Indexing**: Proper indexes on frequently queried columns
- **Query Optimization**: Efficient Supabase queries
- **Connection Pooling**: Supabase handles automatically
- **Caching**: localStorage for frequently accessed data

---

## 🔄 State Management Patterns

### localStorage Keys
```typescript
// Critical: Use exact key names
'liftlog_user'              // Current user session
'liftlog_active_program'    // Active program state
'liftlog_in_progress_workouts' // Current workout sessions
'liftlog_workouts'          // Completed workout history
'liftlog_program_progress'  // Progress tracking
```

### React Context Usage
```typescript
// Auth Context - Global user state
const { user, loading } = useAuth()

// OneRM Context - 1RM data for progression
const { getOneRepMax } = useOneRm()

// Program Context - Active program state
const { activeProgram, updateProgram } = useProgram()
```

### Event-Driven Updates
```typescript
// Dispatch event when program changes
window.dispatchEvent(new Event("programChanged"))

// Listen for program changes
useEffect(() => {
  const handleProgramChange = () => {
    // Refresh UI components
  }
  window.addEventListener("programChanged", handleProgramChange)
  return () => window.removeEventListener("programChanged", handleProgramChange)
}, [])
```

---

## 🎯 Best Practices

### Code Organization
- **Feature-Based**: Group related files together
- **Separation of Concerns**: UI, logic, and data separate
- **Reusable Components**: Build composable UI components
- **Custom Hooks**: Extract complex logic into hooks

### Performance Patterns
- **Optimistic Updates**: Update UI immediately, sync later
- **Debouncing**: Prevent excessive API calls
- **Memoization**: React.memo, useMemo, useCallback
- **Lazy Loading**: Load components only when needed

### Error Handling
- **Graceful Degradation**: App works even with failures
- **User Feedback**: Clear error messages and loading states
- **Recovery Mechanisms**: Retry failed operations
- **Logging**: Comprehensive error logging for debugging

---

## 🚀 Future Enhancements

### Planned Features
- **Real-time Sync**: WebSocket for multi-device sync
- **Advanced Analytics**: More sophisticated progress tracking
- **Social Features**: Workout sharing and community
- **Mobile App**: React Native mobile application
- **AI Coach**: Intelligent workout recommendations

### Technical Improvements
- **Microservices**: Split into smaller services
- **Advanced Caching**: Redis for better performance
- **CDN**: Global content delivery
- **Monitoring**: Advanced error tracking and performance

---

## 📞 Support & Resources

### Documentation
- **User Guide**: `USER_GUIDE.md` - End-user documentation
- **API Reference**: Coming soon
- **Component Library**: Storybook (when added)

### Development Resources
- **Next.js Documentation**: https://nextjs.org/docs
- **Supabase Documentation**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs

### Community
- **GitHub Issues**: Report bugs and request features
- **Discord Community**: Developer discussions (coming soon)
- **Contributing Guide**: Guidelines for contributors

---

*This guide covers the core technical aspects of LiftLog. For specific implementation details, refer to the source code and inline documentation.*

*Last updated: October 2025*
*Version: 1.0 (Beta Complete)*
