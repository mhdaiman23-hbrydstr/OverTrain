// Mobile Functionality Test Script
// Tests swap buttons, drag & drop, and dialog functionality on mobile/tablet viewports

console.clear();
console.log('%c📱 Mobile Functionality Test', 'font-size: 20px; font-weight: bold; color: #2196F3;');

// Test 1: Viewport Detection
function testViewport() {
  console.log('\n📐 Test 1: Viewport Detection');
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  console.log(`Current viewport: ${width}x${height}`);
  
  let viewportType = 'desktop';
  if (width <= 768) {
    viewportType = 'mobile';
  } else if (width <= 1024) {
    viewportType = 'tablet';
  }
  
  console.log(`Viewport type: ${viewportType}`);
  
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  console.log(`Touch support: ${hasTouch ? '✅ YES' : '❌ NO'}`);
  
  if (navigator.maxTouchPoints) {
    console.log(`Max touch points: ${navigator.maxTouchPoints}`);
  }
  
  return { width, height, viewportType, hasTouch };
}

// Test 2: Swap Button Touch Targets
function testSwapButtonTouchTargets() {
  console.log('\n🔄 Test 2: Swap Button Touch Targets');
  
  const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
  console.log(`Found ${swapButtons.length} swap buttons`);
  
  swapButtons.forEach((btn, index) => {
    const rect = btn.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    console.log(`\nButton ${index + 1}:`);
    console.log(`- Dimensions: ${width.toFixed(0)}x${height.toFixed(0)}px`);
    console.log(`- Meets 44x44px minimum: ${width >= 44 && height >= 44 ? '✅ YES' : '❌ NO'}`);
    console.log(`- Touch manipulation class: ${btn.classList.contains('touch-manipulation') ? '✅ YES' : '❌ NO'}`);
    console.log(`- Disabled: ${btn.disabled ? '❌ YES' : '✅ NO'}`);
    console.log(`- Visible: ${btn.offsetParent !== null ? '✅ YES' : '❌ NO'}`);
    
    // Check for touch event listeners
    const hasTouchEvents = btn.getAttribute('ontouchstart') !== null || 
                           btn.getAttribute('ontouchend') !== null ||
                           btn.getAttribute('onpointerdown') !== null ||
                           btn.getAttribute('onpointerup') !== null;
    
    console.log(`- Touch events: ${hasTouchEvents ? '✅ YES' : '❌ NO'}`);
  });
  
  return swapButtons.length;
}

// Test 3: Mobile Touch Event Simulation
function testMobileTouchEvents() {
  console.log('\n👆 Test 3: Mobile Touch Event Simulation');
  
  const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
  
  if (swapButtons.length === 0) {
    console.log('❌ No swap buttons found to test');
    return false;
  }
  
  const firstButton = swapButtons[0];
  console.log('Testing touch events on first swap button...');
  
  // Simulate touch events
  const touchStartEvent = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [{
      clientX: firstButton.getBoundingClientRect().left + 10,
      clientY: firstButton.getBoundingClientRect().top + 10,
      identifier: 0,
      target: firstButton,
      force: 1
    }]
  });
  
  const touchEndEvent = new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    changedTouches: [{
      clientX: firstButton.getBoundingClientRect().left + 10,
      clientY: firstButton.getBoundingClientRect().top + 10,
      identifier: 0,
      target: firstButton,
      force: 1
    }]
  });
  
  console.log('Dispatching touchstart event...');
  const startResult = firstButton.dispatchEvent(touchStartEvent);
  console.log(`Touchstart result: ${startResult ? '✅ Dispatched' : '❌ Cancelled'}`);
  
  setTimeout(() => {
    console.log('Dispatching touchend event...');
    const endResult = firstButton.dispatchEvent(touchEndEvent);
    console.log(`Touchend result: ${endResult ? '✅ Dispatched' : '❌ Cancelled'}`);
    
    // Check if dialog appeared after touch events
    setTimeout(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], .dialog, [data-state="open"]');
      console.log(`Dialogs after touch events: ${dialogs.length}`);
      
      if (dialogs.length > 0) {
        console.log('✅ Touch events successfully triggered dialog!');
      } else {
        console.log('❌ Touch events did not trigger dialog');
      }
    }, 500);
  }, 100);
  
  return true;
}

// Test 4: Drag & Drop Touch Support
function testDragDropTouchSupport() {
  console.log('\n🎯 Test 4: Drag & Drop Touch Support');
  
  const draggableElements = document.querySelectorAll('[draggable="true"]');
  console.log(`Found ${draggableElements.length} draggable elements`);
  
  draggableElements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const hasGrabCursor = element.style.cursor === 'grab' || 
                         element.classList.contains('cursor-grab');
    const hasTouchEvents = element.getAttribute('ontouchstart') !== null;
    
    console.log(`\nDraggable element ${index + 1}:`);
    console.log(`- Dimensions: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`);
    console.log(`- Grab cursor: ${hasGrabCursor ? '✅ YES' : '❌ NO'}`);
    console.log(`- Touch events: ${hasTouchEvents ? '✅ YES' : '❌ NO'}`);
    console.log(`- Draggable attribute: ${element.draggable ? '✅ YES' : '❌ NO'}`);
  });
  
  return draggableElements.length;
}

// Test 5: Dialog Mobile Responsiveness
function testDialogResponsiveness() {
  console.log('\n📋 Test 5: Dialog Mobile Responsiveness');
  
  // Try to find any existing dialogs or create a test one
  let dialogs = document.querySelectorAll('[role="dialog"], .dialog, [data-state="open"]');
  
  if (dialogs.length === 0) {
    console.log('No dialogs found. Testing dialog CSS classes...');
    
    // Check if dialog CSS classes are properly defined
    const testElement = document.createElement('div');
    testElement.className = 'fixed inset-0 z-50 bg-background/80';
    document.body.appendChild(testElement);
    
    const styles = window.getComputedStyle(testElement);
    console.log('Dialog overlay styles:');
    console.log(`- Position: ${styles.position}`);
    console.log(`- Z-index: ${styles.zIndex}`);
    console.log(`- Background: ${styles.backgroundColor}`);
    
    document.body.removeChild(testElement);
  } else {
    console.log(`Found ${dialogs.length} dialog(s)`);
    
    dialogs.forEach((dialog, index) => {
      const rect = dialog.getBoundingClientRect();
      const isWithinViewport = rect.left >= 0 && rect.top >= 0 && 
                             rect.right <= window.innerWidth && 
                             rect.bottom <= window.innerHeight;
      
      console.log(`\nDialog ${index + 1}:`);
      console.log(`- Dimensions: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`);
      console.log(`- Within viewport: ${isWithinViewport ? '✅ YES' : '❌ NO'}`);
      console.log(`- Position: ${rect.left.toFixed(0)},${rect.top.toFixed(0)}`);
    });
  }
  
  return dialogs.length;
}

// Test 6: Performance on Mobile
function testMobilePerformance() {
  console.log('\n⚡ Test 6: Performance on Mobile');
  
  // Measure DOM query performance
  const start = performance.now();
  const allButtons = document.querySelectorAll('button');
  const end = performance.now();
  
  console.log(`DOM query time: ${(end - start).toFixed(2)}ms for ${allButtons.length} buttons`);
  
  // Check for excessive DOM elements
  const totalElements = document.querySelectorAll('*').length;
  console.log(`Total DOM elements: ${totalElements}`);
  
  if (totalElements > 5000) {
    console.log('⚠️ High DOM element count - may impact mobile performance');
  } else {
    console.log('✅ DOM element count is reasonable for mobile');
  }
  
  // Check memory usage if available
  if (performance.memory) {
    const memory = performance.memory;
    console.log(`Memory usage: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB`);
  }
  
  return { domQueryTime: end - start, totalElements };
}

// Test 7: Mobile-Specific CSS
function testMobileSpecificCSS() {
  console.log('\n🎨 Test 7: Mobile-Specific CSS');
  
  const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
  
  swapButtons.forEach((btn, index) => {
    const styles = window.getComputedStyle(btn);
    
    console.log(`\nButton ${index + 1} styles:`);
    console.log(`- Touch action: ${styles.touchAction}`);
    console.log(`- User select: ${styles.userSelect}`);
    console.log(`- Pointer events: ${styles.pointerEvents}`);
    console.log(`- Min height: ${styles.minHeight}`);
    console.log(`- Min width: ${styles.minWidth}`);
    
    const hasTouchOptimization = styles.touchAction !== 'auto' || 
                               styles.userSelect === 'none' ||
                               btn.classList.contains('touch-manipulation');
    
    console.log(`- Touch optimized: ${hasTouchOptimization ? '✅ YES' : '❌ NO'}`);
  });
}

// Main test runner
function runMobileTests() {
  console.log('\n🚀 Running Mobile Functionality Tests...\n');
  
  try {
    const viewport = testViewport();
    const swapButtonCount = testSwapButtonTouchTargets();
    const touchEventResult = testMobileTouchEvents();
    const dragDropCount = testDragDropTouchSupport();
    const dialogCount = testDialogResponsiveness();
    const performance = testMobilePerformance();
    testMobileSpecificCSS();
    
    // Summary
    console.log('\n📊 MOBILE TEST SUMMARY');
    console.log('========================');
    
    console.log(`Viewport: ${viewport.viewportType} (${viewport.width}x${viewport.height})`);
    console.log(`Touch support: ${viewport.hasTouch ? '✅ YES' : '❌ NO'}`);
    console.log(`Swap buttons: ${swapButtonCount} found`);
    console.log(`Drag & drop: ${dragDropCount} draggable elements`);
    console.log(`Dialogs: ${dialogCount} found`);
    console.log(`Performance: ${performance.domQueryTime.toFixed(2)}ms DOM query time`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (!viewport.hasTouch) {
      console.log('- Test on actual touch device for accurate results');
    }
    
    if (swapButtonCount === 0) {
      console.log('- No swap buttons found - navigate to Program Wizard Day Builder');
    }
    
    const hasIssues = swapButtonCount === 0 || !touchEventResult;
    
    if (hasIssues) {
      console.log('- ❌ Issues detected - see detailed results above');
    } else {
      console.log('- ✅ All mobile functionality appears to be working');
    }
    
    console.log('\n🔍 MANUAL TESTING STEPS:');
    console.log('1. Switch to tablet/mobile view in browser dev tools');
    console.log('2. Try clicking swap buttons with touch simulation');
    console.log('3. Verify dialog opens and displays exercises');
    console.log('4. Test search and filter functionality in dialog');
    console.log('5. Try drag & drop reordering on touch device');
    console.log('6. Test on actual mobile device if possible');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Auto-run tests
runMobileTests();

// Make test functions available globally
window.testMobileFunctionality = {
  runAllTests: runMobileTests,
  testViewport,
  testSwapButtonTouchTargets,
  testMobileTouchEvents,
  testDragDropTouchSupport,
  testDialogResponsiveness,
  testMobilePerformance,
  testMobileSpecificCSS
};

console.log('\n💻 Mobile test functions available at window.testMobileFunctionality');
