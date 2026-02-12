/**
 * CRUD for tags. User-scoped.
 */

import type { Db } from './db.js';
import type { Tag } from '../shared/types.js';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export type TagInsert = Omit<Tag, 'id' | 'user_id'> & { user_id?: number };
export type TagUpdate = Partial<Pick<Tag, 'name'>>;

export function createTag(db: Db, userId: number, data: TagInsert): Tag {
  assert(typeof data.name === 'string' && data.name.trim() !== '', 'Tag name is required');

  const name = data.name.trim();
  const existing = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(userId, name);
  assert(!existing, `Tag "${name}" already exists`);

  const created_at = data.created_at ?? new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tags (user_id, name, created_at)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, name, created_at);
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
}

export function updateTag(db: Db, userId: number, id: number, data: TagUpdate): Tag {
  const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as Tag | undefined;
  assert(existing !== undefined, `Tag not found: ${id}`);

  if (data.name !== undefined) {
    assert(typeof data.name === 'string' && data.name.trim() !== '', 'Tag name cannot be empty');
    const name = data.name.trim();
    const duplicate = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?').get(userId, name, id);
    assert(!duplicate, `Tag "${name}" already exists`);
  }

  const merged = { ...existing, ...data };
  db.prepare(`
    UPDATE tags SET name = ?
    WHERE id = ? AND user_id = ?
  `).run(merged.name, id, userId);
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
}

export function deleteTag(db: Db, userId: number, id: number): void {
  const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
  assert(result.changes > 0, `Tag not found: ${id}`);
  // Remove tag from all tasks
  db.prepare('DELETE FROM task_tags WHERE tag_id = ?').run(id);
}

export function getTagsByUser(db: Db, userId: number): Tag[] {
  return db.prepare(`
    SELECT id, user_id, name, created_at
    FROM tags
    WHERE user_id = ?
    ORDER BY name
  `).all(userId) as Tag[];
}
