// Run this script to fix Week 1, Day 1 completion issue
// This will ensure Week 1, Day 1 is properly marked as completed

console.log('🔧 Fixing Week 1, Day 1 completion issue...');

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

// Function to check Week 1, Day 1 completion status
const checkWeek1Day1Status = () => {
    const storageKeys = getUserStorageKeys(userId);
    const workouts = JSON.parse(localStorage.getItem(storageKeys.workouts) || '[]');
    
    console.log(`📋 Total workouts in storage: ${workouts.length}`);
    
    // Find Week 1, Day 1 workouts
    const week1Day1Workouts = workouts.filter(w => w.week === 1 && w.day === 1);
    console.log(`🔍 Found ${week1Day1Workouts.length} workouts for Week 1, Day 1`);
    
    week1Day1Workouts.forEach((workout, index) => {
        console.log(`   Workout ${index + 1}:`, {
            id: workout.id,
            completed: workout.completed,
            exerciseCount: workout.exercises?.length || 0,
            hasValidExercises: workout.exercises?.every(ex => ex.sets && ex.sets.length > 0),
            skipped: workout.skipped,
            programId: workout.programId
        });
    });
    
    return week1Day1Workouts;
};

// Function to create a proper Week 1, Day 1 workout
const createProperWeek1Day1Workout = () => {
    const workoutId = `week1-day1-${Date.now()}`;
    const timestamp = Date.now();
    
    const workout = {
        id: workoutId,
        userId: userId,
        programId: activeProgram.template?.id || activeProgram.templateId,
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
        notes: 'Properly completed workout - fixed by script',
        completed: true,
        skipped: false,
        week: 1,
        day: 1
    };
    
    return workout;
};

// Function to fix Week 1, Day 1
const fixWeek1Day1 = () => {
    console.log('🔧 Starting Week 1, Day 1 fix...');
    
    const storageKeys = getUserStorageKeys(userId);
    const workouts = JSON.parse(localStorage.getItem(storageKeys.workouts) || '[]');
    const week1Day1Workouts = checkWeek1Day1Status();
    
    // Remove existing Week 1, Day 1 workouts (they're problematic)
    const filteredWorkouts = workouts.filter(w => !(w.week === 1 && w.day === 1));
    console.log(`🗑️ Removed ${workouts.length - filteredWorkouts.length} existing Week 1, Day 1 workouts`);
    
    // Create a proper Week 1, Day 1 workout
    const properWorkout = createProperWeek1Day1Workout();
    filteredWorkouts.push(properWorkout);
    
    // Save updated workout list
    localStorage.setItem(storageKeys.workouts, JSON.stringify(filteredWorkouts));
    
    console.log('✅ Week 1, Day 1 fix completed!');
    console.log('📋 New workout created:', {
        id: properWorkout.id,
        exerciseCount: properWorkout.exercises.length,
        totalSets: properWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
        completed: properWorkout.completed
    });
    
    return properWorkout;
};

// Main execution
try {
    const existingWorkouts = checkWeek1Day1Status();
    
    if (existingWorkouts.length === 0 || !existingWorkouts.some(w => w.completed && w.exercises?.every(ex => ex.sets && ex.sets.length > 0))) {
        console.log('❌ Week 1, Day 1 is missing or has invalid data - fixing now...');
        const fixedWorkout = fixWeek1Day1();
        
        console.log('🎯 Week 1, Day 1 has been fixed!');
        console.log('📊 The calendar should now show Week 1, Day 1 as completed (green)');
        console.log('🔄 Refresh the page or navigate to see the updated calendar');
        
        // Trigger calendar refresh
        window.dispatchEvent(new Event('programChanged'));
        
    } else {
        console.log('✅ Week 1, Day 1 already has valid completion data');
    }
    
    console.log('\n📋 Summary:');
    console.log('   - Week 1, Day 1 should now be properly completed');
    console.log('   - Calendar should show green for Week 1, Day 1');
    console.log('   - Week 2 should now be accessible');
    console.log('   - You can continue with the smart workout completer');
    
} catch (error) {
    console.error('❌ Error fixing Week 1, Day 1:', error);
}

console.log('\n💡 Next steps:');
console.log('   1. Refresh the page to see the updated calendar');
console.log('   2. Verify Week 1, Day 1 is now green');
console.log('   3. Continue with the smart workout completer script');
console.log('   4. Week 2 should now be accessible');
