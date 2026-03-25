/**
 * Application Header Component
 * Contains title, session info, and window controls
 */

import React from 'react';
import { useActiveSession, useSessionLoading } from '@/store/sessionStore';
import { useCurrentView } from '@/store/uiStore';
import { WindowControls } from '@/components/electron/WindowControls';
import { SessionStatus } from '@/components/session/SessionStatus';
import { QuickActions } from '@/components/ui/QuickActions';

/**
 * Header Component
 * - App title and branding
 * - Current session information
 * - Window controls for Electron
 * - Quick action buttons
 */
export function Header(): React.ReactElement {
  const activeSession = useActiveSession();
  const sessionLoading = useSessionLoading();
  const currentView = useCurrentView();

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-gray-800 border-b border-gray-700 select-none">
      {/* Left: App Title and Session Info */}
      <div className="flex items-center space-x-4">
        {/* App Title */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-100">
              QSA Sailing Analytics
            </h1>
            <div className="text-xs text-gray-400 capitalize">
              {currentView.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>
        </div>

        {/* Session Status */}
        <SessionStatus
          session={activeSession}
          loading={sessionLoading}
        />
      </div>

      {/* Center: Current View Breadcrumb */}
      <div className="flex-1 flex justify-center">
        <nav className="flex items-center space-x-2 text-sm text-gray-400">
          {activeSession ? (
            <>
              <span className="text-gray-300">{activeSession.name}</span>
              <span className="text-gray-500">/</span>
              <span className="text-blue-400 capitalize">
                {currentView.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </>
          ) : (
            <span className="text-gray-500">No session loaded</span>
          )}
        </nav>
      </div>

      {/* Right: Quick Actions and Window Controls */}
      <div className="flex items-center space-x-3">
        <QuickActions />
        <WindowControls />
      </div>
    </header>
  );
}