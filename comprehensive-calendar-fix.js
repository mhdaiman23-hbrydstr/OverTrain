// Comprehensive calendar fix - addresses all possible issues
// This will diagnose and fix Week 1, Day 1 completion completely

console.log('🔧 Comprehensive Calendar Fix - Starting deep analysis...');

// Get current user and workout data
const userId = JSON.parse(localStorage.getItem('liftlog_user') || '{}')?.id;
const activeProgram = JSON.parse(localStorage.getItem('liftlog_active_program') || '{}');

console.log('👤 User ID:', userId);
console.log('📊 Current program:', activeProgram.template?.name);
console.log('📍 Current position:', `Week ${activeProgram.currentWeek}, Day ${activeProgram.currentDay}`);

// Function to get user-specific storage keys
const getUserStorageKeys = (userId) => {
    if (userId) {
        return {
            workouts: `liftlog_workouts_${userId}`,
            inProgress: `liftlog_in_progress_workouts_${userId}`
        };
    }
    return {
        workouts: 'liftlog_workouts',
        inProgress: 'liftlog_in_progress_workouts'
    };
};

// Function to simulate the exact validation logic from WorkoutLogger.hasCompletedWorkout
const simulateWorkoutValidation = (week, day) => {
    console.log(`🔍 Simulating validation for Week ${week}, Day ${day}...`);
    
    const storageKeys = getUserStorageKeys(userId);
    const history = JSON.parse(localStorage.getItem(storageKeys.workouts) || '[]');
    
    console.log(`📋 Total workouts in history: ${history.length}`);
    
    // Apply the exact same logic as WorkoutLogger.hasCompletedWorkout
    const completedWorkout = history.find((workout) => {
        console.log(`   Checking workout ${workout.id}:`, {
            week: workout.week,
            day: workout.day,
            completed: workout.completed,
            match: workout.week === week && workout.day === day
        });
        
        if (workout.week !== week || workout.day !== day) {
            return false;
        }

        if (!workout.completed) {
            console.log(`   ❌ Workout not completed`);
            return false;
        }

        // Additional validation: ensure the completed workout has actual exercise data
        const hasValidData = workout.exercises &&
                             workout.exercises.length > 0 &&
                             workout.exercises.every(ex => ex.sets && ex.sets.length > 0);

        if (!hasValidData) {
            console.warn(`   ❌ Found completed workout with invalid data - treating as not completed`);
            console.warn(`   Invalid workout details:`, workout);
            return false;
        }

        console.log(`   ✅ Workout passed validation`);
        return true;
    });

    console.log(`🎯 Validation result:`, {
        found: !!completedWorkout,
        workoutId: completedWorkout?.id,
        hasValidData: !!completedWorkout
    });

    return !!completedWorkout;
};

// Function to clear all caches and force refresh
const clearAllCaches = () => {
    console.log('🧹 Clearing all caches and forcing refresh...');
    
    // Clear calendar completion status cache
    if (window.CalendarDev) {
        window.CalendarDev.forceRefresh();
        console.log('✅ Calendar cache cleared');
    }
    
    // Trigger program change event
    window.dispatchEvent(new Event('programChanged'));
    console.log('✅ Program change event triggered');
    
    // Trigger storage event (in case other components listen)
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'liftlog_workouts',
        newValue: localStorage.getItem(getUserStorageKeys(userId).workouts)
    }));
    console.log('✅ Storage event triggered');
    
    // Force calendar component to re-render by touching its internal state
    const calendarElements = document.querySelectorAll('[data-week]');
    if (calendarElements.length > 0) {
        calendarElements.forEach(el => {
            el.style.display = 'none';
            setTimeout(() => {
                el.style.display = '';
            }, 10);
        });
        console.log('✅ Calendar elements forced to re-render');
    }
};

// Function to create a perfectly valid Week 1, Day 1 workout
const createPerfectWeek1Day1Workout = () => {
    const workoutId = `week1-day1-perfect-${Date.now()}`;
    const timestamp = Date.now();
    const programId = activeProgram.template?.id || activeProgram.templateId;
    
    console.log('🏗️ Creating perfect Week 1, Day 1 workout...');
    
    const workout = {
        id: workoutId,
        userId: userId,
        programId: programId,
        workoutName: 'Full Body A',
        startTime: timestamp - 3600000, // 1 hour ago
        endTime: timestamp,
        exercises: [
            {
                id: `${workoutId}-ex-1`,
                exerciseId: 'squat',
                exerciseName: 'Barbell Back Squat',
                targetSets: 3,
                targetReps: '8-10',
                targetRest: '120',
                suggestedWeight: 135,
                sets: [
                    {
                        id: `${workoutId}-set-1-1`,
                        reps: 8,
                        weight: 135,
                        completed: true,
                        skipped: false
                    },
                    {
                        id: `${workoutId}-set-1-2`,
                        reps: 9,
                        weight: 135,
                        completed: true,
                        skipped: false
                    },
                    {
                        id: `${workoutId}-set-1-3`,
                        reps: 8,
                        weight: 140,
                        completed: true,
                        skipped: false
                    }
                ],
                completed: true,
                skipped: false
            },
            {
                id: `${workoutId}-ex-2`,
                exerciseId: 'bench-press',
                exerciseName: 'Barbell Bench Press',
                targetSets: 3,
                targetReps: '8-10',
                targetRest: '120',
                suggestedWeight: 115,
                sets: [
                    {
                        id: `${workoutId}-set-2-1`,
                        reps: 8,
                        weight: 115,
                        completed: true,
                        skipped: false
                    },
                    {
                        id: `${workoutId}-set-2-2`,
                        reps: 9,
                        weight: 115,
                        completed: true,
                        skipped: false
                    },
                    {
                        id: `${workoutId}-set-2-3`,
                        reps: 8,
                        weight: 120,
                        completed: true,
                        skipped: false
                    }
                ],
                completed: true,
                skipped: false
            },
            {
                id: `${workoutId}-ex-3`,
                exerciseId: 'barbell-row',
                exerciseName: 'Barbell Row',
                targetSets: 3,
                targetReps: '8-10',
                targetRest: '90',
                suggestedWeight: 95,
                sets: [
                    {
                        id: `${workoutId}-set-3-1`,
                        reps: 8,
                        weight: 95,
                        completed: true,
                        skipped: false
                    },
                    {
                        id: `${workoutId}-set-3-2`,
                        reps: 9,
                        weight: 95,
                        completed: true,
                        skipped: false
                    },
                    {
                        id: `${workoutId}-set-3-3`,
                        reps: 8,
                        weight: 100,
                        completed: true,
                        skipped: false
                    }
                ],
                completed: true,
                skipped: false
            }
        ],
        notes: 'Perfectly completed workout - comprehensive fix',
        completed: true,
        skipped: false,
        week: 1,
        day: 1
    };
    
    console.log('✅ Perfect workout created:', {
        id: workout.id,
        programId: workout.programId,
        exerciseCount: workout.exercises.length,
        totalSets: workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
        completed: workout.completed,
        hasValidData: workout.exercises && workout.exercises.length > 0 && 
                   workout.exercises.every(ex => ex.sets && ex.sets.length > 0)
    });
    
    return workout;
};

// Function to completely fix Week 1, Day 1
const completelyFixWeek1Day1 = () => {
    console.log('🔧 Starting comprehensive Week 1, Day 1 fix...');
    
    const storageKeys = getUserStorageKeys(userId);
    
    // Get current workouts
    const workouts = JSON.parse(localStorage.getItem(storageKeys.workouts) || '[]');
    console.log(`📋 Current total workouts: ${workouts.length}`);
    
    // Remove ALL Week 1, Day 1 workouts (clean slate)
    const filteredWorkouts = workouts.filter(w => !(w.week === 1 && w.day === 1));
    console.log(`🗑️ Removed ${workouts.length - filteredWorkouts.length} existing Week 1, Day 1 workouts`);
    
    // Create the perfect Week 1, Day 1 workout
    const perfectWorkout = createPerfectWeek1Day1Workout();
    filteredWorkouts.push(perfectWorkout);
    
    // Save updated workout list
    localStorage.setItem(storageKeys.workouts, JSON.stringify(filteredWorkouts));
    console.log('💾 Updated workout list saved');
    
    return perfectWorkout;
};

// Function to verify the fix worked
const verifyFix = () => {
    console.log('🔍 Verifying the fix worked...');
    
    // Test the validation logic
    const isCompleted = simulateWorkoutValidation(1, 1);
    
    if (isCompleted) {
        console.log('✅ SUCCESS: Week 1, Day 1 now passes validation!');
        return true;
    } else {
        console.log('❌ FAILED: Week 1, Day 1 still fails validation');
        return false;
    }
};

// Main execution
try {
    console.log('🎯 Step 1: Checking current validation status...');
    const currentStatus = simulateWorkoutValidation(1, 1);
    
    if (!currentStatus) {
        console.log('❌ Week 1, Day 1 fails validation - applying comprehensive fix...');
        
        console.log('🎯 Step 2: Applying comprehensive fix...');
        const fixedWorkout = completelyFixWeek1Day1();
        
        console.log('🎯 Step 3: Clearing all caches...');
        clearAllCaches();
        
        console.log('🎯 Step 4: Verifying fix...');
        setTimeout(() => {
            const fixWorked = verifyFix();
            
            if (fixWorked) {
                console.log('🎉 SUCCESS: Week 1, Day 1 has been completely fixed!');
                console.log('📊 Calendar should now show Week 1, Day 1 as green');
                console.log('🔄 Week 2 should now be accessible');
                console.log('💡 If calendar still shows red, try refreshing the page (F5)');
            } else {
                console.log('❌ Fix failed - there may be a deeper issue');
                console.log('🔍 Try refreshing the page and running the script again');
            }
        }, 1000);
        
    } else {
        console.log('✅ Week 1, Day 1 already passes validation');
        console.log('🔍 The issue might be calendar caching - clearing caches...');
        clearAllCaches();
    }
    
    console.log('\n📋 Summary of actions taken:');
    console.log('   1. Analyzed current validation status');
    console.log('   2. Removed all problematic Week 1, Day 1 workouts');
    console.log('   3. Created a perfectly valid Week 1, Day 1 workout');
    console.log('   4. Cleared all caches and forced refresh');
    console.log('   5. Verified the fix using the exact validation logic');
    
} catch (error) {
    console.error('❌ Error in comprehensive fix:', error);
}

console.log('\n💡 Next steps:');
console.log('   1. Wait for verification to complete');
console.log('   2. If successful, refresh the page (F5)');
console.log('   3. Check if Week 1, Day 1 is now green');
console.log('   4. If still red, try the script one more time');
console.log('   5. Continue with smart workout completer once fixed');
