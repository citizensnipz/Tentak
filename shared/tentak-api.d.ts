/**
 * Type declarations for window.tentak (exposed by preload via contextBridge).
 * Use from renderer: window.tentak.query(...), window.tentak.mutate(...).
 */

import type { Event, Task } from './types.js';

export type QueryType = 'scheduleToday' | 'tasksBacklog' | 'tasksScheduled' | 'tasksWaiting';

export type QueryPayload = {
  type: QueryType;
  params?: { date?: string };
};

export type QueryResult =
  | { ok: true; data: Event[] | Task[] }
  | { ok: false; error: string };

export type MutateOperation =
  | 'taskCreate'
  | 'taskUpdate'
  | 'taskDelete'
  | 'eventCreate'
  | 'eventUpdate'
  | 'eventDelete'
  | 'reminderCreate'
  | 'reminderUpdate'
  | 'reminderDelete';

export type MutatePayload = {
  operation: MutateOperation;
  payload: Record<string, unknown>;
};

export type MutateResult<T = unknown> =
  | { ok: true; data: T | null }
  | { ok: false; error: string };

export interface TentakAPI {
  query(payload: QueryPayload): Promise<QueryResult>;
  mutate(payload: MutatePayload): Promise<MutateResult>;
}

declare global {
  interface Window {
    tentak: TentakAPI;
  }
}

export {};
