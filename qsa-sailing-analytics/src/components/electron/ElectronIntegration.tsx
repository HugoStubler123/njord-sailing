/**
 * Electron Integration Component
 * Handles IPC events and Electron-specific functionality
 */

import React, { useEffect } from 'react';
import { useUIStore, useSessionStore } from '@/store';

/**
 * ElectronIntegration Component
 * - Listens for IPC events from main process
 * - Handles file opening, navigation, and analysis triggers
 * - Bridges Electron and React application
 */
export function ElectronIntegration(): React.ReactElement | null {
  const { setCurrentView, showSuccess, showError, openModal } = useUIStore();
  const { loadFile } = useSessionStore();

  useEffect(() => {
    // Only set up IPC listeners if running in Electron
    if (!window.electronAPI) {
      return;
    }

    // File opened via menu or drag-and-drop
    const handleFileOpened = window.electronAPI.on.fileOpened((data) => {
      console.log('File opened via Electron:', data.filename);

      loadFile(data.buffer, data.filename)
        .then(() => {
          showSuccess('File Loaded', `Successfully loaded ${data.filename}`);
          setCurrentView('dashboard');
        })
        .catch((error) => {
          showError('Load Error', `Failed to load ${data.filename}: ${error.message}`);
        });
    });

    // Navigation requests from menu
    const handleNavigateTo = window.electronAPI.on.navigateTo((view) => {
      console.log('Navigate to view:', view);
      setCurrentView(view as any);
    });

    // Analysis requests from menu
    const handleRunAnalysis = window.electronAPI.on.runAnalysis((analysisType) => {
      console.log('Run analysis:', analysisType);

      // Switch to appropriate view and trigger analysis
      switch (analysisType) {
        case 'races':
          setCurrentView('race');
          // Could trigger race analysis here
          break;
        case 'maneuvers':
          setCurrentView('maneuvers');
          // Could trigger maneuver analysis here
          break;
        case 'polar':
          setCurrentView('polar');
          // Could trigger polar analysis here
          break;
        case 'all':
          // Could trigger full analysis
          showSuccess('Analysis Started', 'Running full analysis on current session');
          break;
      }
    });

    // Save session request from menu
    const handleSaveSessionRequest = window.electronAPI.on.saveSessionRequest(() => {
      console.log('Save session requested');
      openModal({
        type: 'export',
        title: 'Save Session',
        data: { format: 'qsa' }
      });
    });

    // Export data request from menu
    const handleExportDataRequest = window.electronAPI.on.exportDataRequest(() => {
      console.log('Export data requested');
      openModal({
        type: 'export',
        title: 'Export Data',
        data: { format: 'csv' }
      });
    });

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.off.fileOpened(handleFileOpened);
      window.electronAPI.off.navigateTo(handleNavigateTo);
      window.electronAPI.off.runAnalysis(handleRunAnalysis);
      window.electronAPI.off.saveSessionRequest(handleSaveSessionRequest);
      window.electronAPI.off.exportDataRequest(handleExportDataRequest);
    };
  }, [setCurrentView, showSuccess, showError, openModal, loadFile]);

  // This component doesn't render anything
  return null;
}