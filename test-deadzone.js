// Dead Zone Test - Find what's blocking swap button clicks
console.clear();
console.log('%c🎯 Dead Zone Analysis', 'font-size: 18px; font-weight: bold; color: #FF5722;');

const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
console.log(`\nFound ${swapButtons.length} swap buttons\n`);

if (swapButtons.length > 0) {
  const btn = swapButtons[0];
  const rect = btn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  console.log('First Button Analysis:');
  console.log(`  Position: (${Math.round(centerX)}, ${Math.round(centerY)})`);
  console.log(`  Size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  console.log(`  Disabled: ${btn.disabled}`);
  
  // Find what element is actually at the click point
  const topElement = document.elementFromPoint(centerX, centerY);
  console.log(`  Element at click point: ${topElement?.tagName}.${topElement?.className.split(' ')[0] || 'no-class'}`);
  
  // Check parent chain
  console.log('\nParent Chain:');
  let current = btn;
  let level = 0;
  while (current && level < 5) {
    const style = window.getComputedStyle(current);
    console.log(`  ${level}: ${current.tagName}.${current.className.split(' ')[0] || 'no-class'}`);
    console.log(`      z-index: ${style.zIndex}, pointer-events: ${style.pointerEvents}, position: ${style.position}`);
    current = current.parentElement;
    level++;
  }
  
  // Check for overlays
  console.log('\n🔍 Checking for blocking overlays:');
  const overlays = document.querySelectorAll('.fixed, .absolute, [style*="z-index"]');
  overlays.forEach((overlay, i) => {
    const overlayRect = overlay.getBoundingClientRect();
    const overlayStyle = window.getComputedStyle(overlay);
    
    // Check if overlay covers the button
    const coversButton = (
      overlayRect.left <= centerX && overlayRect.right >= centerX &&
      overlayRect.top <= centerY && overlayRect.bottom >= centerY
    );
    
    if (coversButton && overlayStyle.pointerEvents !== 'none') {
      console.log(`  ⚠️  Overlay ${i+1} covers button:`, {
        element: `${overlay.tagName}.${overlay.className.split(' ')[0] || 'no-class'}`,
        zIndex: overlayStyle.zIndex,
        pointerEvents: overlayStyle.pointerEvents,
        position: overlayStyle.position
      });
    }
  });
  
  // Test functions
  window.testClick = function() {
    console.clear();
    console.log('Testing click...');
    
    // Force enable button
    btn.disabled = false;
    
    // Try different click methods
    console.log('1. Direct click()');
    btn.click();
    
    setTimeout(() => {
      console.log('2. Mouse event simulation');
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      btn.dispatchEvent(event);
    }, 100);
    
    setTimeout(() => {
      console.log('3. Check if dropdown appeared');
      const dropdown = document.querySelector('.absolute.right-0.top-full');
      if (dropdown) {
        console.log('✅ Dropdown found!');
      } else {
        console.log('❌ No dropdown - something is blocking');
      }
    }, 200);
  };
  
  window.highlightDeadZone = function() {
    // Highlight the button
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid red;
      background: rgba(255, 0, 0, 0.2);
      pointer-events: none;
      z-index: 999999;
    `;
    document.body.appendChild(highlight);
    
    // Highlight what's on top
    if (topElement && topElement !== btn) {
      const topRect = topElement.getBoundingClientRect();
      const topHighlight = document.createElement('div');
      topHighlight.style.cssText = `
        position: fixed;
        left: ${topRect.left}px;
        top: ${topRect.top}px;
        width: ${topRect.width}px;
        height: ${topRect.height}px;
        border: 3px solid orange;
        background: rgba(255, 165, 0, 0.2);
        pointer-events: none;
        z-index: 999999;
      `;
      document.body.appendChild(topHighlight);
      console.log('🎨 Red = button, Orange = blocking element');
    }
    
    setTimeout(() => {
      document.querySelectorAll('[style*="border: 3px solid"]').forEach(el => el.remove());
    }, 5000);
  };
  
  console.log('\n📝 Test Commands:');
  console.log('  testClick()        - Try clicking the button');
  console.log('  highlightDeadZone() - Visualize what\'s blocking');
}

