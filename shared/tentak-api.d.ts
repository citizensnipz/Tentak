/**
 * Type declarations for window.tentak (exposed by preload via contextBridge).
 * Use from renderer: window.tentak.query(...), window.tentak.mutate(...).
 */

import type { Event, Task, User } from './types.js';

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

export interface AuthUserSummary {
  id: number;
  username: string;
  email: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
  last_backup_at: string | null;
  last_login_at: string | null;
  hasPassword: boolean;
}

export type ProfileGetResult = { ok: true; data: User | null } | { ok: false; error: string };
export type ProfileUpdateResult = { ok: true; data: User } | { ok: false; error: string };
export type BackupNowResult = { ok: true; data: User } | { ok: false; error: string };

export interface TentakAPI {
  query(payload: QueryPayload): Promise<QueryResult>;
  mutate(payload: MutatePayload): Promise<MutateResult>;
  agentAsk(message: string): Promise<AgentAskResult>;
  getAssetPath(name: string): Promise<{ ok: true; data: string } | { ok: false; error: string }>;
  loadChatMessages(chatId?: string): Promise<{ ok: true; data: ChatMessageAPI[] } | { ok: false; error: string }>;
  appendChatMessage(chatId: string, message: { role: string; content: string; timestamp?: number; usedLLM?: boolean }): Promise<{ ok: true; data: ChatMessageAPI } | { ok: false; error: string }>;
  auth: {
    listUsers(): Promise<{ ok: true; data: AuthUserSummary[] } | { ok: false; error: string }>;
    signup(payload: { username: string; email?: string | null; password: string; avatar_path?: string | null }): Promise<{ ok: true; data: User } | { ok: false; error: string }>;
    login(payload: { userId: number; password: string }): Promise<{ ok: true; data: User } | { ok: false; error: string }>;
    logout(): Promise<{ ok: true; data: null } | { ok: false; error: string }>;
  };
  profile: {
    get(): Promise<ProfileGetResult>;
    update(payload: { username?: string; email?: string; avatar_path?: string | null }): Promise<ProfileUpdateResult>;
    chooseAvatar(): Promise<{ ok: true; data: string | null } | { ok: false; error: string }>;
    getAvatarUrl(path: string): Promise<{ ok: true; data: string | null } | { ok: false; error: string }>;
  };
  backupNow(): Promise<BackupNowResult>;
}

declare global {
  interface Window {
    tentak: TentakAPI;
  }
}

export {};
