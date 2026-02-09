/**
 * IPC handlers: tentak:query and tentak:mutate. Call backend only; no agent/LLM.
 */

import { ipcMain } from 'electron';
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

export function registerIpcHandlers(db) {
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
      switch (type) {
        case 'scheduleToday': {
          const date = params.date ?? new Date().toISOString().slice(0, 10);
          return getScheduleToday(db, date);
        }
        case 'tasksBacklog':
          return getTasksBacklog(db);
        case 'tasksScheduled':
          return getTasksScheduled(db);
        case 'tasksWaiting':
          return getTasksWaiting(db);
        case 'allTables':
          return getAllTables(db);
        case 'allTasks':
          return getAllTasks(db);
        case 'tasksByScheduledDate': {
          const date = params.date ?? new Date().toISOString().slice(0, 10);
          return getTasksByScheduledDate(db, date);
        }
        default:
          throw new Error(`Unknown query type: ${type}`);
      }
    })
  );

  ipcMain.handle(
    'tentak:mutate',
    wrap((payload) => {
      if (!payload || typeof payload.operation !== 'string') {
        throw new Error('Mutate payload must have operation');
      }
      const { operation, payload: opPayload = {} } = payload;
      if (!MUTATE_OPERATIONS.includes(operation)) {
        throw new Error(`Unknown mutate operation: ${operation}`);
      }
      switch (operation) {
        case 'taskCreate':
          return createTask(db, opPayload);
        case 'taskUpdate': {
          const { id, ...data } = opPayload;
          if (id == null) throw new Error('taskUpdate requires id');
          return updateTask(db, Number(id), data);
        }
        case 'taskDelete': {
          const id = opPayload.id;
          if (id == null) throw new Error('taskDelete requires id');
          deleteTask(db, Number(id));
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
          return createTable(db, opPayload);
        case 'tableUpdate': {
          const { id, ...data } = opPayload;
          if (id == null) throw new Error('tableUpdate requires id');
          return updateTable(db, String(id), data);
        }
        case 'tableDelete': {
          const { id, moveTasksToBacklog, deleteTasks } = opPayload;
          if (id == null) throw new Error('tableDelete requires id');
          deleteTable(db, String(id), { moveTasksToBacklog, deleteTasks });
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

      // Build a sanitized, JSON-only snapshot of the current state for the agent.
      const context = buildAgentContext(db);

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

  // Chat: persisted messages, load and append (trimming handled in backend).
  ipcMain.handle('tentak:chat:loadMessages', wrap((payload) => {
    const chatId = payload?.chatId ?? 'default';
    return loadChatMessages(db, String(chatId));
  }));

  ipcMain.handle('tentak:chat:appendMessage', wrap((payload) => {
    const chatId = payload?.chatId ?? 'default';
    const message = payload?.message;
    if (!message || typeof message.role !== 'string' || typeof message.content !== 'string') {
      throw new Error('appendMessage requires message with role and content');
    }
    return appendChatMessage(db, String(chatId), {
      role: message.role,
      content: message.content,
      timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
      usedLLM: Boolean(message.usedLLM),
    });
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
