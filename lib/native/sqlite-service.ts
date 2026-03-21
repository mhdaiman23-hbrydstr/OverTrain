/**
 * SQLite Service for Native Apps
 * 
 * Provides a high-level API for SQLite database operations using Capacitor SQLite plugin.
 * Falls back gracefully on web where SQLite is not available.
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { 
  DATABASE_NAME, 
  DATABASE_VERSION, 
  CREATE_TABLES_SQL, 
  MIGRATIONS,
  TABLES,
  type TableName,
  parseJsonField,
  stringifyJsonField
} from './sqlite-schema';
import { isNative, getPlatform } from './platform';

/**
 * SQLite connection manager
 */
class SQLiteService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * Initialize the SQLite database
   * Returns true if successful, false if SQLite is not available (web)
   */
  async initialize(): Promise<boolean> {
    // Return cached result if already initialized
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<boolean> {
    try {
      // Only available on native platforms
      if (!isNative()) {
        console.log('[SQLite] Not available on web platform, using IndexedDB fallback');
        return false;
      }

      // Check if plugin is available
      if (!Capacitor.isPluginAvailable('CapacitorSQLite')) {
        console.warn('[SQLite] CapacitorSQLite plugin not available');
        return false;
      }

      // Create SQLite connection
      this.sqlite = new SQLiteConnection(CapacitorSQLite);

      // Check connection consistency (Android only)
      const platform = getPlatform();
      if (platform === 'android') {
        const retCC = await this.sqlite.checkConnectionsConsistency();
        const isConn = (await this.sqlite.isConnection(DATABASE_NAME, false)).result;
        
        if (retCC.result && isConn) {
          this.db = await this.sqlite.retrieveConnection(DATABASE_NAME, false);
        } else {
          this.db = await this.sqlite.createConnection(
            DATABASE_NAME,
            false,
            'no-encryption',
            DATABASE_VERSION,
            false
          );
        }
      } else {
        // iOS or other platforms
        this.db = await this.sqlite.createConnection(
          DATABASE_NAME,
          false,
          'no-encryption',
          DATABASE_VERSION,
          false
        );
      }

      // Open the database
      await this.db.open();

      // Create tables
      await this.db.execute(CREATE_TABLES_SQL);

      // Run migrations
      await this.runMigrations();

      this.isInitialized = true;
      console.log('[SQLite] Database initialized successfully');
      return true;
    } catch (error) {
      console.error('[SQLite] Initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    try {
      // Get current version from a metadata table or use 0
      let currentVersion = 0;
      
      try {
        const result = await this.db.query('SELECT MAX(version) as version FROM _migrations');
        if (result.values && result.values.length > 0) {
          currentVersion = result.values[0].version || 0;
        }
      } catch {
        // Create migrations table if it doesn't exist
        await this.db.execute(`
          CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
          );
        `);
      }

      // Run pending migrations
      for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
          console.log(`[SQLite] Running migration version ${migration.version}`);
          try {
            // Split multi-statement migrations and run each individually
            // This handles ALTER TABLE failures gracefully (e.g., column already exists)
            const statements = migration.sql
              .split(';')
              .map(s => s.trim())
              .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const stmt of statements) {
              try {
                await this.db.execute(stmt + ';');
              } catch (stmtError: any) {
                // Ignore "duplicate column" errors from ALTER TABLE
                const msg = String(stmtError?.message || stmtError || '').toLowerCase();
                if (msg.includes('duplicate column') || msg.includes('already exists')) {
                  console.log(`[SQLite] Column already exists, skipping: ${stmt.substring(0, 60)}...`);
                } else {
                  throw stmtError;
                }
              }
            }

            await this.db.run(
              'INSERT INTO _migrations (version) VALUES (?)',
              [migration.version]
            );
            console.log(`[SQLite] Migration version ${migration.version} applied successfully`);
          } catch (migrationError) {
            console.error(`[SQLite] Migration version ${migration.version} failed:`, migrationError);
            throw migrationError;
          }
        }
      }
    } catch (error) {
      console.error('[SQLite] Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if SQLite is available and initialized
   */
  isAvailable(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Execute a SQL query with parameters
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!await this.initialize() || !this.db) {
      throw new Error('SQLite not available');
    }

    const result = await this.db.query(sql, params);
    return (result.values || []) as T[];
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastId: number }> {
    if (!await this.initialize() || !this.db) {
      throw new Error('SQLite not available');
    }

    const result = await this.db.run(sql, params);
    return {
      changes: result.changes?.changes || 0,
      lastId: result.changes?.lastId || 0,
    };
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async executeTransaction(statements: { sql: string; params?: any[] }[]): Promise<void> {
    if (!await this.initialize() || !this.db) {
      throw new Error('SQLite not available');
    }

    await this.db.execute('BEGIN TRANSACTION');
    
    try {
      for (const stmt of statements) {
        await this.db.run(stmt.sql, stmt.params || []);
      }
      await this.db.execute('COMMIT');
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get a single record by ID
   */
  async getById<T>(table: TableName, id: string): Promise<T | null> {
    const results = await this.query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all records from a table
   */
  async getAll<T>(table: TableName, orderBy?: string): Promise<T[]> {
    const sql = orderBy 
      ? `SELECT * FROM ${table} ORDER BY ${orderBy}`
      : `SELECT * FROM ${table}`;
    return this.query<T>(sql);
  }

  /**
   * Get records by user ID
   */
  async getByUserId<T>(table: TableName, userId: string, orderBy?: string): Promise<T[]> {
    const sql = orderBy
      ? `SELECT * FROM ${table} WHERE user_id = ? ORDER BY ${orderBy}`
      : `SELECT * FROM ${table} WHERE user_id = ?`;
    return this.query<T>(sql, [userId]);
  }

  /**
   * Insert a record
   */
  async insert<T extends Record<string, any>>(table: TableName, data: T): Promise<void> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => {
      const v = data[k];
      // Convert objects/arrays to JSON strings
      if (v !== null && typeof v === 'object') {
        return stringifyJsonField(v);
      }
      return v;
    });

    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.run(sql, values);
  }

  /**
   * Update a record
   */
  async update<T extends Record<string, any>>(
    table: TableName, 
    id: string, 
    data: Partial<T>
  ): Promise<void> {
    const keys = Object.keys(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => {
      const v = data[k as keyof typeof data];
      if (v !== null && typeof v === 'object') {
        return stringifyJsonField(v);
      }
      return v;
    });

    const sql = `UPDATE ${table} SET ${setClause}, updated_at = ? WHERE id = ?`;
    await this.run(sql, [...values, Date.now(), id]);
  }

  /**
   * Delete a record
   */
  async delete(table: TableName, id: string): Promise<void> {
    await this.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  /**
   * Delete all records from a table
   */
  async deleteAll(table: TableName): Promise<void> {
    await this.run(`DELETE FROM ${table}`);
  }

  /**
   * Atomically replace all records in a table (delete + insert in a transaction).
   * If any insert fails, the entire operation rolls back preserving existing data.
   */
  async replaceAll<T extends Record<string, any>>(table: TableName, rows: T[]): Promise<void> {
    if (!await this.initialize() || !this.db) {
      throw new Error('SQLite not available');
    }

    await this.db.execute('BEGIN TRANSACTION');

    try {
      await this.db.run(`DELETE FROM ${table}`, []);

      for (const data of rows) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => {
          const v = data[k];
          if (v !== null && typeof v === 'object') {
            return stringifyJsonField(v);
          }
          return v;
        });

        await this.db.run(
          `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }

      await this.db.execute('COMMIT');
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get unsynced records
   */
  async getUnsynced<T>(table: TableName): Promise<T[]> {
    return this.query<T>(`SELECT * FROM ${table} WHERE synced = 0`);
  }

  /**
   * Mark records as synced
   */
  async markSynced(table: TableName, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    
    const placeholders = ids.map(() => '?').join(', ');
    await this.run(
      `UPDATE ${table} SET synced = 1, synced_at = ? WHERE id IN (${placeholders})`,
      [Date.now(), ...ids]
    );
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
    tableName: string,
    recordId: string,
    data: any,
    priority: number = 0
  ): Promise<void> {
    await this.insert(TABLES.SYNC_QUEUE, {
      id: `${tableName}-${recordId}-${Date.now()}`,
      operation,
      table_name: tableName,
      record_id: recordId,
      data: stringifyJsonField(data),
      priority,
      created_at: Date.now(),
      retry_count: 0,
      max_retries: 5,
      last_error: null,
      last_retry_at: null,
    });
  }

  /**
   * Get pending sync queue items
   */
  async getSyncQueue(limit: number = 50): Promise<any[]> {
    return this.query(
      `SELECT * FROM ${TABLES.SYNC_QUEUE} 
       WHERE retry_count < max_retries 
       ORDER BY priority DESC, created_at ASC 
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Update sync queue item after attempt
   */
  async updateSyncQueueItem(id: string, success: boolean, error?: string): Promise<void> {
    if (success) {
      await this.delete(TABLES.SYNC_QUEUE, id);
    } else {
      await this.run(
        `UPDATE ${TABLES.SYNC_QUEUE} 
         SET retry_count = retry_count + 1, 
             last_error = ?, 
             last_retry_at = ? 
         WHERE id = ?`,
        [error || null, Date.now(), id]
      );
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db && this.sqlite) {
      await this.sqlite.closeConnection(DATABASE_NAME, false);
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get database statistics for debugging
   */
  async getStats(): Promise<{
    tables: { name: string; count: number }[];
    syncQueueSize: number;
    unsyncedCounts: { table: string; count: number }[];
  }> {
    if (!this.isAvailable()) {
      return { tables: [], syncQueueSize: 0, unsyncedCounts: [] };
    }

    const tableNames = Object.values(TABLES);
    const tables: { name: string; count: number }[] = [];
    const unsyncedCounts: { table: string; count: number }[] = [];

    for (const table of tableNames) {
      try {
        const countResult = await this.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        tables.push({ name: table, count: countResult[0]?.count || 0 });

        if (table !== TABLES.SYNC_QUEUE) {
          const unsyncedResult = await this.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${table} WHERE synced = 0`
          );
          const count = unsyncedResult[0]?.count || 0;
          if (count > 0) {
            unsyncedCounts.push({ table, count });
          }
        }
      } catch {
        // Table might not exist yet
      }
    }

    const syncQueueResult = await this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.SYNC_QUEUE}`
    );

    return {
      tables,
      syncQueueSize: syncQueueResult[0]?.count || 0,
      unsyncedCounts,
    };
  }
}

// Export singleton instance
export const sqliteService = new SQLiteService();

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).SQLiteService = sqliteService;
  (window as any).SQLiteStats = () => sqliteService.getStats();
}

export { parseJsonField, stringifyJsonField };

