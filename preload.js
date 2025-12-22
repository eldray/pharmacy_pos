
    const { contextBridge, ipcRenderer } = require('electron');

    contextBridge.exposeInMainWorld('electronAPI', {
      platform: process.platform,
      isPackaged: require('electron').app.isPackaged,
      onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
      onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback)
    });
  
    const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isPackaged: require('electron').app.isPackaged
});