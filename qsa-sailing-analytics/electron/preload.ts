/**
 * Electron Preload Script
 * Secure IPC bridge between main and renderer processes
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Types for the exposed API
export interface ElectronAPI {
  // File operations
  file: {
    openDialog: () => Promise<{
      buffer: ArrayBuffer;
      filename: string;
      filePath: string;
    } | null>;
  };

  // Session operations
  session: {
    save: (sessionData: any, suggestedName: string) => Promise<{
      filePath: string;
      success: boolean;
    } | null>;
  };

  // Data export
  data: {
    export: (exportData: string, format: string, suggestedName: string) => Promise<{
      filePath: string;
      success: boolean;
    } | null>;
  };

  // Window controls
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };

  // App info
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
  };

  // Event listeners
  on: {
    fileOpened: (callback: (data: {
      buffer: ArrayBuffer;
      filename: string;
      filePath: string;
    }) => void) => () => void;

    navigateTo: (callback: (view: string) => void) => () => void;

    runAnalysis: (callback: (analysisType: string) => void) => () => void;

    saveSessionRequest: (callback: () => void) => () => void;

    exportDataRequest: (callback: () => void) => () => void;
  };

  // Remove listeners
  off: {
    fileOpened: (callback: Function) => void;
    navigateTo: (callback: Function) => void;
    runAnalysis: (callback: Function) => void;
    saveSessionRequest: (callback: Function) => void;
    exportDataRequest: (callback: Function) => void;
  };
}

// Validate that we're in the preload context
if (process.contextIsolated) {
  try {
    // Create the API object
    const electronAPI: ElectronAPI = {
      // File operations
      file: {
        openDialog: () => ipcRenderer.invoke('file:open-dialog'),
      },

      // Session operations
      session: {
        save: (sessionData: any, suggestedName: string) =>
          ipcRenderer.invoke('session:save', sessionData, suggestedName),
      },

      // Data export
      data: {
        export: (exportData: string, format: string, suggestedName: string) =>
          ipcRenderer.invoke('data:export', exportData, format, suggestedName),
      },

      // Window controls
      window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
      },

      // App info
      app: {
        getVersion: () => ipcRenderer.invoke('app:version'),
        getPlatform: () => ipcRenderer.invoke('app:platform'),
      },

      // Event listeners
      on: {
        fileOpened: (callback: (data: any) => void) => {
          const wrappedCallback = (_: IpcRendererEvent, data: any) => callback(data);
          ipcRenderer.on('file-opened', wrappedCallback);
          return () => ipcRenderer.off('file-opened', wrappedCallback);
        },

        navigateTo: (callback: (view: string) => void) => {
          const wrappedCallback = (_: IpcRendererEvent, view: string) => callback(view);
          ipcRenderer.on('navigate-to', wrappedCallback);
          return () => ipcRenderer.off('navigate-to', wrappedCallback);
        },

        runAnalysis: (callback: (analysisType: string) => void) => {
          const wrappedCallback = (_: IpcRendererEvent, analysisType: string) => callback(analysisType);
          ipcRenderer.on('run-analysis', wrappedCallback);
          return () => ipcRenderer.off('run-analysis', wrappedCallback);
        },

        saveSessionRequest: (callback: () => void) => {
          const wrappedCallback = (_: IpcRendererEvent) => callback();
          ipcRenderer.on('save-session-request', wrappedCallback);
          return () => ipcRenderer.off('save-session-request', wrappedCallback);
        },

        exportDataRequest: (callback: () => void) => {
          const wrappedCallback = (_: IpcRendererEvent) => callback();
          ipcRenderer.on('export-data-request', wrappedCallback);
          return () => ipcRenderer.off('export-data-request', wrappedCallback);
        },
      },

      // Remove listeners
      off: {
        fileOpened: (callback: Function) => ipcRenderer.off('file-opened', callback as any),
        navigateTo: (callback: Function) => ipcRenderer.off('navigate-to', callback as any),
        runAnalysis: (callback: Function) => ipcRenderer.off('run-analysis', callback as any),
        saveSessionRequest: (callback: Function) => ipcRenderer.off('save-session-request', callback as any),
        exportDataRequest: (callback: Function) => ipcRenderer.off('export-data-request', callback as any),
      },
    };

    // Expose the API to the renderer process
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);

    // Also expose some development utilities in development mode
    if (process.env.NODE_ENV === 'development') {
      contextBridge.exposeInMainWorld('electronDev', {
        platform: process.platform,
        versions: process.versions,
        env: {
          NODE_ENV: process.env.NODE_ENV,
        },
      });
    }

  } catch (error) {
    console.error('Failed to expose electronAPI:', error);
  }
} else {
  console.warn('Context isolation is disabled. ElectronAPI not available.');
}

// Type declaration for use in renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electronDev?: {
      platform: string;
      versions: Record<string, string>;
      env: {
        NODE_ENV?: string;
      };
    };
  }
}