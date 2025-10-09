// Run this script in the browser console of your LiftLog app
// This will force the app to load the restored program state from the database

console.log('🔄 Forcing load of restored program from database...');

// Step 1: Clear current active program to force reload
localStorage.removeItem('liftlog_active_program');
localStorage.removeItem('liftlog_program_progress');
localStorage.removeItem('liftlog_program_history');
console.log('🗑️ Cleared local program data to force database reload');

// Step 2: Force a complete data reload from database
console.log('🔄 Triggering database reload...');

// Access the auth context to force reload
if (window.WorkoutLoggerDev && window.WorkoutLoggerDev.forceDataReload) {
    window.WorkoutLoggerDev.forceDataReload();
    console.log('✅ Forced data reload via dev tools');
} else {
    // Alternative: Trigger a page reload with cache busting
    console.log('🔄 Reloading page to force database sync...');
    const timestamp = new Date().getTime();
    window.location.href = window.location.pathname + '?t=' + timestamp + window.location.hash;
}

console.log('🎯 After reload, the app should load your restored program (Week 6, Day 2)');
