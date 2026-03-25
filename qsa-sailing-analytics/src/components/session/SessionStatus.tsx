/**
 * Session Status Component
 * Shows current session information and loading state
 */

import React from 'react';
import { SailingSession } from '@/core/models';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SessionStatusProps {
  session: SailingSession | null;
  loading: {
    isLoading: boolean;
    progress: number;
    message: string;
  };
}

/**
 * SessionStatus Component
 * - Current session name and metadata
 * - Loading progress for file operations
 * - Session statistics summary
 */
export function SessionStatus({ session, loading }: SessionStatusProps): React.ReactElement {
  if (loading.isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <LoadingSpinner size="sm" />
        <div>
          <div className="text-blue-400 font-medium">
            {loading.message || 'Loading...'}
          </div>
          {loading.progress > 0 && (
            <div className="text-gray-400 text-xs">
              {Math.round(loading.progress * 100)}%
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-sm text-gray-500 italic">
        No session loaded
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 text-sm">
      {/* Session Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-green-400 font-medium">Active</span>
      </div>

      {/* Session Info */}
      <div className="text-gray-400 space-x-1">
        <span>{session.data.length.toLocaleString()} records</span>
        <span>•</span>
        <span>{Math.round(session.duration / 60)}min</span>
        {session.stats.maxSpeed && (
          <>
            <span>•</span>
            <span>{session.stats.maxSpeed.toFixed(1)}kts max</span>
          </>
        )}
      </div>
    </div>
  );
}