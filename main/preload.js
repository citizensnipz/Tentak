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
