// Run this script in the browser console of your LiftLog app
// This will jump your new program to Week 6, Day 3 for testing the completion fix

console.log('⚡ Jumping to Week 6, Day 3 for testing...');

// Step 1: Get current active program
const activeProgram = localStorage.getItem('liftlog_active_program');
if (!activeProgram) {
    console.error('❌ No active program found. Please start a program first.');
} else {
    try {
        const program = JSON.parse(activeProgram);
        console.log('📋 Current program:', program.template?.name, '- Week', program.currentWeek, 'Day', program.currentDay);
        
        // Step 2: Update to Week 6, Day 2 (so Day 3 is the next workout)
        program.currentWeek = 6;
        program.currentDay = 2;
        program.completedWorkouts = 17; // 5 weeks * 3 days + 2 days in week 6
        program.progress = (program.completedWorkouts / program.totalWorkouts) * 100;
        
        // Step 3: Save the updated program
        localStorage.setItem('liftlog_active_program', JSON.stringify(program));
        
        // Step 4: Create fake completed workouts for Weeks 1-6, Day 2
        const fakeWorkouts = [];
        for (let week = 1; week <= 6; week++) {
            for (let day = 1; day <= 3; day++) {
                // Skip Week 6, Day 3 (that's what we'll test)
                if (week === 6 && day === 3) continue;
                
                // Skip Week 6, Day 2 (that's our current position)
                if (week === 6 && day === 2) continue;
                
                fakeWorkouts.push({
                    id: `fake-${week}-${day}`,
                    user_id: '6bf0e5d0-cf5c-4820-90f5-346e1e2a4d4c',
                    program_id: program.templateId,
                    workout_name: `Week ${week} Day ${day}`,
                    week: week,
                    day: day,
                    completed: true,
                    start_time: Date.now() - (1000 * 60 * 60 * 24 * (6 - week) * 7),
                    end_time: Date.now() - (1000 * 60 * 60 * 24 * (6 - week) * 7) + (1000 * 60 * 45),
                    exercises: program.template.schedule[`day${day}`]?.exercises?.map(ex => ({
                        exerciseId: ex.id,
                        exerciseName: ex.exerciseName,
                        muscleGroup: ex.category,
                        sets: [{
                            reps: 8,
                            weight: 135,
                            rpe: 7,
                            restTime: 120
                        }]
                    })) || []
                });
            }
        }
        
        // Step 5: Save fake workouts to localStorage
        const existingWorkouts = JSON.parse(localStorage.getItem('liftlog_workouts') || '[]');
        const allWorkouts = [...fakeWorkouts, ...existingWorkouts.filter(w => !w.id.startsWith('fake-'))];
        localStorage.setItem('liftlog_workouts', JSON.stringify(allWorkouts));
        
        console.log('✅ Program updated to Week 6, Day 2');
        console.log('📊 Progress:', program.completedWorkouts, '/', program.totalWorkouts, 'workouts completed');
        console.log('🎯 Next workout: Week 6, Day 3 (final workout!)');
        console.log('');
        console.log('🔄 Refresh the page to see the updated program state');
        console.log('🏋️ Then complete Week 6, Day 3 to test the program completion fix!');
        
    } catch (error) {
        console.error('❌ Error updating program:', error);
    }
}
