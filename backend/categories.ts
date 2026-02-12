/**
 * CRUD for categories. User-scoped.
 */

import type { Db } from './db.js';
import type { Category } from '../shared/types.js';

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export type CategoryInsert = Omit<Category, 'id' | 'user_id'> & { user_id?: number };
export type CategoryUpdate = Partial<Pick<Category, 'name' | 'color'>>;

export function createCategory(db: Db, userId: number, data: CategoryInsert): Category {
  assert(typeof data.name === 'string' && data.name.trim() !== '', 'Category name is required');
  assert(typeof data.color === 'string' && HEX_REGEX.test(data.color), 'Category color must be a valid hex string');

  const name = data.name.trim();
  const existing = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?').get(userId, name);
  assert(!existing, `Category "${name}" already exists`);

  const created_at = data.created_at ?? new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO categories (user_id, name, color, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(userId, name, data.color, created_at);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category;
}

export function updateCategory(db: Db, userId: number, id: number, data: CategoryUpdate): Category {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId) as Category | undefined;
  assert(existing !== undefined, `Category not found: ${id}`);

  if (data.name !== undefined) {
    assert(typeof data.name === 'string' && data.name.trim() !== '', 'Category name cannot be empty');
    const name = data.name.trim();
    const duplicate = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? AND id != ?').get(userId, name, id);
    assert(!duplicate, `Category "${name}" already exists`);
  }
  if (data.color !== undefined) {
    assert(typeof data.color === 'string' && HEX_REGEX.test(data.color), 'Category color must be a valid hex string');
  }

  const merged = { ...existing, ...data };
  db.prepare(`
    UPDATE categories SET name = ?, color = ?
    WHERE id = ? AND user_id = ?
  `).run(merged.name, merged.color, id, userId);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
}

export function deleteCategory(db: Db, userId: number, id: number): void {
  const result = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
  assert(result.changes > 0, `Category not found: ${id}`);
  // Set category_id to NULL for all tasks that had this category
  db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ?').run(id);
}

export function getCategoriesByUser(db: Db, userId: number): Category[] {
  return db.prepare(`
    SELECT id, user_id, name, color, created_at
    FROM categories
    WHERE user_id = ?
    ORDER BY name
  `).all(userId) as Category[];
}
