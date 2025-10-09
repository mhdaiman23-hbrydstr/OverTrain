// Simple status checker that works in Node.js
console.log("=== Simple Status Check ===");

// Check active program
const activeProgramData = localStorage.getItem('liftlog_active_program');
if (activeProgramData) {
    const program = JSON.parse(activeProgramData);
    console.log("✅ Active Program:");
    console.log(`  Name: ${program.template.name}`);
    console.log(`  Current Week: ${program.currentWeek}`);
    console.log(`  Current Day: ${program.currentDay}`);
    console.log(`  Template Weeks: ${program.template.weeks}`);
} else {
    console.log("❌ No active program found");
}

// Check workout logger data
const workoutsKey = 'liftlog_workouts';
const workoutsData = localStorage.getItem(workoutsKey);

if (workoutsData) {
    try {
        const workouts = JSON.parse(workoutsData);
        console.log(`\n📊 Total workouts in storage: ${workouts.length}`);
        
        // Filter for 2-week test program
        const testWorkouts = workouts.filter(w => w.program_id === 'test-2week-3day-program');
        console.log(`🧪 Test program workouts: ${testWorkouts.length}`);
        
        // Show Week 2, Day 1 specifically
        const week2Day1 = testWorkouts.filter(w => w.week === 2 && w.day === 1);
        console.log(`📅 Week 2, Day 1 workouts: ${week2Day1.length}`);
        
        if (week2Day1.length > 0) {
            week2Day1.forEach((workout, index) => {
                console.log(`  Workout ${index + 1}:`);
                console.log(`    ID: ${workout.id}`);
                console.log(`    Completed: ${workout.completed}`);
                console.log(`    Workout Name: ${workout.workout_name}`);
                console.log(`    Created: ${workout.created_at}`);
                if (workout.exercises) {
                    console.log(`    Exercises: ${workout.exercises.length}`);
                    workout.exercises.forEach((ex, exIndex) => {
                        console.log(`      ${exIndex + 1}. ${ex.exercise_name} - ${ex.sets?.length || 0} sets`);
                    });
                }
            });
        }
        
        // Show all test program workouts by week/day
        console.log("\n📋 All test program workouts:");
        const byWeekDay = {};
        testWorkouts.forEach(w => {
            const key = `Week ${w.week}, Day ${w.day}`;
            if (!byWeekDay[key]) byWeekDay[key] = [];
            byWeekDay[key].push(w);
        });
        
        Object.keys(byWeekDay).sort().forEach(key => {
            const workouts = byWeekDay[key];
            const completedCount = workouts.filter(w => w.completed).length;
            console.log(`  ${key}: ${workouts.length} workouts, ${completedCount} completed`);
        });
        
    } catch (error) {
        console.log("❌ Error parsing workout data:", error.message);
    }
} else {
    console.log("❌ No workout data found");
}

console.log("\n=== Diagnosis ===");
console.log("If Week 2, Day 1 shows as completed but calendar shows red:");
console.log("1. Check if the workout is marked as completed: true");
console.log("2. Check if the calendar's completion status cache is stale");
console.log("3. Check if boundary validation is interfering with status display");
console.log("4. Try refreshing the calendar with: window.CalendarDev?.forceRefresh()");

console.log("\n=== Quick Fix Commands ===");
console.log("Run these in browser console:");
console.log("1. window.CalendarDev?.forceRefresh()");
console.log("2. window.CalendarDev?.debugCalendarState()");
console.log("3. // Clear completion cache:");
console.log("   localStorage.removeItem('liftlog_completion_cache')");
