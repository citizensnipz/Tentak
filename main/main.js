/**
 * Electron main process: open DB, register IPC, create window. No UI logic.
 */

import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../backend/dist/backend/index.js';
import { registerIpcHandlers } from './ipc-handlers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
let db = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow loading file:// so the built renderer (renderer/dist) loads in Electron
      webSecurity: false,
    },
  });

  const indexPath = join(__dirname, '..', 'renderer', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
  const dbPath = join(app.getPath('userData'), 'tentak.db');
  db = openDb(dbPath);
  registerIpcHandlers(db);
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  app.quit();
});
