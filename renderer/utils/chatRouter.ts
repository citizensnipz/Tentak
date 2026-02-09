/**
 * Chat routing utility: determines whether a message should be answered locally
 * (fast path) or sent to Clawdbot (slow path).
 * 
 * Simple factual questions are answered locally using the provided context.
 * Interpretive/fuzzy questions are routed to the agent.
 */

import type { Task, Table } from '../../shared/types';

export type ChatRoute =
  | { type: 'local'; response: string }
  | { type: 'agent' };

export interface ChatRouterContext {
  today: Task[];
  backlog: Task[];
  scheduled: Task[];
  waiting: Task[];
  tables: Table[];
}

/**
 * Routes a chat message to either local response or agent.
 * 
 * @param message - The user's message
 * @param context - Current task and table context
 * @returns ChatRoute indicating local response or agent routing
 */
export function routeChatMessage(
  message: string,
  context: ChatRouterContext
): ChatRoute {
  const normalized = message.toLowerCase().trim();

  // Check if this is a simple factual question that can be answered locally
  const localResponse = tryAnswerLocally(normalized, context);
  
  if (localResponse !== null) {
    return { type: 'local', response: localResponse };
  }

  // Otherwise, route to agent
  return { type: 'agent' };
}

/**
 * Attempts to answer a message locally. Returns null if the question
 * requires interpretation or analysis (should go to agent).
 */
function tryAnswerLocally(
  normalizedMessage: string,
  context: ChatRouterContext
): string | null {
  const { today, backlog, scheduled, waiting, tables } = context;

  // ============================================
  // 1. TASK COUNTS
  // ============================================
  // Match: "how many", "number of", "count"
  if (
    normalizedMessage.includes('how many') ||
    normalizedMessage.includes('number of') ||
    normalizedMessage.includes('count')
  ) {
    if (normalizedMessage.includes('task')) {
      if (normalizedMessage.includes('today') || normalizedMessage.includes('scheduled for today')) {
        return `You have ${today.length} task${today.length !== 1 ? 's' : ''} scheduled for today.`;
      }
      if (normalizedMessage.includes('backlog')) {
        return `You have ${backlog.length} task${backlog.length !== 1 ? 's' : ''} in your backlog.`;
      }
      if (normalizedMessage.includes('waiting')) {
        return `You have ${waiting.length} task${waiting.length !== 1 ? 's' : ''} waiting on others.`;
      }
      if (normalizedMessage.includes('scheduled')) {
        return `You have ${scheduled.length} scheduled task${scheduled.length !== 1 ? 's' : ''}.`;
      }
      const total = today.length + backlog.length + scheduled.length + waiting.length;
      return `You have ${total} total task${total !== 1 ? 's' : ''}.`;
    }
    if (normalizedMessage.includes('table')) {
      return `You have ${tables.length} table${tables.length !== 1 ? 's' : ''} on your board.`;
    }
  }

  // ============================================
  // 2. TABLE LISTING (check before task listing to avoid conflicts)
  // ============================================
  if (
    normalizedMessage.includes('what tables') ||
    (normalizedMessage.includes('list') && normalizedMessage.includes('table')) ||
    (normalizedMessage.includes('show') && normalizedMessage.includes('table')) ||
    normalizedMessage.match(/^table.*(on|in)/)
  ) {
    if (tables.length === 0) {
      return 'You have no tables on your board.';
    }
    const tableList = tables
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join('\n');
    return `Tables on your board:\n${tableList}`;
  }

  // ============================================
  // 3. LISTING TASKS
  // ============================================
  // Match: "what tasks", "list tasks", "show tasks", "what do I have"
  if (
    normalizedMessage.includes('what tasks') ||
    normalizedMessage.includes('what do i have') ||
    (normalizedMessage.includes('list') && normalizedMessage.includes('task')) ||
    (normalizedMessage.includes('show') && normalizedMessage.includes('task')) ||
    normalizedMessage.match(/^task.*(in|on|for)/)
  ) {
    // Check if asking about a specific category
    if (normalizedMessage.includes('today') || normalizedMessage.includes('scheduled for today')) {
      return formatTaskList(today, 'Tasks scheduled for today');
    }
    if (normalizedMessage.includes('backlog')) {
      return formatTaskList(backlog, 'Backlog tasks');
    }
    if (normalizedMessage.includes('waiting')) {
      return formatTaskList(waiting, 'Tasks waiting on others');
    }
    if (normalizedMessage.includes('scheduled')) {
      return formatTaskList(scheduled, 'Scheduled tasks');
    }
    
    // General task listing: prioritize Today → Backlog → others
    const allTasks = [...today, ...backlog, ...scheduled, ...waiting];
    if (allTasks.length === 0) {
      return 'You have no tasks.';
    }
    return formatTaskListPrioritized(today, backlog, scheduled, waiting);
  }

  // ============================================
  // 4. FIRST / LAST / NEXT TASK
  // ============================================
  if (
    normalizedMessage.includes('first task') ||
    normalizedMessage.includes('last task') ||
    normalizedMessage.includes('next task')
  ) {
    const allTasks = [...today, ...backlog, ...scheduled, ...waiting];
    const incompleteTasks = allTasks.filter(t => t.status !== 'completed');
    
    if (incompleteTasks.length === 0) {
      return 'You have no incomplete tasks.';
    }

    // Order: Today first (by creation), then Backlog (by creation)
    const sortedTasks = [
      ...today.filter(t => t.status !== 'completed').sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      ...backlog.filter(t => t.status !== 'completed').sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      ...scheduled.filter(t => t.status !== 'completed').sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      ...waiting.filter(t => t.status !== 'completed').sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    ];

    if (normalizedMessage.includes('first task')) {
      const firstTask = sortedTasks[0];
      const tableName = getTaskTableName(firstTask, today, backlog, scheduled, waiting, tables);
      return `Your first task is "${firstTask.title}"${tableName ? ` in ${tableName}` : ''}.`;
    }
    
    if (normalizedMessage.includes('last task')) {
      const lastTask = sortedTasks[sortedTasks.length - 1];
      const tableName = getTaskTableName(lastTask, today, backlog, scheduled, waiting, tables);
      return `Your last task is "${lastTask.title}"${tableName ? ` in ${tableName}` : ''}.`;
    }
    
    if (normalizedMessage.includes('next task')) {
      // "Next" means first incomplete task
      const nextTask = sortedTasks[0];
      const tableName = getTaskTableName(nextTask, today, backlog, scheduled, waiting, tables);
      return `Your next task is "${nextTask.title}"${tableName ? ` in ${tableName}` : ''}.`;
    }
  }

  // ============================================
  // 5. COMPLETION STATUS
  // ============================================
  if (
    normalizedMessage.includes('completed') ||
    normalizedMessage.includes('done') ||
    normalizedMessage.includes('finished')
  ) {
    const allTasks = [...today, ...backlog, ...scheduled, ...waiting];
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const total = allTasks.length;
    return `You have completed ${completed} out of ${total} task${total !== 1 ? 's' : ''}.`;
  }

  // ============================================
  // 6. PENDING STATUS
  // ============================================
  if (
    normalizedMessage.includes('pending') ||
    normalizedMessage.includes('incomplete') ||
    normalizedMessage.includes('not done')
  ) {
    const allTasks = [...today, ...backlog, ...scheduled, ...waiting];
    const pending = allTasks.filter(t => t.status === 'pending' || t.status === 'waiting').length;
    return `You have ${pending} pending task${pending !== 1 ? 's' : ''}.`;
  }

  // If none of the patterns match, route to agent
  return null;
}

/**
 * Formats a task list with a limit of ~5 items and "and X more" if needed.
 */
function formatTaskList(tasks: Task[], label: string): string {
  if (tasks.length === 0) {
    return `You have no ${label.toLowerCase()}.`;
  }
  
  const MAX_ITEMS = 5;
  const displayTasks = tasks.slice(0, MAX_ITEMS);
  const remaining = tasks.length - MAX_ITEMS;
  
  const taskList = displayTasks
    .map((t, i) => `• ${t.title}${t.status === 'completed' ? ' ✓' : ''}`)
    .join('\n');
  
  if (remaining > 0) {
    return `${label}:\n${taskList}\nand ${remaining} more`;
  }
  
  return `${label}:\n${taskList}`;
}

/**
 * Formats a prioritized task list (Today → Backlog → others), limited to ~5 items.
 */
function formatTaskListPrioritized(
  today: Task[],
  backlog: Task[],
  scheduled: Task[],
  waiting: Task[]
): string {
  const MAX_ITEMS = 5;
  const allTasks: Array<{ task: Task; source: string }> = [];
  
  // Prioritize: Today → Backlog → Scheduled → Waiting
  today.forEach(t => allTasks.push({ task: t, source: 'Today' }));
  backlog.forEach(t => allTasks.push({ task: t, source: 'Backlog' }));
  scheduled.forEach(t => allTasks.push({ task: t, source: 'Scheduled' }));
  waiting.forEach(t => allTasks.push({ task: t, source: 'Waiting' }));
  
  if (allTasks.length === 0) {
    return 'You have no tasks.';
  }
  
  const displayTasks = allTasks.slice(0, MAX_ITEMS);
  const remaining = allTasks.length - MAX_ITEMS;
  
  const taskList = displayTasks
    .map(({ task, source }) => `• ${task.title}${task.status === 'completed' ? ' ✓' : ''} (${source})`)
    .join('\n');
  
  if (remaining > 0) {
    return `Your tasks:\n${taskList}\nand ${remaining} more`;
  }
  
  return `Your tasks:\n${taskList}`;
}

/**
 * Determines which table/category a task belongs to.
 */
function getTaskTableName(
  task: Task,
  today: Task[],
  backlog: Task[],
  scheduled: Task[],
  waiting: Task[],
  tables: Table[]
): string {
  // Check by array membership first
  if (today.some(t => t.id === task.id)) {
    return 'Today';
  }
  if (backlog.some(t => t.id === task.id)) {
    return 'Backlog';
  }
  if (scheduled.some(t => t.id === task.id)) {
    return 'Scheduled';
  }
  if (waiting.some(t => t.id === task.id)) {
    return 'Waiting';
  }
  
  // Check by table_id
  if (task.table_id) {
    const table = tables.find(t => t.id === task.table_id);
    if (table) {
      return table.title;
    }
  }
  
  return '';
}
