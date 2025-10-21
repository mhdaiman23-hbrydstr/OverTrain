// Debug script to diagnose swap button issues
console.clear();
console.log('%c🔍 Swap Button Debug Analysis', 'font-size: 18px; font-weight: bold; color: #FF5722;');

// 1. Check if we're on the right page
console.log('\n📍 Page Check:');
console.log('Current URL:', window.location.href);
console.log('Page title:', document.title);

// 2. Find all swap buttons
console.log('\n🔄 Swap Button Analysis:');
const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
console.log(`Found ${swapButtons.length} swap buttons`);

swapButtons.forEach((btn, index) => {
  console.log(`\nButton ${index + 1}:`);
  console.log('- ARIA label:', btn.getAttribute('aria-label'));
  console.log('- Disabled:', btn.disabled);
  console.log('- Classes:', btn.className);
  console.log('- Visible:', btn.offsetParent !== null);
  console.log('- Tab index:', btn.tabIndex);
  
  // Check if button has click listeners
  const eventListeners = getEventListeners ? getEventListeners(btn) : 'Not available';
  console.log('- Event listeners:', eventListeners);
});

// 3. Check exercise loading state
console.log('\n📋 Exercise Loading State:');
if (window.programWizardDebug) {
  const state = window.programWizardDebug.getState();
  console.log('Exercise loading state:', state.exerciseLoading);
  console.log('Swap button analysis:', state.swapButtons);
} else {
  console.log('❌ Debug tools not available');
}

// 4. Check for exercise data
console.log('\n💾 Exercise Data Check:');
const exerciseElements = document.querySelectorAll('[class*="exercise"]');
console.log(`Exercise elements found: ${exerciseElements.length}`);

// Look for exercise names in the DOM
const exerciseNames = Array.from(document.querySelectorAll('*')).filter(el => {
  const text = el.textContent || '';
  return text.includes('Bench Press') || text.includes('Squat') || text.includes('Deadlift');
});
console.log('Exercise name elements found:', exerciseNames.length);

// 5. Check React component state (if available)
console.log('\n⚛️ React State Check:');
const rootElements = document.querySelectorAll('[data-reactroot], [data-react-checksum]');
console.log('React root elements:', rootElements.length);

// Try to access React dev tools
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools available');
} else {
  console.log('❌ React DevTools not available');
}

// 6. Manual button test
console.log('\n🧪 Manual Button Test:');
if (swapButtons.length > 0) {
  const firstButton = swapButtons[0];
  console.log('Testing first swap button...');
  
  // Try to manually enable and click
  const originalDisabled = firstButton.disabled;
  firstButton.disabled = false;
  
  console.log('- Manually enabled button');
  console.log('- Clicking button...');
  
  // Create and dispatch click event
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  firstButton.dispatchEvent(clickEvent);
  
  // Check if dialog appeared
  setTimeout(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], .dialog, .modal');
    console.log('- Dialogs after click:', dialogs.length);
    
    if (dialogs.length > 0) {
      console.log('✅ Dialog appeared! Button works when manually enabled');
    } else {
      console.log('❌ No dialog appeared even when manually enabled');
    }
    
    // Restore original state
    firstButton.disabled = originalDisabled;
  }, 1000);
} else {
  console.log('❌ No swap buttons found to test');
}

// 7. Network check
console.log('\n🌐 Network Check:');
if (window.performance && window.performance.getEntriesByType) {
  const resources = window.performance.getEntriesByType('resource');
  const apiCalls = resources.filter(resource => 
    resource.name.includes('exercise') || 
    resource.name.includes('api') ||
    resource.name.includes('supabase')
  );
  console.log('Exercise-related API calls:', apiCalls.length);
  apiCalls.forEach(call => {
    console.log(`- ${call.name}: ${call.responseStatus || 'N/A'}`);
  });
}

// 8. Console error check
console.log('\n🚨 Error Check:');
const originalError = console.error;
const errors = [];
console.error = function(...args) {
  errors.push(args);
  originalError.apply(console, args);
};

// Wait a bit to catch any errors
setTimeout(() => {
  if (errors.length > 0) {
    console.log('Recent errors:', errors);
  } else {
    console.log('No recent errors detected');
  }
  console.error = originalError;
}, 2000);

console.log('\n💡 Debug Complete! Check the results above.');
