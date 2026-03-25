/**
 * Error Modal Component
 * Displays error information in modal format
 */

import React, { useState } from 'react';

interface ErrorModalProps {
  modal: {
    id: string;
    title: string;
    data?: {
      error?: Error | string;
      message?: string;
      details?: string;
      actions?: Array<{
        label: string;
        action: () => void;
        variant?: 'primary' | 'secondary' | 'destructive';
      }>;
    };
  };
  onClose: () => void;
}

/**
 * ErrorModal Component
 * - Detailed error information display
 * - Collapsible error details and stack traces
 * - Custom action buttons for error recovery
 */
export function ErrorModal({ modal, onClose }: ErrorModalProps): React.ReactElement {
  const [showDetails, setShowDetails] = useState(false);

  const {
    error,
    message = 'An unexpected error occurred.',
    details,
    actions = []
  } = modal.data || {};

  const errorMessage = typeof error === 'string' ? error : error?.message || message;
  const errorStack = typeof error === 'object' && error?.stack ? error.stack : details;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {/* Error Icon */}
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center bg-opacity-10">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">
            {modal.title}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Error Message */}
        <div className="mb-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            {errorMessage}
          </p>
        </div>

        {/* Error Details */}
        {errorStack && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span>
                {showDetails ? 'Hide' : 'Show'} Details
              </span>
              <svg
                className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {showDetails && (
              <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-600">
                <pre className="text-xs text-red-400 whitespace-pre-wrap break-all font-mono">
                  {errorStack}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Custom Actions */}
        {actions.length > 0 && (
          <div className="mb-4 pt-4 border-t border-gray-700">
            <div className="space-y-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    onClose();
                  }}
                  className={`
                    w-full px-4 py-2 text-sm font-medium rounded transition-colors text-left
                    ${action.variant === 'destructive'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : action.variant === 'primary'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end p-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  );
}