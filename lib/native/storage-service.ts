/**
 * Unified Storage Service
 * 
 * Provides a platform-aware storage abstraction that routes to:
 * - SQLite on native platforms (Android/iOS) for high performance
 * - IndexedDB/localStorage on web for PWA compatibility
 * 
 * This service maintains API compatibility with the existing StorageManager
 * while providing significant performance improvements on native.
 */

import { isNative } from './platform';
import { sqliteService, parseJsonField, stringifyJsonField } from './sqlite-service';
import { TABLES, type TableName } from './sqlite-schema';
import StorageManager from '../indexed-db-storage';

/**
 * Storage backends
 */
type StorageBackend = 'sqlite' | 'indexeddb';

/**
 * Workout session type (imported from workout-logger for compatibility)
 */
interface WorkoutSession {
  id: string;
  userId: string;
  programId?: string;
  programInstanceId?: string;
  workoutName: string;
  startTime: number;
  endTime?: number;
  exercises: any[];
  notes?: string;
  completed: boolean;
  week?: number;
  day?: number;
  skipped?: boolean;
}

/**
 * Unified Storage Service
 */
class UnifiedStorageService {
  private backend: StorageBackend = 'indexeddb';
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Try SQLite first on native platforms
      if (isNative()) {
        const sqliteAvailable = await sqliteService.initialize();
        if (sqliteAvailable) {
          this.backend = 'sqlite';
          console.log('[UnifiedStorage] Using SQLite backend (native)');
          
          // Migrate data from IndexedDB/localStorage if needed
          await this.migrateFromWeb();
          
          this.initialized = true;
          return;
        }
      }

      // Fall back to IndexedDB
      await StorageManager.init();
      this.backend = 'indexeddb';
      console.log('[UnifiedStorage] Using IndexedDB backend (web)');
      this.initialized = true;
    } catch (error) {
      console.error('[UnifiedStorage] Initialization failed:', error);
      // Default to IndexedDB
      await StorageManager.init();
      this.backend = 'indexeddb';
      this.initialized = true;
    }
  }

  /**
   * Get the current storage backend
   */
  getBackend(): StorageBackend {
    return this.backend;
  }

  /**
   * Check if using native SQLite
   */
  isUsingSQLite(): boolean {
    return this.backend === 'sqlite';
  }

  // ============================================================================
  // GENERIC KEY-VALUE OPERATIONS (for compatibility)
  // ============================================================================

  /**
   * Get a value by key (compatible with existing StorageManager API)
   */
  async get(key: string): Promise<any> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      return this.getSQLiteValue(key);
    }

    return StorageManager.get(key);
  }

  /**
   * Set a value by key (compatible with existing StorageManager API)
   */
  async set(key: string, value: any): Promise<void> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      await this.setSQLiteValue(key, value);
      return;
    }

    await StorageManager.set(key, value);
  }

  /**
   * Remove a value by key
   */
  async remove(key: string): Promise<void> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      await this.removeSQLiteValue(key);
      return;
    }

    await StorageManager.remove(key);
  }

  // ============================================================================
  // SQLITE KEY MAPPING
  // ============================================================================

  /**
   * Map localStorage keys to SQLite tables
   */
  private mapKeyToTable(key: string): { table: TableName; idField: string } | null {
    if (key === 'liftlog_active_program') {
      return { table: TABLES.ACTIVE_PROGRAMS, idField: 'id' };
    }
    if (key.startsWith('liftlog_in_progress_workouts')) {
      return { table: TABLES.IN_PROGRESS_WORKOUTS, idField: 'id' };
    }
    if (key === 'liftlog_workouts' || key.startsWith('liftlog_workouts_')) {
      return { table: TABLES.WORKOUTS, idField: 'id' };
    }
    if (key === 'liftlog_program_history') {
      return { table: TABLES.PROGRAM_HISTORY, idField: 'id' };
    }
    return null;
  }

  /**
   * Get value from SQLite based on key
   */
  private async getSQLiteValue(key: string): Promise<any> {
    const mapping = this.mapKeyToTable(key);
    
    if (!mapping) {
      // For unmapped keys, use a generic key-value store approach
      // Fall back to IndexedDB for these
      return StorageManager.get(key);
    }

    try {
      const results = await sqliteService.getAll(mapping.table);
      
      // For array-based storage (workouts, in-progress workouts)
      if (key.startsWith('liftlog_workouts') || key.startsWith('liftlog_in_progress')) {
        return results.map(row => this.sqliteRowToObject(row));
      }
      
      // For single-value storage (active program)
      if (results.length > 0) {
        return this.sqliteRowToObject(results[0]);
      }
      
      return null;
    } catch (error) {
      console.error(`[UnifiedStorage] SQLite get failed for ${key}:`, error);
      // Fall back to IndexedDB
      return StorageManager.get(key);
    }
  }

  /**
   * Set value in SQLite based on key
   */
  private async setSQLiteValue(key: string, value: any): Promise<void> {
    const mapping = this.mapKeyToTable(key);
    
    if (!mapping) {
      // Fall back to IndexedDB for unmapped keys
      await StorageManager.set(key, value);
      return;
    }

    try {
      if (Array.isArray(value)) {
        // For array data (workouts, in-progress workouts)
        // Clear existing and insert all
        await sqliteService.deleteAll(mapping.table);
        for (const item of value) {
          const row = this.objectToSQLiteRow(item, mapping.table);
          await sqliteService.insert(mapping.table, row);
        }
      } else if (value) {
        // For single objects
        const row = this.objectToSQLiteRow(value, mapping.table);
        await sqliteService.insert(mapping.table, row);
      }
    } catch (error) {
      console.error(`[UnifiedStorage] SQLite set failed for ${key}:`, error);
      // Fall back to IndexedDB
      await StorageManager.set(key, value);
    }
  }

  /**
   * Remove value from SQLite based on key
   */
  private async removeSQLiteValue(key: string): Promise<void> {
    const mapping = this.mapKeyToTable(key);
    
    if (!mapping) {
      await StorageManager.remove(key);
      return;
    }

    try {
      await sqliteService.deleteAll(mapping.table);
    } catch (error) {
      console.error(`[UnifiedStorage] SQLite remove failed for ${key}:`, error);
      await StorageManager.remove(key);
    }
  }

  // ============================================================================
  // TYPE CONVERSIONS
  // ============================================================================

  /**
   * Convert SQLite row to JavaScript object
   */
  private sqliteRowToObject(row: any): any {
    if (!row) return null;

    const result: any = {};
    for (const [key, value] of Object.entries(row)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Parse JSON fields
      if (key === 'exercises' || key === 'template_data' || key === 'goals' || key === 'one_rep_max') {
        result[camelKey] = parseJsonField(value as string, key === 'exercises' || key === 'goals' ? [] : {});
      } 
      // Convert boolean fields
      else if (key === 'completed' || key === 'synced' || key === 'skipped' || key === 'is_active') {
        result[camelKey] = value === 1;
      }
      else {
        result[camelKey] = value;
      }
    }
    return result;
  }

  /**
   * Convert JavaScript object to SQLite row
   */
  private objectToSQLiteRow(obj: any, table: TableName): any {
    if (!obj) return null;

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // Stringify JSON fields
      if (key === 'exercises' || key === 'templateData' || key === 'goals' || key === 'oneRepMax') {
        result[snakeKey] = stringifyJsonField(value);
      }
      // Convert boolean fields
      else if (key === 'completed' || key === 'synced' || key === 'skipped' || key === 'isActive') {
        result[snakeKey] = value ? 1 : 0;
      }
      else {
        result[snakeKey] = value;
      }
    }
    
    // Ensure required fields have defaults
    if (result.synced === undefined) result.synced = 0;
    if (result.created_at === undefined) result.created_at = Date.now();
    if (result.updated_at === undefined) result.updated_at = Date.now();
    
    return result;
  }

  // ============================================================================
  // WORKOUT-SPECIFIC OPERATIONS
  // ============================================================================

  /**
   * Get workouts for a user (optimized for SQLite)
   */
  async getWorkouts(userId: string): Promise<WorkoutSession[]> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      try {
        const rows = await sqliteService.getByUserId(TABLES.WORKOUTS, userId, 'start_time DESC');
        return rows.map(row => this.sqliteRowToObject(row));
      } catch (error) {
        console.error('[UnifiedStorage] Failed to get workouts from SQLite:', error);
      }
    }

    // Fall back to IndexedDB
    const workouts = await StorageManager.get('liftlog_workouts') || [];
    return workouts.filter((w: any) => w.userId === userId);
  }

  /**
   * Save a workout (optimized for SQLite)
   */
  async saveWorkout(workout: WorkoutSession): Promise<void> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      try {
        const row = this.objectToSQLiteRow(workout, TABLES.WORKOUTS);
        await sqliteService.insert(TABLES.WORKOUTS, row);
        return;
      } catch (error) {
        console.error('[UnifiedStorage] Failed to save workout to SQLite:', error);
      }
    }

    // Fall back to IndexedDB
    const workouts = await StorageManager.get('liftlog_workouts') || [];
    const filtered = workouts.filter((w: any) => w.id !== workout.id);
    filtered.push(workout);
    await StorageManager.set('liftlog_workouts', filtered);
  }

  /**
   * Get in-progress workouts
   */
  async getInProgressWorkouts(userId: string): Promise<WorkoutSession[]> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      try {
        const rows = await sqliteService.getByUserId(TABLES.IN_PROGRESS_WORKOUTS, userId);
        return rows.map(row => this.sqliteRowToObject(row));
      } catch (error) {
        console.error('[UnifiedStorage] Failed to get in-progress workouts from SQLite:', error);
      }
    }

    // Fall back to IndexedDB
    const workouts = await StorageManager.get('liftlog_in_progress_workouts') || [];
    return workouts.filter((w: any) => w.userId === userId);
  }

  /**
   * Save an in-progress workout
   */
  async saveInProgressWorkout(workout: WorkoutSession): Promise<void> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      try {
        const row = this.objectToSQLiteRow(workout, TABLES.IN_PROGRESS_WORKOUTS);
        await sqliteService.insert(TABLES.IN_PROGRESS_WORKOUTS, row);
        return;
      } catch (error) {
        console.error('[UnifiedStorage] Failed to save in-progress workout to SQLite:', error);
      }
    }

    // Fall back to IndexedDB
    const workouts = await StorageManager.get('liftlog_in_progress_workouts') || [];
    const filtered = workouts.filter((w: any) => w.id !== workout.id);
    filtered.push(workout);
    await StorageManager.set('liftlog_in_progress_workouts', filtered);
  }

  /**
   * Remove an in-progress workout
   */
  async removeInProgressWorkout(workoutId: string): Promise<void> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      try {
        await sqliteService.delete(TABLES.IN_PROGRESS_WORKOUTS, workoutId);
        return;
      } catch (error) {
        console.error('[UnifiedStorage] Failed to remove in-progress workout from SQLite:', error);
      }
    }

    // Fall back to IndexedDB
    const workouts = await StorageManager.get('liftlog_in_progress_workouts') || [];
    const filtered = workouts.filter((w: any) => w.id !== workoutId);
    await StorageManager.set('liftlog_in_progress_workouts', filtered);
  }

  // ============================================================================
  // DATA MIGRATION
  // ============================================================================

  /**
   * Migrate data from IndexedDB/localStorage to SQLite
   */
  private async migrateFromWeb(): Promise<void> {
    try {
      // Check if migration already done
      const migrationKey = '_sqlite_migration_completed';
      const alreadyMigrated = await this.checkMigrationFlag();
      if (alreadyMigrated) {
        console.log('[UnifiedStorage] Migration already completed, skipping');
        return;
      }

      console.log('[UnifiedStorage] Starting data migration to SQLite...');

      // Migrate workouts
      const workouts = await StorageManager.get('liftlog_workouts');
      if (Array.isArray(workouts) && workouts.length > 0) {
        for (const workout of workouts) {
          const row = this.objectToSQLiteRow(workout, TABLES.WORKOUTS);
          row.synced = 1; // Mark as synced since it came from synced source
          await sqliteService.insert(TABLES.WORKOUTS, row);
        }
        console.log(`[UnifiedStorage] Migrated ${workouts.length} workouts`);
      }

      // Migrate in-progress workouts
      const inProgress = await StorageManager.get('liftlog_in_progress_workouts');
      if (Array.isArray(inProgress) && inProgress.length > 0) {
        for (const workout of inProgress) {
          const row = this.objectToSQLiteRow(workout, TABLES.IN_PROGRESS_WORKOUTS);
          await sqliteService.insert(TABLES.IN_PROGRESS_WORKOUTS, row);
        }
        console.log(`[UnifiedStorage] Migrated ${inProgress.length} in-progress workouts`);
      }

      // Migrate active program
      const activeProgram = await StorageManager.get('liftlog_active_program');
      if (activeProgram) {
        const row = this.objectToSQLiteRow(activeProgram, TABLES.ACTIVE_PROGRAMS);
        await sqliteService.insert(TABLES.ACTIVE_PROGRAMS, row);
        console.log('[UnifiedStorage] Migrated active program');
      }

      // Set migration flag
      await this.setMigrationFlag();
      console.log('[UnifiedStorage] Migration completed successfully');
    } catch (error) {
      console.error('[UnifiedStorage] Migration failed:', error);
      // Don't throw - we can still function with fresh SQLite
    }
  }

  private async checkMigrationFlag(): Promise<boolean> {
    try {
      const results = await sqliteService.query(
        'SELECT 1 FROM _migrations WHERE version = -1'
      );
      return results.length > 0;
    } catch {
      return false;
    }
  }

  private async setMigrationFlag(): Promise<void> {
    try {
      await sqliteService.run(
        'INSERT OR REPLACE INTO _migrations (version, applied_at) VALUES (-1, ?)',
        [Date.now()]
      );
    } catch (error) {
      console.warn('[UnifiedStorage] Failed to set migration flag:', error);
    }
  }

  // ============================================================================
  // SYNC QUEUE OPERATIONS
  // ============================================================================

  /**
   * Add operation to sync queue (for background sync)
   */
  async addToSyncQueue(
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
    tableName: string,
    recordId: string,
    data: any,
    priority: number = 0
  ): Promise<void> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      await sqliteService.addToSyncQueue(operation, tableName, recordId, data, priority);
    }
    // On web, sync queue is handled by data-sync-service
  }

  /**
   * Get pending items from sync queue
   */
  async getSyncQueue(limit: number = 50): Promise<any[]> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      return sqliteService.getSyncQueue(limit);
    }
    return [];
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    backend: StorageBackend;
    stats: any;
  }> {
    await this.initialize();

    if (this.backend === 'sqlite') {
      const stats = await sqliteService.getStats();
      return { backend: 'sqlite', stats };
    }

    return {
      backend: 'indexeddb',
      stats: StorageManager.getCacheStats(),
    };
  }
}

// Export singleton instance
export const unifiedStorage = new UnifiedStorageService();

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).UnifiedStorage = unifiedStorage;
  (window as any).UnifiedStorageStats = () => unifiedStorage.getStats();
}

