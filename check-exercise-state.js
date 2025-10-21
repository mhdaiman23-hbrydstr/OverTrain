// Check actual exercise loading state
console.clear();
console.log('%c🔍 Exercise State Check', 'font-size: 18px; font-weight: bold; color: #2196F3;');

// Try to find the React component state
console.log('\nLooking for exercise data...');

// Check if there are any exercise elements on the page
const exerciseElements = document.querySelectorAll('[class*="exercise"], [data-exercise]');
console.log(`Found ${exerciseElements.length} exercise-related elements`);

// Check for loading indicators
const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
console.log(`Found ${loadingElements.length} loading indicators`);

// Check for error messages
const errorElements = document.querySelectorAll('[class*="error"], [class*="failed"]');
console.log(`Found ${errorElements.length} error elements`);

// Check console for any exercise-related logs
console.log('\nCheck the console above for any messages like:');
console.log('- "Failed to load exercises"');
console.log('- "Exercise loading..."');
console.log('- RLS policy errors');

// Quick fix test
window.forceEnableButtons = function() {
  const buttons = document.querySelectorAll('button[aria-label*="Replace"]');
  buttons.forEach(btn => {
    btn.disabled = false;
    btn.style.pointerEvents = 'auto';
  });
  console.log(`✅ Force-enabled ${buttons.length} buttons`);
  console.log('Now try clicking a swap button');
};

console.log('\n💡 Quick Fix:');
console.log('Run: forceEnableButtons()');
console.log('Then try clicking a swap button to see if dropdown works');
