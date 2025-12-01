/**
 * Background Sync Service for Native Apps
 * 
 * Handles synchronization between local SQLite database and Supabase cloud.
 * Works with both the Capacitor App plugin for background/foreground events
 * and manual sync triggers.
 */

import { App } from '@capacitor/app';
import { supabase } from '../supabase';
import { sqliteService, parseJsonField } from './sqlite-service';
import { TABLES } from './sqlite-schema';
import { isNative, isPluginAvailable } from './platform';
import { ConnectionMonitor } from '../connection-monitor';

/**
 * Sync status tracking
 */
export interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  lastError: string | null;
}

/**
 * Background Sync Service
 */
class BackgroundSyncService {
  private syncStatus: SyncStatus = {
    isRunning: false,
    lastSyncTime: null,
    pendingCount: 0,
    lastError: null,
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30_000; // 30 seconds
  private readonly SYNC_BATCH_SIZE = 20;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Initialize the background sync service
   */
  async initialize(): Promise<void> {
    if (!isNative()) {
      console.log('[BackgroundSync] Not on native platform, using web sync');
      return;
    }

    // Set up app state listeners
    if (isPluginAvailable('App')) {
      App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          // App came to foreground - sync immediately
          console.log('[BackgroundSync] App became active, triggering sync');
          await this.syncNow();
        } else {
          // App going to background - save any pending data
          console.log('[BackgroundSync] App going to background');
          await this.flushPendingOperations();
        }
      });

      // Handle app pause (Android specific)
      App.addListener('pause', async () => {
        console.log('[BackgroundSync] App paused');
        await this.flushPendingOperations();
      });

      // Handle app resume
      App.addListener('resume', async () => {
        console.log('[BackgroundSync] App resumed, triggering sync');
        await this.syncNow();
      });
    }

    // Start periodic sync
    this.startPeriodicSync();

    // Initial sync
    await this.syncNow();

    console.log('[BackgroundSync] Initialized');
  }

  /**
   * Start periodic sync timer
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (ConnectionMonitor.isOnline()) {
        await this.syncNow();
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.syncStatus);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try {
        cb(this.syncStatus);
      } catch (error) {
        console.error('[BackgroundSync] Listener error:', error);
      }
    });
  }

  /**
   * Trigger immediate sync
   */
  async syncNow(): Promise<boolean> {
    if (this.syncStatus.isRunning) {
      console.log('[BackgroundSync] Sync already in progress');
      return false;
    }

    if (!ConnectionMonitor.isOnline()) {
      console.log('[BackgroundSync] Offline, skipping sync');
      return false;
    }

    if (!supabase) {
      console.log('[BackgroundSync] Supabase not available');
      return false;
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.lastError = null;
    this.notifyListeners();

    try {
      // 1. Upload local changes
      await this.uploadPendingChanges();

      // 2. Download remote changes
      await this.downloadRemoteChanges();

      // 3. Process sync queue
      await this.processSyncQueue();

      this.syncStatus.lastSyncTime = Date.now();
      this.syncStatus.pendingCount = await this.getPendingCount();
      console.log('[BackgroundSync] Sync completed successfully');
      return true;
    } catch (error) {
      this.syncStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BackgroundSync] Sync failed:', error);
      return false;
    } finally {
      this.syncStatus.isRunning = false;
      this.notifyListeners();
    }
  }

  /**
   * Upload pending local changes to Supabase
   */
  private async uploadPendingChanges(): Promise<void> {
    if (!sqliteService.isAvailable()) return;

    // Get unsynced workouts
    const unsyncedWorkouts = await sqliteService.getUnsynced(TABLES.WORKOUTS);
    for (const workout of unsyncedWorkouts) {
      try {
        const data = this.prepareForSupabase(workout as any, 'workouts');
        const { error } = await supabase!.from('workouts').upsert(data, { onConflict: 'id' });
        
        if (!error) {
          await sqliteService.markSynced(TABLES.WORKOUTS, [(workout as any).id]);
        } else {
          console.error('[BackgroundSync] Failed to sync workout:', error);
        }
      } catch (error) {
        console.error('[BackgroundSync] Error syncing workout:', error);
      }
    }

    // Get unsynced workout sets
    const unsyncedSets = await sqliteService.getUnsynced(TABLES.WORKOUT_SETS);
    if (unsyncedSets.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < unsyncedSets.length; i += batchSize) {
        const batch = unsyncedSets.slice(i, i + batchSize);
        try {
          const data = batch.map(set => this.prepareForSupabase(set as any, 'workout_sets'));
          const { error } = await supabase!.from('workout_sets').upsert(data, { onConflict: 'id' });
          
          if (!error) {
            await sqliteService.markSynced(
              TABLES.WORKOUT_SETS, 
              batch.map(s => (s as any).id)
            );
          } else {
            console.error('[BackgroundSync] Failed to sync workout sets:', error);
          }
        } catch (error) {
          console.error('[BackgroundSync] Error syncing workout sets:', error);
        }
      }
    }

    // Get unsynced in-progress workouts
    const unsyncedInProgress = await sqliteService.getUnsynced(TABLES.IN_PROGRESS_WORKOUTS);
    for (const workout of unsyncedInProgress) {
      try {
        const data = this.prepareForSupabase(workout as any, 'in_progress_workouts');
        const { error } = await supabase!.from('in_progress_workouts').upsert(data, { onConflict: 'id' });
        
        if (!error) {
          await sqliteService.markSynced(TABLES.IN_PROGRESS_WORKOUTS, [(workout as any).id]);
        } else {
          console.error('[BackgroundSync] Failed to sync in-progress workout:', error);
        }
      } catch (error) {
        console.error('[BackgroundSync] Error syncing in-progress workout:', error);
      }
    }

    // Sync active program state
    await this.syncActiveProgram();
  }

  /**
   * Sync active program state to Supabase
   */
  private async syncActiveProgram(): Promise<void> {
    if (!sqliteService.isAvailable()) return;

    try {
      const unsyncedPrograms = await sqliteService.getUnsynced(TABLES.ACTIVE_PROGRAMS);
      for (const program of unsyncedPrograms) {
        try {
          const data = this.prepareActiveProgramForSupabase(program as any);
          const { error } = await supabase!
            .from('active_programs')
            .upsert(data, { onConflict: 'user_id' }); // One active program per user
          
          if (!error) {
            await sqliteService.markSynced(TABLES.ACTIVE_PROGRAMS, [(program as any).id]);
            console.log('[BackgroundSync] Synced active program to Supabase');
          } else {
            console.error('[BackgroundSync] Failed to sync active program:', error);
          }
        } catch (error) {
          console.error('[BackgroundSync] Error syncing active program:', error);
        }
      }

      // Sync program history
      const unsyncedHistory = await sqliteService.getUnsynced(TABLES.PROGRAM_HISTORY);
      for (const entry of unsyncedHistory) {
        try {
          const data = this.prepareProgramHistoryForSupabase(entry as any);
          const { error } = await supabase!
            .from('program_history')
            .upsert(data, { onConflict: 'id' });
          
          if (!error) {
            await sqliteService.markSynced(TABLES.PROGRAM_HISTORY, [(entry as any).id]);
          } else {
            console.error('[BackgroundSync] Failed to sync program history:', error);
          }
        } catch (error) {
          console.error('[BackgroundSync] Error syncing program history:', error);
        }
      }
    } catch (error) {
      console.error('[BackgroundSync] Error in syncActiveProgram:', error);
    }
  }

  /**
   * Prepare active program data for Supabase upload
   */
  private prepareActiveProgramForSupabase(row: any): any {
    return {
      user_id: row.user_id,
      program_id: row.template_id,
      instance_id: row.instance_id,
      program_name: row.program_name,
      current_week: row.current_week,
      current_day: row.current_day,
      days_per_week: row.days_per_week || 3,
      total_weeks: row.total_weeks || 6,
      start_date: row.started_at ? new Date(row.started_at).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Prepare program history data for Supabase upload
   */
  private prepareProgramHistoryForSupabase(row: any): any {
    return {
      id: row.id,
      user_id: row.user_id,
      template_id: row.program_id || row.template_id,
      instance_id: row.instance_id || row.id,
      name: row.program_name,
      start_date: row.started_at ? new Date(row.started_at).toISOString() : null,
      end_date: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      completion_rate: row.completion_rate || 0,
      total_workouts: row.total_workouts || 0,
      completed_workouts: row.completed_workouts || 0,
      is_active: row.is_active === 1,
      ended_early: row.ended_early === 1,
    };
  }

  /**
   * Download remote changes from Supabase
   */
  private async downloadRemoteChanges(): Promise<void> {
    if (!sqliteService.isAvailable()) return;

    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;

      // Get last sync time
      const lastSync = this.syncStatus.lastSyncTime || 0;
      const lastSyncDate = new Date(lastSync).toISOString();

      // Download workouts updated since last sync
      const { data: workouts, error: workoutsError } = await supabase!
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', lastSyncDate)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!workoutsError && workouts) {
        for (const workout of workouts) {
          const row = this.prepareForSQLite(workout, TABLES.WORKOUTS);
          row.synced = 1;
          row.synced_at = Date.now();
          await sqliteService.insert(TABLES.WORKOUTS, row);
        }
        if (workouts.length > 0) {
          console.log(`[BackgroundSync] Downloaded ${workouts.length} workouts`);
        }
      }

      // Download workout sets
      const { data: sets, error: setsError } = await supabase!
        .from('workout_sets')
        .select('*')
        .eq('user_id', user.id)
        .gt('completed_at', lastSyncDate)
        .order('completed_at', { ascending: false })
        .limit(500);

      if (!setsError && sets) {
        for (const set of sets) {
          const row = this.prepareForSQLite(set, TABLES.WORKOUT_SETS);
          row.synced = 1;
          row.synced_at = Date.now();
          await sqliteService.insert(TABLES.WORKOUT_SETS, row);
        }
        if (sets.length > 0) {
          console.log(`[BackgroundSync] Downloaded ${sets.length} workout sets`);
        }
      }

      // Download active program if changed on another device
      await this.downloadActiveProgram(user.id, lastSyncDate);
    } catch (error) {
      console.error('[BackgroundSync] Error downloading changes:', error);
    }
  }

  /**
   * Download active program from Supabase if changed
   */
  private async downloadActiveProgram(userId: string, lastSyncDate: string): Promise<void> {
    try {
      const { data: activeProgram, error } = await supabase!
        .from('active_programs')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSyncDate)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is ok
          console.error('[BackgroundSync] Failed to check active program:', error);
        }
        return;
      }

      if (activeProgram) {
        console.log('[BackgroundSync] Found updated active program from another device');
        
        // Convert Supabase format to SQLite format
        const row = {
          id: activeProgram.id || `program-${userId}`,
          user_id: userId,
          template_id: activeProgram.program_id,
          instance_id: activeProgram.instance_id,
          program_name: activeProgram.program_name,
          current_week: activeProgram.current_week,
          current_day: activeProgram.current_day,
          started_at: activeProgram.start_date ? new Date(activeProgram.start_date).getTime() : Date.now(),
          is_active: 1,
          synced: 1,
          synced_at: Date.now(),
          created_at: activeProgram.created_at ? new Date(activeProgram.created_at).getTime() : Date.now(),
          updated_at: activeProgram.updated_at ? new Date(activeProgram.updated_at).getTime() : Date.now(),
        };

        // Clear existing and insert new
        await sqliteService.deleteAll(TABLES.ACTIVE_PROGRAMS);
        await sqliteService.insert(TABLES.ACTIVE_PROGRAMS, row);
        
        console.log('[BackgroundSync] Updated local active program from remote');
        
        // Emit event to update UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('programChanged'));
        }
      }
    } catch (error) {
      console.error('[BackgroundSync] Error downloading active program:', error);
    }
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (!sqliteService.isAvailable()) return;

    const queue = await sqliteService.getSyncQueue(this.SYNC_BATCH_SIZE);
    
    for (const item of queue) {
      try {
        const data = parseJsonField(item.data, {});
        const success = await this.executeSyncOperation(item.operation, item.table_name, data);
        await sqliteService.updateSyncQueueItem(item.id, success, success ? undefined : 'Sync failed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await sqliteService.updateSyncQueueItem(item.id, false, errorMessage);
      }
    }
  }

  /**
   * Execute a sync operation
   */
  private async executeSyncOperation(
    operation: string,
    tableName: string,
    data: any
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      switch (operation) {
        case 'INSERT':
        case 'UPSERT': {
          const { error } = await supabase.from(tableName).upsert(data, { onConflict: 'id' });
          return !error;
        }
        case 'UPDATE': {
          const { error } = await supabase.from(tableName).update(data).eq('id', data.id);
          return !error;
        }
        case 'DELETE': {
          const { error } = await supabase.from(tableName).delete().eq('id', data.id);
          return !error;
        }
        default:
          console.warn(`[BackgroundSync] Unknown operation: ${operation}`);
          return false;
      }
    } catch (error) {
      console.error(`[BackgroundSync] Sync operation failed:`, error);
      return false;
    }
  }

  /**
   * Flush pending operations before app goes to background
   */
  private async flushPendingOperations(): Promise<void> {
    // This is a quick save, not a full sync
    console.log('[BackgroundSync] Flushing pending operations');
    // The data is already in SQLite, so we just need to ensure it's persisted
    // SQLite handles this automatically
  }

  /**
   * Get count of pending (unsynced) items
   */
  private async getPendingCount(): Promise<number> {
    if (!sqliteService.isAvailable()) return 0;

    let count = 0;
    for (const table of [TABLES.WORKOUTS, TABLES.WORKOUT_SETS, TABLES.IN_PROGRESS_WORKOUTS]) {
      try {
        const unsynced = await sqliteService.getUnsynced(table);
        count += unsynced.length;
      } catch {
        // Table might not exist
      }
    }
    return count;
  }

  /**
   * Prepare SQLite row for Supabase upload
   */
  private prepareForSupabase(row: any, tableName: string): any {
    const result: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      // Skip sync-related fields
      if (key === 'synced' || key === 'synced_at') continue;
      
      // Parse JSON fields
      if (key === 'exercises' || key === 'template_data') {
        result[key] = typeof value === 'string' ? JSON.parse(value) : value;
      }
      // Convert timestamps to ISO strings for Supabase
      else if (key.includes('_at') || key.includes('_time') || key === 'created_at' || key === 'updated_at') {
        result[key] = value ? new Date(value as number).toISOString() : null;
      }
      // Convert boolean integers
      else if (key === 'completed' || key === 'skipped' || key === 'is_active') {
        result[key] = value === 1;
      }
      else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Prepare Supabase row for SQLite storage
   */
  private prepareForSQLite(row: any, tableName: string): any {
    const result: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      // Stringify JSON fields
      if (key === 'exercises' || key === 'template_data') {
        result[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
      // Convert ISO strings to timestamps
      else if ((key.includes('_at') || key.includes('_time')) && typeof value === 'string') {
        result[key] = new Date(value).getTime();
      }
      // Convert booleans to integers
      else if (key === 'completed' || key === 'skipped' || key === 'is_active') {
        result[key] = value ? 1 : 0;
      }
      else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncService();

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).BackgroundSync = backgroundSync;
}

