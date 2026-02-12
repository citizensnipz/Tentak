/**
 * Simple JSON file storage inside app userData. Used for window bounds,
 * session, and remembered profiles. No sensitive data except session token.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function ensureDir(dirPath) {
  try {
    mkdirSync(dirPath, { recursive: true });
  } catch {
    // ignore
  }
}

/**
 * Read JSON file from userData. Returns null if missing or invalid.
 */
export function readJson(userDataPath, filename) {
  const filePath = join(userDataPath, filename);
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write JSON file to userData. Overwrites existing.
 */
export function writeJson(userDataPath, filename, data) {
  ensureDir(userDataPath);
  const filePath = join(userDataPath, filename);
  writeFileSync(filePath, JSON.stringify(data, null, 0), 'utf-8');
}

export const FILES = {
  WINDOW_BOUNDS: 'window-bounds.json',
  SESSION: 'session.json',
  REMEMBERED_PROFILES: 'remembered_profiles.json',
};
