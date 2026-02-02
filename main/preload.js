/**
 * Preload: expose minimal window.tentak API via contextBridge. No agent APIs.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tentak', {
  query(payload) {
    return ipcRenderer.invoke('tentak:query', payload);
  },
  mutate(payload) {
    return ipcRenderer.invoke('tentak:mutate', payload);
  },
});
