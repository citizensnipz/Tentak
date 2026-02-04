/**
 * Backend core: DB, queries, CRUD. No IPC, UI, Clawdbot, or LLM.
 */

export { openDb, type Db } from './db.js';
export {
  getScheduleToday,
  getTasksBacklog,
  getTasksScheduled,
  getTasksWaiting,
} from './queries.js';
export {
  createTask,
  updateTask,
  deleteTask,
  createEvent,
  updateEvent,
  deleteEvent,
  createReminder,
  updateReminder,
  deleteReminder,
  type TaskInsert,
  type TaskUpdate,
  type EventInsert,
  type EventUpdate,
  type ReminderInsert,
  type ReminderUpdate,
} from './crud.js';
