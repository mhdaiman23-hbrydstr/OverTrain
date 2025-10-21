/**
 * Dead Click Test Script - Run in Browser Console
 * Navigate to the Day Builder step of the Program Wizard first
 * Then paste this entire script into the browser console
 */

(function() {
  const testResults = {
    dragHandles: { found: 0, clickable: [], positions: [] },
    swapButtons: { found: 0, clickable: [], positions: [] },
    randomizeButtons: { found: 0, clickable: [], positions: [] },
    overlays: [],
    touchTargets: []
  };

  console.log('\n%c🎯 Program Wizard Dead Click Test Suite', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50;');
  console.log('');

  // Helper to check if element is clickable
  function isElementClickable(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const topElement = document.elementFromPoint(centerX, centerY);
    
    return {
      rect,
      center: { x: centerX, y: centerY },
      isAccessible: element.contains(topElement) || topElement === element,
      topElement: topElement?.tagName + (topElement?.className ? '.' + topElement.className.split(' ')[0] : ''),
      zIndex: window.getComputedStyle(element).zIndex,
      pointerEvents: window.getComputedStyle(element).pointerEvents,
      visibility: window.getComputedStyle(element).visibility,
      display: window.getComputedStyle(element).display
    };
  }

  // Test 1: Drag Handles
  console.log('%c━━━ TEST 1: Drag Handles ━━━', 'font-size: 16px; color: #2196F3; font-weight: bold;');
  const dragHandles = document.querySelectorAll('button[aria-label*="drag"], button[aria-label*="Drag"]');
  testResults.dragHandles.found = dragHandles.length;
  console.log(`Found ${dragHandles.length} drag handles`);
  
  dragHandles.forEach((handle, index) => {
    const clickability = isElementClickable(handle);
    testResults.dragHandles.clickable.push(clickability.isAccessible);
    testResults.dragHandles.positions.push(clickability.rect);
    
    const status = clickability.isAccessible ? '✅' : '❌';
    console.log(`  ${status} Handle ${index + 1}:`, {
      position: `(${Math.round(clickability.rect.x)}, ${Math.round(clickability.rect.y)})`,
      size: `${Math.round(clickability.rect.width)}x${Math.round(clickability.rect.height)}`,
      accessible: clickability.isAccessible,
      topElement: clickability.topElement,
      pointerEvents: clickability.pointerEvents,
      touchAction: window.getComputedStyle(handle).touchAction
    });
    
    // Check for touch-none class
    if (handle.classList.contains('touch-none')) {
      console.warn(`  ⚠️  Handle ${index + 1} has 'touch-none' class - will not work on mobile!`);
    }
  });

  // Test 2: Swap/Replace Buttons
  console.log('\n%c━━━ TEST 2: Swap/Replace Buttons ━━━', 'font-size: 16px; color: #2196F3; font-weight: bold;');
  const swapButtons = document.querySelectorAll('button[aria-label*="swap"], button[aria-label*="replace"], button[aria-label*="Swap"], button[aria-label*="Replace"]');
  testResults.swapButtons.found = swapButtons.length;
  console.log(`Found ${swapButtons.length} swap/replace buttons`);
  
  swapButtons.forEach((button, index) => {
    const clickability = isElementClickable(button);
    testResults.swapButtons.clickable.push(clickability.isAccessible);
    testResults.swapButtons.positions.push(clickability.rect);
    
    const status = clickability.isAccessible ? '✅' : '❌ DEAD CLICK';
    console.log(`  ${status} Swap ${index + 1}:`, {
      position: `(${Math.round(clickability.rect.x)}, ${Math.round(clickability.rect.y)})`,
      size: `${Math.round(clickability.rect.width)}x${Math.round(clickability.rect.height)}`,
      accessible: clickability.isAccessible,
      topElement: clickability.topElement,
      disabled: button.disabled,
      pointerEvents: clickability.pointerEvents
    });
    
    if (!clickability.isAccessible) {
      console.error(`  ❌ Button blocked by: ${clickability.topElement}`);
    }
    
    // Check touch target size for mobile
    if (clickability.rect.height < 44 || clickability.rect.width < 44) {
      console.warn(`  ⚠️  Button too small for mobile (44px minimum): ${Math.round(clickability.rect.width)}x${Math.round(clickability.rect.height)}`);
    }
  });

  // Test 3: Randomize Buttons
  console.log('\n%c━━━ TEST 3: Randomize Buttons ━━━', 'font-size: 16px; color: #2196F3; font-weight: bold;');
  const randomizeButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Randomize') || 
    btn.getAttribute('aria-label')?.toLowerCase().includes('randomize') ||
    btn.getAttribute('aria-label')?.toLowerCase().includes('shuffle')
  );
  testResults.randomizeButtons.found = randomizeButtons.length;
  console.log(`Found ${randomizeButtons.length} randomize/shuffle buttons`);
  
  randomizeButtons.forEach((button, index) => {
    const clickability = isElementClickable(button);
    testResults.randomizeButtons.clickable.push(clickability.isAccessible);
    testResults.randomizeButtons.positions.push(clickability.rect);
    
    const status = clickability.isAccessible ? '✅' : '❌ DEAD CLICK';
    console.log(`  ${status} Randomize ${index + 1}:`, {
      position: `(${Math.round(clickability.rect.x)}, ${Math.round(clickability.rect.y)})`,
      size: `${Math.round(clickability.rect.width)}x${Math.round(clickability.rect.height)}`,
      accessible: clickability.isAccessible,
      topElement: clickability.topElement,
      disabled: button.disabled
    });
    
    if (!clickability.isAccessible) {
      console.error(`  ❌ Button blocked by: ${clickability.topElement}`);
    }
  });

  // Test 4: Check for Overlays
  console.log('\n%c━━━ TEST 4: Overlay Detection ━━━', 'font-size: 16px; color: #2196F3; font-weight: bold;');
  const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], .fixed.inset-0, [data-radix-presence]');
  console.log(`Found ${overlays.length} potential overlay elements`);
  
  overlays.forEach((overlay, index) => {
    const rect = overlay.getBoundingClientRect();
    const style = window.getComputedStyle(overlay);
    
    if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
      const overlayInfo = {
        element: overlay.tagName + '.' + (overlay.className.split(' ')[0] || ''),
        zIndex: style.zIndex,
        pointerEvents: style.pointerEvents,
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        visible: style.visibility,
        opacity: style.opacity
      };
      
      testResults.overlays.push(overlayInfo);
      
      if (style.pointerEvents !== 'none') {
        console.warn(`  ⚠️  Active overlay ${index + 1}:`, overlayInfo);
      } else {
        console.log(`  ℹ️  Inactive overlay ${index + 1}:`, overlayInfo);
      }
    }
  });

  // Test 5: Touch Targets for Mobile
  console.log('\n%c━━━ TEST 5: Touch Target Sizes ━━━', 'font-size: 16px; color: #2196F3; font-weight: bold;');
  const allButtons = document.querySelectorAll('button[aria-label*="Replace"], button[aria-label*="Shuffle"], button[aria-label*="Remove"], button[aria-label*="drag"]');
  let tooSmallCount = 0;
  
  allButtons.forEach((button) => {
    const rect = button.getBoundingClientRect();
    const isTooSmall = rect.width < 44 || rect.height < 44;
    
    if (isTooSmall) {
      tooSmallCount++;
      console.warn(`  ❌ Touch target too small: ${button.getAttribute('aria-label')}`, {
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        needed: '44x44 minimum'
      });
      testResults.touchTargets.push({
        element: button.getAttribute('aria-label'),
        size: { width: rect.width, height: rect.height },
        meetsMinimum: false
      });
    } else {
      testResults.touchTargets.push({
        element: button.getAttribute('aria-label'),
        size: { width: rect.width, height: rect.height },
        meetsMinimum: true
      });
    }
  });
  
  if (tooSmallCount === 0) {
    console.log('  ✅ All touch targets meet 44px minimum');
  } else {
    console.log(`  ❌ ${tooSmallCount} buttons are too small for mobile`);
  }

  // Summary
  console.log('\n%c═══════════════════════════════════════════════════════', 'color: #4CAF50;');
  console.log('%c📊 TEST SUMMARY', 'font-size: 18px; font-weight: bold; color: #4CAF50;');
  console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50;');
  
  const dragClickable = testResults.dragHandles.clickable.filter(Boolean).length;
  const swapClickable = testResults.swapButtons.clickable.filter(Boolean).length;
  const randomizeClickable = testResults.randomizeButtons.clickable.filter(Boolean).length;
  const touchTargetsMet = testResults.touchTargets.filter(t => t.meetsMinimum).length;
  
  console.log(`
Drag Handles:     ${dragClickable}/${testResults.dragHandles.found} clickable
Swap Buttons:     ${swapClickable}/${testResults.swapButtons.found} clickable ${swapClickable < testResults.swapButtons.found ? '❌' : '✅'}
Randomize:        ${randomizeClickable}/${testResults.randomizeButtons.found} clickable ${randomizeClickable < testResults.randomizeButtons.found ? '❌' : '✅'}
Touch Targets:    ${touchTargetsMet}/${testResults.touchTargets.length} meet 44px min ${touchTargetsMet < testResults.touchTargets.length ? '❌' : '✅'}
Active Overlays:  ${testResults.overlays.filter(o => o.pointerEvents !== 'none').length} ${testResults.overlays.filter(o => o.pointerEvents !== 'none').length > 0 ? '⚠️' : '✅'}
  `);

  // Enable Visual Debugging
  console.log('\n%c💡 TIP: Run window.highlightProblems() to visually highlight dead click areas', 'color: #FF9800; font-weight: bold;');
  
  window.highlightProblems = function() {
    // Remove old highlights
    document.querySelectorAll('.dead-click-highlight').forEach(el => el.remove());
    
    // Highlight inaccessible swap buttons
    swapButtons.forEach((button, index) => {
      const clickability = isElementClickable(button);
      if (!clickability.isAccessible) {
        const highlight = document.createElement('div');
        highlight.className = 'dead-click-highlight';
        highlight.style.cssText = `
          position: fixed;
          left: ${clickability.rect.left}px;
          top: ${clickability.rect.top}px;
          width: ${clickability.rect.width}px;
          height: ${clickability.rect.height}px;
          border: 3px solid red;
          background: rgba(255, 0, 0, 0.2);
          pointer-events: none;
          z-index: 999999;
          animation: pulse 1s infinite;
        `;
        document.body.appendChild(highlight);
        
        const label = document.createElement('div');
        label.className = 'dead-click-highlight';
        label.style.cssText = `
          position: fixed;
          left: ${clickability.rect.left}px;
          top: ${clickability.rect.top - 25}px;
          background: red;
          color: white;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: bold;
          z-index: 999999;
          pointer-events: none;
        `;
        label.textContent = `DEAD CLICK - blocked by ${clickability.topElement}`;
        document.body.appendChild(label);
      }
    });
    
    console.log('🎨 Visual highlights added! Red borders = dead clicks');
  };

  // Store results globally
  window.deadClickTestResults = testResults;
  console.log('\n%c✅ Results stored in window.deadClickTestResults', 'color: #4CAF50;');
  
})();

