/**
 * Electron main process: open DB, register IPC, create window. No UI logic.
 */

import { app, BrowserWindow, nativeImage, Menu, screen } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../backend/dist/backend/index.js';
import { registerIpcHandlers, restoreSessionFromStorage } from './ipc-handlers.js';
import { readJson, writeJson, FILES } from './storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 800;
let mainWindow = null;
let db = null;
let userDataPath = null;
let boundsSaveTimeout = null;

function clampBounds(bounds) {
  const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, x, y } = bounds || {};
  const w = Math.max(DEFAULT_WIDTH, typeof width === 'number' ? width : DEFAULT_WIDTH);
  const h = Math.max(DEFAULT_HEIGHT, typeof height === 'number' ? height : DEFAULT_HEIGHT);
  const display = screen.getDisplayNearestPoint({ x: Number(x) || 0, y: Number(y) || 0 });
  const workArea = display?.workArea ?? display?.bounds ?? { x: 0, y: 0, width: 1920, height: 1080 };
  const wx = workArea.x ?? 0;
  const wy = workArea.y ?? 0;
  const ww = workArea.width ?? 1920;
  const wh = workArea.height ?? 1080;
  const nx = Math.max(wx, Math.min(Number(x) ?? wx, wx + ww - 100));
  const ny = Math.max(wy, Math.min(Number(y) ?? wy, wy + wh - 100));
  return { x: nx, y: ny, width: w, height: h };
}

function saveBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || !userDataPath) return;
  const b = mainWindow.getBounds();
  writeJson(userDataPath, FILES.WINDOW_BOUNDS, { x: b.x, y: b.y, width: b.width, height: b.height });
}

function scheduleSaveBounds() {
  if (boundsSaveTimeout) clearTimeout(boundsSaveTimeout);
  boundsSaveTimeout = setTimeout(saveBounds, 300);
}

function createWindow() {
  const iconPath = join(ASSETS_DIR, 'icon.png');
  const iconAlt = join(ASSETS_DIR, 'icon.png.png');
  const icon = nativeImage.createFromPath(iconPath);
  const iconToUse = icon.isEmpty() ? nativeImage.createFromPath(iconAlt) : icon;
  const saved = readJson(userDataPath, FILES.WINDOW_BOUNDS);
  const bounds = clampBounds(saved);

  mainWindow = new BrowserWindow({
    ...bounds,
    icon: iconToUse.isEmpty() ? undefined : iconToUse,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.on('resize', scheduleSaveBounds);
  mainWindow.on('move', scheduleSaveBounds);

  const indexPath = join(__dirname, '..', 'renderer', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
  userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'tentak.db');
  db = openDb(dbPath);
  restoreSessionFromStorage(db, userDataPath);
  registerIpcHandlers(db, userDataPath);
  createWindow();
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }
});

app.on('window-all-closed', () => {
  if (db) db.close();
  app.quit();
});
