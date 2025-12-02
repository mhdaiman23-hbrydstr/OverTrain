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

    // Ensure status bar doesn't overlay the webview content
    // This is critical - when false, the app gets padding for the status bar
    await StatusBar.setOverlaysWebView({ overlay: false });
    console.log('[StatusBar] Overlay disabled');

    // Set background color for Android
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#000000' });
      console.log('[StatusBar] Background color set for Android');
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

