/**
 * SQLite Database Schema for Native Apps
 * 
 * This schema mirrors the Supabase tables for local caching and offline support.
 * The local SQLite database serves as a high-performance cache that syncs with Supabase.
 * 
 * Key tables:
 * - profiles: User profile data
 * - active_programs: Currently active workout program
 * - workouts: Completed workout sessions
 * - in_progress_workouts: Workouts currently being performed
 * - workout_sets: Individual set data for workouts
 * - sync_queue: Pending operations to sync with Supabase
 * - one_rep_max: User's one-rep max records
 * - exercise_notes: User notes on exercises
 * - exercise_custom_rpe: Custom RPE values for exercises
 */

export const DATABASE_NAME = 'overtrain_local';
export const DATABASE_VERSION = 1;

/**
 * SQL statements to create all tables
 */
export const CREATE_TABLES_SQL = `
-- Profiles table (mirrors Supabase profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'Prefer not say')),
  experience TEXT CHECK (experience IN ('beginner', 'intermediate', 'advanced')),
  goals TEXT, -- JSON array stored as TEXT
  one_rep_max TEXT, -- JSON object stored as TEXT
  preferred_unit TEXT CHECK (preferred_unit IN ('metric', 'imperial')) DEFAULT 'metric',
  bodyweight REAL,
  created_at INTEGER,
  updated_at INTEGER,
  synced INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- Active programs table (matches ActiveProgram interface in program-state.ts)
CREATE TABLE IF NOT EXISTS active_programs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  program_name TEXT NOT NULL,
  template_data TEXT, -- JSON stored as TEXT (full GymTemplate)
  template_metadata TEXT, -- JSON stored as TEXT (lightweight metadata)
  current_week INTEGER DEFAULT 1,
  current_day INTEGER DEFAULT 1,
  completed_workouts INTEGER DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  progress REAL DEFAULT 0,
  started_at INTEGER NOT NULL,
  last_workout_at INTEGER,
  progression_override TEXT, -- JSON stored as TEXT
  is_custom INTEGER DEFAULT 0,
  origin_template_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  -- SYNC PROTECTION: Prevents stale Supabase data from overwriting fresh local state
  pending_upload INTEGER DEFAULT 1, -- 1 = local has changes not yet synced, 0 = synced
  local_updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), -- When local state last changed
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Completed workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  program_id TEXT,
  program_instance_id TEXT,
  workout_name TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  exercises TEXT NOT NULL, -- JSON array stored as TEXT
  notes TEXT,
  completed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  week INTEGER,
  day INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- In-progress workouts table
CREATE TABLE IF NOT EXISTS in_progress_workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  program_id TEXT,
  program_instance_id TEXT,
  workout_name TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  exercises TEXT NOT NULL, -- JSON array stored as TEXT
  notes TEXT,
  week INTEGER,
  day INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Workout sets table (individual set completions)
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight REAL,
  completed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  notes TEXT,
  week INTEGER,
  day INTEGER,
  completed_at INTEGER,
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

-- One rep max records
CREATE TABLE IF NOT EXISTS one_rep_max (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight REAL NOT NULL,
  date_tested INTEGER NOT NULL,
  notes TEXT,
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Exercise notes
CREATE TABLE IF NOT EXISTS exercise_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Exercise custom RPE values
CREATE TABLE IF NOT EXISTS exercise_custom_rpe (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  rpe_value REAL NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Program history (completed programs)
CREATE TABLE IF NOT EXISTS program_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  program_id TEXT,
  program_name TEXT NOT NULL,
  template_data TEXT, -- JSON stored as TEXT
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  total_workouts INTEGER DEFAULT 0,
  completion_rate REAL DEFAULT 0,
  synced INTEGER DEFAULT 0,
  synced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Sync queue for offline operations
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'UPSERT')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON payload
  priority INTEGER DEFAULT 0, -- Higher = more important
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_error TEXT,
  last_retry_at INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_synced ON workouts(synced);
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_synced ON workout_sets(synced);
CREATE INDEX IF NOT EXISTS idx_in_progress_user_id ON in_progress_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_active_programs_user_id ON active_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_one_rep_max_user_exercise ON one_rep_max(user_id, exercise_id);
`;

/**
 * SQL statements to create upgrade migrations
 */
export const MIGRATIONS: { version: number; sql: string }[] = [
  // Version 1 is the base schema (CREATE_TABLES_SQL)
  // Version 2: Add missing fields to active_programs for full ActiveProgram support
  {
    version: 2,
    sql: `
      -- Add missing columns to active_programs (ignore if already exist)
      ALTER TABLE active_programs ADD COLUMN template_id TEXT;
      ALTER TABLE active_programs ADD COLUMN instance_id TEXT;
      ALTER TABLE active_programs ADD COLUMN template_metadata TEXT;
      ALTER TABLE active_programs ADD COLUMN completed_workouts INTEGER DEFAULT 0;
      ALTER TABLE active_programs ADD COLUMN total_workouts INTEGER DEFAULT 0;
      ALTER TABLE active_programs ADD COLUMN progress REAL DEFAULT 0;
      ALTER TABLE active_programs ADD COLUMN progression_override TEXT;
      ALTER TABLE active_programs ADD COLUMN is_custom INTEGER DEFAULT 0;
      ALTER TABLE active_programs ADD COLUMN origin_template_id TEXT;
      ALTER TABLE active_programs ADD COLUMN created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000);
      ALTER TABLE active_programs ADD COLUMN updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000);
    `
  },
  // Version 3: Add sync protection columns to prevent stale Supabase data from overwriting fresh local state
  {
    version: 3,
    sql: `
      -- Add sync protection columns to active_programs
      ALTER TABLE active_programs ADD COLUMN pending_upload INTEGER DEFAULT 1;
      ALTER TABLE active_programs ADD COLUMN local_updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000);
    `
  },
];

/**
 * Table names for reference
 */
export const TABLES = {
  PROFILES: 'profiles',
  ACTIVE_PROGRAMS: 'active_programs',
  WORKOUTS: 'workouts',
  IN_PROGRESS_WORKOUTS: 'in_progress_workouts',
  WORKOUT_SETS: 'workout_sets',
  ONE_REP_MAX: 'one_rep_max',
  EXERCISE_NOTES: 'exercise_notes',
  EXERCISE_CUSTOM_RPE: 'exercise_custom_rpe',
  PROGRAM_HISTORY: 'program_history',
  SYNC_QUEUE: 'sync_queue',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

/**
 * Type definitions for table rows
 */
export interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  gender: 'male' | 'female' | 'Prefer not say' | null;
  experience: 'beginner' | 'intermediate' | 'advanced' | null;
  goals: string | null; // JSON array as string
  one_rep_max: string | null; // JSON object as string
  preferred_unit: 'metric' | 'imperial';
  bodyweight: number | null;
  created_at: number | null;
  updated_at: number | null;
  synced: number;
  synced_at: number | null;
}

export interface ActiveProgramRow {
  id: string;
  user_id: string;
  template_id: string;
  instance_id: string;
  program_name: string;
  template_data: string | null; // JSON as string (full GymTemplate)
  template_metadata: string | null; // JSON as string (lightweight metadata)
  current_week: number;
  current_day: number;
  completed_workouts: number;
  total_workouts: number;
  progress: number;
  started_at: number;
  last_workout_at: number | null;
  progression_override: string | null; // JSON as string
  is_custom: number;
  origin_template_id: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
  synced: number;
  synced_at: number | null;
  // SYNC PROTECTION: Prevents stale Supabase data from overwriting fresh local state
  pending_upload: number; // 1 = local has changes not yet synced, 0 = synced
  local_updated_at: number; // When local state last changed
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  program_id: string | null;
  program_instance_id: string | null;
  workout_name: string;
  start_time: number;
  end_time: number | null;
  exercises: string; // JSON array as string
  notes: string | null;
  completed: number;
  skipped: number;
  week: number | null;
  day: number | null;
  created_at: number;
  updated_at: number;
  synced: number;
  synced_at: number | null;
}

export interface InProgressWorkoutRow {
  id: string;
  user_id: string;
  program_id: string | null;
  program_instance_id: string | null;
  workout_name: string;
  start_time: number;
  exercises: string; // JSON array as string
  notes: string | null;
  week: number | null;
  day: number | null;
  created_at: number;
  updated_at: number;
  synced: number;
  synced_at: number | null;
}

export interface WorkoutSetRow {
  id: string;
  user_id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  completed: number;
  skipped: number;
  notes: string | null;
  week: number | null;
  day: number | null;
  completed_at: number | null;
  synced: number;
  synced_at: number | null;
}

export interface SyncQueueRow {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  table_name: string;
  record_id: string;
  data: string; // JSON payload
  priority: number;
  created_at: number;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  last_retry_at: number | null;
}

/**
 * Helper to parse JSON fields from SQLite rows
 */
export function parseJsonField<T>(jsonString: string | null, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    console.warn('[SQLite] Failed to parse JSON field:', jsonString);
    return defaultValue;
  }
}

/**
 * Helper to stringify JSON fields for SQLite storage
 */
export function stringifyJsonField<T>(value: T): string {
  return JSON.stringify(value);
}

