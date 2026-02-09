export const DEFAULT_TASK_COLOR = '#e0e0e0';
export const CARD_WIDTH = 220;
export const CARD_HEIGHT = 110;
export const CARD_GAP = 40;
export const TABLE_HEADER_HEIGHT = 36;
export const TABLE_CARD_INSET = 16;
export const CARD_HEADER_HEIGHT = 36;
export const DEFAULT_TABLE_COLOR = '#c4c4c4';
export const BOARD_BG_COLOR_STORAGE_KEY = 'tentak.boardBackgroundColor';
export const DEFAULT_BOARD_BACKGROUND_COLOR = '#f4f4f5';
export const DATE_REMIND_KEY = 'tentak.dontRemindDateChange';
export const NEW_TABLE_CENTER_X = 1200;
export const NEW_TABLE_CENTER_Y = 400;
export const DEFAULT_TABLE_WIDTH = 600;
export const DEFAULT_TABLE_HEIGHT = 400;

export const TABLE_ID_TO_KIND = { backlog: 'backlog', today: 'scheduled' };
export const KIND_TO_TABLE_ID = { backlog: 'backlog', scheduled: 'today', waiting: 'backlog', external_dependency: 'backlog', someday: 'backlog' };

export const DEFAULT_TABLES = [
  {
    id: 'backlog',
    title: 'Backlog',
    x: 150,
    y: 150,
    width: 600,
    height: 400,
    color: null,
    is_permanent: 1,
  },
  {
    id: 'today',
    title: 'Today',
    x: 850,
    y: 150,
    width: 600,
    height: 400,
    color: null,
    is_permanent: 1,
  },
];

export function getTextColorForBackground(hex) {
  if (!hex || typeof hex !== 'string') return '#333';
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#333';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5 ? '#111' : '#fff';
}

export function computeInitialPositionInTable(indexInTable, table) {
  // Use the same column-based layout algorithm for consistency
  // Calculate available vertical space in table content area
  const tableContentHeight = table.height - TABLE_HEADER_HEIGHT - (2 * TABLE_CARD_INSET);
  
  // Calculate how many cards fit in one column
  const maxCardsPerColumn = Math.max(1, Math.floor(tableContentHeight / (CARD_HEIGHT + CARD_GAP)));
  
  // Calculate column and row indices
  const columnIndex = Math.floor(indexInTable / maxCardsPerColumn);
  const rowIndex = indexInTable % maxCardsPerColumn;
  
  // Calculate position
  const x = table.x + TABLE_CARD_INSET + columnIndex * (CARD_WIDTH + CARD_GAP);
  const y = table.y + TABLE_HEADER_HEIGHT + TABLE_CARD_INSET + rowIndex * (CARD_HEIGHT + CARD_GAP);
  
  return { x, y };
}

/**
 * Computes the snapped position for a card within a table based on its layout index.
 * Cards stack vertically (Y axis) first, then flow to new columns (X axis) when vertical space is exhausted.
 * 
 * @param {number} layoutIndex - The layout index within the table (0-based, determines order)
 * @param {object} table - The table object with height property
 * @returns {{x: number, y: number}} The snapped position
 */
export function computeSnappedPositionInTable(layoutIndex, table) {
  // Calculate available vertical space in table content area
  const tableContentHeight = table.height - TABLE_HEADER_HEIGHT - (2 * TABLE_CARD_INSET);
  
  // Calculate how many cards fit in one column
  const maxCardsPerColumn = Math.max(1, Math.floor(tableContentHeight / (CARD_HEIGHT + CARD_GAP)));
  
  // Calculate column and row indices
  const columnIndex = Math.floor(layoutIndex / maxCardsPerColumn);
  const rowIndex = layoutIndex % maxCardsPerColumn;
  
  // Calculate position
  const x = table.x + TABLE_CARD_INSET + columnIndex * (CARD_WIDTH + CARD_GAP);
  const y = table.y + TABLE_HEADER_HEIGHT + TABLE_CARD_INSET + rowIndex * (CARD_HEIGHT + CARD_GAP);
  
  return { x, y };
}

/**
 * Determines the layout index for a card dropped at a given position within a table.
 * Prioritizes Y-axis stacking first, then X-axis columns when Y space is exhausted.
 * 
 * @param {number} dropX - The X coordinate where the card was dropped
 * @param {number} dropY - The Y coordinate where the card was dropped
 * @param {object} table - The table object with height property
 * @param {Array<object>} existingTasksInTable - Tasks already in the table (with table_order)
 * @returns {number} The layout index for the new position
 */
export function computeLayoutIndexForDrop(dropX, dropY, table, existingTasksInTable) {
  // Calculate available vertical space dynamically
  const tableContentHeight = table.height - TABLE_HEADER_HEIGHT - (2 * TABLE_CARD_INSET);
  const maxCardsPerColumn = Math.max(1, Math.floor(tableContentHeight / (CARD_HEIGHT + CARD_GAP)));
  
  // Calculate table content area bounds
  const tableContentTop = table.y + TABLE_HEADER_HEIGHT;
  const tableContentLeft = table.x + TABLE_CARD_INSET;
  
  // Calculate relative positions within table content area
  const relativeX = dropX - tableContentLeft;
  const relativeY = dropY - tableContentTop;
  
  // Sort existing tasks by their layout index to understand current layout
  const sortedTasks = [...existingTasksInTable]
    .filter(t => t.table_order !== null && t.table_order !== undefined)
    .sort((a, b) => (a.table_order ?? 0) - (b.table_order ?? 0));
  
  // If no existing tasks, calculate index from drop position
  if (sortedTasks.length === 0) {
    // Determine row from Y position (prioritize Y)
    const rowIndex = Math.max(0, Math.floor(relativeY / (CARD_HEIGHT + CARD_GAP)));
    const clampedRowIndex = Math.min(rowIndex, maxCardsPerColumn - 1);
    
    // Determine column from X position
    const columnIndex = Math.max(0, Math.floor(relativeX / (CARD_WIDTH + CARD_GAP)));
    
    // Calculate layout index: Y first, then X
    return columnIndex * maxCardsPerColumn + clampedRowIndex;
  }
  
  // Find the maximum layout index
  const maxOrder = Math.max(...sortedTasks.map(t => t.table_order ?? 0));
  
  // Determine target row and column from drop position
  const targetRowIndex = Math.max(0, Math.floor(relativeY / (CARD_HEIGHT + CARD_GAP)));
  const clampedTargetRowIndex = Math.min(targetRowIndex, maxCardsPerColumn - 1);
  const targetColumnIndex = Math.max(0, Math.floor(relativeX / (CARD_WIDTH + CARD_GAP)));
  
  // Calculate target layout index
  const targetLayoutIndex = targetColumnIndex * maxCardsPerColumn + clampedTargetRowIndex;
  
  // If dropping beyond all existing cards, append to end
  if (targetLayoutIndex > maxOrder) {
    return maxOrder + 1;
  }
  
  // Check if target position is occupied
  const occupiedIndices = new Set(sortedTasks.map(t => t.table_order ?? 0));
  
  if (!occupiedIndices.has(targetLayoutIndex)) {
    // Position is free, use it
    return Math.max(0, targetLayoutIndex);
  }
  
  // Position is occupied - find insertion point
  // For simplicity, insert at target position (caller will shift others)
  return Math.max(0, targetLayoutIndex);
}

/**
 * Checks if a point (card center) intersects with a table's bounds.
 * 
 * @param {number} cardX - Card X position
 * @param {number} cardY - Card Y position
 * @param {object} table - The table object
 * @returns {boolean} True if the card intersects the table
 */
export function cardIntersectsTable(cardX, cardY, table) {
  const cardCenterX = cardX + CARD_WIDTH / 2;
  const cardCenterY = cardY + CARD_HEIGHT / 2;
  return pointInTable(cardCenterX, cardCenterY, table);
}

export function computeScale(element) {
  if (!element) return 1;
  const rect = element.getBoundingClientRect();
  const base = element.offsetWidth || CARD_WIDTH;
  if (!base) return 1;
  return rect.width / base;
}

export function formatTableDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return '';
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function daysFromToday(dateStr) {
  if (!dateStr || dateStr.length < 10) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (24 * 60 * 60 * 1000));
}

export function getTableDisplayTitle(table, todayStr) {
  if (table.id === 'today') return 'Today';
  
  const effectiveDate = table.table_date || null;
  if (!effectiveDate) return table.title;
  
  const n = daysFromToday(effectiveDate);
  
  if (n === 1) return 'Tomorrow';
  
  const dayLabel = Math.abs(n) === 1 ? 'day' : 'days';
  const formattedDate = formatTableDate(effectiveDate);
  
  const displayTitle = table.title.trim() || formattedDate;
  return `${displayTitle} (in ${n} ${dayLabel})`;
}

export function pointInTable(px, py, table) {
  return px >= table.x && px <= table.x + table.width && py >= table.y && py <= table.y + table.height;
}

export function getTaskTableId(task) {
  return task.table_id || (KIND_TO_TABLE_ID[task.kind] || 'backlog');
}
