/**
 * CRUD for Task, Event, Reminder with validation (enum checks, non-null required fields).
 */

import type { Db } from './db.js';
import type {
  Task,
  TaskStatus,
  TaskKind,
  TaskPriority,
  Event,
  EventKind,
  Reminder,
  ReminderTargetType,
} from '../shared/types.js';

const TASK_STATUSES: TaskStatus[] = [
  'pending',
  'waiting',
  'completed',
  'cancelled',
];
const TASK_KINDS: TaskKind[] = [
  'scheduled',
  'backlog',
  'external_dependency',
  'someday',
];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high'];
const EVENT_KINDS: EventKind[] = [
  'meeting',
  'personal',
  'reminder',
  'block',
];
const REMINDER_TARGET_TYPES: ReminderTargetType[] = ['task', 'event'];

function assert(
  condition: boolean,
  message: string
): asserts condition {
  if (!condition) throw new Error(message);
}

// --- Task ---

export type TaskInsert = Omit<Task, 'id' | 'created_at'> & {
  created_at?: string;
};

export function createTask(
  db: Db,
  data: TaskInsert
): Task {
  assert(typeof data.title === 'string' && data.title.trim() !== '', 'Task title is required');
  assert(TASK_STATUSES.includes(data.status), `Invalid task status: ${data.status}`);
  assert(TASK_KINDS.includes(data.kind), `Invalid task kind: ${data.kind}`);
  assert(TASK_PRIORITIES.includes(data.priority), `Invalid task priority: ${data.priority}`);

  const created_at = data.created_at ?? new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, status, kind, priority, created_at, completed_at, related_event_id, external_owner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.title.trim(),
    data.description ?? null,
    data.status,
    data.kind,
    data.priority,
    created_at,
    data.completed_at ?? null,
    data.related_event_id ?? null,
    data.external_owner ?? null
  );
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as Task;
  return row;
}

export type TaskUpdate = Partial<Omit<Task, 'id'>>;

export function updateTask(db: Db, id: number, data: TaskUpdate): Task {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  assert(existing !== undefined, `Task not found: ${id}`);

  if (data.title !== undefined) {
    assert(typeof data.title === 'string' && data.title.trim() !== '', 'Task title cannot be empty');
  }
  if (data.status !== undefined) assert(TASK_STATUSES.includes(data.status), `Invalid task status: ${data.status}`);
  if (data.kind !== undefined) assert(TASK_KINDS.includes(data.kind), `Invalid task kind: ${data.kind}`);
  if (data.priority !== undefined) assert(TASK_PRIORITIES.includes(data.priority), `Invalid task priority: ${data.priority}`);

  const merged: Task = {
    ...existing,
    ...data,
    id: existing.id,
  };
  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, status = ?, kind = ?, priority = ?, created_at = ?, completed_at = ?, related_event_id = ?, external_owner = ?
    WHERE id = ?
  `).run(
    merged.title,
    merged.description ?? null,
    merged.status,
    merged.kind,
    merged.priority,
    merged.created_at,
    merged.completed_at ?? null,
    merged.related_event_id ?? null,
    merged.external_owner ?? null,
    id
  );
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function deleteTask(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  assert(result.changes > 0, `Task not found: ${id}`);
}

// --- Event ---

export type EventInsert = Omit<Event, 'id' | 'created_at'> & {
  created_at?: string;
};

export function createEvent(db: Db, data: EventInsert): Event {
  assert(typeof data.title === 'string' && data.title.trim() !== '', 'Event title is required');
  assert(typeof data.start_time === 'string' && data.start_time.trim() !== '', 'Event start_time is required');
  assert(typeof data.end_time === 'string' && data.end_time.trim() !== '', 'Event end_time is required');
  assert(EVENT_KINDS.includes(data.kind), `Invalid event kind: ${data.kind}`);

  const created_at = data.created_at ?? new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO events (title, start_time, end_time, location, kind, created_at, related_task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.title.trim(),
    data.start_time.trim(),
    data.end_time.trim(),
    data.location ?? null,
    data.kind,
    created_at,
    data.related_task_id ?? null
  );
  return db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid) as Event;
}

export type EventUpdate = Partial<Omit<Event, 'id'>>;

export function updateEvent(db: Db, id: number, data: EventUpdate): Event {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
  assert(existing !== undefined, `Event not found: ${id}`);

  if (data.title !== undefined) {
    assert(typeof data.title === 'string' && data.title.trim() !== '', 'Event title cannot be empty');
  }
  if (data.start_time !== undefined) assert(typeof data.start_time === 'string' && data.start_time.trim() !== '', 'Event start_time cannot be empty');
  if (data.end_time !== undefined) assert(typeof data.end_time === 'string' && data.end_time.trim() !== '', 'Event end_time cannot be empty');
  if (data.kind !== undefined) assert(EVENT_KINDS.includes(data.kind), `Invalid event kind: ${data.kind}`);

  const merged: Event = { ...existing, ...data, id: existing.id };
  db.prepare(`
    UPDATE events SET title = ?, start_time = ?, end_time = ?, location = ?, kind = ?, created_at = ?, related_task_id = ?
    WHERE id = ?
  `).run(
    merged.title,
    merged.start_time,
    merged.end_time,
    merged.location ?? null,
    merged.kind,
    merged.created_at,
    merged.related_task_id ?? null,
    id
  );
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event;
}

export function deleteEvent(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  assert(result.changes > 0, `Event not found: ${id}`);
}

// --- Reminder ---

export type ReminderInsert = Omit<Reminder, 'id'> & { delivered_at?: string | null };

export function createReminder(db: Db, data: ReminderInsert): Reminder {
  assert(REMINDER_TARGET_TYPES.includes(data.target_type), `Invalid reminder target_type: ${data.target_type}`);
  assert(typeof data.target_id === 'number' && Number.isInteger(data.target_id), 'Reminder target_id must be an integer');
  assert(typeof data.offset_minutes === 'number' && Number.isInteger(data.offset_minutes), 'Reminder offset_minutes must be an integer');

  const stmt = db.prepare(`
    INSERT INTO reminders (target_type, target_id, offset_minutes, delivered_at)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.target_type,
    data.target_id,
    data.offset_minutes,
    data.delivered_at ?? null
  );
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid) as Reminder;
}

export type ReminderUpdate = Partial<Omit<Reminder, 'id'>>;

export function updateReminder(db: Db, id: number, data: ReminderUpdate): Reminder {
  const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder | undefined;
  assert(existing !== undefined, `Reminder not found: ${id}`);

  if (data.target_type !== undefined) assert(REMINDER_TARGET_TYPES.includes(data.target_type), `Invalid reminder target_type: ${data.target_type}`);
  if (data.target_id !== undefined) assert(typeof data.target_id === 'number' && Number.isInteger(data.target_id), 'Reminder target_id must be an integer');
  if (data.offset_minutes !== undefined) assert(typeof data.offset_minutes === 'number' && Number.isInteger(data.offset_minutes), 'Reminder offset_minutes must be an integer');

  const merged: Reminder = { ...existing, ...data, id: existing.id };
  db.prepare(`
    UPDATE reminders SET target_type = ?, target_id = ?, offset_minutes = ?, delivered_at = ?
    WHERE id = ?
  `).run(
    merged.target_type,
    merged.target_id,
    merged.offset_minutes,
    merged.delivered_at ?? null,
    id
  );
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder;
}

export function deleteReminder(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  assert(result.changes > 0, `Reminder not found: ${id}`);
}
