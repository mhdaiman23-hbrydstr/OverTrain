// Run this script in the browser console of your LiftLog app
// This will create complete workout history for Weeks 1-6, Day 2 with dummy data

console.log('🏋️ Creating complete workout history for Weeks 1-6, Day 2...');

// Step 1: Get current active program
const activeProgram = JSON.parse(localStorage.getItem('liftlog_active_program') || '{}');
if (!activeProgram.templateId) {
    console.error('❌ No active program found. Please start a program first.');
} else {
    console.log('📋 Current program:', activeProgram.template?.name);
    
    // Step 2: Create complete workout history for Weeks 1-6, Day 2
    const workoutHistory = [];
    
    // Exercise templates for each day
    const exerciseTemplates = {
        day1: [
            { exerciseId: 'squat', exerciseName: 'Barbell Back Squat', muscleGroup: 'Legs' },
            { exerciseId: 'bench', exerciseName: 'Barbell Bench Press', muscleGroup: 'Chest' },
            { exerciseId: 'row', exerciseName: 'Barbell Row', muscleGroup: 'Back' }
        ],
        day2: [
            { exerciseId: 'deadlift', exerciseName: 'Romanian Deadlift', muscleGroup: 'Legs' },
            { exerciseId: 'incline', exerciseName: 'Incline Barbell Press', muscleGroup: 'Chest' },
            { exerciseId: 'lateral', exerciseName: 'Lateral Raises', muscleGroup: 'Shoulders' }
        ],
        day3: [
            { exerciseId: 'frontsquat', exerciseName: 'Barbell Front Squat', muscleGroup: 'Legs' },
            { exerciseId: 'overhead', exerciseName: 'Overhead Press', muscleGroup: 'Shoulders' },
            { exerciseId: 'curls', exerciseName: 'Barbell Curls', muscleGroup: 'Arms' }
        ]
    };
    
    // Generate workouts for Weeks 1-6, Day 2
    for (let week = 1; week <= 6; week++) {
        for (let day = 1; day <= 3; day++) {
            // Skip Week 6, Day 3 (that's what we'll test)
            if (week === 6 && day === 3) continue;
            
            const exercises = exerciseTemplates[`day${day}`];
            const workoutExercises = exercises.map(ex => ({
                exerciseId: ex.exerciseId,
                exerciseName: ex.exerciseName,
                muscleGroup: ex.muscleGroup,
                sets: [
                    { reps: 8, weight: 135 + (week - 1) * 5, rpe: 7, restTime: 120 },
                    { reps: 8, weight: 135 + (week - 1) * 5, rpe: 7.5, restTime: 120 },
                    { reps: 8, weight: 135 + (week - 1) * 5, rpe: 8, restTime: 120 }
                ]
            }));
            
            workoutHistory.push({
                id: `workout-${week}-${day}`,
                user_id: '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c',
                program_id: activeProgram.templateId,
                workout_name: `Week ${week} Day ${day}`,
                week: week,
                day: day,
                completed: true,
                start_time: Date.now() - (1000 * 60 * 60 * 24 * (6 - week) * 7) - (day * 1000 * 60 * 60 * 24),
                end_time: Date.now() - (1000 * 60 * 60 * 24 * (6 - week) * 7) - (day * 1000 * 60 * 60 * 24) + (1000 * 60 * 45),
                exercises: workoutExercises,
                notes: null,
                created_at: new Date(Date.now() - (1000 * 60 * 60 * 24 * (6 - week) * 7)).toISOString(),
                updated_at: new Date(Date.now() - (1000 * 60 * 60 * 24 * (6 - week) * 7)).toISOString()
            });
        }
    }
    
    // Step 3: Save complete workout history
    localStorage.setItem('liftlog_workouts', JSON.stringify(workoutHistory));
    
    // Step 4: Update program state
    activeProgram.currentWeek = 6;
    activeProgram.currentDay = 2;
    activeProgram.completedWorkouts = 17; // All workouts except Week 6, Day 3
    activeProgram.progress = (activeProgram.completedWorkouts / activeProgram.totalWorkouts) * 100;
    localStorage.setItem('liftlog_active_program', JSON.stringify(activeProgram));
    
    // Step 5: Clear any problematic data
    localStorage.removeItem('liftlog_in_progress_workouts');
    localStorage.removeItem('liftlog_program_history');
    localStorage.removeItem('liftlog_program_progress');
    
    console.log(`✅ Created ${workoutHistory.length} complete workouts`);
    console.log('📊 Program state: Week 6, Day 2 (17/18 workouts completed)');
    console.log('🎯 Next workout: Week 6, Day 3 (FINAL WORKOUT!)');
    console.log('');
    console.log('🔄 Refreshing page to load the complete workout history...');
    
    // Force page reload
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}
