// Simple Button Test - No error spam
// Clear console first (Ctrl+L or click clear icon)
// Then paste this

console.clear();
console.log('%c🔧 Simple Swap Button Test', 'font-size: 18px; font-weight: bold; color: #4CAF50;');

const swapButtons = document.querySelectorAll('button[aria-label*="Replace"]');
console.log(`\nFound ${swapButtons.length} swap buttons\n`);

// Check first button
if (swapButtons.length > 0) {
  const btn = swapButtons[0];
  const parent = btn.parentElement;
  
  console.log('First Button Status:');
  console.log(`  Disabled: ${btn.disabled}`);
  console.log(`  Parent: ${parent?.className.substring(0, 50)}`);
  
  if (btn.disabled) {
    console.log('\n❌ PROBLEM: Button is disabled');
    console.log('   Exercises haven\'t loaded yet');
    console.log('   Check Network tab for failed requests\n');
  } else {
    console.log('\n✅ Button is enabled');
  }
  
  // Test functions
  window.enableAndTest = function() {
    console.clear();
    console.log('Enabling all swap buttons...');
    swapButtons.forEach(b => b.disabled = false);
    console.log(`✅ Enabled ${swapButtons.length} buttons`);
    console.log('\nNow manually click a swap button');
    console.log('Does the dropdown appear? Y/N');
  };
  
  window.clickTest = function() {
    console.clear();
    swapButtons.forEach(b => b.disabled = false);
    swapButtons[0].click();
    setTimeout(() => {
      const dropdown = document.querySelector('.absolute.right-0.top-full');
      if (dropdown) {
        console.log('✅ Dropdown appeared! Buttons work when enabled');
      } else {
        console.log('❌ Dropdown did NOT appear - z-index issue');
      }
    }, 100);
  };
  
  console.log('\n📝 Test Commands:');
  console.log('  enableAndTest()  - Enable buttons, then you click one');
  console.log('  clickTest()      - Auto-click and check if dropdown works');
}

