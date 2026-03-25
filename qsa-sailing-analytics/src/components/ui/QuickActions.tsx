/**
 * Quick Actions Component
 * Provides quick access buttons in the header
 */

import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useActiveSession } from '@/store/sessionStore';

/**
 * QuickActions Component
 * - File operations (open, save, export)
 * - View toggles (sidebar, timeline)
 * - Quick analysis triggers
 */
export function QuickActions(): React.ReactElement {
  const { setSidebarVisible, setTimelineVisible, openModal } = useUIStore();
  const activeSession = useActiveSession();

  const handleOpenFile = async () => {
    if (window.electronAPI) {
      // Use Electron file dialog
      try {
        const result = await window.electronAPI.file.openDialog();
        if (result) {
          // File will be handled by ElectronIntegration component
          console.log('File selected via dialog:', result.filename);
        }
      } catch (error) {
        console.error('Failed to open file dialog:', error);
      }
    } else {
      // Web fallback - open file picker modal
      openModal({
        type: 'file_picker',
        title: 'Open Sailing Log File'
      });
    }
  };

  const handleToggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const handleToggleTimeline = () => {
    setTimelineVisible((prev) => !prev);
  };

  const handleSettings = () => {
    openModal({
      type: 'settings',
      title: 'Application Settings'
    });
  };

  return (
    <div className="flex items-center space-x-1">
      {/* Open File */}
      <button
        onClick={handleOpenFile}
        className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        title="Open file (Ctrl+O)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 7a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" clipRule="evenodd" />
          <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1h-1l-.5 1H5.5L5 3H3z" />
        </svg>
      </button>

      {/* Toggle Sidebar */}
      <button
        onClick={handleToggleSidebar}
        className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        title="Toggle sidebar"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 2H5v8h10V7z" clipRule="evenodd" />
          <path d="M7 7v8" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      {/* Toggle Timeline */}
      <button
        onClick={handleToggleTimeline}
        disabled={!activeSession}
        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-gray-200 transition-colors"
        title="Toggle timeline"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-600" />

      {/* Settings */}
      <button
        onClick={handleSettings}
        className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        title="Settings"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}