/**
 * Error Fallback Component
 * Displays when the main application encounters an error
 */

import React from 'react';
import { FallbackProps } from 'react-error-boundary';

/**
 * ErrorFallback Component
 * - Full-screen error display for critical application errors
 * - Error details and recovery options
 * - User-friendly error messaging
 */
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg border border-red-500/20 p-6">
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
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h1 className="text-xl font-bold text-white text-center mb-2">
          Application Error
        </h1>

        {/* Error Message */}
        <p className="text-gray-300 text-center mb-4">
          QSA Sailing Analytics encountered an unexpected error and needs to restart.
        </p>

        {/* Error Details */}
        <details className="mb-4 bg-gray-700/50 rounded p-3">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-200">
            Error Details
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

        {/* Recovery Actions */}
        <div className="space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Reload Application
          </button>

          {window.electronAPI && (
            <button
              onClick={() => window.electronAPI.window.close()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Close Application
            </button>
          )}
        </div>

        {/* Support Info */}
        <div className="mt-4 pt-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            If this error persists, please contact support or check the application logs.
          </p>
        </div>
      </div>
    </div>
  );
}