# Application Logic Examples - Active Program Workflow

Based on your clarified business rules:
- Users must have an active program to start workouts
- One active program per user at a time
- Programs complete → workouts become historical (Programs > History tab)
- Existing workouts without programs are kept as NULL for manual linking

## Core Application Workflow

### 1. User Starts Workout

```javascript
// Before allowing user to start workout
async function startWorkout(userId, workoutData) {
  // Check if user has active program
  const canStart = await canUserStartWorkout(userId);
  if (!canStart) {
    throw new Error("You must select a program before starting a workout");
  }
  
  // Create workout with automatic program linking
  const workoutId = await createWorkoutWithProgram({
    workout_id: generateId(),
    user_id: userId,
    workout_name: workoutData.name,
    week: workoutData.week,
    day: workoutData.day,
    exercises: workoutData.exercises
  });
  
  return workoutId;
}
```

### 2. Get User's Current Workout with Program Context

```javascript
async function getCurrentWorkoutWithProgram(userId) {
  const { data, error } = await supabase
    .from('in_progress_workouts')
    .select(`
      id,
      workout_name,
      week,
      day,
      start_time,
      exercises,
      active_programs (
        template_id,
        current_week,
        current_day,
        template_data
      )
    `)
    .eq('user_id', userId)
    .eq('active_program_link', userId)
    .order('start_time', { ascending: false })
    .limit(1);
  
  return data?.[0] || null;
}
```

### 3. User Completes Program

```javascript
async function completeProgram(userId, completionType = 'completed') {
  // Get current active program
  const { data: activeProgram } = await supabase
    .from('active_programs')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!activeProgram) {
    throw new Error("No active program found");
  }
  
  // Move to history (you'll need a programs_history table)
  await supabase
    .from('programs_history')
    .insert({
      user_id: userId,
      template_id: activeProgram.template_id,
      start_week: activeProgram.start_week,
      end_week: activeProgram.current_week,
      completion_type: completionType, // 'completed' or 'ended_early'
      template_data: activeProgram.template_data,
      completed_at: new Date().toISOString()
    });
  
  // Delete active program (this sets active_program_link to NULL in workouts)
  await supabase
    .from('active_programs')
    .delete()
    .eq('user_id', userId);
  
  // Mark all in-progress workouts as completed
  await supabase
    .from('in_progress_workouts')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .is('active_program_link', null);
}
```

### 4. User Selects New Program

```javascript
async function selectNewProgram(userId, templateId, templateData) {
  // Check if user already has active program
  const { data: existingProgram } = await supabase
    .from('active_programs')
    .select('user_id')
    .eq('user_id', userId)
    .single();
  
  if (existingProgram) {
    throw new Error("User already has an active program");
  }
  
  // Create new active program
  const { data: newProgram } = await supabase
    .from('active_programs')
    .insert({
      user_id: userId,
      template_id: templateId,
      current_week: 1,
      current_day: 1,
      template_data: templateData
    })
    .select()
    .single();
  
  return newProgram;
}
```

## Database Helper Functions

The migration created these helper functions you can call directly:

### 1. Check if User Can Start Workout

```sql
-- Direct database call
SELECT can_user_start_workout('user-uuid-here');

-- Returns: true or false
```

### 2. Get User's Active Program

```sql
-- Get active program details
SELECT * FROM get_user_active_program('user-uuid-here');

-- Returns: template_id, current_week, current_day, template_data
```

### 3. Create Workout with Program Link

```sql
-- Create workout automatically linked to program
SELECT create_workout_with_program(
  'workout-id-123',
  'user-uuid-here',
  'Week 1 Day 1 - Full Body',
  1, -- week
  1, -- day
  '[{"exercise_id": "squat", "sets": 3}]'::jsonb
);

-- Returns: workout-id-123
```

## Frontend Integration Examples

### React Component: Workout Start Button

```jsx
function StartWorkoutButton({ userId }) {
  const [canStart, setCanStart] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkCanStart() {
      const { data } = await supabase
        .rpc('can_user_start_workout', { p_user_id: userId });
      
      setCanStart(data);
      setLoading(false);
    }
    
    checkCanStart();
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  
  if (!canStart) {
    return (
      <div className="alert">
        <p>You need to select a program before starting workouts</p>
        <Link to="/programs">Select Program</Link>
      </div>
    );
  }
  
  return (
    <button onClick={() => startWorkout(userId)}>
      Start Workout
    </button>
  );
}
```

### React Component: Current Workout Display

```jsx
function CurrentWorkout({ userId }) {
  const [workout, setWorkout] = useState(null);
  
  useEffect(() => {
    async function getCurrentWorkout() {
      const { data } = await supabase
        .from('in_progress_workouts')
        .select(`
          *,
          active_programs (
            template_id,
            current_week,
            current_day
          )
        `)
        .eq('user_id', userId)
        .eq('active_program_link', userId)
        .order('start_time', { ascending: false })
        .limit(1);
      
      setWorkout(data?.[0]);
    }
    
    getCurrentWorkout();
  }, [userId]);
  
  if (!workout) {
    return <div>No active workout</div>;
  }
  
  return (
    <div>
      <h3>{workout.workout_name}</h3>
      <p>Program: {workout.active_programs?.template_id}</p>
      <p>Week {workout.week}, Day {workout.day}</p>
      {/* Workout details */}
    </div>
  );
}
```

## Error Handling

### Common Error Scenarios

```javascript
// 1. User tries to start workout without program
try {
  await startWorkout(userId, workoutData);
} catch (error) {
  if (error.message.includes('must have an active program')) {
    // Redirect to program selection
    navigate('/programs');
  }
}

// 2. User tries to select program when already has one
try {
  await selectNewProgram(userId, templateId);
} catch (error) {
  if (error.message.includes('already has an active program')) {
    // Show confirmation to replace current program
    setShowReplaceProgramDialog(true);
  }
}

// 3. Workout creation fails due to missing program
try {
  const workoutId = await createWorkoutWithProgram(workoutData);
} catch (error) {
  if (error.message.includes('must have an active program')) {
    // Handle gracefully - maybe program was just completed
    refreshUserState();
  }
}
```

## Data Validation

### Before Workout Creation

```javascript
async function validateWorkoutCreation(userId) {
  // Check active program
  const { data: activeProgram } = await supabase
    .from('active_programs')
    .select('template_id, current_week, current_day')
    .eq('user_id', userId)
    .single();
  
  if (!activeProgram) {
    return { valid: false, error: 'No active program' };
  }
  
  // Check if user already has workout in progress
  const { data: existingWorkout } = await supabase
    .from('in_progress_workouts')
    .select('id')
    .eq('user_id', userId)
    .eq('active_program_link', userId)
    .is('completed_at', null)
    .single();
  
  if (existingWorkout) {
    return { valid: false, error: 'Workout already in progress' };
  }
  
  return { valid: true, activeProgram };
}
```

## Summary

This implementation enforces your business rules:

1. ✅ **Users must have active program to start workouts**
2. ✅ **One active program per user at a time**
3. ✅ **Program completion moves workouts to history**
4. ✅ **Existing workouts without programs preserved as NULL**
5. ✅ **Automatic program linking for new workouts**
6. ✅ **Proper error handling and user feedback**

The database functions handle the core logic, while the application code provides user-friendly interfaces and error handling.
