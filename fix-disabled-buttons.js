/**
 * Diagnostic and Fix for Disabled Swap Buttons
 * Run in browser console on the Day Builder page
 */

console.log('\n🔧 Swap Button Diagnostic & Fix\n');

// 1. Check button state
const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
console.log(`Found ${swapButtons.length} swap buttons`);

let disabledCount = 0;
swapButtons.forEach((btn, i) => {
  if (btn.disabled) disabledCount++;
});

console.log(`Disabled: ${disabledCount}/${swapButtons.length}`);

// 2. Check if exercises loaded
console.log('\n📚 Checking Exercise Loading State:');
const loadingSpinners = document.querySelectorAll('[class*="spinner"]');
console.log(`- Loading spinners visible: ${loadingSpinners.length}`);

// 3. Check console for errors
console.log('\n🔍 Check browser console for errors like:');
console.log('   - "Failed to load exercises"');
console.log('   - RLS policy errors');
console.log('   - Network errors');

// 4. Check if parent div is blocking
console.log('\n📦 Checking Parent DIV blocking:');
if (swapButtons.length > 0) {
  const firstBtn = swapButtons[0];
  const parent = firstBtn.parentElement;
  const parentStyle = parent ? window.getComputedStyle(parent) : null;
  
  if (parentStyle) {
    console.log(`- Parent position: ${parentStyle.position}`);
    console.log(`- Parent z-index: ${parentStyle.zIndex}`);
    console.log(`- Parent pointer-events: ${parentStyle.pointerEvents}`);
    
    if (parentStyle.pointerEvents === 'none') {
      console.warn('⚠️  Parent has pointer-events: none - this blocks clicks!');
    }
  }
}

// 5. Provide fixes
console.log('\n💡 FIXES:');
console.log('\n=== FIX 1: If exercises failed to load ===');
console.log('Check the console for RLS policy errors or network failures');
console.log('The exercise library might not be accessible');

console.log('\n=== FIX 2: Force enable buttons (temporary test) ===');
console.log('Run this to enable all buttons:');
console.log('  swapButtons.forEach(btn => btn.disabled = false);');

console.log('\n=== FIX 3: Check z-index conflicts ===');
console.log('The DIV.relative wrapper might have z-index issues');

console.log('\n=== FIX 4: Reload exercises ===');
console.log('If stuck in loading state, refresh the page');

// 6. Auto-fix attempt
console.log('\n🔧 Attempting Auto-Fix...');

// Check if issue is just the disabled state
if (disabledCount === swapButtons.length && disabledCount > 0) {
  console.log('All buttons are disabled. This suggests exercises haven\'t loaded.');
  console.log('\n⚠️  LIKELY CAUSE: Exercise loading stuck or failed');
  console.log('Check Network tab for failed requests to Supabase');
}

// Make buttons accessible for testing
window.testEnableSwapButtons = function() {
  const buttons = document.querySelectorAll('button[aria-label*="Replace"]');
  buttons.forEach(btn => {
    btn.disabled = false;
  });
  console.log(`✅ Enabled ${buttons.length} swap buttons (temporary)`);
  console.log('Now try clicking a swap button to see if dropdown works');
};

window.testClickFirstSwap = function() {
  const buttons = document.querySelectorAll('button[aria-label*="Replace"]');
  if (buttons.length > 0) {
    buttons.forEach(btn => btn.disabled = false);
    buttons[0].click();
    console.log('✅ Clicked first swap button');
    console.log('Check if dropdown appeared');
  }
};

console.log('\n📝 TEST COMMANDS AVAILABLE:');
console.log('  window.testEnableSwapButtons()  - Enable all swap buttons');
console.log('  window.testClickFirstSwap()      - Enable and click first button');
console.log('\n');

