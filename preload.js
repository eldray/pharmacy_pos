//preload.js 

const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isPackaged: process.env.NODE_ENV === 'production',
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron
    },
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update_available', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update_downloaded', callback);
    },
    removeUpdateListeners: () => {
      ipcRenderer.removeAllListeners('update_available');
      ipcRenderer.removeAllListeners('update_downloaded');
    }
  });
  
  console.log('Preload script initialized successfully');
} catch (error) {
  console.error('Error in preload script:', error);
}