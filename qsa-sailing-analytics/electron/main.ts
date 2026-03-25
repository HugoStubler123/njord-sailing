/**
 * Electron Main Process
 * Handles window management, menu, and file system operations
 */

import { app, BrowserWindow, dialog, Menu, shell, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

// Handle running in development vs production
const isDev = process.env.NODE_ENV === 'development';

// Single window instance
let mainWindow: BrowserWindow | null = null;

// Recent files list
let recentFiles: string[] = [];
const MAX_RECENT_FILES = 10;

/**
 * Create the main application window
 */
async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS style
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for some file operations
      preload: path.resolve(__dirname, 'preload.js'),
      webSecurity: !isDev, // Disable in dev for local file access
    },
    show: false, // Show only when ready to prevent flash
  });

  // Load the app
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.resolve(__dirname, '../dist/renderer/index.html');
    await mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();

      // Focus window on macOS
      if (process.platform === 'darwin') {
        app.focus();
      }
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

/**
 * Set up application menu
 */
function setupApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Sailing Log...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            await handleFileOpen();
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Recent Files',
          submenu: createRecentFilesMenu(),
        },
        {
          type: 'separator',
        },
        {
          label: 'Save Session...',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            await handleSessionSave();
          },
        },
        {
          label: 'Export Data...',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            await handleDataExport();
          },
        },
        {
          type: 'separator',
        },
        {
          role: 'quit',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow?.webContents.send('navigate-to', 'dashboard');
          },
        },
        {
          label: 'Map View',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow?.webContents.send('navigate-to', 'map');
          },
        },
        {
          label: 'Charts',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow?.webContents.send('navigate-to', 'charts');
          },
        },
        {
          label: 'Polar Diagram',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow?.webContents.send('navigate-to', 'polar');
          },
        },
        {
          type: 'separator',
        },
        {
          role: 'reload',
        },
        {
          role: 'toggleDevTools',
        },
        {
          type: 'separator',
        },
        {
          role: 'resetZoom',
        },
        {
          role: 'zoomIn',
        },
        {
          role: 'zoomOut',
        },
        {
          type: 'separator',
        },
        {
          role: 'togglefullscreen',
        },
      ],
    },
    {
      label: 'Analysis',
      submenu: [
        {
          label: 'Detect Races',
          click: () => {
            mainWindow?.webContents.send('run-analysis', 'races');
          },
        },
        {
          label: 'Detect Maneuvers',
          click: () => {
            mainWindow?.webContents.send('run-analysis', 'maneuvers');
          },
        },
        {
          label: 'Generate Polar Diagram',
          click: () => {
            mainWindow?.webContents.send('run-analysis', 'polar');
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Run Full Analysis',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.send('run-analysis', 'all');
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          role: 'minimize',
        },
        {
          role: 'close',
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About QSA Sailing Analytics',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About QSA Sailing Analytics',
              message: 'QSA Sailing Analytics',
              detail: 'Professional sailing performance analysis desktop application\nVersion 1.0.0\n\nBuilt with Electron, React, and TypeScript',
            });
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'User Guide',
          click: () => {
            shell.openExternal('https://github.com/qsa/sailing-analytics/wiki');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/qsa/sailing-analytics/issues');
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          role: 'about',
        },
        {
          type: 'separator',
        },
        {
          role: 'services',
        },
        {
          type: 'separator',
        },
        {
          role: 'hide',
        },
        {
          role: 'hideOthers',
        },
        {
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          role: 'quit',
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create recent files submenu
 */
function createRecentFilesMenu(): Electron.MenuItemConstructorOptions[] {
  if (recentFiles.length === 0) {
    return [{ label: 'No recent files', enabled: false }];
  }

  const recentItems = recentFiles.map((filePath) => ({
    label: path.basename(filePath),
    click: async () => {
      try {
        await openFile(filePath);
      } catch (error) {
        // Remove from recent files if file no longer exists
        recentFiles = recentFiles.filter(f => f !== filePath);
        setupApplicationMenu(); // Rebuild menu

        dialog.showErrorBox('File Not Found', `Could not open file: ${filePath}`);
      }
    },
  }));

  return [
    ...recentItems,
    { type: 'separator' },
    {
      label: 'Clear Recent Files',
      click: () => {
        recentFiles = [];
        setupApplicationMenu();
      },
    },
  ];
}

/**
 * Handle file open dialog
 */
async function handleFileOpen(): Promise<void> {
  if (!mainWindow) return;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Sailing Log File',
    properties: ['openFile'],
    filters: [
      {
        name: 'Sailing Log Files',
        extensions: ['nmea', 'gpx', 'csv', 'log', 'txt', 'vcc', 'exp'],
      },
      {
        name: 'NMEA Files',
        extensions: ['nmea', 'log', 'txt'],
      },
      {
        name: 'GPX Files',
        extensions: ['gpx'],
      },
      {
        name: 'CSV Files',
        extensions: ['csv'],
      },
      {
        name: 'All Files',
        extensions: ['*'],
      },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    await openFile(filePath);
  }
}

/**
 * Open a specific file
 */
async function openFile(filePath: string): Promise<void> {
  try {
    const buffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    // Add to recent files
    addToRecentFiles(filePath);

    // Send to renderer
    mainWindow?.webContents.send('file-opened', {
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      filename,
      filePath,
    });

  } catch (error) {
    console.error('Error opening file:', error);
    dialog.showErrorBox('Error Opening File', `Could not open file: ${filePath}\n\nError: ${error}`);
  }
}

/**
 * Add file to recent files list
 */
function addToRecentFiles(filePath: string): void {
  // Remove if already exists
  recentFiles = recentFiles.filter(f => f !== filePath);

  // Add to beginning
  recentFiles.unshift(filePath);

  // Limit list size
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  }

  // Rebuild menu
  setupApplicationMenu();
}

/**
 * Handle session save
 */
async function handleSessionSave(): Promise<void> {
  // This will be handled by the renderer process
  mainWindow?.webContents.send('save-session-request');
}

/**
 * Handle data export
 */
async function handleDataExport(): Promise<void> {
  // This will be handled by the renderer process
  mainWindow?.webContents.send('export-data-request');
}

/**
 * App event handlers
 */
app.whenReady().then(async () => {
  // Create main window
  await createMainWindow();

  // Set up menu
  setupApplicationMenu();

  // Handle app activation (macOS)
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

/**
 * IPC Handlers
 */

// File operations
ipcMain.handle('file:open-dialog', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Sailing Log File',
    properties: ['openFile'],
    filters: [
      {
        name: 'Sailing Log Files',
        extensions: ['nmea', 'gpx', 'csv', 'log', 'txt', 'vcc', 'exp'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];

  try {
    const buffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    addToRecentFiles(filePath);

    return {
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      filename,
      filePath,
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error}`);
  }
});

// Session save
ipcMain.handle('session:save', async (_, sessionData: any, suggestedName: string) => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Session',
    defaultPath: `${suggestedName}.qsa`,
    filters: [
      { name: 'QSA Session Files', extensions: ['qsa'] },
      { name: 'JSON Files', extensions: ['json'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    const jsonData = JSON.stringify(sessionData, null, 2);
    await fs.writeFile(result.filePath, jsonData, 'utf-8');

    return {
      filePath: result.filePath,
      success: true,
    };
  } catch (error) {
    throw new Error(`Failed to save session: ${error}`);
  }
});

// Data export
ipcMain.handle('data:export', async (_, exportData: any, format: string, suggestedName: string) => {
  if (!mainWindow) return null;

  const extensions = format === 'csv' ? ['csv'] :
                    format === 'gpx' ? ['gpx'] :
                    format === 'json' ? ['json'] : ['txt'];

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Data',
    defaultPath: `${suggestedName}.${extensions[0]}`,
    filters: [
      { name: `${format.toUpperCase()} Files`, extensions },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    await fs.writeFile(result.filePath, exportData, 'utf-8');

    return {
      filePath: result.filePath,
      success: true,
    };
  } catch (error) {
    throw new Error(`Failed to export data: ${error}`);
  }
});

// Window controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.restore();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// App info
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('app:platform', () => {
  return process.platform;
});

export { mainWindow };