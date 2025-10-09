// Run this script in the browser console of your LiftLog app
// This will check the calendar status and identify which days are still incomplete

console.log('🔍 Checking calendar status...');

// Function to analyze calendar cells
const analyzeCalendar = () => {
    const calendarCells = document.querySelectorAll('[data-week], [data-day], .calendar-cell, .day-cell');
    const status = {
        complete: [],
        incomplete: [],
        current: [],
        locked: []
    };
    
    calendarCells.forEach((cell) => {
        const week = cell.getAttribute('data-week') || cell.querySelector('[data-week]')?.getAttribute('data-week');
        const day = cell.getAttribute('data-day') || cell.querySelector('[data-day]')?.getAttribute('data-day');
        const text = cell.textContent?.trim() || '';
        
        if (week && day) {
            // Check cell status based on styling and content
            const style = window.getComputedStyle(cell);
            const bgColor = style.backgroundColor;
            const color = style.color;
            
            let cellStatus = 'unknown';
            
            // Check for completion indicators
            if (text.includes('✓') || text.includes('✅') || bgColor.includes('0, 255, 0') || bgColor.includes('34, 197, 94')) {
                cellStatus = 'complete';
            } else if (bgColor.includes('255, 0, 0') || bgColor.includes('239, 68, 68') || color.includes('255, 0, 0')) {
                cellStatus = 'incomplete';
            } else if (bgColor.includes('255, 255, 0') || bgColor.includes('250, 204, 21')) {
                cellStatus = 'current';
            } else if (style.opacity === '0.5' || style.pointerEvents === 'none') {
                cellStatus = 'locked';
            }
            
            // Also check for specific classes
            if (cell.classList.contains('complete') || cell.classList.contains('completed')) {
                cellStatus = 'complete';
            } else if (cell.classList.contains('incomplete') || cell.classList.contains('missing')) {
                cellStatus = 'incomplete';
            } else if (cell.classList.contains('current') || cell.classList.contains('active')) {
                cellStatus = 'current';
            } else if (cell.classList.contains('locked') || cell.classList.contains('disabled')) {
                cellStatus = 'locked';
            }
            
            const cellInfo = {
                week: parseInt(week),
                day: parseInt(day),
                text: text,
                status: cellStatus,
                bgColor: bgColor,
                color: color
            };
            
            status[cellStatus].push(cellInfo);
        }
    });
    
    return status;
};

// Function to check localStorage for workout data
const checkWorkoutData = () => {
    const workouts = JSON.parse(localStorage.getItem('liftlog_workouts') || '[]');
    const activeProgram = JSON.parse(localStorage.getItem('liftlog_active_program') || '{}');
    
    console.log('📊 Workout Data Analysis:');
    console.log(`   - Total workouts in storage: ${workouts.length}`);
    console.log(`   - Current program: ${activeProgram.template?.name || 'Unknown'}`);
    console.log(`   - Current position: Week ${activeProgram.currentWeek}, Day ${activeProgram.currentDay}`);
    console.log(`   - Completed workouts: ${activeProgram.completedWorkouts || 0}/${activeProgram.totalWorkouts || 18}`);
    
    // Group workouts by week and day
    const workoutMap = {};
    workouts.forEach(workout => {
        const key = `${workout.week}-${workout.day}`;
        if (!workoutMap[key]) {
            workoutMap[key] = [];
        }
        workoutMap[key].push(workout);
    });
    
    console.log('\n📋 Workout Completion Status:');
    for (let week = 1; week <= 6; week++) {
        for (let day = 1; day <= 3; day++) {
            const key = `${week}-${day}`;
            const count = workoutMap[key] ? workoutMap[key].length : 0;
            const status = count > 0 ? '✅' : '❌';
            console.log(`   Week ${week}, Day ${day}: ${status} (${count} workouts)`);
        }
    }
    
    return { workouts, activeProgram, workoutMap };
};

// Function to find clickable calendar elements
const findClickableElements = () => {
    const clickables = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
        if (element.onclick || element.getAttribute('onclick') || 
            element.getAttribute('data-week') || element.getAttribute('data-day')) {
            const week = element.getAttribute('data-week');
            const day = element.getAttribute('data-day');
            if (week && day) {
                clickables.push({
                    element: element,
                    week: parseInt(week),
                    day: parseInt(day),
                    text: element.textContent?.trim() || '',
                    clickable: true
                });
            }
        }
    });
    
    return clickables;
};

// Main analysis
console.log('🔍 Analyzing calendar...');
const calendarStatus = analyzeCalendar();
const workoutData = checkWorkoutData();
const clickables = findClickableElements();

console.log('\n📊 Calendar Status Summary:');
console.log(`   ✅ Complete: ${calendarStatus.complete.length} days`);
console.log(`   ❌ Incomplete: ${calendarStatus.incomplete.length} days`);
console.log(`   🟡 Current: ${calendarStatus.current.length} days`);
console.log(`   🔒 Locked: ${calendarStatus.locked.length} days`);

if (calendarStatus.incomplete.length > 0) {
    console.log('\n❌ Incomplete Days (need attention):');
    calendarStatus.incomplete.forEach(day => {
        console.log(`   Week ${day.week}, Day ${day.day}: "${day.text}"`);
    });
}

if (calendarStatus.current.length > 0) {
    console.log('\n🟡 Current Day:');
    calendarStatus.current.forEach(day => {
        console.log(`   Week ${day.week}, Day ${day.day}: "${day.text}"`);
    });
}

console.log('\n🔧 Available Clickable Elements:');
clickables.forEach(clickable => {
    console.log(`   Week ${clickable.week}, Day ${clickable.day}: "${clickable.text}"`);
});

// Helper function to navigate to a specific day
window.navigateToDay = (week, day) => {
    const target = clickables.find(c => c.week === week && c.day === day);
    if (target) {
        target.element.click();
        console.log(`📍 Navigated to Week ${week}, Day ${day}`);
        return true;
    } else {
        console.log(`❌ Could not find clickable element for Week ${week}, Day ${day}`);
        return false;
    }
};

console.log('\n💡 Usage:');
console.log('   - Use navigateToDay(week, day) to jump to a specific day');
console.log('   - Example: navigateToDay(2, 1) to go to Week 2, Day 1');
console.log('   - Focus on incomplete days first to unlock future weeks');

console.log('\n🎯 Next Steps:');
if (calendarStatus.incomplete.length > 0) {
    console.log('   1. Navigate to incomplete days using navigateToDay()');
    console.log('   2. Complete those workouts to unlock future weeks');
    console.log('   3. Work through them systematically');
} else {
    console.log('   1. All days appear complete in calendar');
    console.log('   2. If finish button still missing, check current day details');
    console.log('   3. May need to refresh or check specific workout completion');
}
