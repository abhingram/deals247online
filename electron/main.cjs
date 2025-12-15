const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;
let tray;
let willQuitApp = false;

// Helper function to get app icon with fallback
function getAppIcon() {
  const fs = require('fs');
  const pngIcon = path.join(__dirname, '../public/pwa-icon.png');
  const svgIcon = path.join(__dirname, '../public/pwa-icon.svg');

  if (fs.existsSync(pngIcon)) {
    return pngIcon;
  } else if (fs.existsSync(svgIcon)) {
    return svgIcon;
  }
  return undefined; // No icon available
}

// Create the main application window
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: getAppIcon(),
    show: false, // Don't show until ready
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff'
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Focus the window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent new window creation on external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle close button - minimize to tray instead of quit
  mainWindow.on('close', (event) => {
    if (!willQuitApp) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    }
  });
}

// Create system tray
function createTray() {
  try {
    // Try to use PNG icon first, fallback to SVG, then no icon
    let trayIcon = path.join(__dirname, '../public/pwa-icon.png');
    const fs = require('fs');

    if (fs.existsSync(trayIcon)) {
      tray = new Tray(trayIcon);
    } else {
      trayIcon = path.join(__dirname, '../public/pwa-icon.svg');
      if (fs.existsSync(trayIcon)) {
        // SVG might not work on all platforms, try anyway
        try {
          tray = new Tray(trayIcon);
        } catch (svgError) {
          console.warn('SVG tray icon not supported, skipping tray creation');
          return; // Skip tray creation entirely
        }
      } else {
        // No icon available, try creating tray without icon
        try {
          tray = new Tray('');
        } catch (noIconError) {
          console.warn('Tray creation failed, skipping tray functionality');
          return; // Skip tray creation entirely
        }
      }
    }

    tray.setToolTip('Deals247 - Smart Deal Finder');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          mainWindow.show();
          if (process.platform === 'darwin') {
            app.dock.show();
          }
        }
      },
      {
        label: 'New Deal Alert',
        click: () => {
          showNotification('New Deal Available!', 'Check out the latest deals in your area.');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          willQuitApp = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    // Show app on tray click
    tray.on('click', () => {
      mainWindow.show();
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    });
  } catch (error) {
    console.warn('Tray creation failed completely, continuing without tray:', error.message);
    // Continue without tray functionality
  }
}

// Show desktop notification
function showNotification(title, body, data = {}) {
  const notification = new Notification({
    title,
    body,
    icon: getAppIcon(),
    silent: false
  });

  notification.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
    // Could navigate to specific deal or section
    if (data.dealId) {
      mainWindow.webContents.send('navigate-to-deal', data.dealId);
    }
  });

  notification.show();
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            willQuitApp = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Deals',
      submenu: [
        {
          label: 'Today\'s Deals',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow.webContents.send('navigate-to-section', 'today')
        },
        {
          label: 'Favorite Stores',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('navigate-to-section', 'favorites')
        },
        {
          label: 'Search Deals',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('focus-search')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  // macOS specific menu
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[5].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for communication with renderer
function setupIpcHandlers() {
  // Handle deal notifications from web app
  ipcMain.on('show-deal-notification', (event, dealData) => {
    showNotification(
      `Deal Alert: ${dealData.title}`,
      `Save ${dealData.discount} at ${dealData.store}`,
      { dealId: dealData.id }
    );
  });

  // Handle price drop notifications
  ipcMain.on('show-price-drop-notification', (event, dealData) => {
    showNotification(
      'Price Drop Alert!',
      `${dealData.title} is now ${dealData.discount} off!`,
      { dealId: dealData.id }
    );
  });

  // Handle app minimization request
  ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
  });

  // Handle app quit request
  ipcMain.on('quit-app', () => {
    willQuitApp = true;
    app.quit();
  });

  // Get app info
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      isDev,
      userDataPath: app.getPath('userData')
    };
  });

  // Open external links
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  // Show save dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    return await dialog.showSaveDialog(mainWindow, options);
  });

  // Show open dialog
  ipcMain.handle('show-open-dialog', async (event, options) => {
    return await dialog.showOpenDialog(mainWindow, options);
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();
  setupIpcHandlers();

  // macOS specific - re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app before quit
app.on('before-quit', () => {
  willQuitApp = true;
});

// Security: Prevent navigation to external websites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Could send to error reporting service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Could send to error reporting service
});