/**
 * Electron main process: open DB, register IPC, create window. No UI logic.
 */

import { app, BrowserWindow, nativeImage, Menu } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../backend/dist/backend/index.js';
import { registerIpcHandlers } from './ipc-handlers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');
let mainWindow = null;
let db = null;

function createWindow() {
  const iconPath = join(ASSETS_DIR, 'icon.png');
  const iconAlt = join(ASSETS_DIR, 'icon.png.png');
  const icon = nativeImage.createFromPath(iconPath);
  const iconToUse = icon.isEmpty() ? nativeImage.createFromPath(iconAlt) : icon;
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: iconToUse.isEmpty() ? undefined : iconToUse,
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
  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'tentak.db');
  db = openDb(dbPath);
  registerIpcHandlers(db, userDataPath);
  createWindow();
  // Remove native menu bar on Windows/Linux; keep default on macOS
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }
});

app.on('window-all-closed', () => {
  if (db) db.close();
  app.quit();
});
