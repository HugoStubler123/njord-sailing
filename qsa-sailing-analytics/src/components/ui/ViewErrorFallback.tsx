/**
 * View Error Fallback Component
 * Displays when individual views encounter errors
 */

import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { useCurrentView, useUIStore } from '@/store/uiStore';

/**
 * ViewErrorFallback Component
 * - In-context error display for view failures
 * - Allows switching to different views
 * - Less disruptive than full application error
 */
export function ViewErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.ReactElement {
  const currentView = useCurrentView();
  const { setCurrentView } = useUIStore();

  const handleViewSwitch = (view: any) => {
    setCurrentView(view);
    resetErrorBoundary();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View Error
        </h2>

        {/* Error Message */}
        <p className="text-gray-300 mb-4">
          This view encountered an error and couldn't load properly.
        </p>

        {/* Error Details */}
        <details className="mb-6 bg-gray-800 rounded p-3 text-left">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-200 text-center">
            Show Error Details
          </summary>
          <div className="mt-2 text-xs font-mono text-red-400 whitespace-pre-wrap break-all">
            {error instanceof Error ? error.message : String(error)}
            {process.env.NODE_ENV === 'development' && error instanceof Error && (
              <div className="mt-2 pt-2 border-t border-gray-600 text-gray-500">
                {error.stack}
              </div>
            )}
          </div>
        </details>

        {/* Recovery Options */}
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Retry View
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleViewSwitch('dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              Dashboard
            </button>
            <button
              onClick={() => handleViewSwitch('map')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              Map
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Try reloading the session data or switching to a different view.
          </p>
        </div>
      </div>
    </div>
  );
}