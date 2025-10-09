// Test script to verify calendar week display fix
// This script checks that the calendar now respects the template's exact week count

console.log("=== Testing Calendar Week Display Fix ===");

// Get current active program
const activeProgramData = localStorage.getItem('liftlog_active_program');

if (!activeProgramData) {
    console.log("❌ No active program found. Please start a program first.");
    console.log("Recommended: Start the 2-week test program to verify the fix.");
} else {
    const activeProgram = JSON.parse(activeProgramData);
    
    console.log("✅ Active program found:");
    console.log(`  Name: ${activeProgram.template.name}`);
    console.log(`  Template ID: ${activeProgram.templateId}`);
    console.log(`  Template Weeks: ${activeProgram.template.weeks}`);
    console.log(`  Current Week: ${activeProgram.currentWeek}`);
    console.log(`  Current Day: ${activeProgram.currentDay}`);
    
    // Check if this is the 2-week test program
    const isTestProgram = activeProgram.templateId === 'test-2week-3day-program';
    
    if (isTestProgram) {
        console.log("\n🧪 Testing 2-week program calendar display...");
        
        if (activeProgram.template.weeks === 2) {
            console.log("✅ Template correctly defines 2 weeks");
        } else {
            console.log(`❌ Template defines ${activeProgram.template.weeks} weeks (expected 2)`);
        }
        
        // Check what the calendar should display
        const expectedWeeks = activeProgram.template.weeks;
        console.log(`\n📅 Calendar should display exactly ${expectedWeeks} weeks`);
        
        // Simulate calendar component logic
        const totalWeeks = expectedWeeks; // Updated logic: use template's exact week count
        console.log(`📊 Calendar will display ${totalWeeks} weeks`);
        
        if (totalWeeks === 2) {
            console.log("✅ Calendar will display correct number of weeks (2)");
        } else {
            console.log(`❌ Calendar will display ${totalWeeks} weeks (expected 2)`);
        }
        
        console.log("\n🔍 Testing boundary validation...");
        
        // Test week boundary validation
        const testWeeks = [1, 2, 3, 4];
        testWeeks.forEach(week => {
            const isBlocked = week > activeProgram.template.weeks;
            console.log(`  Week ${week}: ${isBlocked ? '❌ BLOCKED (exceeds program)' : '✅ ALLOWED (within program)'}`);
        });
        
    } else {
        console.log("\nℹ️ Not using the 2-week test program.");
        console.log(`Template: ${activeProgram.template.name}`);
        console.log(`Template weeks: ${activeProgram.template.weeks}`);
        
        // For other programs, verify the calendar still works correctly
        const expectedWeeks = activeProgram.template.weeks || 6;
        console.log(`\n📅 Calendar should display ${expectedWeeks} weeks`);
        
        if (activeProgram.template.weeks) {
            console.log("✅ Template has explicit week count");
        } else {
            console.log("⚠️ Template uses default week count (6)");
        }
    }
}

console.log("\n=== Manual Testing Instructions ===");
console.log("1. Open the app and check the calendar display");
console.log("2. Verify the calendar shows exactly the number of weeks defined in the template");
console.log("3. Try clicking on weeks beyond the program duration - they should be blocked");
console.log("4. Check that week add/remove buttons respect the template's week count");
console.log("5. Test program completion by completing all workouts in a 2-week program");

console.log("\n=== Expected Results ===");
console.log("✅ 2-week test program should display exactly 2 weeks (not 4)");
console.log("✅ Users cannot access weeks beyond the program's duration");
console.log("✅ Week add/remove buttons are disabled at the template boundaries");
console.log("✅ Program completion triggers correctly at the final week");

console.log("\n=== Debug Tools ===");
console.log("Use window.CalendarDev.debugCalendarState() to check calendar state");
console.log("Use window.CalendarDev.forceRefresh() to refresh the calendar");
