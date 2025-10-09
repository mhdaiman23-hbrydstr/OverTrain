// Reset Week 2, Day 3 to incomplete state for testing program completion
// This script clears the auto-logged data and fixes database conflicts

console.log("=== Resetting Week 2, Day 3 for Program Completion Test ===");

// Get current user
const userData = localStorage.getItem('liftlog_user');
const user = userData ? JSON.parse(userData) : null;

if (!user) {
    console.error("❌ No user found. Please log in first.");
} else {
    console.log(`✅ User found: ${user.id}`);
    
    const userId = user.id;
    const programId = 'test-2week-3day-program'; // Test program ID
    
    // Step 1: Clear completed workouts for Week 2, Day 3
    console.log("\n🗑️ Step 1: Clearing Week 2, Day 3 completed workouts...");
    
    const workoutsKey = 'liftlog_workouts';
    const workoutsData = localStorage.getItem(workoutsKey);
    
    if (workoutsData) {
        try {
            const workouts = JSON.parse(workoutsData);
            const initialCount = workouts.length;
            
            // Filter out Week 2, Day 3 workouts
            const filteredWorkouts = workouts.filter(w => {
                const shouldRemove = w.user_id === userId && 
                                   w.program_id === programId && 
                                   w.week === 2 && 
                                   w.day === 3;
                if (shouldRemove) {
                    console.log(`  🗑️ Removing workout: ${w.id} - ${w.workout_name}`);
                }
                return !shouldRemove;
            });
            
            localStorage.setItem(workoutsKey, JSON.stringify(filteredWorkouts));
            console.log(`✅ Removed ${initialCount - filteredWorkouts.length} Week 2, Day 3 workouts`);
            
        } catch (error) {
            console.error("❌ Error processing workouts:", error);
        }
    }
    
    // Step 2: Clear in-progress workouts for Week 2, Day 3
    console.log("\n🗑️ Step 2: Clearing Week 2, Day 3 in-progress workouts...");
    
    const inProgressKey = `liftlog_in_progress_workouts_${userId}`;
    const inProgressData = localStorage.getItem(inProgressKey);
    
    if (inProgressData) {
        try {
            const inProgressWorkouts = JSON.parse(inProgressData);
            const initialCount = inProgressWorkouts.length;
            
            // Filter out Week 2, Day 3 in-progress workouts
            const filteredInProgress = inProgressWorkouts.filter(w => {
                const shouldRemove = w.program_id === programId && 
                                   w.week === 2 && 
                                   w.day === 3;
                if (shouldRemove) {
                    console.log(`  🗑️ Removing in-progress workout: ${w.id} - ${w.workout_name}`);
                }
                return !shouldRemove;
            });
            
            localStorage.setItem(inProgressKey, JSON.stringify(filteredInProgress));
            console.log(`✅ Removed ${initialCount - filteredInProgress.length} Week 2, Day 3 in-progress workouts`);
            
        } catch (error) {
            console.error("❌ Error processing in-progress workouts:", error);
        }
    }
    
    // Step 3: Reset program state to Week 2, Day 3
    console.log("\n🔄 Step 3: Resetting program state...");
    
    const programKey = 'liftlog_active_program';
    const programData = localStorage.getItem(programKey);
    
    if (programData) {
        try {
            const program = JSON.parse(programData);
            
            if (program.templateId === programId) {
                console.log(`  📍 Current program state: Week ${program.currentWeek}, Day ${program.currentDay}`);
                
                // Set to Week 2, Day 3 (incomplete)
                program.currentWeek = 2;
                program.currentDay = 3;
                
                // Recalculate progress (should be 5/6 workouts completed = 83.3%)
                program.completedWorkouts = 5;
                program.progress = (5 / 6) * 100;
                
                localStorage.setItem(programKey, JSON.stringify(program));
                console.log(`✅ Reset program to: Week ${program.currentWeek}, Day ${program.currentDay}`);
                console.log(`📊 Progress: ${program.completedWorkouts}/${program.totalWorkouts} (${program.progress.toFixed(1)}%)`);
                
            } else {
                console.log(`⚠️ Active program is different: ${program.templateId}`);
            }
            
        } catch (error) {
            console.error("❌ Error resetting program state:", error);
        }
    }
    
    // Step 4: Clear completion status cache
    console.log("\n🗑️ Step 4: Clearing completion status cache...");
    
    const cacheKeys = [
        'liftlog_completion_cache',
        'liftlog_calendar_cache',
        'liftlog_program_cache'
    ];
    
    cacheKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`  🗑️ Cleared cache: ${key}`);
        }
    });
    
    // Step 5: Trigger program change event
    console.log("\n🔄 Step 5: Triggering program change event...");
    window.dispatchEvent(new Event('programChanged'));
    console.log("✅ Program change event dispatched");
    
    // Step 6: Verify the reset
    console.log("\n🔍 Step 6: Verifying reset...");
    
    // Check program state
    const updatedProgramData = localStorage.getItem(programKey);
    if (updatedProgramData) {
        const program = JSON.parse(updatedProgramData);
        console.log(`📊 Program state: Week ${program.currentWeek}, Day ${program.currentDay}`);
        console.log(`📊 Progress: ${program.completedWorkouts}/${program.totalWorkouts} (${program.progress.toFixed(1)}%)`);
    }
    
    // Check if Week 2, Day 3 workouts are gone
    const updatedWorkoutsData = localStorage.getItem(workoutsKey);
    if (updatedWorkoutsData) {
        const workouts = JSON.parse(updatedWorkoutsData);
        const week2Day3Workouts = workouts.filter(w => 
            w.user_id === userId && 
            w.program_id === programId && 
            w.week === 2 && 
            w.day === 3
        );
        console.log(`📊 Week 2, Day 3 workouts remaining: ${week2Day3Workouts.length}`);
    }
    
    console.log("\n=== Reset Complete ===");
    console.log("🎯 Week 2, Day 3 is now ready for manual completion testing");
    console.log("📋 Next steps:");
    console.log("1. Navigate to Week 2, Day 3");
    console.log("2. Complete the workout manually");
    console.log("3. Check for program completion popup");
    console.log("4. Verify program summary appears");
    console.log("5. Test starting a new program");
    
    console.log("\n🔄 Refreshing page in 2 seconds...");
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}
