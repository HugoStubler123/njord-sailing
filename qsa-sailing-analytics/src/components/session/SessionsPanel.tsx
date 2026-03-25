/**
 * Sessions Panel Component
 * Displays and manages loaded sailing sessions
 */

import React from 'react';
import { useSessionSummaries, useActiveSession } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';

/**
 * SessionsPanel Component
 * - List of loaded sessions
 * - Session selection and management
 * - Session import/export actions
 */
export function SessionsPanel(): React.ReactElement {
  const sessionSummaries = useSessionSummaries();
  const activeSession = useActiveSession();
  const { openModal } = useUIStore();

  const handleOpenFile = () => {
    openModal({
      type: 'file_picker',
      title: 'Open Sailing Log File'
    });
  };

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Sessions</h3>
        <button
          onClick={handleOpenFile}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
          title="Open file"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {sessionSummaries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-3">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 7a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-3">No sessions loaded</p>
            <button
              onClick={handleOpenFile}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Open File
            </button>
          </div>
        ) : (
          sessionSummaries.map((session) => (
            <div
              key={session.id}
              className={`
                p-3 rounded border cursor-pointer transition-colors
                ${activeSession?.id === session.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                }
              `}
            >
              <h4 className="font-medium text-sm truncate">{session.name}</h4>
              <p className="text-xs opacity-75 mt-1">
                {new Date(session.startTime).toLocaleDateString()}
              </p>
              <div className="flex items-center space-x-3 text-xs opacity-75 mt-2">
                <span>{Math.round(session.duration / 60)}min</span>
                <span>{session.stats.maxSpeed?.toFixed(1)}kts</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}