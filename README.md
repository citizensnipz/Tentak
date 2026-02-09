# Tentak

A desktop task and board manager with an integrated chat assistant. Organize work on a zoomable board, schedule by day, and ask questions about your tasks—with optional AI (Clawdbot) for richer answers.

![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![SQLite](https://img.shields.io/badge/SQLite-3-003b57?logo=sqlite)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)

---

## What it is

**Tentak** is an Electron app that combines:

- **Board view** — A 2D canvas with tables (e.g. Backlog, Today, and custom tables). Tasks live as cards you can drag between tables, with pan and zoom.
- **Day view** — A date-picked list of tasks scheduled for that day, with quick complete/delete.
- **Chat** — A read-only assistant (Clawdbot) that answers from your task data. Simple factual questions (counts, “what’s on today”) are answered locally; interpretive questions can be sent to an optional OpenAI-backed agent.
- **Settings** — Board background color and optional OpenAI API key for Clawdbot.

Data is stored locally in SQLite; no account or cloud required.

---

## Features

| Area | Capabilities |
|------|--------------|
| **Tasks** | Title, description, status (pending/waiting/completed/cancelled), kind (scheduled/backlog/external_dependency/someday), priority, scheduled date, table assignment |
| **Board** | Default “Backlog” and “Today” tables; create custom tables; drag tasks between tables; lock tables; resize/reposition tables; customizable board background |
| **Day view** | Pick a date; list tasks for that day; add task (pre-filled date), complete, delete |
| **Chat** | Persisted conversation; local answers for counts and simple queries; optional OpenAI integration for Clawdbot |
| **Data** | SQLite DB in app user data; schema supports tasks, events, reminders, notes, tables, chat messages |

---

## Tech stack

- **Desktop:** [Electron](https://www.electronjs.org/)
- **UI:** [React](https://react.dev/) + [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/)
- **Backend:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Node/Electron main process), TypeScript
- **Board:** [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) for pan/zoom

---

## Prerequisites

- **Node.js** (v18 or later recommended)
- **npm** (or compatible package manager)

---

## How to run

1. **Clone and install**

   ```bash
   git clone https://github.com/your-username/tentak.git
   cd tentak
   npm install
   ```

2. **Build**

   Builds the backend (TypeScript) and the renderer (Vite):

   ```bash
   npm run build
   ```

3. **Start the app**

   ```bash
   npm start
   ```

The first run creates a SQLite database in your Electron user data directory (e.g. `%APPDATA%/tentak` on Windows).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build backend + renderer (required before `start`) |
| `npm start` | Run the Electron app |
| `npm run build:backend` | Compile backend TypeScript only |
| `npm run build:renderer` | Build renderer with Vite only |
| `npm run dev:renderer` | Run Vite dev server for renderer (hot reload; app still loads built renderer by default) |
| `npm run typecheck` | Type-check backend |
| `npm run rebuild` | Rebuild native modules (e.g. after Node/Electron upgrade) |

---

## Project structure

```
tentak/
├── main/              # Electron main process (window, IPC wiring)
├── backend/           # TypeScript: DB, CRUD, queries, agent context, chat persistence
├── renderer/          # React app (Vite root)
│   ├── views/         # BoardView, DayView, ChatView, SettingsView
│   ├── components/    # UI, modals, board (WorldStage, Table, TaskCard, etc.)
│   ├── hooks/         # useTaskActions, useTableActions, useBoardEffects
│   └── lib/           # board-utils, theme/utils
├── shared/            # Shared types (Task, Table, Event, etc.)
├── agent/             # Clawdbot runner (read-only, optional OpenAI)
└── assets/            # App icon, etc.
```

---

## Chat and Clawdbot

- **Chat** is persisted per thread (default `chat_id`) in SQLite.
- **Routing:** Simple questions (e.g. “How many tasks today?”) are answered locally from current task/table context. Everything else is sent to **Clawdbot**.
- **Clawdbot** is read-only: it never creates, updates, or deletes data. With no API key it uses a placeholder response. With an **OpenAI API key** in Settings, it uses the OpenAI API for real replies.

---

## License

See [LICENSE](LICENSE) in the repo (add a license file if you publish).
