/**
 * IPC handlers: tentak:query and tentak:mutate. Call backend only; no agent/LLM.
 */

import { ipcMain } from 'electron';
import {
  getScheduleToday,
  getTasksBacklog,
  getTasksScheduled,
  getTasksWaiting,
  createTask,
  updateTask,
  deleteTask,
  createEvent,
  updateEvent,
  deleteEvent,
  createReminder,
  updateReminder,
  deleteReminder,
} from '../backend/dist/backend/index.js';

const QUERY_TYPES = ['scheduleToday', 'tasksBacklog', 'tasksScheduled', 'tasksWaiting'];
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
        default:
          throw new Error(`Unknown mutate operation: ${operation}`);
      }
    })
  );
}
