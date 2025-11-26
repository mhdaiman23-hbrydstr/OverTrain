/**
 * Platform Detection Utilities
 * 
 * Detects whether the app is running in a native Capacitor context
 * or as a web PWA. This is used to conditionally enable native features.
 */

import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'android' | 'ios' | 'electron';

/**
 * Check if the app is running in a native Capacitor context
 */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios' || platform === 'electron') {
      return platform;
    }
    return 'web';
  } catch {
    return 'web';
  }
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

/**
 * Check if running on web (PWA or browser)
 */
export function isWeb(): boolean {
  return getPlatform() === 'web';
}

/**
 * Check if a specific Capacitor plugin is available
 */
export function isPluginAvailable(pluginName: string): boolean {
  try {
    return Capacitor.isPluginAvailable(pluginName);
  } catch {
    return false;
  }
}

/**
 * Get platform-specific value
 * Useful for conditional configuration
 */
export function platformValue<T>(options: {
  web?: T;
  android?: T;
  ios?: T;
  native?: T;
  default: T;
}): T {
  const platform = getPlatform();
  
  if (platform === 'android' && options.android !== undefined) {
    return options.android;
  }
  
  if (platform === 'ios' && options.ios !== undefined) {
    return options.ios;
  }
  
  if (isNative() && options.native !== undefined) {
    return options.native;
  }
  
  if (platform === 'web' && options.web !== undefined) {
    return options.web;
  }
  
  return options.default;
}

/**
 * Run a callback only on native platforms
 */
export async function runOnNative<T>(callback: () => T | Promise<T>): Promise<T | undefined> {
  if (isNative()) {
    return await callback();
  }
  return undefined;
}

/**
 * Run a callback only on web
 */
export async function runOnWeb<T>(callback: () => T | Promise<T>): Promise<T | undefined> {
  if (isWeb()) {
    return await callback();
  }
  return undefined;
}

/**
 * Platform info for debugging
 */
export function getPlatformInfo(): {
  platform: Platform;
  isNative: boolean;
  userAgent: string;
  plugins: string[];
} {
  const plugins: string[] = [];
  
  // Check common plugins
  const pluginNames = [
    'SplashScreen',
    'StatusBar',
    'PushNotifications',
    'LocalNotifications',
    'CapacitorSQLite',
    'Haptics',
    'App',
    'Preferences',
  ];
  
  for (const name of pluginNames) {
    if (isPluginAvailable(name)) {
      plugins.push(name);
    }
  }
  
  return {
    platform: getPlatform(),
    isNative: isNative(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    plugins,
  };
}

// Development logging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).PlatformInfo = getPlatformInfo;
  console.log('[Platform] Info:', getPlatformInfo());
}

