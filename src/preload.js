const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createSignal: (signal) => ipcRenderer.invoke('create-signal', signal),
  getSignals: () => ipcRenderer.invoke('get-signals'),
  getSignalById: (id) => ipcRenderer.invoke('get-signal-by-id', id),
  updateSignal: (id, signal) => ipcRenderer.invoke('update-signal', id, signal),
  deleteSignal: (id) => ipcRenderer.invoke('delete-signal', id),
  
  getTags: () => ipcRenderer.invoke('get-tags'),
  
  filterSignalsByTag: (tag) => ipcRenderer.invoke('filter-signals-by-tag', tag),
  searchSignals: (query) => ipcRenderer.invoke('search-signals', query)
});
