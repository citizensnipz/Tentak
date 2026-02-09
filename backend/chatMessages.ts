/**
 * Chat message persistence: load and append with automatic trim to MAX_MESSAGES.
 * All logic lives in the backend; renderer only calls loadChatMessages and appendChatMessage.
 */

import type { Db } from './db.js';

export const MAX_CHAT_MESSAGES = 100;

export interface ChatMessageRow {
  id: number;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  used_llm: number;
}

export interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  usedLLM: boolean;
}

export interface ChatMessageInsert {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  usedLLM?: boolean;
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: Number(row.timestamp) || new Date(row.timestamp).getTime(),
    usedLLM: Boolean(row.used_llm),
  };
}

/**
 * Load all messages for a chat, ordered by timestamp ascending.
 */
export function loadChatMessages(db: Db, chatId: string): ChatMessage[] {
  const chat_id = chatId || 'default';
  const rows = db
    .prepare(
      `SELECT id, chat_id, role, content, timestamp, used_llm
       FROM chat_messages
       WHERE chat_id = ?
       ORDER BY timestamp ASC`
    )
    .all(chat_id) as ChatMessageRow[];
  return rows.map(rowToMessage);
}

/**
 * Append one message and trim oldest so total count for chatId does not exceed MAX_CHAT_MESSAGES.
 * Returns the inserted message (with id).
 */
export function appendChatMessage(
  db: Db,
  chatId: string,
  message: ChatMessageInsert
): ChatMessage {
  const chat_id = chatId || 'default';
  const role = message.role === 'user' || message.role === 'assistant' ? message.role : 'assistant';
  const content = typeof message.content === 'string' ? message.content : String(message.content);
  const timestamp = typeof message.timestamp === 'number' ? message.timestamp : Date.now();
  const used_llm = message.usedLLM === true ? 1 : 0;

  const insert = db.prepare(`
    INSERT INTO chat_messages (chat_id, role, content, timestamp, used_llm)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insert.run(chat_id, role, content, String(timestamp), used_llm);
  const lastId = Number(result.lastInsertRowid);

  const count = db.prepare('SELECT COUNT(*) as n FROM chat_messages WHERE chat_id = ?').get(chat_id) as { n: number };
  if (count.n > MAX_CHAT_MESSAGES) {
    const toDelete = count.n - MAX_CHAT_MESSAGES;
    const oldest = db.prepare(
      `SELECT id FROM chat_messages WHERE chat_id = ? ORDER BY timestamp ASC LIMIT ?`
    ).all(chat_id, toDelete) as { id: number }[];
    if (oldest.length > 0) {
      const placeholders = oldest.map(() => '?').join(',');
      db.prepare(`DELETE FROM chat_messages WHERE id IN (${placeholders})`).run(...oldest.map((r) => r.id));
    }
  }

  return {
    id: lastId,
    role,
    content,
    timestamp,
    usedLLM: used_llm === 1,
  };
}
