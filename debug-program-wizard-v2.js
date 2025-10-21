// Enhanced debugging script for program wizard fixes v2
// Run this in the browser console on /program-wizard?step=dayBuilder

console.log('🔧 Enhanced Program Wizard Debugging v2...');

// Enhanced overlay detection
function detectOverlays() {
  console.log('\n🔍 Detecting overlay elements...');
  
  const overlays = [];
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    // Check for elements that could block clicks
    if (
      (parseInt(style.zIndex) > 40 && style.position !== 'static') ||
      style.position === 'fixed' ||
      style.position === 'absolute'
    ) {
      overlays.push({
        element: el,
        tag: el.tagName,
        className: el.className,
        id: el.id,
        zIndex: style.zIndex,
        position: style.position,
        pointerEvents: style.pointerEvents,
        display: style.display,
        visibility: style.visibility,
        rect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        clickable: style.pointerEvents !== 'none' && style.display !== 'none' && style.visibility !== 'hidden'
      });
    }
  });
  
  console.log('Potential overlay elements:', overlays);
  return overlays;
}

// Test specific button functionality
function testButtonFunctionality() {
  console.log('\n🖱️ Testing button functionality...');
  
  const tests = {
    replaceButtons: document.querySelectorAll('button[aria-label*="Replace"]'),
    randomizeButtons: document.querySelectorAll('button[aria-label*="Shuffle"]'),
    dragHandles: document.querySelectorAll('button[aria-label*="Reorder"]'),
    removeButtons: document.querySelectorAll('button[aria-label*="Remove"]')
  };
  
  Object.entries(tests).forEach(([type, buttons]) => {
    console.log(`\n${type}: Found ${buttons.length} buttons`);
    
    buttons.forEach((btn, index) => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      
      console.log(`  Button ${index + 1}:`, {
        visible: rect.width > 0 && rect.height > 0,
        clickable: style.pointerEvents !== 'none',
        disabled: btn.disabled,
        zIndex: style.zIndex,
        position: style.position,
        rect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        }
      });
      
      // Test click event
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const clickResult = btn.dispatchEvent(clickEvent);
      console.log(`  Click test result: ${clickResult}`);
    });
  });
}

// Check element at specific coordinates
function checkElementAtPoint(x, y, label) {
  const element = document.elementFromPoint(x, y);
  console.log(`\n📍 Element at ${label} (${x}, ${y}):`, element);
  
  if (element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    console.log('  Details:', {
      tag: element.tagName,
      className: element.className,
      id: element.id,
      ariaLabel: element.getAttribute('aria-label'),
      zIndex: style.zIndex,
      position: style.position,
      pointerEvents: style.pointerEvents,
      display: style.display,
      visibility: style.visibility,
      rect: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      }
    });
  }
  
  return element;
}

// Visual debugging - add borders to clickable elements
function enableVisualDebugging() {
  console.log('\n🎨 Enabling visual debugging...');
  
  // Add borders to all buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.style.outline = '2px solid red';
    btn.style.outlineOffset = '2px';
  });
  
  // Add borders to dropdown overlays
  const dropdowns = document.querySelectorAll('.absolute.z-\\[100\\]');
  dropdowns.forEach(dd => {
    dd.style.outline = '3px solid blue';
    dd.style.outlineOffset = '2px';
  });
  
  console.log('Added red borders to buttons, blue borders to dropdowns');
  console.log('Run disableVisualDebugging() to remove borders');
}

function disableVisualDebugging() {
  const elements = document.querySelectorAll('*');
  elements.forEach(el => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  });
  console.log('Visual debugging borders removed');
}

// Test mobile touch events
function testTouchEvents() {
  console.log('\n📱 Testing touch events...');
  
  const buttons = document.querySelectorAll('button');
  let touchSupported = 'ontouchstart' in window;
  
  console.log(`Touch support: ${touchSupported}`);
  
  buttons.forEach((btn, index) => {
    if (index < 3) { // Test first 3 buttons
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{
          clientX: 100,
          clientY: 100,
          identifier: 0,
          target: btn,
          force: 1
        }]
      });
      
      const result = btn.dispatchEvent(touchStart);
      console.log(`Button ${index + 1} touch test: ${result}`);
    }
  });
}

// Check for CSS conflicts
function checkCSSConflicts() {
  console.log('\n🎭 Checking CSS conflicts...');
  
  const buttons = document.querySelectorAll('button');
  buttons.forEach((btn, index) => {
    if (index < 3) { // Check first 3 buttons
      const style = window.getComputedStyle(btn);
      const computed = {
        pointerEvents: style.pointerEvents,
        userSelect: style.userSelect,
        webkitUserSelect: style.webkitUserSelect,
        webkitTouchCallout: style.webkitTouchCallout,
        webkitTapHighlightColor: style.webkitTapHighlightColor
      };
      
      console.log(`Button ${index + 1} CSS:`, computed);
    }
  });
}

// Comprehensive test runner
function runComprehensiveTest() {
  console.log('🚀 Running comprehensive debugging test...');
  
  const overlays = detectOverlays();
  testButtonFunctionality();
  
  // Check key points on screen
  checkElementAtPoint(window.innerWidth / 2, 300, 'center');
  checkElementAtPoint(window.innerWidth / 2, window.innerHeight - 100, 'bottom');
  
  // Check first button position
  const firstButton = document.querySelector('button');
  if (firstButton) {
    const rect = firstButton.getBoundingClientRect();
    checkElementAtPoint(rect.left + 5, rect.top + 5, 'first button');
  }
  
  testTouchEvents();
  checkCSSConflicts();
  
  console.log('\n✅ Comprehensive test complete!');
  console.log('🎨 Run enableVisualDebugging() to see clickable areas');
  console.log('🧹 Run disableVisualDebugging() to remove visual debugging');
  
  return {
    overlays,
    enableVisualDebugging,
    disableVisualDebugging
  };
}

// Export for manual testing
window.debugWizardV2 = {
  detectOverlays,
  testButtonFunctionality,
  checkElementAtPoint,
  enableVisualDebugging,
  disableVisualDebugging,
  testTouchEvents,
  checkCSSConflicts,
  runComprehensiveTest
};

// Auto-run comprehensive test
const results = runComprehensiveTest();

console.log('\n💡 Available commands:');
console.log('- debugWizardV2.runComprehensiveTest() - Run all tests');
console.log('- debugWizardV2.enableVisualDebugging() - Show clickable areas');
console.log('- debugWizardV2.checkElementAtPoint(x, y, label) - Check specific point');
console.log('- debugWizardV2.testButtonFunctionality() - Test buttons specifically');
