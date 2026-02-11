/**
 * IPC handlers: tentak:query and tentak:mutate. Call backend only; no agent/LLM.
 */

import { ipcMain, dialog } from 'electron';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import crypto from 'crypto';

const __dirnameIpc = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirnameIpc, '..', 'assets');
import {
  getScheduleToday,
  getTasksBacklog,
  getTasksScheduled,
  getTasksWaiting,
  getAllTables,
  getAllTasks,
  getTasksByScheduledDate,
  createTask,
  updateTask,
  deleteTask,
  createEvent,
  updateEvent,
  deleteEvent,
  createReminder,
  updateReminder,
  deleteReminder,
  createTable,
  updateTable,
  deleteTable,
  buildAgentContext,
  getOpenAIApiKey,
  setOpenAIApiKey,
  clearOpenAIApiKey,
  loadChatMessages,
  appendChatMessage,
  getDefaultOrFirstUserId,
  getUser,
  updateUser,
  runSnapshotBackup,
} from '../backend/dist/backend/index.js';
import { runClawdbot } from '../agent/runClawdbot.js';

const QUERY_TYPES = ['scheduleToday', 'tasksBacklog', 'tasksScheduled', 'tasksWaiting', 'allTables', 'allTasks', 'tasksByScheduledDate'];
const MUTATE_OPERATIONS = [
  'taskCreate',
  'taskUpdate',
  'taskDelete',
  'eventCreate',
  'eventUpdate',
  'eventDelete',
  'reminderCreate',
  'reminderUpdate',
  'reminderDelete',
  'tableCreate',
  'tableUpdate',
  'tableDelete',
];

let currentUserId = null;

function wrap(handler) {
  return async (_event, payload) => {
    try {
      const data = await handler(payload);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

function getActiveUserId() {
  if (currentUserId == null) throw new Error('Not authenticated');
  return currentUserId;
}

export function registerIpcHandlers(db, userDataPath) {
  ipcMain.handle(
    'tentak:query',
    wrap((payload) => {
      if (!payload || typeof payload.type !== 'string') {
        throw new Error('Query payload must have type');
      }
      const { type, params = {} } = payload;
      if (!QUERY_TYPES.includes(type)) {
        throw new Error(`Unknown query type: ${type}`);
      }
      const userId = getActiveUserId();
      switch (type) {
        case 'scheduleToday': {
          const date = params.date ?? new Date().toISOString().slice(0, 10);
          return getScheduleToday(db, date);
        }
        case 'tasksBacklog':
          return getTasksBacklog(db, userId);
        case 'tasksScheduled':
          return getTasksScheduled(db, userId);
        case 'tasksWaiting':
          return getTasksWaiting(db, userId);
        case 'allTables':
          return getAllTables(db, userId);
        case 'allTasks':
          return getAllTasks(db, userId);
        case 'tasksByScheduledDate': {
          const date = params.date ?? new Date().toISOString().slice(0, 10);
          return getTasksByScheduledDate(db, date, userId);
        }
        default:
          throw new Error(`Unknown query type: ${type}`);
      }
    })
  );

  const triggerBackup = (userId) => runSnapshotBackup(db, userDataPath, userId).catch(() => {});

  ipcMain.handle(
    'tentak:mutate',
    wrap(async (payload) => {
      if (!payload || typeof payload.operation !== 'string') {
        throw new Error('Mutate payload must have operation');
      }
      const { operation, payload: opPayload = {} } = payload;
      if (!MUTATE_OPERATIONS.includes(operation)) {
        throw new Error(`Unknown mutate operation: ${operation}`);
      }
      const userId = getActiveUserId();
      let result;
      switch (operation) {
        case 'taskCreate':
          result = createTask(db, userId, opPayload);
          await triggerBackup(userId);
          return result;
        case 'taskUpdate': {
          const { id, ...data } = opPayload;
          if (id == null) throw new Error('taskUpdate requires id');
          result = updateTask(db, userId, Number(id), data);
          await triggerBackup(userId);
          return result;
        }
        case 'taskDelete': {
          const id = opPayload.id;
          if (id == null) throw new Error('taskDelete requires id');
          deleteTask(db, userId, Number(id));
          await triggerBackup(userId);
          return null;
        }
        case 'eventCreate':
          return createEvent(db, opPayload);
        case 'eventUpdate': {
          const { id, ...data } = opPayload;
          if (id == null) throw new Error('eventUpdate requires id');
          return updateEvent(db, Number(id), data);
        }
        case 'eventDelete': {
          const id = opPayload.id;
          if (id == null) throw new Error('eventDelete requires id');
          deleteEvent(db, Number(id));
          return null;
        }
        case 'reminderCreate':
          return createReminder(db, opPayload);
        case 'reminderUpdate': {
          const { id, ...data } = opPayload;
          if (id == null) throw new Error('reminderUpdate requires id');
          return updateReminder(db, Number(id), data);
        }
        case 'reminderDelete': {
          const id = opPayload.id;
          if (id == null) throw new Error('reminderDelete requires id');
          deleteReminder(db, Number(id));
          return null;
        }
        case 'tableCreate':
          result = createTable(db, userId, opPayload);
          await triggerBackup(userId);
          return result;
        case 'tableUpdate': {
          const { id, ...data } = opPayload;
          if (id == null) throw new Error('tableUpdate requires id');
          result = updateTable(db, userId, String(id), data);
          await triggerBackup(userId);
          return result;
        }
        case 'tableDelete': {
          const { id, moveTasksToBacklog, deleteTasks } = opPayload;
          if (id == null) throw new Error('tableDelete requires id');
          deleteTable(db, userId, String(id), { moveTasksToBacklog, deleteTasks });
          await triggerBackup(userId);
          return null;
        }
        default:
          throw new Error(`Unknown mutate operation: ${operation}`);
      }
    })
  );

  // Agent / Clawdbot: read-only query assistant.
  ipcMain.handle('tentak:agent:ask', async (_event, payload) => {
    try {
      const message = payload?.message;
      if (typeof message !== 'string' || !message.trim()) {
        throw new Error('agent:ask requires a non-empty message string');
      }

      const userId = getActiveUserId();
      const context = buildAgentContext(db, userId);

      // Check if OpenAI API key is configured
      const apiKey = getOpenAIApiKey();

      // Run the agent in a strictly read-only fashion.
      const result = await runClawdbot(message, context, apiKey);

      return { ok: true, reply: result.reply, usedLLM: result.usedLLM };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        usedLLM: false,
      };
    }
  });

  // Asset path: return file:// URL for use in img src (e.g. logo, icon).
  ipcMain.handle('tentak:getAssetPath', wrap((payload) => {
    const name = payload?.name;
    if (typeof name !== 'string' || !name.length) throw new Error('getAssetPath requires name');
    const safe = name.replace(/\.\./g, '').replace(/^\/+/, '');
    let absolute = join(ASSETS_DIR, safe);
    if (!existsSync(absolute)) absolute = join(ASSETS_DIR, safe + '.png');
    return pathToFileURL(absolute).href;
  }));

  // Chat: persisted messages, load and append (trimming handled in backend).
  ipcMain.handle('tentak:chat:loadMessages', wrap((payload) => {
    const userId = getActiveUserId();
    const chatId = payload?.chatId ?? 'default';
    return loadChatMessages(db, userId, String(chatId));
  }));

  ipcMain.handle('tentak:chat:appendMessage', wrap(async (payload) => {
    const userId = getActiveUserId();
    const chatId = payload?.chatId ?? 'default';
    const message = payload?.message;
    if (!message || typeof message.role !== 'string' || typeof message.content !== 'string') {
      throw new Error('appendMessage requires message with role and content');
    }
    const result = appendChatMessage(db, userId, String(chatId), {
      role: message.role,
      content: message.content,
      timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
      usedLLM: Boolean(message.usedLLM),
    });
    await triggerBackup(userId);
    return result;
  }));

  // Profile: get current user, update profile.
  ipcMain.handle('tentak:profile:get', wrap(() => {
    const userId = getActiveUserId();
    const user = getUser(db, userId);
    return user ?? null;
  }));

  ipcMain.handle('tentak:profile:update', wrap((payload) => {
    const userId = getActiveUserId();
    const { username, email, avatar_path } = payload ?? {};
    return updateUser(db, userId, { username, email, avatar_path });
  }));

  // Manual backup.
  ipcMain.handle('tentak:backup:now', wrap(async () => {
    const userId = getActiveUserId();
    await runSnapshotBackup(db, userDataPath, userId);
    return getUser(db, userId);
  }));

  // Avatar: open file dialog and return selected path; get file URL for preview.
  ipcMain.handle('tentak:profile:chooseAvatar', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (result.canceled || !result.filePaths?.length) return { ok: true, data: null };
    return { ok: true, data: result.filePaths[0] };
  });

  ipcMain.handle('tentak:profile:getAvatarUrl', wrap((payload) => {
    const path = payload?.path;
    if (typeof path !== 'string' || !path) return null;
    return pathToFileURL(path).href;
  }));

  // Authentication: local-only accounts with password hashing.
  ipcMain.handle('tentak:auth:listUsers', wrap(() => {
    const rows = db
      .prepare(
        `SELECT id, username, email, avatar_path, created_at, updated_at, last_backup_at, last_login_at, password_hash
         FROM users
         ORDER BY id ASC`
      )
      .all();
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      avatar_path: row.avatar_path,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_backup_at: row.last_backup_at,
      last_login_at: row.last_login_at,
      hasPassword: Boolean(row.password_hash),
    }));
  }));

  ipcMain.handle('tentak:auth:signup', wrap((payload) => {
    const { username, email, password, avatar_path } = payload ?? {};
    if (typeof username !== 'string' || !username.trim()) {
      throw new Error('Username is required');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username.trim());
    if (existing) {
      throw new Error('Username already exists');
    }

    const now = new Date().toISOString();
    const saltBuf = crypto.randomBytes(16);
    const saltHex = saltBuf.toString('hex');
    const hashBuf = crypto.pbkdf2Sync(password, saltHex, 100000, 64, 'sha512');
    const hashHex = hashBuf.toString('hex');

    const stmt = db.prepare(
      `INSERT INTO users (username, email, avatar_path, created_at, updated_at, last_backup_at, password_hash, password_salt, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      username.trim(),
      email || null,
      avatar_path || null,
      now,
      now,
      null,
      hashHex,
      saltHex,
      now
    );
    const id = Number(result.lastInsertRowid);
    currentUserId = id;

    const user = db
      .prepare(
        `SELECT id, username, email, avatar_path, created_at, updated_at, last_backup_at, last_login_at
         FROM users WHERE id = ?`
      )
      .get(id);
    return user;
  }));

  ipcMain.handle('tentak:auth:login', wrap((payload) => {
    const { userId, password } = payload ?? {};
    const id = Number(userId);
    if (!id || Number.isNaN(id)) {
      throw new Error('login requires userId');
    }
    if (typeof password !== 'string' || !password) {
      throw new Error('Password is required');
    }

    const row = db
      .prepare(
        `SELECT id, username, password_hash, password_salt, updated_at
         FROM users WHERE id = ?`
      )
      .get(id);
    if (!row) throw new Error('User not found');

    const now = new Date().toISOString();

    if (!row.password_hash || !row.password_salt) {
      // Legacy user without a password: treat this login as initial password set.
      const saltBuf = crypto.randomBytes(16);
      const saltHex = saltBuf.toString('hex');
      const hashBuf = crypto.pbkdf2Sync(password, saltHex, 100000, 64, 'sha512');
      const hashHex = hashBuf.toString('hex');
      db.prepare(
        `UPDATE users
         SET password_hash = ?, password_salt = ?, last_login_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(hashHex, saltHex, now, now, id);
    } else {
      const saltHex = row.password_salt;
      const expectedHex = row.password_hash;
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      const actualBuf = crypto.pbkdf2Sync(password, saltHex, 100000, 64, 'sha512');
      if (
        expectedBuf.length !== actualBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, actualBuf)
      ) {
        throw new Error('Invalid password');
      }
      db.prepare(
        `UPDATE users
         SET last_login_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(now, now, id);
    }

    currentUserId = id;
    const user = db
      .prepare(
        `SELECT id, username, email, avatar_path, created_at, updated_at, last_backup_at, last_login_at
         FROM users WHERE id = ?`
      )
      .get(id);
    return user;
  }));

  ipcMain.handle('tentak:auth:logout', wrap(() => {
    currentUserId = null;
    return null;
  }));

  // Secure settings: OpenAI API key management.
  ipcMain.handle('tentak:settings:getOpenAIApiKey', wrap(() => {
    const key = getOpenAIApiKey();
    // Return masked key for display (show last 4 characters)
    if (key) {
      const masked = key.length > 4 
        ? '*'.repeat(key.length - 4) + key.slice(-4)
        : '*'.repeat(key.length);
      return { key: masked, hasKey: true };
    }
    return { key: null, hasKey: false };
  }));

  ipcMain.handle('tentak:settings:setOpenAIApiKey', wrap((payload) => {
    const { key } = payload;
    if (typeof key !== 'string') {
      throw new Error('API key must be a string');
    }
    if (key.trim() === '') {
      clearOpenAIApiKey();
      return null;
    }
    setOpenAIApiKey(key.trim());
    return null;
  }));
}
