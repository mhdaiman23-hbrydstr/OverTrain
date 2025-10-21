# Manual Testing Guide for Program Wizard Dead Clicks

## Quick Console Test

### Step 1: Navigate to Day Builder
1. Open your app at `http://localhost:3000`
2. Sign in if needed
3. Go to **Programs** → **New** → **Choose from template**
4. Select **3 Days, 4 Weeks**
5. Click **Next**
6. Select any template
7. Click **Next** to reach the **Day Builder** page

### Step 2: Run Console Test
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Copy the entire contents of `test-deadclicks-console.js`
4. Paste into console and press Enter

### Step 3: Review Results
The script will show:
- ✅ Number of clickable drag handles
- ✅ Number of clickable swap buttons
- ✅ Number of clickable randomize buttons
- ⚠️ Any overlays blocking clicks
- ⚠️ Touch targets that are too small

### Step 4: Visual Debugging (Optional)
Run this in console:
```javascript
window.highlightProblems()
```
This will highlight any dead click areas with red borders.

---

## Manual Click Testing

### Test on Desktop

#### Test 1: Drag Handles
1. Find the grip icon (⋮⋮) on the left of each exercise
2. Try to drag an exercise up or down
3. **Expected**: Exercise should move smoothly
4. **Dead Click**: Nothing happens when you try to drag

#### Test 2: Swap/Replace Button
1. Find the replace icon (🔄) on each exercise row
2. Click the replace button
3. **Expected**: Exercise library dropdown appears with filtered exercises
4. **Dead Click**: Nothing happens, no dropdown appears

#### Test 3: Randomize Button
1. Find the "Randomize" button for each day section
2. Click the randomize button
3. **Expected**: Exercises in that day shuffle/change
4. **Dead Click**: Nothing happens, exercises stay the same

### Test on Mobile/Tablet

#### Setup
1. Open DevTools (F12)
2. Click the device toolbar icon (or Ctrl+Shift+M)
3. Select a device:
   - **Mobile**: iPhone SE (375x667)
   - **Tablet**: iPad (768x1024)

#### Test 1: Touch Targets
1. All buttons should be at least 44x44 pixels
2. Buttons should not feel cramped or overlap
3. **Expected**: Easy to tap without mis-clicks
4. **Problem**: Buttons too small, hard to tap accurately

#### Test 2: Swap Button on Mobile
1. Tap the replace icon on an exercise
2. **Expected**: Dropdown appears and is easy to interact with
3. **Dead Click**: Nothing happens or dropdown appears but can't scroll/click

#### Test 3: Randomize on Mobile
1. Tap the "Randomize" button
2. **Expected**: Exercises shuffle
3. **Dead Click**: Nothing happens

#### Test 4: No Bottom Nav Overlap
1. Scroll to the bottom of the page
2. **Expected**: Bottom navigation doesn't cover content
3. **Problem**: Bottom nav covers the last exercises or buttons

---

## Common Issues to Look For

### 1. Overlays Blocking Clicks
**Symptom**: You can see the button but clicks don't register

**Check**:
- Look for invisible overlays using the console script
- Check if Radix UI modals are interfering
- Run `window.highlightProblems()` to see what's blocking

### 2. Event Propagation Issues
**Symptom**: Clicking buttons triggers parent element actions

**Check**:
- Does clicking a button cause the day section to collapse/expand?
- Does the dropdown close immediately after opening?

### 3. Touch Events Blocked
**Symptom**: Works on desktop but not on mobile/touch devices

**Check**:
- Inspect element and look for `touch-none` class
- Check if `touch-action` CSS is set to `none`
- Verify touch target sizes are at least 44px

### 4. Z-Index Issues
**Symptom**: Dropdown appears behind other content

**Check**:
- Can you see the dropdown but can't click items?
- Does content overlap the dropdown?
- Check z-index values in DevTools

---

## Quick Fix Verification

After applying fixes from `PROGRAM_WIZARD_DEAD_CLICKS_FIX_SUMMARY.md`:

### ✅ Checklist
- [ ] Swap buttons open dropdown immediately
- [ ] Dropdown items are clickable
- [ ] Randomize buttons shuffle exercises
- [ ] Drag handles allow reordering (desktop)
- [ ] All buttons work on mobile viewport
- [ ] No bottom navigation overlap
- [ ] Touch targets are 44px minimum
- [ ] No `touch-none` classes on interactive elements
- [ ] No invisible overlays blocking clicks

### 🔧 If Issues Persist

1. **Clear browser cache and hard refresh** (Ctrl+Shift+R)
2. **Check for console errors** (F12 → Console tab)
3. **Run the console test script** to identify specific problems
4. **Use `window.highlightProblems()`** to visualize dead clicks
5. **Compare with the fixes** in `PROGRAM_WIZARD_DEAD_CLICKS_FIX_SUMMARY.md`

---

## Viewport Testing Matrix

| Test | Desktop (1920px) | Tablet (768px) | Mobile (375px) |
|------|------------------|----------------|----------------|
| Drag handles work | ✅ Should work | ⚠️ May not work | ⚠️ May not work |
| Swap buttons clickable | ✅ Test this | ✅ Test this | ✅ Test this |
| Randomize clickable | ✅ Test this | ✅ Test this | ✅ Test this |
| Dropdown opens | ✅ Test this | ✅ Test this | ✅ Test this |
| Dropdown scrollable | ✅ Test this | ✅ Test this | ✅ Test this |
| Touch targets ≥44px | N/A | ✅ Test this | ✅ Test this |
| No nav overlap | N/A | ✅ Test this | ✅ Test this |

---

## Reporting Issues

If you find dead clicks, note:
1. **Which button** (drag, swap, randomize)
2. **Which viewport** (desktop, tablet, mobile)
3. **What happens** (nothing, wrong action, error)
4. **Console errors** (if any)
5. **Element blocking** (from `window.highlightProblems()`)

Example:
```
❌ Swap button #2 on Day 1
   Viewport: Mobile (375px)
   Issue: No dropdown appears
   Blocked by: div.fixed.inset-0 (z-index: 90)
   Console: No errors
```

