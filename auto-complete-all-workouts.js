// Run this script in the browser console of your LiftLog app
// This will automatically complete all workouts from Week 1 to Week 6, Day 2 in proper order

console.log('🚀 Starting automatic workout completion from Week 1 to Week 6, Day 2...');

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to find and click elements
const clickElement = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
        element.click();
        return true;
    }
    return false;
};

// Helper function to fill exercise inputs
const fillExerciseInputs = () => {
    const inputs = document.querySelectorAll('input[type="number"]');
    const filled = [];
    
    inputs.forEach((input, index) => {
        if (input.value === '' || input.value === '0') {
            // Fill with realistic values based on input type
            if (input.placeholder?.toLowerCase().includes('weight') || input.name?.toLowerCase().includes('weight')) {
                input.value = 135 + Math.floor(Math.random() * 50); // 135-185 lbs
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled.push(input.value);
            } else if (input.placeholder?.toLowerCase().includes('rpe') || input.name?.toLowerCase().includes('rpe')) {
                input.value = 7 + Math.random() * 2; // 7-9 RPE
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled.push(input.value);
            } else if (input.placeholder?.toLowerCase().includes('reps') || input.name?.toLowerCase().includes('reps')) {
                input.value = 8 + Math.floor(Math.random() * 3); // 8-10 reps
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled.push(input.value);
            }
        }
    });
    
    return filled.length;
};

// Main function to complete workouts
const completeAllWorkouts = async () => {
    const workouts = [];
    
    // Generate workout plan: Weeks 1-6, Days 1-3 (skip Week 6, Day 3)
    for (let week = 1; week <= 6; week++) {
        for (let day = 1; day <= 3; day++) {
            if (week === 6 && day === 3) continue; // Skip final workout for testing
            workouts.push({ week, day });
        }
    }
    
    console.log(`📋 Planning to complete ${workouts.length} workouts...`);
    
    for (let i = 0; i < workouts.length; i++) {
        const { week, day } = workouts[i];
        console.log(`🏋️ Completing Week ${week}, Day ${day} (${i + 1}/${workouts.length})`);
        
        // Navigate to the workout
        if (week === 1 && day === 1) {
            // First workout - should already be on screen
            console.log('📍 Starting with current workout...');
        } else {
            // Click on the calendar to navigate to the workout
            const calendarSelector = `[data-week="${week}"][data-day="${day}"]`;
            if (!clickElement(calendarSelector)) {
                console.error(`❌ Could not find calendar cell for Week ${week}, Day ${day}`);
                continue;
            }
            await wait(1000); // Wait for navigation
        }
        
        // Wait for workout to load
        await wait(2000);
        
        // Fill exercise inputs
        const filledInputs = fillExerciseInputs();
        console.log(`📝 Filled ${filledInputs} exercise inputs`);
        
        // Wait a moment for inputs to register
        await wait(1000);
        
        // Click finish workout button
        let finishButton = document.querySelector('button[data-testid="finish-workout"]');
        if (!finishButton) {
            // Try alternative selectors
            const altButtons = document.querySelectorAll('button');
            for (const btn of altButtons) {
                if (btn.textContent?.includes('Finish') || btn.textContent?.includes('Complete')) {
                    finishButton = btn;
                    break;
                }
            }
        }
        
        if (finishButton) {
            finishButton.click();
            console.log('✅ Clicked finish workout button');
        } else {
            console.error('❌ Could not find finish workout button');
            continue;
        }
        
        // Wait for completion dialog and handle it
        await wait(2000);
        
        // Look for completion dialog buttons
        const dialogButtons = document.querySelectorAll('[role="dialog"] button, .dialog button');
        let handled = false;
        
        for (const btn of dialogButtons) {
            if (btn.textContent?.includes('Continue') || btn.textContent?.includes('Next Workout')) {
                btn.click();
                console.log('✅ Handled completion dialog');
                handled = true;
                break;
            }
        }
        
        if (!handled) {
            console.log('ℹ️ No completion dialog found, continuing...');
        }
        
        // Wait before next workout
        await wait(2000);
        
        // Log progress
        const progress = ((i + 1) / workouts.length * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% - ${i + 1}/${workouts.length} workouts completed`);
    }
    
    console.log('🎉 All workouts completed! You should now be at Week 6, Day 3 ready for testing.');
    console.log('💪 Navigate to Train section to complete the final workout and test the program completion fix!');
};

// Start the process
completeAllWorkouts().catch(error => {
    console.error('❌ Error during workout completion:', error);
});
