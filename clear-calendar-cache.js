// Quick fix to clear calendar cache and refresh status
console.log("=== Clearing Calendar Cache & Refreshing ===");

// Clear the calendar's completion status cache
console.log("🗑️ Clearing completion status cache...");
if (typeof window !== 'undefined') {
    // Clear calendar completion cache
    if (window.CalendarDev) {
        window.CalendarDev.forceRefresh();
        console.log("✅ Calendar refreshed via dev tools");
    }
    
    // Clear any cached completion status
    const completionCacheKey = 'liftlog_completion_cache';
    if (localStorage.getItem(completionCacheKey)) {
        localStorage.removeItem(completionCacheKey);
        console.log("✅ Completion cache cleared");
    }
    
    // Trigger program change event to force calendar refresh
    window.dispatchEvent(new Event('programChanged'));
    console.log("✅ Program change event dispatched");
    
    // Check current program state
    const programData = localStorage.getItem('liftlog_active_program');
    if (programData) {
        const program = JSON.parse(programData);
        console.log("📊 Current program state:");
        console.log(`  Template: ${program.template.name}`);
        console.log(`  Current Week: ${program.currentWeek}`);
        console.log(`  Current Day: ${program.currentDay}`);
        console.log(`  Template Weeks: ${program.template.weeks}`);
        
        // Check if we're at the program boundary
        const isAtBoundary = program.currentWeek >= program.template.weeks;
        console.log(`  At program boundary: ${isAtBoundary}`);
        
        if (isAtBoundary) {
            console.log("⚠️ Current week is at or beyond template boundaries");
            console.log("This might be causing calendar display issues");
        }
    }
    
    console.log("\n🔄 Forcing complete page refresh...");
    setTimeout(() => {
        window.location.reload();
    }, 1000);
    
} else {
    console.log("❌ This script must be run in the browser console");
    console.log("Please paste this code in your browser's developer console");
}
