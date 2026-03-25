/**
 * Status Bar Initialization
 * 
 * Configures the native status bar on iOS and Android to ensure
 * proper display and prevent content from bleeding under the status bar.
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative, isAndroid, isIOS } from './platform';

/**
 * Initialize the status bar with proper configuration for the app.
 * Should be called once when the app starts.
 */
export async function initializeStatusBar(): Promise<void> {
  if (!isNative()) {
    console.log('[StatusBar] Not on native platform, skipping initialization');
    return;
  }

  try {
    // Show the status bar (in case it was hidden by splash screen)
    await StatusBar.show();
    console.log('[StatusBar] Status bar shown');

    // Set style based on theme (light content for dark backgrounds)
    await StatusBar.setStyle({ style: Style.Light });
    console.log('[StatusBar] Style set to Light');

    if (isAndroid()) {
      // On Android 15+ (API 35), edge-to-edge is enforced — the WebView draws
      // behind the status bar regardless of the overlaysWebView setting.
      // Setting overlay: true tells the browser this is intentional, which
      // causes env(safe-area-inset-top) to be populated with the correct value.
      // CSS safe-area padding on headers (WorkoutHeader, TemplateDetailView)
      // then creates the visual spacing below the status bar.
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: '#00000000' }); // transparent
      console.log('[StatusBar] Android: overlay enabled, transparent background');

      // Fallback: if env(safe-area-inset-top) is still 0 after overlay change,
      // set the CSS variable directly using standard Android status bar height (24dp)
      requestAnimationFrame(() => {
        const testEl = document.createElement('div');
        testEl.style.paddingTop = 'env(safe-area-inset-top, 0px)';
        testEl.style.position = 'absolute';
        testEl.style.visibility = 'hidden';
        document.body.appendChild(testEl);
        const measured = parseFloat(getComputedStyle(testEl).paddingTop) || 0;
        document.body.removeChild(testEl);

        if (measured === 0) {
          document.documentElement.style.setProperty('--safe-area-inset-top', '24px');
          console.log('[StatusBar] Android safe-area fallback applied: 24px');
        } else {
          console.log('[StatusBar] Android env(safe-area-inset-top):', measured + 'px');
        }
      });
    } else {
      // iOS: contentInset: 'automatic' in Capacitor config handles safe areas.
      // overlay: false prevents double-padding from both contentInset and env().
      await StatusBar.setOverlaysWebView({ overlay: false });
      console.log('[StatusBar] iOS: overlay disabled');
    }

    console.log('[StatusBar] Initialization complete');
  } catch (error) {
    console.error('[StatusBar] Failed to initialize:', error);
  }
}

/**
 * Set the status bar to dark style (dark icons/text on light background).
 * Use this when the app has a light-colored header.
 */
export async function setStatusBarDark(): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  } catch (error) {
    console.error('[StatusBar] Failed to set dark style:', error);
  }
}

/**
 * Set the status bar to light style (light icons/text on dark background).
 * Use this when the app has a dark-colored header.
 */
export async function setStatusBarLight(): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }
  } catch (error) {
    console.error('[StatusBar] Failed to set light style:', error);
  }
}

/**
 * Hide the status bar (for immersive experiences like full-screen video).
 */
export async function hideStatusBar(): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('[StatusBar] Failed to hide:', error);
  }
}

/**
 * Show the status bar (after hiding it).
 */
export async function showStatusBar(): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.show();
  } catch (error) {
    console.error('[StatusBar] Failed to show:', error);
  }
}

