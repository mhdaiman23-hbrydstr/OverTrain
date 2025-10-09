// Run this script in the browser console of your LiftLog app
// This version safely restores your program using actual template data

console.log('🏋️ Safely restoring program for testing...');

// Step 1: Clear any problematic active program first
localStorage.removeItem('liftlog_active_program');
console.log('🗑️ Cleared any existing active program');

// Step 2: Get program history and workout data
const programHistory = localStorage.getItem('liftlog_program_history');
const workouts = localStorage.getItem('liftlog_workouts');

if (!programHistory) {
    console.error('❌ No program history found. Cannot restore program.');
    console.log('💡 You may need to start a new program to test the fix.');
} else {
    try {
        const history = JSON.parse(programHistory);
        console.log('📋 Found program history:', history.length, 'entries');
        
        // Find the most recent completed program
        const lastProgram = history.find(p => !p.isActive && p.templateId === 'fullbody-3day-beginner-female');
        
        if (!lastProgram) {
            console.error('❌ No completed program found with template ID "fullbody-3day-beginner-female"');
            console.log('💡 Available programs:', history.map(p => `${p.name} (${p.templateId}) - Active: ${p.isActive}`));
        } else {
            console.log('✅ Found completed program:', lastProgram.name);
            
            // Try to get actual template data from workouts
            let actualTemplateData = null;
            
            if (workouts) {
                const workoutData = JSON.parse(workouts);
                const week1Workout = workoutData.find(w => w.week === 1 && w.day === 1);
                
                if (week1Workout && week1Workout.exercises) {
                    // Reconstruct template from actual workout data
                    actualTemplateData = {
                        id: lastProgram.templateId,
                        name: lastProgram.name,
                        weeks: 6,
                        category: 'fullbody',
                        difficulty: 'beginner',
                        description: 'Full body workout program',
                        schedule: {
                            day1: { 
                                name: 'Full Body A', 
                                exercises: week1Workout.exercises.map(ex => ({
                                    id: ex.exerciseId || ex.exerciseName.toLowerCase().replace(/\s+/g, '-'),
                                    exerciseName: ex.exerciseName,
                                    category: ex.muscleGroup || 'unknown',
                                    restTime: 120
                                }))
                            },
                            day2: { 
                                name: 'Full Body B', 
                                exercises: [] // Will be populated from other workouts
                            },
                            day3: { 
                                name: 'Full Body C', 
                                exercises: [] // Will be populated from other workouts
                            }
                        }
                    };
                    
                    // Try to get exercises from other days
                    const day2Workout = workoutData.find(w => w.week === 1 && w.day === 2);
                    const day3Workout = workoutData.find(w => w.week === 1 && w.day === 3);
                    
                    if (day2Workout && day2Workout.exercises) {
                        actualTemplateData.schedule.day2.exercises = day2Workout.exercises.map(ex => ({
                            id: ex.exerciseId || ex.exerciseName.toLowerCase().replace(/\s+/g, '-'),
                            exerciseName: ex.exerciseName,
                            category: ex.muscleGroup || 'unknown',
                            restTime: 120
                        }));
                    }
                    
                    if (day3Workout && day3Workout.exercises) {
                        actualTemplateData.schedule.day3.exercises = day3Workout.exercises.map(ex => ({
                            id: ex.exerciseId || ex.exerciseName.toLowerCase().replace(/\s+/g, '-'),
                            exerciseName: ex.exerciseName,
                            category: ex.muscleGroup || 'unknown',
                            restTime: 120
                        }));
                    }
                }
            }
            
            if (!actualTemplateData) {
                console.error('❌ Could not reconstruct template data from workouts');
                console.log('💡 Using minimal template structure');
                
                // Fallback to minimal structure
                actualTemplateData = {
                    id: lastProgram.templateId,
                    name: lastProgram.name,
                    weeks: 6,
                    category: 'fullbody',
                    difficulty: 'beginner',
                    description: 'Full body workout program',
                    schedule: {
                        day1: { name: 'Full Body A', exercises: [] },
                        day2: { name: 'Full Body B', exercises: [] },
                        day3: { name: 'Full Body C', exercises: [] }
                    }
                };
            }
            
            // Restore the active program with actual template data
            const restoredProgram = {
                templateId: lastProgram.templateId,
                template: actualTemplateData,
                startDate: new Date(lastProgram.startDate).getTime(),
                currentWeek: 6,
                currentDay: 2,
                completedWorkouts: 17,
                totalWorkouts: 18,
                progress: (17/18) * 100
            };
            
            // Save the restored program
            localStorage.setItem('liftlog_active_program', JSON.stringify(restoredProgram));
            
            // Remove Week 6, Day 3 completion from workout history
            if (workouts) {
                const workoutData = JSON.parse(workouts);
                const filteredWorkouts = workoutData.filter(w => !(w.week === 6 && w.day === 3 && w.completed));
                localStorage.setItem('liftlog_workouts', JSON.stringify(filteredWorkouts));
                console.log('🗑️ Removed Week 6, Day 3 completion from workout history');
            }
            
            // Remove Week 6, Day 3 from in-progress workouts
            const inProgress = localStorage.getItem('liftlog_in_progress_workouts');
            if (inProgress) {
                const inProgressData = JSON.parse(inProgress);
                const filteredInProgress = inProgressData.filter(w => !(w.week === 6 && w.day === 3));
                localStorage.setItem('liftlog_in_progress_workouts', JSON.stringify(filteredInProgress));
                console.log('🗑️ Removed Week 6, Day 3 from in-progress workouts');
            }
            
            console.log('✅ Program restored successfully!');
            console.log('📍 Current state: Week 6, Day 2');
            console.log('📊 Progress: 17/18 workouts completed');
            console.log('📋 Template:', actualTemplateData.name);
            console.log('');
            console.log('🎯 Next steps:');
            console.log('1. Refresh the page to reload the app');
            console.log('2. Navigate to the Train section');
            console.log('3. You should see "Week 6, Day 3" as your current workout');
            console.log('4. Complete the workout normally');
            console.log('5. Verify that the program ends properly (no Week 7)');
            console.log('');
            console.log('🔄 REFRESH THE PAGE NOW to see the updated program state');
        }
    } catch (error) {
        console.error('❌ Error restoring program:', error);
    }
}

// Step 3: Show current state after restoration
console.log('');
console.log('📊 Current localStorage state:');
const currentActiveProgram = localStorage.getItem('liftlog_active_program');
if (currentActiveProgram) {
    const program = JSON.parse(currentActiveProgram);
    console.log('✅ Active Program:', program.template?.name || 'Unknown');
    console.log('📍 Week:', program.currentWeek, 'Day:', program.currentDay);
    console.log('📈 Progress:', program.completedWorkouts, '/', program.totalWorkouts, 'workouts');
    console.log('📋 Template structure:', Object.keys(program.template.schedule || {}));
} else {
    console.log('❌ No active program found');
}
