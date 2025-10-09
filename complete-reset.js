// Run this script in the browser console of your LiftLog app
// This will completely reset all program data to restore your UI

console.log('🔄 Complete reset - restoring app to working state...');

// Step 1: Clear all program-related localStorage
const keysToRemove = [
    'liftlog_active_program',
    'liftlog_program_progress',
    'liftlog_program_history',
    'liftlog_in_progress_workouts'
];

keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed: ${key}`);
});

// Step 2: Keep workout data but remove the problematic Week 6, Day 3 completion
const workouts = localStorage.getItem('liftlog_workouts');
if (workouts) {
    try {
        const workoutData = JSON.parse(workouts);
        const filteredWorkouts = workoutData.filter(w => !(w.week === 6 && w.day === 3 && w.completed));
        localStorage.setItem('liftlog_workouts', JSON.stringify(filteredWorkouts));
        console.log('🗑️ Removed Week 6, Day 3 completion from workout history');
        console.log(`📊 Remaining workouts: ${filteredWorkouts.length}`);
    } catch (error) {
        console.error('❌ Error filtering workouts:', error);
    }
}

console.log('✅ Complete reset finished!');
console.log('');
console.log('🎯 Next steps:');
console.log('1. Refresh the page to reload the app');
console.log('2. The app should now show no active program');
console.log('3. You can start a new program or use SQL to restore your previous state');
console.log('');
console.log('🔄 REFRESH THE PAGE NOW to restore your UI');
