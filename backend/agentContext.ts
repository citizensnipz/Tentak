/**
 * Agent context builder: assemble a read-only JSON snapshot for Clawdbot.
 * SECURITY: Uses existing query functions only; no raw SQL, no DB handles exposed.
 */

import type { Db } from './db.js';
import {
  getScheduleToday,
  getTasksBacklog,
  getTasksScheduled,
  getTasksWaiting,
  getAllTables,
  getAllTasks,
  getTasksByScheduledDate,
} from './queries.js';

export interface AgentContext {
  today: {
    /** ISO date (YYYY-MM-DD) used for "today". */
    date: string;
    /** Tasks scheduled explicitly for today. */
    tasks: ReturnType<typeof getTasksByScheduledDate>;
    /** Events overlapping today. */
    schedule: ReturnType<typeof getScheduleToday>;
  };
  /** Backlog tasks (kind = 'backlog'). */
  backlog: ReturnType<typeof getTasksBacklog>;
  /** Scheduled tasks (kind = 'scheduled'). */
  scheduled: ReturnType<typeof getTasksScheduled>;
  /** Tasks waiting on others (status = 'waiting'). */
  waiting: ReturnType<typeof getTasksWaiting>;
  /** All tables on the board. */
  tables: ReturnType<typeof getAllTables>;
  /**
   * Upcoming tasks with a scheduled_date strictly after today.
   * This is derived from getAllTasks() in-memory (no extra SQL).
   */
  upcoming: {
    tasks: ReturnType<typeof getAllTasks>;
  };
}

export function buildAgentContext(db: Db, userId: number): AgentContext {
  const todayDate = new Date().toISOString().slice(0, 10);

  const scheduleToday = getScheduleToday(db, todayDate);
  const todayTasks = getTasksByScheduledDate(db, todayDate, userId);

  const backlog = getTasksBacklog(db, userId);
  const scheduled = getTasksScheduled(db, userId);
  const waiting = getTasksWaiting(db, userId);
  const tables = getAllTables(db, userId);
  const allTasks = getAllTasks(db, userId);

  const upcomingTasks = allTasks.filter((task) => {
    const d = (task.scheduled_date ?? '') as string;
    return d && d > todayDate;
  });

  return {
    today: {
      date: todayDate,
      tasks: todayTasks,
      schedule: scheduleToday,
    },
    backlog,
    scheduled,
    waiting,
    tables,
    upcoming: {
      tasks: upcomingTasks,
    },
  };
}

