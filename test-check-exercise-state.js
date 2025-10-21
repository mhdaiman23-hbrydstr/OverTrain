/**
 * Quick check for exercise state and button status
 * Run in browser console
 */

console.log('\n🔍 Exercise State Diagnostic\n');

// Check if exercises are loaded
const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
console.log(`Found ${swapButtons.length} swap buttons`);

if (swapButtons.length > 0) {
  const firstButton = swapButtons[0];
  console.log('\nFirst Swap Button Analysis:');
  console.log('- Disabled:', firstButton.disabled);
  console.log('- Aria Label:', firstButton.getAttribute('aria-label'));
  
  // Check parent structure
  const parent = firstButton.parentElement;
  console.log('- Parent tag:', parent?.tagName);
  console.log('- Parent classes:', parent?.className);
  
  // Check computed styles
  const parentStyle = parent ? window.getComputedStyle(parent) : null;
  if (parentStyle) {
    console.log('- Parent position:', parentStyle.position);
    console.log('- Parent z-index:', parentStyle.zIndex);
    console.log('- Parent pointer-events:', parentStyle.pointerEvents);
  }
  
  const buttonStyle = window.getComputedStyle(firstButton);
  console.log('- Button pointer-events:', buttonStyle.pointerEvents);
  console.log('- Button z-index:', buttonStyle.zIndex);
}

// Check for loading spinners
const spinners = document.querySelectorAll('[class*="spinner"], [class*="loading"]');
console.log(`\nFound ${spinners.length} loading spinners`);

// Check for exercise data in window/global state
console.log('\nChecking global state:');
console.log('- Window has exercises?', typeof window !== 'undefined');

// Try to find React component state
const container = document.querySelector('[class*="day"]');
if (container) {
  console.log('- Found day container');
}

console.log('\n💡 Quick Fix Test:');
console.log('Run this to enable all swap buttons:');
console.log('document.querySelectorAll(\'button[aria-label*="Replace"]\').forEach(btn => btn.disabled = false);');

