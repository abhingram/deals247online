const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Notifications
  showDealNotification: (dealData) => ipcRenderer.send('show-deal-notification', dealData),
  showPriceDropNotification: (dealData) => ipcRenderer.send('show-price-drop-notification', dealData),

  // Window controls
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  quitApp: () => ipcRenderer.send('quit-app'),

  // External links
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Navigation events (from main process)
  onNavigateToDeal: (callback) => ipcRenderer.on('navigate-to-deal', callback),
  onNavigateToSection: (callback) => ipcRenderer.on('navigate-to-section', callback),
  onFocusSearch: (callback) => ipcRenderer.on('focus-search', callback),

  // Remove all listeners when component unmounts
  removeAllListeners: (event) => ipcRenderer.removeAllListeners(event),

  // Platform detection
  platform: process.platform,

  // Development mode
  isDev: process.env.NODE_ENV === 'development'
});

// Also expose a simple API for backward compatibility
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});