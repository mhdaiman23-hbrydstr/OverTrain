// Run this script in the browser console of your LiftLog app
// This will help you quickly complete workouts in the Train section

console.log('🏋️ Simple Workout Completer - Fill current workout and move to next');

// Function to fill all exercise inputs with realistic values
const fillCurrentWorkout = () => {
    const inputs = document.querySelectorAll('input[type="number"]');
    let filled = 0;
    
    inputs.forEach((input) => {
        if (input.value === '' || input.value === '0') {
            // Check if it's a weight input
            if (input.placeholder?.toLowerCase().includes('weight') || 
                input.name?.toLowerCase().includes('weight') ||
                input.closest('[data-exercise-id]')?.querySelector('label')?.textContent?.toLowerCase().includes('weight')) {
                input.value = 135 + Math.floor(Math.random() * 40); // 135-175 lbs
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled++;
            }
            // Check if it's an RPE input
            else if (input.placeholder?.toLowerCase().includes('rpe') || 
                     input.name?.toLowerCase().includes('rpe') ||
                     input.max == 10) {
                input.value = (7 + Math.random() * 2).toFixed(1); // 7-9 RPE
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled++;
            }
            // Check if it's a reps input
            else if (input.placeholder?.toLowerCase().includes('reps') || 
                     input.name?.toLowerCase().includes('reps') ||
                     input.max <= 15) {
                input.value = 8 + Math.floor(Math.random() * 3); // 8-10 reps
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled++;
            }
        }
    });
    
    console.log(`📝 Filled ${filled} exercise inputs`);
    return filled;
};

// Function to mark all sets as complete
const markAllSetsComplete = () => {
    // Look for checkboxes that mark sets as complete
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    let checked = 0;
    
    checkboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
            // Check if this checkbox is for completing a set
            const label = checkbox.closest('label') || checkbox.nextElementSibling;
            const labelText = label?.textContent?.toLowerCase() || '';
            const parent = checkbox.closest('[data-set-id], [data-exercise-id], .set-row, .exercise-set');
            
            if (labelText.includes('complete') || labelText.includes('done') || parent) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checked++;
            }
        }
    });
    
    // Also look for buttons that mark sets as complete
    const completeButtons = document.querySelectorAll('button');
    completeButtons.forEach((button) => {
        const text = button.textContent?.toLowerCase() || '';
        if (text.includes('complete set') || text.includes('check') || text.includes('✓')) {
            button.click();
            checked++;
        }
    });
    
    console.log(`✅ Marked ${checked} sets as complete`);
    return checked;
};

// Function to find and click the finish workout button
const finishWorkout = () => {
    // Look for finish/complete buttons
    const buttons = document.querySelectorAll('button');
    
    for (const button of buttons) {
        const text = button.textContent?.toLowerCase() || '';
        if (text.includes('finish') || text.includes('complete') || text.includes('done')) {
            // Check if button is enabled
            if (!button.disabled) {
                button.click();
                console.log('✅ Clicked finish workout button');
                return true;
            }
        }
    }
    
    console.log('❌ No enabled finish workout button found');
    return false;
};

// Function to handle completion dialog
const handleCompletionDialog = () => {
    setTimeout(() => {
        // Look for dialog buttons
        const dialogButtons = document.querySelectorAll('[role="dialog"] button, .dialog button, button');
        
        for (const button of dialogButtons) {
            const text = button.textContent?.toLowerCase() || '';
            if (text.includes('continue') || text.includes('next') || text.includes('ok')) {
                button.click();
                console.log('✅ Handled completion dialog');
                return;
            }
        }
        
        console.log('ℹ️ No completion dialog found or needed');
    }, 1000);
};

// Helper function to check current workout position
const getCurrentWorkoutPosition = () => {
    const workoutData = JSON.parse(localStorage.getItem('liftlog_active_program') || '{}');
    const week = workoutData.currentWeek || 1;
    const day = workoutData.currentDay || 1;
    
    console.log(`📍 Current position: Week ${week}, Day ${day}`);
    return { week, day };
};

// Helper function to check if this is the final workout (Week 6, Day 3)
const isFinalWorkout = () => {
    const { week, day } = getCurrentWorkoutPosition();
    const isFinal = week === 6 && day === 3;
    
    if (isFinal) {
        console.log('🎯 FINAL WORKOUT DETECTED: Week 6, Day 3');
        console.log('⚠️ This workout will be prepared but NOT completed automatically');
        console.log('🧪 You will complete it manually to test the program end logic');
    }
    
    return isFinal;
};

// Enhanced completion handler that stops at final workout
const completeWorkoutOrPrepare = (isFinal) => {
    if (isFinal) {
        console.log('🎯 FINAL WORKOUT: Preparation complete!');
        console.log('📋 Workout is ready for manual completion');
        console.log('🧪 Complete this workout manually to test the program completion fix');
        console.log('🔍 Expected behavior: Program should end, NOT advance to Week 7');
        console.log('✨ The "View Program Summary" button should appear');
        return false; // Don't continue to completion
    }
    
    // For regular workouts, proceed with completion
    console.log('⏱️ Waiting 2 seconds for finish button to enable...');
    setTimeout(() => {
        const success = finishWorkout();
        if (success) {
            handleCompletionDialog();
            console.log('🎉 Workout completed! Run this script again for the next workout.');
            console.log('📋 Current progress: Check your workout calendar to see which workout is next');
        } else {
            console.log('❌ Finish button still not found. Trying alternative approach...');
            // Try to find any button that might finish the workout
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('finish') || text.includes('complete') || text.includes('done') || text.includes('end')) {
                    console.log('🔄 Found potential finish button:', text);
                    if (!btn.disabled) {
                        btn.click();
                        console.log('✅ Clicked alternative finish button');
                        handleCompletionDialog();
                        return;
                    }
                }
            }
        }
    }, 2000);
    
    return true; // Continued with completion
};

// Main execution
console.log('🎯 Smart Workout Completer - Starting analysis...');
const { week, day } = getCurrentWorkoutPosition();
const finalWorkout = isFinalWorkout();

console.log('🎯 Filling current workout...');
const filledCount = fillCurrentWorkout();

if (filledCount > 0) {
    console.log('⏱️ Waiting 1 second before marking sets complete...');
    setTimeout(() => {
        const checkedCount = markAllSetsComplete();
        
        if (checkedCount > 0) {
            console.log(`✅ Marked ${checkedCount} sets as complete`);
            
            if (finalWorkout) {
                console.log('🎯 FINAL WORKOUT: All sets prepared and marked complete');
                console.log('🧪 Ready for manual completion test');
                console.log('📝 Next steps:');
                console.log('   1. Manually click "Finish Workout" button');
                console.log('   2. Test the program completion dialog');
                console.log('   3. Verify program does NOT advance to Week 7');
                console.log('   4. Check if "View Program Summary" works');
            } else {
                console.log(`📍 Regular workout: Week ${week}, Day ${day} - proceeding with completion`);
                completeWorkoutOrPrepare(false);
            }
        } else {
            console.log('ℹ️ No sets to mark complete, checking if this is final workout...');
            if (finalWorkout) {
                console.log('🎯 FINAL WORKOUT: No sets to mark, but ready for manual completion');
                console.log('🧪 Complete this workout manually to test the program completion fix');
            } else {
                console.log('📍 Regular workout: Trying finish button directly...');
                const success = finishWorkout();
                if (success) {
                    handleCompletionDialog();
                    console.log('🎉 Workout completed! Run this script again for the next workout.');
                }
            }
        }
    }, 1000);
} else {
    console.log('❌ No inputs found to fill. Make sure you\'re on the Train section with an active workout.');
    
    if (finalWorkout) {
        console.log('🎯 FINAL WORKOUT DETECTED: Week 6, Day 3');
        console.log('🧪 Complete this workout manually to test the program completion fix');
        console.log('🔍 Expected: Program should end, show "View Program Summary", NOT advance to Week 7');
    } else {
        console.log('💡 Navigate to a workout and run this script again');
    }
}

// Helper function to check current workout progress
const checkProgress = () => {
    const programInfo = document.querySelector('[data-program-info], .program-info, h1, h2');
    if (programInfo) {
        console.log('📊 Current workout info:', programInfo.textContent);
    }
    
    const workoutData = JSON.parse(localStorage.getItem('liftlog_active_program') || '{}');
    if (workoutData.currentWeek && workoutData.currentDay) {
        console.log(`📍 Current position: Week ${workoutData.currentWeek}, Day ${workoutData.currentDay}`);
        console.log(`📈 Progress: ${workoutData.completedWorkouts || 0}/${workoutData.totalWorkouts || 18} workouts`);
    }
};

// Show current progress
checkProgress();

// Make functions available for manual use
window.fillWorkout = fillCurrentWorkout;
window.finishWorkout = finishWorkout;
window.checkProgress = checkProgress;

console.log('💡 Tips:');
console.log('   - Run this script repeatedly to complete workouts one by one');
console.log('   - Each run will fill the current workout and complete it');
console.log('   - When you reach Week 6, Day 3, complete it manually to test the fix');
console.log('   - Use checkProgress() anytime to see your current position');
