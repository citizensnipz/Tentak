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
  }

  return db;
}
