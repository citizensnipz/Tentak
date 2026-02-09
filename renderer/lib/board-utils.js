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
  const col = indexInTable % 2;
  const row = Math.floor(indexInTable / 2);
  return {
    x: table.x + TABLE_CARD_INSET + col * (CARD_WIDTH + CARD_GAP),
    y: table.y + TABLE_HEADER_HEIGHT + TABLE_CARD_INSET + row * (CARD_HEIGHT + CARD_GAP),
  };
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
