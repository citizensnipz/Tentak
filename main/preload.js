/**
 * Preload: expose minimal window.tentak API via contextBridge.
 * SECURITY: Only well-defined IPC channels are exposed; no direct access to ipcRenderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tentak', {
  query(payload) {
    return ipcRenderer.invoke('tentak:query', payload);
  },
  mutate(payload) {
    return ipcRenderer.invoke('tentak:mutate', payload);
  },
  /**
   * Read-only agent / Clawdbot entrypoint from the renderer.
   * Takes a message string and returns { ok: boolean, reply?: string, error?: string }.
   */
  agentAsk(message) {
    return ipcRenderer.invoke('tentak:agent:ask', { message });
  },
  /**
   * Returns a file:// URL for an asset (e.g. 'logo.png', 'icon.png') for use in img src.
   */
  getAssetPath(name) {
    return ipcRenderer.invoke('tentak:getAssetPath', { name });
  },

  /**
   * Chat: load and append messages (persistence and trimming in backend).
   */
  loadChatMessages(chatId = 'default') {
    return ipcRenderer.invoke('tentak:chat:loadMessages', { chatId });
  },
  appendChatMessage(chatId, message) {
    return ipcRenderer.invoke('tentak:chat:appendMessage', { chatId, message });
  },

  /**
   * Profile: get current user, update profile (username, email, avatar_path).
   */
  profile: {
    get() {
      return ipcRenderer.invoke('tentak:profile:get');
    },
    update(payload) {
      return ipcRenderer.invoke('tentak:profile:update', payload);
    },
    chooseAvatar() {
      return ipcRenderer.invoke('tentak:profile:chooseAvatar');
    },
    getAvatarUrl(path) {
      return ipcRenderer.invoke('tentak:profile:getAvatarUrl', { path });
    },
  },

  /**
   * Manual backup: run snapshot backup and return updated user (with last_backup_at).
   */
  backupNow() {
    return ipcRenderer.invoke('tentak:backup:now');
  },

  /**
   * Settings: OpenAI API key management.
   * SECURITY: Key is stored securely in main process, never exposed to renderer.
   */
  settings: {
    getOpenAIApiKey() {
      return ipcRenderer.invoke('tentak:settings:getOpenAIApiKey');
    },
    setOpenAIApiKey(key) {
      return ipcRenderer.invoke('tentak:settings:setOpenAIApiKey', { key });
    },
  },
});
