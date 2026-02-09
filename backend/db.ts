/**
 * Database module: open SQLite at a path and run schema on first run.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// When compiled to backend/dist/backend/, schema lives at backend/schema.sql
const SCHEMA_PATH = join(__dirname, '..', '..', 'schema.sql');

export type Db = Database.Database;

/**
 * Opens or creates the SQLite database at the given path and runs schema.sql
 * if the database is new (no tables yet). Returns the database handle.
 */
export function openDb(dbPath: string): Db {
  const db = new Database(dbPath);

  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'"
    )
    .get();

  if (!tableExists) {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    initializePermanentTables(db);
  } else {
    try {
      db.exec('ALTER TABLE tasks ADD COLUMN color TEXT');
    } catch {
      /* column already exists */
    }
    try {
      db.exec('ALTER TABLE tasks ADD COLUMN table_id TEXT');
    } catch {
      /* column already exists */
    }
    try {
      db.exec('ALTER TABLE tasks ADD COLUMN scheduled_date TEXT');
    } catch {
      /* column already exists */
    }
    try {
      db.exec('ALTER TABLE tasks ADD COLUMN table_order INTEGER');
    } catch {
      /* column already exists */
    }
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tables (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          color TEXT,
          x REAL NOT NULL,
          y REAL NOT NULL,
          width REAL NOT NULL,
          height REAL NOT NULL,
          is_permanent INTEGER NOT NULL DEFAULT 0,
          table_date TEXT,
          locked INTEGER NOT NULL DEFAULT 0
        )
      `);
      initializePermanentTables(db);
    } catch {
      /* table already exists */
    }
    try {
      db.exec('ALTER TABLE tables ADD COLUMN table_date TEXT');
    } catch {
      /* column already exists */
    }
    try {
      db.exec('ALTER TABLE tables ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
    } catch {
      /* column already exists */
    }
    ensureChatMessagesTable(db);
  }

  return db;
}

function ensureChatMessagesTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL DEFAULT 'default',
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      used_llm INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id_timestamp ON chat_messages (chat_id, timestamp)'
  );
}

function initializePermanentTables(db: Db): void {
  const backlogExists = db.prepare('SELECT id FROM tables WHERE id = ?').get('backlog');
  if (!backlogExists) {
    db.prepare(`
      INSERT INTO tables (id, title, color, x, y, width, height, is_permanent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('backlog', 'Backlog', null, 150, 150, 600, 400, 1);
  }
  const todayExists = db.prepare('SELECT id FROM tables WHERE id = ?').get('today');
  if (!todayExists) {
    db.prepare(`
      INSERT INTO tables (id, title, color, x, y, width, height, is_permanent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('today', 'Today', null, 850, 150, 600, 400, 1);
  }
}
