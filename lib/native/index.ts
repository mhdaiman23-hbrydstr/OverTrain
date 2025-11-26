/**
 * Native Services Entry Point
 * 
 * Initializes all native-specific services for Capacitor apps.
 * This module should be imported early in the app lifecycle.
 */

import { isNative, getPlatformInfo } from './platform';
import { sqliteService } from './sqlite-service';
import { unifiedStorage } from './storage-service';
import { backgroundSync } from './background-sync';
import { reminderScheduler } from './reminder-scheduler';
import { notificationService } from './notification-service';

export { isNative, isWeb, isAndroid, isIOS, getPlatform, platformValue } from './platform';
export { sqliteService } from './sqlite-service';
export { unifiedStorage } from './storage-service';
export { backgroundSync } from './background-sync';
export { reminderScheduler } from './reminder-scheduler';
export { notificationService } from './notification-service';
export { TABLES, DATABASE_NAME } from './sqlite-schema';
export * from './animations';

/**
 * Initialize all native services
 * Call this early in app startup
 */
export async function initializeNativeServices(): Promise<{
  isNative: boolean;
  platform: string;
  sqliteAvailable: boolean;
  notificationsEnabled: boolean;
}> {
  const platformInfo = getPlatformInfo();
  console.log('[Native] Initializing native services...', platformInfo);

  let sqliteAvailable = false;
  let notificationsEnabled = false;

  if (isNative()) {
    try {
      // Initialize SQLite
      sqliteAvailable = await sqliteService.initialize();
      console.log('[Native] SQLite initialized:', sqliteAvailable);

      // Initialize unified storage (uses SQLite if available)
      await unifiedStorage.initialize();
      console.log('[Native] Unified storage initialized, backend:', unifiedStorage.getBackend());

      // Initialize background sync
      await backgroundSync.initialize();
      console.log('[Native] Background sync initialized');

      // Initialize notification service
      notificationsEnabled = await notificationService.initialize();
      console.log('[Native] Notifications initialized:', notificationsEnabled);

      // Initialize reminder scheduler
      await reminderScheduler.initialize();
      console.log('[Native] Reminder scheduler initialized');

    } catch (error) {
      console.error('[Native] Failed to initialize native services:', error);
    }
  } else {
    // Web platform - just initialize unified storage
    await unifiedStorage.initialize();
    console.log('[Native] Web platform - using IndexedDB storage');
  }

  return {
    isNative: platformInfo.isNative,
    platform: platformInfo.platform,
    sqliteAvailable,
    notificationsEnabled,
  };
}

/**
 * Get native services status
 */
export function getNativeStatus(): {
  isNative: boolean;
  platform: string;
  storageBackend: string;
  syncStatus: any;
} {
  return {
    isNative: isNative(),
    platform: getPlatformInfo().platform,
    storageBackend: unifiedStorage.getBackend(),
    syncStatus: backgroundSync.getStatus(),
  };
}

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).NativeServices = {
    initialize: initializeNativeServices,
    getStatus: getNativeStatus,
    storage: unifiedStorage,
    sqlite: sqliteService,
    sync: backgroundSync,
  };
}

