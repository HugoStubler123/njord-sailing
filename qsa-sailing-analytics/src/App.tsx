/**
 * Main Application Component
 * Root component that orchestrates the entire QSA Sailing Analytics application
 */

import React, { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { NotificationSystem } from '@/components/ui/NotificationSystem';
import { ModalSystem } from '@/components/ui/ModalSystem';
import { ElectronIntegration } from '@/components/electron/ElectronIntegration';
import { useUIStore, useSessionStore, usePlaybackStore, useAnalysisStore } from '@/store';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import '@/styles/globals.css';

/**
 * Main App Component
 * - Sets up global providers and state
 * - Handles Electron integration
 * - Manages error boundaries
 * - Orchestrates layout and UI systems
 */
function App(): React.ReactElement {
  const globalLoading = useUIStore(state => state.globalLoading);
  const loadingTasks = useUIStore(state => state.loadingTasks);

  // Initialize stores on app startup
  useEffect(() => {
    // All stores are automatically initialized via their modules
    // No manual initialization needed as they self-initialize
    console.log('QSA Sailing Analytics - Application Started');

    return () => {
      // Cleanup on unmount
      useSessionStore.getState().cleanup();
      usePlaybackStore.getState().cleanup();
      useAnalysisStore.getState().cleanup();
      console.log('QSA Sailing Analytics - Application Cleanup Complete');
    };
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo);
        // Could send to error reporting service here
      }}
      onReset={() => {
        // Clear any problematic state
        window.location.reload();
      }}
    >
      <div className="h-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
        {/* Electron Integration - Handles IPC events */}
        <ElectronIntegration />

        {/* Main Application Layout */}
        <MainLayout />

        {/* Global UI Systems */}
        <NotificationSystem />
        <ModalSystem />

        {/* Global Loading Overlay */}
        {(globalLoading || loadingTasks.length > 0) && (
          <LoadingOverlay
            isVisible={globalLoading || loadingTasks.length > 0}
            tasks={loadingTasks}
          />
        )}

        {/* Development Tools (only in dev mode) */}
        {process.env.NODE_ENV === 'development' && <DevelopmentTools />}
      </div>
    </ErrorBoundary>
  );
}

/**
 * Development Tools Component
 * Provides debugging utilities during development
 */
function DevelopmentTools(): React.ReactElement {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Toggle dev tools with Ctrl+Shift+D
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) return <></>;

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-50">
      <div className="text-xs font-mono space-y-1">
        <div className="text-blue-400 font-bold">Dev Tools (Ctrl+Shift+D)</div>
        <div>Platform: {(window as any).electronDev?.platform || 'Web'}</div>
        <div>Node: {(window as any).electronDev?.versions.node || 'N/A'}</div>
        <div>Electron: {(window as any).electronDev?.versions.electron || 'N/A'}</div>
        <button
          onClick={() => setIsVisible(false)}
          className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default App;