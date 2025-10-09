// Run this script in the browser console of your LiftLog app
// This will clear the Week 6, Day 3 completion so you can test the program completion fix

console.log('🧹 Clearing Week 6, Day 3 completion for testing...');

// Step 1: Remove Week 6, Day 3 from workout history
const workouts = JSON.parse(localStorage.getItem('liftlog_workouts') || '[]');
const filteredWorkouts = workouts.filter(w => !(w.week === 6 && w.day === 3));
localStorage.setItem('liftlog_workouts', JSON.stringify(filteredWorkouts));

console.log(`🗑️ Removed ${workouts.length - filteredWorkouts.length} Week 6, Day 3 workouts`);

// Step 2: Update program to Week 6, Day 2 (ready for Day 3)
const activeProgram = JSON.parse(localStorage.getItem('liftlog_active_program') || '{}');
if (activeProgram.templateId) {
    activeProgram.currentWeek = 6;
    activeProgram.currentDay = 2;
    activeProgram.completedWorkouts = 17; // All workouts except Week 6, Day 3
    activeProgram.progress = (activeProgram.completedWorkouts / activeProgram.totalWorkouts) * 100;
    localStorage.setItem('liftlog_active_program', JSON.stringify(activeProgram));
    console.log('✅ Updated program to Week 6, Day 2');
}

// Step 3: Clear any in-progress workouts
localStorage.removeItem('liftlog_in_progress_workouts');
console.log('🗑️ Cleared in-progress workouts');

console.log('');
console.log('🎯 Ready for testing!');
console.log('📊 Program state: Week 6, Day 2 (17/18 workouts completed)');
console.log('🏋️ Next workout: Week 6, Day 3 (FINAL WORKOUT!)');
console.log('');
console.log('🔄 Refresh the page and navigate to Train section');
console.log('💪 Complete Week 6, Day 3 to test the program completion fix!');

// Force page reload
setTimeout(() => {
    window.location.reload();
}, 2000);
