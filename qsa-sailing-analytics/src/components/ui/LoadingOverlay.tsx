/**
 * Loading Overlay Component
 * Shows global loading state with task progress
 */

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingTask {
  id: string;
  message: string;
  progress?: number;
}

interface LoadingOverlayProps {
  isVisible: boolean;
  tasks: LoadingTask[];
}

/**
 * LoadingOverlay Component
 * - Full-screen overlay during loading
 * - Progress bars for individual tasks
 * - Prevents user interaction during critical operations
 */
export function LoadingOverlay({ isVisible, tasks }: LoadingOverlayProps): React.ReactElement | null {
  if (!isVisible) {
    return null;
  }

  const primaryTask = tasks[0];
  const hasMultipleTasks = tasks.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600 shadow-2xl">
        {/* Main Loading Indicator */}
        <div className="flex items-center space-x-3 mb-4">
          <LoadingSpinner size="md" />
          <div>
            <h3 className="text-white font-medium">
              {primaryTask?.message || 'Loading...'}
            </h3>
            {hasMultipleTasks && (
              <p className="text-sm text-gray-400">
                {tasks.length} tasks running
              </p>
            )}
          </div>
        </div>

        {/* Task Progress */}
        {tasks.map((task, index) => (
          <div key={task.id} className={index > 0 ? 'mt-3' : ''}>
            {/* Task Message */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-300">
                {task.message}
              </span>
              {typeof task.progress === 'number' && (
                <span className="text-xs text-gray-400">
                  {Math.round(task.progress * 100)}%
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {typeof task.progress === 'number' && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress * 100}%` }}
                />
              </div>
            )}

            {/* Indeterminate Progress */}
            {typeof task.progress !== 'number' && (
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        ))}

        {/* Cancel Button (if appropriate) */}
        {hasMultipleTasks && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <button
              onClick={() => {
                // Could add cancel functionality here
                console.log('Cancel requested');
              }}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel operations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}