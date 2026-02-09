/**
 * Secure settings storage: stores sensitive data like API keys in userData.
 * SECURITY: Settings file is stored in Electron's userData directory, never exposed to renderer.
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(app.getPath('userData'), 'secure-settings.json');

type SecureSettings = {
  openaiApiKey?: string;
};

function readSettings(): SecureSettings {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    // If file is corrupted, return empty settings
    return {};
  }
}

function writeSettings(settings: SecureSettings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Gets the stored OpenAI API key, or null if not set.
 * SECURITY: This should only be called from the main process.
 */
export function getOpenAIApiKey(): string | null {
  const settings = readSettings();
  return settings.openaiApiKey ?? null;
}

/**
 * Sets the OpenAI API key.
 * SECURITY: This should only be called from the main process.
 */
export function setOpenAIApiKey(key: string): void {
  writeSettings({ openaiApiKey: key });
}

/**
 * Clears the OpenAI API key.
 * SECURITY: This should only be called from the main process.
 */
export function clearOpenAIApiKey(): void {
  writeSettings({});
}
