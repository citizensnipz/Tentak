-- Tentak schema (SQLite)
-- Source of truth for tasks, events, reminders.
-- Enums enforced via CHECK constraints.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT,
  avatar_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_backup_at TEXT,
  password_hash TEXT,
  password_salt TEXT,
  last_login_at TEXT
);

-- Task: something the user wants done. May or may not have dates.
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'waiting', 'completed', 'cancelled')),
  kind TEXT NOT NULL CHECK (kind IN ('scheduled', 'backlog', 'external_dependency', 'someday')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  related_event_id INTEGER,
  external_owner TEXT,
  color TEXT,
  table_id TEXT,
  scheduled_date TEXT,
  table_order INTEGER,
  category_id INTEGER
);

-- Categories: macro-level grouping, one per task. User-scoped.
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, name)
);

-- Tags: micro-level grouping, many per task. User-scoped.
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, name)
);

-- Junction: task_id <-> tag_id (many-to-many).
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, tag_id)
);

-- Event: something that happens at a specific time.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('meeting', 'personal', 'reminder', 'block')),
  created_at TEXT NOT NULL,
  related_task_id INTEGER
);

-- Reminder: notification relative to an event or task.
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'event')),
  target_id INTEGER NOT NULL,
  offset_minutes INTEGER NOT NULL,
  delivered_at TEXT
);

-- Note (v2): free-form text attached to tasks, events, or days. Optional for v1.
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  attached_type TEXT NOT NULL,
  attached_id INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Table: grouping area on the board for organizing tasks.
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  color TEXT,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  is_permanent INTEGER NOT NULL DEFAULT 0,
  table_date TEXT,
  locked INTEGER NOT NULL DEFAULT 0
);

-- Chat messages: persisted per chatId, capped per thread.
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  chat_id TEXT NOT NULL DEFAULT 'default',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  used_llm INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id_timestamp ON chat_messages (chat_id, timestamp);
