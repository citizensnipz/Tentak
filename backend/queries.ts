/**
 * Deterministic query functions. No LLM or agent; SQL + logic only.
 */

import type { Db } from './db.js';
import type { Event, Task, Table } from '../shared/types.js';

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
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order
    FROM tasks
    WHERE user_id = ? AND kind = 'backlog'
    ORDER BY created_at
  `);
  return stmt.all(userId) as Task[];
}

/**
 * Scheduled tasks: tasks with kind = 'scheduled' (Today table) for the given user.
 */
export function getTasksScheduled(db: Db, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order
    FROM tasks
    WHERE user_id = ? AND kind = 'scheduled'
    ORDER BY created_at
  `);
  return stmt.all(userId) as Task[];
}

/**
 * Tasks waiting on others: tasks with status = 'waiting' for the given user.
 */
export function getTasksWaiting(db: Db, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order
    FROM tasks
    WHERE user_id = ? AND status = 'waiting'
    ORDER BY created_at
  `);
  return stmt.all(userId) as Task[];
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
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order
    FROM tasks
    WHERE user_id = ?
    ORDER BY created_at
  `);
  return stmt.all(userId) as Task[];
}

/**
 * Tasks scheduled for a given date (YYYY-MM-DD) for the given user. Used by Day List view.
 */
export function getTasksByScheduledDate(db: Db, date: string, userId: number): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner, color, table_id, scheduled_date, table_order
    FROM tasks
    WHERE user_id = ? AND scheduled_date = ?
    ORDER BY created_at
  `);
  return stmt.all(userId, date) as Task[];
}
