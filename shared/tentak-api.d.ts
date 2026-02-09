/**
 * Type declarations for window.tentak (exposed by preload via contextBridge).
 * Use from renderer: window.tentak.query(...), window.tentak.mutate(...).
 */

import type { Event, Task } from './types.js';

export type QueryType = 'scheduleToday' | 'tasksBacklog' | 'tasksScheduled' | 'tasksWaiting' | 'allTables' | 'allTasks' | 'tasksByScheduledDate';

export type QueryPayload = {
  type: QueryType;
  params?: { date?: string };
};

import type { Table } from './types.js';

export type QueryResult =
  | { ok: true; data: Event[] | Task[] | Table[] }
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
  | 'reminderDelete'
  | 'tableCreate'
  | 'tableUpdate'
  | 'tableDelete';

export type MutatePayload = {
  operation: MutateOperation;
  payload: Record<string, unknown>;
};

export type MutateResult<T = unknown> =
  | { ok: true; data: T | null }
  | { ok: false; error: string };

export type AgentAskResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };

export interface ChatMessageAPI {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  usedLLM: boolean;
}

export interface TentakAPI {
  query(payload: QueryPayload): Promise<QueryResult>;
  mutate(payload: MutatePayload): Promise<MutateResult>;
  agentAsk(message: string): Promise<AgentAskResult>;
  getAssetPath(name: string): Promise<{ ok: true; data: string } | { ok: false; error: string }>;
  loadChatMessages(chatId?: string): Promise<{ ok: true; data: ChatMessageAPI[] } | { ok: false; error: string }>;
  appendChatMessage(chatId: string, message: { role: string; content: string; timestamp?: number; usedLLM?: boolean }): Promise<{ ok: true; data: ChatMessageAPI } | { ok: false; error: string }>;
}

declare global {
  interface Window {
    tentak: TentakAPI;
  }
}

export {};
