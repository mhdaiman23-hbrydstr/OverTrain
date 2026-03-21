# OverTrain: Go One More

**Modern workout tracking application for hypertrophy, strength, and athletic training**

Built with Next.js 14, TypeScript, Supabase, and Tailwind CSS.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (localhost:3003)
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Run tests
npm run test

# Lint code
npm run lint
```

---

## 📋 Prerequisites

### Required Environment Variables
Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup
1. Create Supabase project at https://supabase.com
2. Run schema files in order:
   - `migrations/supabase-schema.sql` - Core tables (users, profiles)
   - `exercise-library-schema.sql` - Exercise database (259 exercises)
   - `program-templates-schema.sql` - Template storage

---

## 🏗️ Architecture Overview

### Core Components
- **Authentication**: Supabase Auth with email/password
- **Database**: PostgreSQL via Supabase (database-first architecture)
- **State Management**: React Context + localStorage caching
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Testing**: Vitest + React Testing Library

### Key Features
- ✅ **259 validated exercises** with muscle group & equipment metadata
- ✅ **Admin template builder** - create workout programs via UI (no code required)
- ✅ **5-tier progression system** - adaptive weight progression based on exercise type
- ✅ **Automatic deload weeks** - built into all programs for recovery
- ✅ **Mobile-first responsive design** - optimized for all screen sizes
- ✅ **Real-time database sync** - workout data persisted to Supabase
- ✅ **One-rep-max tracking** - percentage-based progression support

---

## 📁 Project Structure

```
OverTrain/
├── app/                          # Next.js app directory
│   ├── page.tsx                 # Main app shell with view routing
│   └── layout.tsx               # Root layout with providers
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── workout-logger/          # Workout logging system (refactored)
│   │   ├── workout-logger.tsx   # Main orchestrator
│   │   ├── components/          # UI components (header, dialogs, etc.)
│   │   ├── hooks/               # Business logic (use-workout-session.ts)
│   │   └── contexts/            # React contexts (OneRmProvider)
│   └── templates/               # Admin template builder
│       ├── admin-template-builder.tsx
│       ├── exercise-library-panel.tsx
│       └── schedule-panel.tsx
├── lib/
│   ├── auth.ts                  # Authentication service
│   ├── supabase.ts              # Supabase client
│   ├── workout-logger.ts        # Core workout logic
│   ├── program-state.ts         # Active program management
│   ├── gym-templates.ts         # Hardcoded fallback templates
│   ├── progression-router.ts    # Progression strategy routing
│   ├── progression-engines/     # Progression calculation engines
│   │   ├── linear-engine.ts     # Linear progression
│   │   ├── percentage-engine.ts # Percentage-based (1RM)
│   │   └── adaptive-engine.ts   # Adaptive volume compensation
│   └── services/
│       ├── exercise-library-service.ts
│       └── program-template-service.ts
├── contexts/
│   └── auth-context.tsx         # Global auth state
├── tests/                       # Vitest test suite
│   ├── workout-logger.smoke.test.tsx
│   ├── one-rm-context.test.tsx
│   └── progression-router.registry.test.ts
├── migrations/                  # SQL migrations & baseline schema
│   └── supabase-schema.sql      # Core database schema
├── docs/                        # Setup guides & runbooks
└── signing/                     # Local Apple keys/certs (gitignored patterns; optional)
```

---

## 🎯 Core Workflows

### Starting a Workout
1. User signs in → auth-context.tsx
2. Select active program → program-state.ts
3. Start workout → workout-logger.tsx
4. Log sets → use-workout-session.ts hook
5. Complete → saves to Supabase + advances program

### Creating Templates (Admin)
1. Navigate to Admin Template Builder
2. Search exercise library (259 exercises)
3. Drag exercises to schedule days
4. Configure progression defaults
5. Publish → saves to `program_templates` table
6. **No code deployment needed!**

### Progression System
```typescript
// Automatic tier-based progression
large_compound:  5lb min, 2.5% weekly (squat, deadlift)
medium_compound: 2.5lb min, 2.5% weekly (bench, rows)
small_compound:  2.5lb min, 2.0% weekly (pull-ups, dips)
large_isolation: 2.5lb min, 2.0% weekly (leg extensions)
small_isolation: 1lb min, 1.5% weekly (curls, raises)
```

---

## 🧪 Testing

### Test Suite
```bash
# Run all tests
npm run test -- --run

# Run specific test file
npm run test -- --run tests/workout-logger.smoke.test.tsx

# Watch mode (interactive)
npm run test
```

### Test Coverage
- ✅ Workout logger integration tests
- ✅ OneRm context unit tests
- ✅ Progression router registry tests
- ✅ Component rendering tests

---

## 📊 Data Architecture

### localStorage Keys
- `liftlog_user` - Current user session
- `liftlog_active_program` - Active program with week/day tracking
- `liftlog_in_progress_workouts_${userId}` - User-specific in-progress workouts
- `liftlog_workouts_${userId}` - User-specific completed workout history

### Database Tables (Supabase)
- `profiles` - User profiles (gender, experience, goals)
- `exercise_library` - 259 exercises with metadata
- `program_templates` - Database-driven workout templates
- `active_programs` - User's currently active program
- `in_progress_workouts` - Workouts being logged
- `workout_history` - Completed workouts

### Data Flow
```
User Action → Database Update → Optimistic UI Update → localStorage Cache
     ↓              ↓                    ↓                    ↓
UI Response   Single Source      Real-time Feedback    Fast Access
```

---

## 🛠️ Development Tools

### Browser Console Commands
```javascript
// Enable debug logging (see DEBUG_GUIDE.md for details)
window.LL.setDebug(true)  // Enable verbose logs
window.LL.setDebug(false) // Disable verbose logs

// View active program
JSON.parse(localStorage.getItem('liftlog_active_program'))

// Jump to specific week (testing)
let p = JSON.parse(localStorage.getItem('liftlog_active_program'))
p.currentWeek = 6
p.currentDay = 1
localStorage.setItem('liftlog_active_program', JSON.stringify(p))
location.reload()

// Clear all local data
localStorage.clear()
location.reload()

// Development tools
window.LL.clearLocal()                 // Clear all OverTrain cache
window.LL.getLocalStorageInfo()        // View storage keys
window.LL.getCacheInfo()                // View cache sizes (KB)
```

### Path Aliases
Uses `@/*` for root-level imports:
```typescript
import { AuthService } from "@/lib/auth"
import { Button } from "@/components/ui/button"
```

---

## 📖 Documentation

Project guides and runbooks live under [`docs/`](./docs/) (iOS/Android signing, EAS, Codemagic, OAuth, security, etc.).

### Essential Reading
- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive architecture guide for AI coding
- **[DEVELOPMENT_TIMELINE.md](./DEVELOPMENT_TIMELINE.md)** - Historical development timeline (Oct 2-11, 2025)
- **[CHECKPOINT_SUMMARY.md](./CHECKPOINT_SUMMARY.md)** - Current state & latest achievements
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing procedures & best practices
- **[DEBUG_GUIDE.md](./DEBUG_GUIDE.md)** - Debug mode & development tools guide

### Quick References
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Deload system quick guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Deload implementation details
- **[ADAPTIVE_PROGRESSION_SUMMARY.md](./ADAPTIVE_PROGRESSION_SUMMARY.md)** - 5-tier progression system
- **[enhancement_backlog.md](./enhancement_backlog.md)** - Future enhancements & roadmap

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] Run `npm run build` - ensure successful compilation
- [ ] Run `npm run test -- --run` - all tests passing
- [ ] Run `npm run lint` - no critical errors
- [ ] Verify `.env.local` has production Supabase credentials
- [ ] Database schema deployed to production Supabase
- [ ] Exercise library populated (259 exercises)
- [ ] At least one template published via admin builder

### Build Targets
```bash
# Production build
npm run build

# Output directory: .next/
# Static assets: .next/static/
```

---

## 🔑 Key Decisions & Patterns

### Why Database-First?
- **Before**: Hardcoded templates in code → required deployment for new programs
- **After**: Database-driven → create templates via UI, zero code deployments
- **Result**: 95% reduction in template creation time (2-4 hours → 5-10 minutes)

### Why Modular Component Architecture?
- **Before**: Monolithic 2000+ line WorkoutLogger component
- **After**: Extracted hooks, contexts, and UI components
- **Result**: Easier testing, better maintainability, clearer separation of concerns

### Why Tier-Based Progression?
- **Before**: One-size-fits-all progression increments
- **After**: Exercise-specific progression based on movement patterns
- **Result**: Safer progression, reduced injury risk, better user experience

---

## 🤝 Contributing

### Code Style
- TypeScript strict mode enabled
- ESLint 9 with flat config (see `eslint.config.mjs`)
- Prettier for formatting (when added)
- React hooks best practices

### Commit Guidelines
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Reference issues/PRs where applicable
- Keep commits focused and atomic

---

## 📄 License

[Add your license here]

---

## 🆘 Support & Issues

For bugs, feature requests, or questions:
- Create an issue in the repository
- Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for troubleshooting
- Review [CLAUDE.md](./CLAUDE.md) for architecture details

---

**Current Status**: ✅ Production Ready
**Latest Update**: October 11, 2025
**Version**: 1.0.0 (Admin Template Builder Launch)
