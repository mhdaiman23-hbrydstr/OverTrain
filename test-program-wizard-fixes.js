// Program Wizard Fixes Test Script
// Tests all the critical fixes for dead clicks, exercise loading, and drag & drop

console.clear();
console.log('%c🧪 Program Wizard Fixes Test', 'font-size: 20px; font-weight: bold; color: #4CAF50;');

// Test 1: Exercise Loading State
function testExerciseLoading() {
  console.log('\n📋 Test 1: Exercise Loading State');
  
  // Check if exercises are loaded
  const exerciseElements = document.querySelectorAll('[class*="exercise"]');
  console.log(`Found ${exerciseElements.length} exercise elements`);
  
  // Check for loading indicators
  const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
  console.log(`Found ${loadingElements.length} loading indicators`);
  
  // Check for error messages
  const errorElements = document.querySelectorAll('[class*="error"], [class*="destructive"]');
  console.log(`Found ${errorElements.length} error elements`);
  
  // Use debug tools if available
  if (window.programWizardDebug) {
    const state = window.programWizardDebug.getState();
    console.log('Exercise Loading State:', state.exerciseLoading);
    
    if (state.exerciseLoading.hasLoaded && state.exerciseLoading.exerciseCount > 0) {
      console.log('✅ Exercise loading: SUCCESS');
    } else if (state.exerciseLoading.isLoading) {
      console.log('⏳ Exercise loading: IN PROGRESS');
    } else {
      console.log('❌ Exercise loading: FAILED');
    }
  }
}

// Test 2: Swap/Replace Button Functionality
function testSwapButtons() {
  console.log('\n🔄 Test 2: Swap/Replace Button Functionality');
  
  const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
  console.log(`Found ${swapButtons.length} swap/replace buttons`);
  
  let enabledCount = 0;
  let disabledCount = 0;
  
  swapButtons.forEach((btn, index) => {
    if (btn.disabled) {
      disabledCount++;
      console.log(`❌ Button ${index + 1}: DISABLED (${btn.getAttribute('aria-label')})`);
    } else {
      enabledCount++;
      console.log(`✅ Button ${index + 1}: ENABLED (${btn.getAttribute('aria-label')})`);
    }
  });
  
  console.log(`Summary: ${enabledCount} enabled, ${disabledCount} disabled`);
  
  // Use debug tools for detailed analysis
  if (window.programWizardDebug) {
    const analysis = window.programWizardDebug.analyzeButtons();
    console.log('Debug Analysis:', analysis);
  }
  
  return { total: swapButtons.length, enabled: enabledCount, disabled: disabledCount };
}

// Test 3: Mobile Touch Events
function testMobileTouchEvents() {
  console.log('\n📱 Test 3: Mobile Touch Events');
  
  const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
  
  swapButtons.forEach((btn, index) => {
    const hasTouchClass = btn.classList.contains('touch-manipulation');
    const hasTouchStart = btn.getAttribute('ontouchstart') !== null;
    const hasTouchEnd = btn.getAttribute('ontouchend') !== null;
    
    console.log(`Button ${index + 1}:`, {
      touchClass: hasTouchClass,
      touchStart: hasTouchStart,
      touchEnd: hasTouchEnd
    });
    
    if (hasTouchClass) {
      console.log(`✅ Button ${index + 1}: Touch optimization enabled`);
    } else {
      console.log(`⚠️ Button ${index + 1}: Touch optimization missing`);
    }
  });
}

// Test 4: Dropdown Functionality
function testDropdowns() {
  console.log('\n📋 Test 4: Dropdown Functionality');
  
  // Check if dropdown containers exist
  const dropdownContainers = document.querySelectorAll('.absolute.z-\\[100\\]');
  console.log(`Found ${dropdownContainers.length} dropdown containers`);
  
  // Check for overlay elements
  const overlays = document.querySelectorAll('.fixed.inset-0.z-\\[90\\]');
  console.log(`Found ${overlays.length} dropdown overlays`);
  
  // Check for search inputs
  const searchInputs = document.querySelectorAll('input[placeholder*="Search"]');
  console.log(`Found ${searchInputs.length} search inputs`);
  
  // Use debug tools to check dropdown state
  if (window.programWizardDebug) {
    const state = window.programWizardDebug.getState();
    console.log('Dropdown State:', state.dropdownState);
  }
}

// Test 5: Whole-Card Drag & Drop
function testDragAndDrop() {
  console.log('\n🎯 Test 5: Whole-Card Drag & Drop');
  
  // Find exercise cards
  const exerciseCards = document.querySelectorAll('[draggable="true"]');
  console.log(`Found ${exerciseCards.length} draggable elements`);
  
  exerciseCards.forEach((card, index) => {
    const hasGrabCursor = card.style.cursor === 'grab' || card.classList.contains('cursor-grab');
    const hasActiveCursor = card.classList.contains('active:cursor-grabbing');
    const hasHoverEffects = card.classList.contains('hover:shadow-md') || card.classList.contains('hover:scale-\\[1\\.02\\]');
    
    console.log(`Card ${index + 1}:`, {
      draggable: card.draggable,
      grabCursor: hasGrabCursor,
      activeCursor: hasActiveCursor,
      hoverEffects: hasHoverEffects
    });
    
    if (card.draggable && hasGrabCursor) {
      console.log(`✅ Card ${index + 1}: Properly configured for drag & drop`);
    } else {
      console.log(`⚠️ Card ${index + 1}: Drag & drop configuration incomplete`);
    }
  });
}

// Test 6: Randomize Functionality
function testRandomizeButtons() {
  console.log('\n🎲 Test 6: Randomize Functionality');
  
  // Look for randomize buttons (they might have various labels)
  const randomizeButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
    const label = btn.getAttribute('aria-label') || btn.textContent || '';
    return label.toLowerCase().includes('random') || label.toLowerCase().includes('shuffle');
  });
  
  console.log(`Found ${randomizeButtons.length} randomize buttons`);
  
  randomizeButtons.forEach((btn, index) => {
    const isEnabled = !btn.disabled;
    console.log(`Randomize button ${index + 1}: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  });
}

// Test 7: Error Handling and Debug Tools
function testDebugTools() {
  console.log('\n🔧 Test 7: Debug Tools Availability');
  
  if (window.programWizardDebug) {
    console.log('✅ Debug tools available');
    
    // Test debug functions
    const state = window.programWizardDebug.getState();
    console.log('Current debug state:', state);
    
    // Test button analysis
    const buttonAnalysis = window.programWizardDebug.analyzeButtons();
    console.log('Button analysis:', buttonAnalysis);
    
    console.log('✅ All debug tools working');
  } else {
    console.log('❌ Debug tools not available');
  }
}

// Test 8: Performance Check
function testPerformance() {
  console.log('\n⚡ Test 8: Performance Check');
  
  // Measure DOM query performance
  const start = performance.now();
  const allButtons = document.querySelectorAll('button');
  const end = performance.now();
  
  console.log(`Found ${allButtons.length} buttons in ${(end - start).toFixed(2)}ms`);
  
  // Check for excessive DOM elements
  const totalElements = document.querySelectorAll('*').length;
  console.log(`Total DOM elements: ${totalElements}`);
  
  if (totalElements > 5000) {
    console.log('⚠️ High DOM element count - may impact performance');
  } else {
    console.log('✅ DOM element count is reasonable');
  }
}

// Main test runner
function runAllTests() {
  console.log('\n🚀 Running Program Wizard Fixes Tests...\n');
  
  try {
    testExerciseLoading();
    const swapResults = testSwapButtons();
    testMobileTouchEvents();
    testDropdowns();
    testDragAndDrop();
    testRandomizeButtons();
    testDebugTools();
    testPerformance();
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const totalSwapButtons = swapResults.total;
    const enabledSwapButtons = swapResults.enabled;
    
    if (totalSwapButtons > 0 && enabledSwapButtons === totalSwapButtons) {
      console.log('✅ CRITICAL: All swap buttons are enabled');
    } else if (totalSwapButtons > 0) {
      console.log(`⚠️ WARNING: ${enabledSwapButtons}/${totalSwapButtons} swap buttons enabled`);
    } else {
      console.log('❌ CRITICAL: No swap buttons found');
    }
    
    console.log('\n💡 Manual Testing Steps:');
    console.log('1. Try clicking a swap/replace button');
    console.log('2. Verify dropdown opens with exercise list');
    console.log('3. Test search functionality in dropdown');
    console.log('4. Try dragging an exercise card to reorder');
    console.log('5. Test randomize functionality');
    console.log('6. Test on mobile device/touch screen');
    
    console.log('\n🔍 Debug Commands:');
    console.log('- window.programWizardDebug.getState()');
    console.log('- window.programWizardDebug.printReport()');
    console.log('- window.programWizardDebug.analyzeButtons()');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Auto-run tests
runAllTests();

// Make test functions available globally
window.testProgramWizardFixes = {
  runAllTests,
  testExerciseLoading,
  testSwapButtons,
  testMobileTouchEvents,
  testDropdowns,
  testDragAndDrop,
  testRandomizeButtons,
  testDebugTools,
  testPerformance
};

console.log('\n💻 Test functions available at window.testProgramWizardFixes');
