/**
 * Automatic snapshot backups: create a copy of the DB in userData/backups/,
 * keep only the 10 most recent, and update the user's last_backup_at.
 */

import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { Db } from './db.js';
import { setUserLastBackupAt } from './users.js';

const BACKUPS_SUBDIR = 'backups';
const BACKUP_PREFIX = 'tentak-backup-';
const BACKUP_EXT = '.db';
const MAX_BACKUPS = 10;

function formatTimestamp(): string {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D}-${h}${m}${s}`;
}

/**
 * Run a snapshot backup: copy the live DB to userData/backups/tentak-backup-YYYY-MM-DD-HHMMSS.db,
 * prune to 10 most recent, and set users.last_backup_at for the given user.
 * Uses better-sqlite3's backup() which is safe to use on an open database.
 */
export async function runSnapshotBackup(
  db: Db,
  userDataPath: string,
  userId: number
): Promise<void> {
  const backupsDir = join(userDataPath, BACKUPS_SUBDIR);
  mkdirSync(backupsDir, { recursive: true });

  const filename = `${BACKUP_PREFIX}${formatTimestamp()}${BACKUP_EXT}`;
  const backupPath = join(backupsDir, filename);

  await (db as unknown as { backup: (path: string) => Promise<unknown> }).backup(backupPath);

  const entries = readdirSync(backupsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.startsWith(BACKUP_PREFIX) && e.name.endsWith(BACKUP_EXT))
    .map((e) => ({
      name: e.name,
      path: join(backupsDir, e.name),
      mtime: statSync(join(backupsDir, e.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (let i = MAX_BACKUPS; i < entries.length; i++) {
    try {
      unlinkSync(entries[i].path);
    } catch {
      // ignore per-file errors when pruning
    }
  }

  const now = new Date().toISOString();
  setUserLastBackupAt(db, userId, now);
}
