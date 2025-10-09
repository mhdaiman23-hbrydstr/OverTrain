// Run this script in the browser console of your LiftLog app
// Open your LiftLog app, press F12, go to Console tab, and paste this entire script

console.log('🏋️ Restoring program for testing...');

// Step 1: Check if we have program history
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
            
            // Create a basic template structure
            const templateData = {
                id: lastProgram.templateId,
                name: lastProgram.name,
                weeks: 6,
                schedule: {
                    day1: { name: 'Full Body A', exercises: [] },
                    day2: { name: 'Full Body B', exercises: [] },
                    day3: { name: 'Full Body C', exercises: [] }
                }
            };
            
            // Restore the active program
            const restoredProgram = {
                templateId: lastProgram.templateId,
                template: templateData,
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
            console.log('');
            console.log('🎯 Next steps:');
            console.log('1. Navigate to the Train section in your LiftLog app');
            console.log('2. You should see "Week 6, Day 3" as your current workout');
            console.log('3. Complete the workout normally');
            console.log('4. Verify that the program ends properly (no Week 7)');
            console.log('');
            console.log('🔄 Refresh the page to see the updated program state');
        }
    } catch (error) {
        console.error('❌ Error restoring program:', error);
    }
}

// Step 2: Show current state after restoration
console.log('');
console.log('📊 Current localStorage state:');
const currentActiveProgram = localStorage.getItem('liftlog_active_program');
if (currentActiveProgram) {
    const program = JSON.parse(currentActiveProgram);
    console.log('✅ Active Program:', program.template?.name || 'Unknown');
    console.log('📍 Week:', program.currentWeek, 'Day:', program.currentDay);
    console.log('📈 Progress:', program.completedWorkouts, '/', program.totalWorkouts, 'workouts');
} else {
    console.log('❌ No active program found');
}
