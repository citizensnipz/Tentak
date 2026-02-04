/**
 * Deterministic query functions. No LLM or agent; SQL + logic only.
 */

import type { Db } from './db.js';
import type { Event, Task } from '../shared/types.js';

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
 * Backlog tasks: tasks with kind = 'backlog'.
 */
export function getTasksBacklog(db: Db): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner
    FROM tasks
    WHERE kind = 'backlog'
    ORDER BY created_at
  `);
  return stmt.all() as Task[];
}

/**
 * Scheduled tasks: tasks with kind = 'scheduled' (Today table).
 */
export function getTasksScheduled(db: Db): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner
    FROM tasks
    WHERE kind = 'scheduled'
    ORDER BY created_at
  `);
  return stmt.all() as Task[];
}

/**
 * Tasks waiting on others: tasks with status = 'waiting'.
 */
export function getTasksWaiting(db: Db): Task[] {
  const stmt = db.prepare(`
    SELECT id, title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner
    FROM tasks
    WHERE status = 'waiting'
    ORDER BY created_at
  `);
  return stmt.all() as Task[];
}
