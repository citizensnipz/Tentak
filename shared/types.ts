/**
 * Tentak shared types – used by both main process and renderer.
 * Matches backend/schema.sql exactly.
 */

export type TaskStatus = 'pending' | 'waiting' | 'completed' | 'cancelled';
export type TaskKind = 'scheduled' | 'backlog' | 'external_dependency' | 'someday';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  kind: TaskKind;
  priority: TaskPriority;
  created_at: string;
  completed_at: string | null;
  related_event_id: number | null;
  external_owner: string | null;
  color: string | null;
  table_id: string | null;
}

export type EventKind = 'meeting' | 'personal' | 'reminder' | 'block';

export interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  kind: EventKind;
  created_at: string;
  related_task_id: number | null;
}

export type ReminderTargetType = 'task' | 'event';

export interface Reminder {
  id: number;
  target_type: ReminderTargetType;
  target_id: number;
  offset_minutes: number;
  delivered_at: string | null;
}

/** Note (v2): free-form text attached to tasks, events, or days. */
export interface Note {
  id: number;
  body: string;
  attached_type: string;
  attached_id: number;
  created_at: string;
}

export interface Table {
  id: string;
  title: string;
  color: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  is_permanent: number;
}
