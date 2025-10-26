# Race Condition Analysis Report

**Analysis of potential race conditions in LiftLog application**

---

## 🔍 Executive Summary

After analyzing the core systems in LiftLog, I've identified several potential race conditions and areas of concern. The application uses a dual-write pattern (localStorage + database) which introduces complexity around data consistency.

---

## 🚨 Critical Race Conditions

### 1. **Program State Management** (`lib/program-state.ts`)

**Issue**: Concurrent program state updates
```typescript
// PROBLEM: Multiple async operations can modify active program simultaneously
static async setActiveProgram(templateId: string): Promise<ActiveProgram | null>
static async completeWorkout(): Promise<void>
static async recalculateProgress(): Promise<void>
```

**Race Condition Scenarios**:
- User completes workout while simultaneously switching programs
- Auto-progress calculation runs while user manually changes week/day
- Database sync conflicts with localStorage updates

**Impact**: Data corruption, lost progress, inconsistent state

**Mitigation Needed**:
```typescript
// Add locking mechanism
private static programStateLock = false

static async setActiveProgram(templateId: string): Promise<ActiveProgram | null> {
  if (this.programStateLock) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return this.setActiveProgram(templateId) // Retry
  }
  
  this.programStateLock = true
  try {
    // ... existing logic
  } finally {
    this.programStateLock = false
  }
}
```

### 2. **Workout Session Management** (`lib/workout-logger.ts`)

**Issue**: Multiple workout sessions for same week/day
```typescript
// PROBLEM: No uniqueness constraint for concurrent workout starts
static async startWorkout(workoutDay: WorkoutDay): Promise<WorkoutSession>
```

**Race Condition Scenarios**:
- User double-clicks "Start Workout" button
- Multiple tabs open with same workout
- Network delay causes duplicate session creation

**Impact**: Duplicate workouts, data loss, confusion

**Mitigation Needed**:
```typescript
// Add session deduplication
static async startWorkout(workoutDay: WorkoutDay): Promise<WorkoutSession> {
  const sessionKey = `workout-${workoutDay.week}-${workoutDay.day}`
  
  // Check if session already exists
  const existingSession = this.getInProgressWorkout(workoutDay.week, workoutDay.day)
  if (existingSession) {
    return existingSession // Return existing instead of creating duplicate
  }
  
  // ... create new session
}
```

### 3. **Data Sync Service** (`lib/data-sync-service.ts`)

**Issue**: Concurrent sync operations on same data
```typescript
// PROBLEM: Multiple sync operations can overwrite each other
static async saveWorkoutOptimistic(workout: WorkoutSession, userId: string, localStorageKey: string)
static async saveSetOptimistic(...)
```

**Race Condition Scenarios**:
- Rapid set logging (multiple sets in quick succession)
- Workout completion while sets still syncing
- Network retry conflicts with new data

**Impact**: Data loss, inconsistent sync state, corrupted workout data

**Current Mitigations** ✅:
- Sync queue with retry logic
- Exponential backoff for retries
- Operation deduplication by ID

**Additional Mitigations Needed**:
```typescript
// Add operation versioning
interface SyncOperation {
  id: string
  version: number
  timestamp: number
  // ... other fields
}

// Check for newer versions before applying
private static isNewerOperation(newOp: SyncOperation, existingOp: SyncOperation): boolean {
  return newOp.timestamp > existingOp.timestamp
}
```

---

## ⚠️ Medium Priority Race Conditions

### 4. **Session Manager** (`lib/session-manager.ts`)

**Issue**: Concurrent token refresh attempts
```typescript
// PROBLEM: Multiple refresh calls can interfere
static async refreshSession(): Promise<boolean>
```

**Race Condition Scenarios**:
- Multiple components detect expiring token simultaneously
- Manual refresh while auto-refresh in progress
- Network timeout causes retry conflicts

**Current Mitigations** ✅:
- `isRefreshing` flag prevents concurrent refreshes
- Rate limiting with `MIN_REFRESH_INTERVAL_MS`
- Proper error handling and cleanup

**Status**: **WELL PROTECTED** ✅

### 5. **Authentication Context** (`contexts/auth-context.tsx`)

**Issue**: Multiple auth state changes
```typescript
// PROBLEM: Auth state can change from multiple sources
supabase.auth.onAuthStateChange()
```

**Race Condition Scenarios**:
- Token refresh while user manually signing out
- Multiple tabs with different auth states
- Network issues causing state inconsistencies

**Current Mitigations** ✅:
- Single auth state source
- Event-driven updates
- Proper cleanup on unmount

**Status**: **ADEQUATELY PROTECTED** ✅

---

## 📊 Low Priority Concerns

### 6. **localStorage Operations**

**Issue**: Concurrent localStorage access
```typescript
// PROBLEM: localStorage is synchronous but can be called concurrently
localStorage.setItem(key, JSON.stringify(data))
const data = JSON.parse(localStorage.getItem(key))
```

**Race Condition Scenarios**:
- Multiple components writing same key simultaneously
- Read during write operation
- Storage quota exceeded during write

**Impact**: Data corruption, write failures

**Mitigation Strategy**:
```typescript
// Add localStorage wrapper with locking
class LocalStorageManager {
  private static locks = new Map<string, boolean>()
  
  static async setItem(key: string, value: any): Promise<void> {
    while (this.locks.get(key)) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    this.locks.set(key, true)
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } finally {
      this.locks.delete(key)
    }
  }
}
```

---

## 🛡️ Recommended Fixes

### Immediate Actions (High Priority)

1. **Add Program State Locking**
   ```typescript
   // In lib/program-state.ts
   private static programStateLock = false
   private static lockQueue: Array<() => void> = []
   
   private static async acquireLock(): Promise<void> {
     if (this.programStateLock) {
       return new Promise(resolve => this.lockQueue.push(resolve))
     }
     this.programStateLock = true
   }
   
   private static releaseLock(): void {
     this.programStateLock = false
     const next = this.lockQueue.shift()
     if (next) next()
   }
   ```

2. **Implement Workout Session Deduplication**
   ```typescript
   // In lib/workout-logger.ts
   private static activeSessions = new Map<string, WorkoutSession>()
   
   static async startWorkout(workoutDay: WorkoutDay): Promise<WorkoutSession> {
     const sessionKey = `${workoutDay.week}-${workoutDay.day}`
     
     if (this.activeSessions.has(sessionKey)) {
       return this.activeSessions.get(sessionKey)!
     }
     
     // ... create and store session
   }
   ```

3. **Add Sync Operation Versioning**
   ```typescript
   // In lib/data-sync-service.ts
   private static operationVersions = new Map<string, number>()
   
   private static shouldApplyOperation(operation: SyncOperation): boolean {
     const currentVersion = this.operationVersions.get(operation.id) || 0
     if (operation.version > currentVersion) {
       this.operationVersions.set(operation.id, operation.version)
       return true
     }
     return false
   }
   ```

### Medium-Term Improvements

4. **Implement Event Sourcing Pattern**
   - Store all state changes as immutable events
   - Rebuild state from event log
   - Prevents race conditions by design

5. **Add Database Constraints**
   ```sql
   -- Prevent duplicate workouts
   ALTER TABLE in_progress_workouts 
   ADD CONSTRAINT unique_user_week_day 
   UNIQUE (user_id, week, day);
   
   -- Prevent concurrent program changes
   ALTER TABLE active_programs 
   ADD CONSTRAINT unique_user_program 
   UNIQUE (user_id);
   ```

6. **Implement Optimistic Locking**
   ```typescript
   interface VersionedData {
     id: string
     version: number
     data: any
     lastModified: number
   }
   
   // Only update if version matches
   static async updateWithVersion(
     id: string, 
     expectedVersion: number, 
     updates: any
   ): Promise<boolean> {
     const current = await this.getById(id)
     if (current.version !== expectedVersion) {
       return false // Version conflict
     }
     
     // Apply updates with new version
     return await this.save({ ...current, ...updates, version: current.version + 1 })
   }
   ```

---

## 🧪 Testing Strategy

### Race Condition Tests

1. **Concurrent Program Changes**
   ```typescript
   test('concurrent program changes', async () => {
     const promises = [
       ProgramStateManager.setActiveProgram('template1'),
       ProgramStateManager.completeWorkout(),
       ProgramStateManager.recalculateProgress()
     ]
     
     await Promise.all(promises)
     
     // Verify consistent state
     const program = await ProgramStateManager.getActiveProgram()
     expect(program).toBeValid()
   })
   ```

2. **Duplicate Workout Prevention**
   ```typescript
   test('duplicate workout prevention', async () => {
     const workoutDay = { week: 1, day: 1, exercises: [] }
     
     const [session1, session2] = await Promise.all([
       WorkoutLogger.startWorkout(workoutDay),
       WorkoutLogger.startWorkout(workoutDay)
     ])
     
     expect(session1.id).toBe(session2.id) // Should be same session
   })
   ```

3. **Sync Queue Ordering**
   ```typescript
   test('sync queue ordering', async () => {
     const operations = [
       { type: 'set', data: { reps: 10, weight: 100 } },
       { type: 'set', data: { reps: 8, weight: 105 } },
       { type: 'workout_completion', data: {} }
     ]
     
     // Process out of order
     await Promise.all(operations.map(op => DataSyncService.addToSyncQueue(op)))
     
     // Verify correct final state
     const finalState = await DataSyncService.forceSyncAll()
     expect(finalState).toMatchExpectedState()
   })
   ```

---

## 📈 Monitoring & Detection

### Runtime Race Condition Detection

```typescript
class RaceConditionDetector {
  private static activeOperations = new Map<string, number>()
  
  static startOperation(type: string, id: string): void {
