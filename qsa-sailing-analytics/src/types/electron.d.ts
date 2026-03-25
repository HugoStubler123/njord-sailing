/**
 * Type definitions for Electron API exposed via preload script
 */

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