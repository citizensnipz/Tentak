/**
 * Deterministic query functions. No LLM or agent; SQL + logic only.
 */

import type { Db } from './db.js';
import type { Event, Task, Table, Category, Tag } from '../shared/types.js';

export type TaskRow = Task & { category_id?: number | null };

export function enrichTasksWithCategoryAndTags(db: Db, userId: number, rows: TaskRow[]): Task[] {
  if (rows.length === 0) return [];
  const taskIds = rows.map((r) => r.id);
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((id): id is number => id != null))];
  const categories =
    categoryIds.length > 0
      ? (db.prepare('SELECT id, user_id, name, color, created_at FROM categories WHERE user_id = ? AND id IN (' + categoryIds.map(() => '?').join(',') + ')').all(userId, ...categoryIds) as Category[])
      : [];
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const taskTagRows = db.prepare('SELECT task_id, tag_id FROM task_tags WHERE task_id IN (' + taskIds.map(() => '?').join(',') + ')').all(...taskIds) as { task_id: number; tag_id: number }[];
  const tagIds = [...new Set(taskTagRows.map((r) => r.tag_id))];
  const tags =
    tagIds.length > 0
      ? (db.prepare('SELECT id, user_id, name, created_at FROM tags WHERE user_id = ? AND id IN (' + tagIds.map(() => '?').join(',') + ')').all(userId, ...tagIds) as Tag[])
      : [];
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const tagsByTaskId = new Map<number, Tag[]>();
  for (const row of taskTagRows) {
    const tag = tagMap.get(row.tag_id);
    if (tag) {
      const arr = tagsByTaskId.get(row.task_id) ?? [];
      arr.push(tag);
      tagsByTaskId.set(row.task_id, arr);
    }
  }
  return rows.map((r) => {
    const row = r as TaskRow & { user_id?: number };
    const { category_id, user_id: _uid, ...rest } = row;
    const category = category_id != null ? (catMap.get(category_id) ?? null) : null;
    const taskTags = tagsByTaskId.get(r.id) ?? [];
    return { ...rest, category, tags: taskTags } as Task;
  });
}

/**
 * Today's schedule: events that overlap the given date (YYYY-MM-DD).
 * An event overlaps the day if date(start_time) <= date AND date(end_time) >= date.
 */
export function getScheduleToday(db: Db, date: string): Event[] {
  const stmt = db.prepare(`
    SELECT id, title, start_time, end_time, location, kind, created_at, related_task_id
    FROM events
    WHERE date(start_time) <= ? AND date(end_time) >= ?
    ORDER BY start_time
  `);
  return stmt.all(date, date) as Event[];
}

/**
 * Backlog tasks: tasks with kind = 'backlog' for the given user.
 */
export function getTasksBacklog(db: Db, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order, category_id
    FROM tasks
    WHERE user_id = ? AND kind = 'backlog'
    ORDER BY created_at
  `);
  return enrichTasksWithCategoryAndTags(db, userId, stmt.all(userId) as TaskRow[]);
}

/**
 * Scheduled tasks: tasks with kind = 'scheduled' (Today table) for the given user.
 */
export function getTasksScheduled(db: Db, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order, category_id
    FROM tasks
    WHERE user_id = ? AND kind = 'scheduled'
    ORDER BY created_at
  `);
  return enrichTasksWithCategoryAndTags(db, userId, stmt.all(userId) as TaskRow[]);
}

/**
 * Tasks waiting on others: tasks with status = 'waiting' for the given user.
 */
export function getTasksWaiting(db: Db, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order, category_id
    FROM tasks
    WHERE user_id = ? AND status = 'waiting'
    ORDER BY created_at
  `);
  return enrichTasksWithCategoryAndTags(db, userId, stmt.all(userId) as TaskRow[]);
}

/**
 * All tables: returns all tables for the given user.
 */
export function getAllTables(db: Db, userId: number): Table[] {
  const stmt = db.prepare(`
    SELECT id, title, color, x, y, width, height, is_permanent, table_date, locked
    FROM tables
    WHERE user_id = ?
    ORDER BY is_permanent DESC, id
  `);
  const rows = stmt.all(userId) as (Table & { locked?: number })[];
  return rows.map((r) => ({
    ...r,
    locked: Boolean(r.locked),
  }));
}

/**
 * All tasks: returns all tasks for the given user.
 */
export function getAllTasks(db: Db, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order, category_id
    FROM tasks
    WHERE user_id = ?
    ORDER BY created_at
  `);
  return enrichTasksWithCategoryAndTags(db, userId, stmt.all(userId) as TaskRow[]);
}

/**
 * Tasks scheduled for a given date (YYYY-MM-DD) for the given user. Used by Day List view.
 */
export function getTasksByScheduledDate(db: Db, date: string, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order, category_id
    FROM tasks
    WHERE user_id = ? AND scheduled_date = ?
    ORDER BY created_at
  `);
  return enrichTasksWithCategoryAndTags(db, userId, stmt.all(userId, date) as TaskRow[]);
}
