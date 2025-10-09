// Complete Program Reset - Wipe everything clean
// This will remove all workout data, active programs, and reset the app to a fresh state

console.log('🧹 COMPLETE PROGRAM RESET - Starting total wipe...');

// Get current user
const userId = JSON.parse(localStorage.getItem('liftlog_user') || '{}')?.id;

console.log('👤 User ID:', userId);

// Function to get user-specific storage keys
const getUserStorageKeys = (userId) => {
    if (userId) {
        return {
            workouts: `liftlog_workouts_${userId}`,
            inProgress: `liftlog_in_progress_workouts_${userId}`,
            activeProgram: 'liftlog_active_program',
            setsBackup: 'liftlog_sets_backup',
            setsQueue: 'liftlog_sets_sync_queue'
        };
    }
    return {
        workouts: 'liftlog_workouts',
        inProgress: 'liftlog_in_progress_workouts',
        activeProgram: 'liftlog_active_program',
        setsBackup: 'liftlog_sets_backup',
        setsQueue: 'liftlog_sets_sync_queue'
    };
};

// Function to clear all workout-related data
const clearAllWorkoutData = () => {
    console.log('🗑️ Clearing all workout data...');
    
    const storageKeys = getUserStorageKeys(userId);
    let clearedCount = 0;
    
    // Clear completed workouts
    if (localStorage.getItem(storageKeys.workouts)) {
        localStorage.removeItem(storageKeys.workouts);
        console.log('✅ Cleared completed workouts');
        clearedCount++;
    }
    
    // Clear in-progress workouts
    if (localStorage.getItem(storageKeys.inProgress)) {
        localStorage.removeItem(storageKeys.inProgress);
        console.log('✅ Cleared in-progress workouts');
        clearedCount++;
    }
    
    // Clear active program
    if (localStorage.getItem(storageKeys.activeProgram)) {
        localStorage.removeItem(storageKeys.activeProgram);
        console.log('✅ Cleared active program');
        clearedCount++;
    }
    
    // Clear sets backup
    if (localStorage.getItem(storageKeys.setsBackup)) {
        localStorage.removeItem(storageKeys.setsBackup);
        console.log('✅ Cleared sets backup');
        clearedCount++;
    }
    
    // Clear sets queue
    if (localStorage.getItem(storageKeys.setsQueue)) {
        localStorage.removeItem(storageKeys.setsQueue);
        console.log('✅ Cleared sets queue');
        clearedCount++;
    }
    
    // Also clear any global keys (for backward compatibility)
    const globalKeys = [
        'liftlog_workouts',
        'liftlog_in_progress_workouts',
        'liftlog_sets_backup',
        'liftlog_sets_sync_queue'
    ];
    
    globalKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Cleared global key: ${key}`);
            clearedCount++;
        }
    });
    
    console.log(`🎯 Total items cleared: ${clearedCount}`);
    return clearedCount;
};

// Function to clear any cached program state
const clearProgramState = () => {
    console.log('🧹 Clearing program state...');
    
    // Clear any program-related state that might be cached
    const programKeys = [
        'liftlog_program_state',
        'liftlog_template_cache',
        'liftlog_progress_cache'
    ];
    
    programKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Cleared program cache: ${key}`);
        }
    });
};

// Function to trigger complete app refresh
const triggerCompleteRefresh = () => {
    console.log('🔄 Triggering complete app refresh...');
    
    // Trigger program change event
    window.dispatchEvent(new Event('programChanged'));
    
    // Trigger storage events for all workout keys
    const storageKeys = getUserStorageKeys(userId);
    Object.values(storageKeys).forEach(key => {
        window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            newValue: null
        }));
    });
    
    // Force page reload after a short delay
    setTimeout(() => {
        console.log('🔄 Reloading page to ensure clean state...');
        window.location.reload();
    }, 1000);
};

// Main execution
try {
    console.log('🎯 Step 1: Clearing all workout data...');
    const clearedCount = clearAllWorkoutData();
    
    console.log('🎯 Step 2: Clearing program state...');
    clearProgramState();
    
    console.log('🎯 Step 3: Triggering complete refresh...');
    
    console.log('\n📋 RESET SUMMARY:');
    console.log(`   ✅ Cleared ${clearedCount} storage items`);
    console.log('   ✅ Removed all workout history');
    console.log('   ✅ Removed active program');
    console.log('   ✅ Removed in-progress workouts');
    console.log('   ✅ Cleared all caches');
    console.log('   ✅ Ready for fresh start');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Page will reload automatically');
    console.log('   2. Select the new 2-Week Test Program');
    console.log('   3. Test program completion logic');
    console.log('   4. Verify program ends properly after Week 2, Day 3');
    
    // Trigger the refresh
    triggerCompleteRefresh();
    
} catch (error) {
    console.error('❌ Error during reset:', error);
    console.log('💡 You may need to manually refresh the page');
}

console.log('\n🎉 COMPLETE RESET INITIATED!');
console.log('📱 The app will now reload with a clean slate');
