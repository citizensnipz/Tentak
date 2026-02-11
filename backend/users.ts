/**
 * User profile: default user creation, get first user, get/update profile.
 */

import type { Db } from './db.js';
import type { User } from '../shared/types.js';

/**
 * Returns the first user's id, or null if no users exist.
 */
export function getDefaultOrFirstUserId(db: Db): number | null {
  const row = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined;
  return row ? row.id : null;
}

/**
 * Creates the default user (username "Default", email null, etc.) and returns its id.
 * Call after schema is applied when no users exist.
 */
export function createDefaultUser(db: Db): number {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO users (username, email, avatar_path, created_at, updated_at, last_backup_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run('Default', null, null, now, now, null);
  return Number(result.lastInsertRowid);
}

/**
 * Get user by id.
 */
export function getUser(db: Db, id: number): User | null {
  const row = db.prepare(`
    SELECT id, username, email, avatar_path, created_at, updated_at, last_backup_at
    FROM users WHERE id = ?
  `).get(id) as User | undefined;
  return row ?? null;
}

export type UserUpdate = Partial<Pick<User, 'username' | 'email' | 'avatar_path'>>;

/**
 * Update user profile fields. updated_at is set automatically.
 */
export function updateUser(db: Db, id: number, data: UserUpdate): User {
  const existing = getUser(db, id);
  if (!existing) throw new Error(`User not found: ${id}`);

  const updated_at = new Date().toISOString();
  const username = data.username !== undefined ? data.username : existing.username;
  const email = data.email !== undefined ? data.email : existing.email;
  const avatar_path = data.avatar_path !== undefined ? data.avatar_path : existing.avatar_path;

  db.prepare(`
    UPDATE users SET username = ?, email = ?, avatar_path = ?, updated_at = ?
    WHERE id = ?
  `).run(username, email ?? null, avatar_path ?? null, updated_at, id);

  return getUser(db, id) as User;
}

/**
 * Set last_backup_at for a user.
 */
export function setUserLastBackupAt(db: Db, id: number, timestamp: string): void {
  db.prepare('UPDATE users SET last_backup_at = ? WHERE id = ?').run(timestamp, id);
}
