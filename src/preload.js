const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createSignal: (signal) => ipcRenderer.invoke('create-signal', signal),
  getSignals: () => ipcRenderer.invoke('get-signals'),
  getSignalById: (id) => ipcRenderer.invoke('get-signal-by-id', id),
  updateSignal: (id, signal) => ipcRenderer.invoke('update-signal', id, signal),
  deleteSignal: (id) => ipcRenderer.invoke('delete-signal', id),
  
  getTags: () => ipcRenderer.invoke('get-tags'),
  
  filterSignalsByTag: (tag) => ipcRenderer.invoke('filter-signals-by-tag', tag),
  searchSignals: (query) => ipcRenderer.invoke('search-signals', query),
  
  getPipelineConfig: () => ipcRenderer.invoke('get-pipeline-config'),
  savePipelineConfig: (config) => ipcRenderer.invoke('save-pipeline-config', config),
  fetchPipelineDataNow: () => ipcRenderer.invoke('fetch-pipeline-data-now'),
  getPipelineItems: () => ipcRenderer.invoke('get-pipeline-items'),
  getPipelineItemsBySource: (source) => ipcRenderer.invoke('get-pipeline-items-by-source', source),
  approvePipelineItem: (itemId, signalData) => ipcRenderer.invoke('approve-pipeline-item', itemId, signalData),
  deletePipelineItem: (itemId) => ipcRenderer.invoke('delete-pipeline-item', itemId)
});

ipcRenderer.on('pipeline-items-updated', () => {
  document.dispatchEvent(new CustomEvent('pipeline-items-updated'));
});
