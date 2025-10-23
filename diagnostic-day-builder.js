/**
 * COMPREHENSIVE DAY BUILDER DIAGNOSTICS
 * Navigate to Day Builder step, then paste this entire script into browser console
 * This will scan for clickability issues, dead zones, and provide detailed maps
 */

(async function() {
  const results = {
    timestamp: new Date().toISOString(),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    buttons: [],
    deadzones: [],
    issues: [],
    recommendations: []
  };

  console.clear();
  console.log('%c═══════════════════════════════════════════════════════', 'color: #FF6B6B; font-size: 14px; font-weight: bold;');
  console.log('%c🔍 COMPREHENSIVE DAY BUILDER DIAGNOSTICS', 'color: #FF6B6B; font-size: 18px; font-weight: bold;');
  console.log('%c═══════════════════════════════════════════════════════\n', 'color: #FF6B6B; font-size: 14px; font-weight: bold;');

  // ============ DEVICE INFO ============
  console.log('%c📱 DEVICE INFORMATION', 'color: #4ECDC4; font-size: 14px; font-weight: bold;');
  console.log(`Viewport: ${results.viewport.width}x${results.viewport.height}`);
  console.log(`User Agent: ${navigator.userAgent}`);
  console.log(`Touch Support: ${('ontouchstart' in window) ? '✅ YES' : '❌ NO'}`);
  console.log(`Pointer Events: ${('PointerEvent' in window) ? '✅ YES' : '❌ NO'}\n`);

  // ============ FIND ALL BUTTONS IN DAY BUILDER ============
  console.log('%c🔘 SCANNING ALL BUTTONS', 'color: #4ECDC4; font-size: 14px; font-weight: bold;');
  const allButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
    const rect = btn.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0; // Only visible buttons
  });

  console.log(`Found ${allButtons.length} visible buttons\n`);

  // ============ ANALYZE EACH BUTTON ============
  allButtons.forEach((btn, index) => {
    const rect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(btn);
    const parentStyle = window.getComputedStyle(btn.parentElement);

    // Check what element is on top at the center of this button
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    const isAccessible = btn.contains(topElement) || topElement === btn;

    // Get parent chain
    let parent = btn.parentElement;
    let parentChain = [];
    for (let i = 0; i < 5 && parent; i++) {
      parentChain.push({
        tag: parent.tagName.toLowerCase(),
        class: parent.className,
        overflow: window.getComputedStyle(parent).overflow,
        position: window.getComputedStyle(parent).position,
      });
      parent = parent.parentElement;
    }

    const buttonInfo = {
      index,
      label: btn.getAttribute('aria-label') || btn.textContent.trim().substring(0, 50),
      position: { x: Math.round(rect.left), y: Math.round(rect.top) },
      size: { width: Math.round(rect.width), height: Math.round(rect.height) },
      accessible: isAccessible,
      topElement: topElement ? `${topElement.tagName}.${topElement.className.split(' ')[0] || ''}` : 'null',
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      zIndex: style.zIndex,
      position: style.position,
      disabled: btn.disabled,
      touchAction: style.touchAction,
      userSelect: style.userSelect,
      parentChain
    };

    results.buttons.push(buttonInfo);

    // Log it
    const accessIcon = isAccessible ? '✅' : '❌';
    const sizeIcon = (rect.width >= 44 && rect.height >= 44) ? '✅' : '⚠️';

    console.log(`${accessIcon} Button ${index + 1}: ${buttonInfo.label}`);
    console.log(`   Position: (${buttonInfo.position.x}, ${buttonInfo.position.y})`);
    console.log(`   Size: ${sizeIcon} ${Math.round(rect.width)}x${Math.round(rect.height)} ${rect.width < 44 || rect.height < 44 ? '(too small for touch!)' : ''}`);
    console.log(`   Accessible: ${isAccessible ? 'YES' : 'NO - blocked by: ' + buttonInfo.topElement}`);

    if (!isAccessible) {
      console.log(`   ⚠️  DEBUG: ${buttonInfo.topElement} is on top`);
      results.issues.push({
        button: buttonInfo.label,
        issue: 'Button blocked by another element',
        blockedBy: buttonInfo.topElement,
        buttonRect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        topElementRect: topElement ? topElement.getBoundingClientRect() : null
      });
    }

    if (style.pointerEvents === 'none') {
      console.log(`   ⚠️  CSS: pointer-events = none (CANNOT CLICK!)`);
      results.issues.push({
        button: buttonInfo.label,
        issue: 'pointer-events: none',
        fix: 'Add pointer-events: auto or remove the none value'
      });
    }

    if (style.display === 'none') {
      console.log(`   ⚠️  CSS: display = none (HIDDEN!)`);
      results.issues.push({
        button: buttonInfo.label,
        issue: 'display: none',
        fix: 'Change display to block, flex, etc.'
      });
    }

    if (style.visibility !== 'visible' && style.visibility !== 'inherit') {
      console.log(`   ⚠️  CSS: visibility = ${style.visibility} (HIDDEN!)`);
      results.issues.push({
        button: buttonInfo.label,
        issue: `visibility: ${style.visibility}`,
        fix: 'Change visibility to visible'
      });
    }

    console.log('');
  });

  // ============ CHECK FOR OVERFLOW/CLIPPING ============
  console.log('%c🚨 CHECKING FOR OVERFLOW & CLIPPING', 'color: #4ECDC4; font-size: 14px; font-weight: bold;');
  const scrollContainers = document.querySelectorAll('[style*="overflow"], [class*="overflow"]');
  console.log(`Found ${scrollContainers.length} potential scroll containers\n`);

  scrollContainers.forEach((container, idx) => {
    const style = window.getComputedStyle(container);
    const overflow = style.overflow || style.overflowY || 'visible';
    const rect = container.getBoundingClientRect();

    if (overflow !== 'visible') {
      console.log(`Container ${idx + 1}: overflow = ${overflow}`);
      console.log(`  Position: (${Math.round(rect.left)}, ${Math.round(rect.top)})`);
      console.log(`  Size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);

      // Check if any buttons are clipped by this container
      allButtons.forEach(btn => {
        const btnRect = btn.getBoundingClientRect();
        const isInContainer = container.contains(btn);
        const isClipped = (btnRect.bottom > rect.bottom) || (btnRect.right > rect.right) || (btnRect.top < rect.top) || (btnRect.left < rect.left);

        if (isInContainer && isClipped && overflow === 'hidden') {
          console.log(`  ❌ CLIPS BUTTON: "${btn.getAttribute('aria-label')}"`);
          results.issues.push({
            button: btn.getAttribute('aria-label'),
            issue: `Clipped by overflow: ${overflow}`,
            container: container.className,
            fix: 'Add padding-bottom or increase container height'
          });
        }
      });
    }
  });
  console.log('');

  // ============ VISUAL POSITION MAP ============
  console.log('%c🗺️ VISUAL POSITION MAP', 'color: #4ECDC4; font-size: 14px; font-weight: bold;');
  console.log('This map shows button positions relative to viewport:\n');

  // Create a simple text-based map
  const mapWidth = 80;
  const mapHeight = 30;
  const map = Array(mapHeight).fill(null).map(() => Array(mapWidth).fill(' '));

  allButtons.forEach((btn, idx) => {
    const rect = btn.getBoundingClientRect();
    const mapX = Math.min(mapWidth - 1, Math.max(0, Math.round((rect.left / window.innerWidth) * mapWidth)));
    const mapY = Math.min(mapHeight - 1, Math.max(0, Math.round((rect.top / window.innerHeight) * mapHeight)));

    if (map[mapY] && map[mapY][mapX] !== undefined) {
      map[mapY][mapX] = idx < 10 ? idx : '*';
    }
  });

  console.log('┌' + '─'.repeat(mapWidth) + '┐');
  map.forEach(row => {
    console.log('│' + row.join('') + '│');
  });
  console.log('└' + '─'.repeat(mapWidth) + '┘');
  console.log('Numbers = button indices (0-9), * = multiple buttons\n');

  // ============ DEAD ZONES ANALYSIS ============
  console.log('%c⚠️ DEAD ZONES DETECTED', 'color: #FF6B6B; font-size: 14px; font-weight: bold;');
  const inaccessibleButtons = results.buttons.filter(b => !b.accessible);
  if (inaccessibleButtons.length > 0) {
    console.log(`Found ${inaccessibleButtons.length} inaccessible buttons:\n`);
    inaccessibleButtons.forEach(btn => {
      console.log(`❌ "${btn.label}"`);
      console.log(`   Position: (${btn.position.x}, ${btn.position.y})`);
      console.log(`   Blocked by: ${btn.topElement}`);
    });
  } else {
    console.log('✅ No dead zones detected!\n');
  }
  console.log('');

  // ============ ISSUES & RECOMMENDATIONS ============
  console.log('%c💡 ISSUES & RECOMMENDATIONS', 'color: #FFE66D; font-size: 14px; font-weight: bold;');
  if (results.issues.length > 0) {
    console.log(`Found ${results.issues.length} issues:\n`);
    results.issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.button}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.fix) console.log(`   Fix: ${issue.fix}`);
      console.log('');
    });
  } else {
    console.log('✅ No critical issues detected!\n');
  }

  // ============ CLICK SIMULATION TEST ============
  console.log('%c🧪 SIMULATING CLICKS', 'color: #4ECDC4; font-size: 14px; font-weight: bold;');
  console.log('Attempting to simulate clicks on each button...\n');

  const clickResults = [];
  allButtons.forEach((btn, idx) => {
    const label = btn.getAttribute('aria-label') || btn.textContent.trim();

    // Try different click methods
    const simResults = {
      button: label,
      clickMethod: [],
      eventsFired: false
    };

    // Track if events fire
    let eventFired = false;
    const listener = () => { eventFired = true; };
    btn.addEventListener('click', listener, { once: true });

    // Method 1: Direct click()
    try {
      btn.click();
      simResults.clickMethod.push('click() - ✅');
      eventFired = eventFired || true;
    } catch (e) {
      simResults.clickMethod.push(`click() - ❌ ${e.message}`);
    }

    // Method 2: Mouse events
    try {
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      simResults.clickMethod.push('MouseEvent - ✅');
    } catch (e) {
      simResults.clickMethod.push(`MouseEvent - ❌ ${e.message}`);
    }

    // Method 3: Pointer events
    try {
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      simResults.clickMethod.push('PointerEvent - ✅');
    } catch (e) {
      simResults.clickMethod.push(`PointerEvent - ❌ ${e.message}`);
    }

    btn.removeEventListener('click', listener);
    simResults.eventsFired = eventFired;

    clickResults.push(simResults);

    if (!eventFired) {
      console.log(`⚠️  Button "${label}": Click did not fire events`);
    }
  });

  // ============ FINAL SUMMARY ============
  console.log('\n%c═══════════════════════════════════════════════════════', 'color: #FF6B6B; font-size: 14px; font-weight: bold;');
  console.log('%c📊 SUMMARY', 'color: #FF6B6B; font-size: 16px; font-weight: bold;');
  console.log('%c═══════════════════════════════════════════════════════\n', 'color: #FF6B6B; font-size: 14px; font-weight: bold;');

  const accessible = results.buttons.filter(b => b.accessible).length;
  const touchOk = results.buttons.filter(b => b.size.width >= 44 && b.size.height >= 44).length;

  console.log(`Total Buttons: ${results.buttons.length}`);
  console.log(`Accessible: ${accessible}/${results.buttons.length} ${accessible === results.buttons.length ? '✅' : '❌'}`);
  console.log(`Touch Size OK (44px): ${touchOk}/${results.buttons.length} ${touchOk === results.buttons.length ? '✅' : '❌'}`);
  console.log(`Critical Issues: ${results.issues.length} ${results.issues.length === 0 ? '✅' : '❌'}`);

  console.log('\n%c📋 NEXT STEPS:', 'color: #FFE66D; font-weight: bold;');
  console.log('1. Copy the ENTIRE output above (use Ctrl+C in DevTools)');
  console.log('2. Share it with the developer');
  console.log('3. Also answer these questions:');
  console.log('   - What buttons are you trying to click?');
  console.log('   - Does clicking/tapping anywhere work on mobile?');
  console.log('   - Are you testing on real device or emulator?');
  console.log('   - Can you drag on desktop?');
  console.log('   - Are you using Chrome, Firefox, Safari, or other?');
  console.log('');

  // Store results globally
  window.dayBuilderDiagnostics = results;
  console.log('✅ Results stored in window.dayBuilderDiagnostics');
  console.log('You can export with: JSON.stringify(window.dayBuilderDiagnostics, null, 2)\n');

})();
