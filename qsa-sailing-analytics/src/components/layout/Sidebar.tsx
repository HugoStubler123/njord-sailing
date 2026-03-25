/**
 * Sidebar Component
 * Contains navigation, session management, and analysis tools
 */

import React, { useState } from 'react';
import { useSidebar, useUIStore } from '@/store/uiStore';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { NavigationTab } from '@/components/navigation/NavigationTab';
import { SessionsPanel } from '@/components/session/SessionsPanel';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

/**
 * Sidebar Component
 * - Resizable sidebar with tabs
 * - Session management
 * - Analysis controls
 * - Application settings
 */
export function Sidebar(): React.ReactElement {
  const sidebar = useSidebar();
  const { setSidebarWidth, setSidebarCollapsed, setSidebarActiveTab } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);

  const handleResize = (deltaX: number) => {
    if (!isResizing) return;

    const newWidth = sidebar.width + deltaX;
    setSidebarWidth(newWidth);
  };

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const tabs = [
    {
      id: 'sessions' as const,
      label: 'Sessions',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489c.14.56-.619 1.08-1.203.665L6.25 15H5a2 2 0 01-2-2V5zm5.25 9H8a1 1 0 01-1-1V6a1 1 0 011-1h1.25v9z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'analysis' as const,
      label: 'Analysis',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="flex flex-col bg-gray-800 border-r border-gray-700 relative"
      style={{ width: sidebar.collapsed ? '48px' : `${sidebar.width}px` }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-gray-700">
        {!sidebar.collapsed && (
          <h2 className="text-sm font-medium text-gray-200">Navigation</h2>
        )}

        <button
          onClick={() => setSidebarCollapsed(!sidebar.collapsed)}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          title={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-4 h-4 transition-transform"
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ transform: sidebar.collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      {!sidebar.collapsed && (
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <NavigationTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={sidebar.activeTab === tab.id}
              onClick={() => setSidebarActiveTab(tab.id)}
            />
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {!sidebar.collapsed && (
          <>
            {sidebar.activeTab === 'sessions' && <SessionsPanel />}
            {sidebar.activeTab === 'analysis' && <AnalysisPanel />}
            {sidebar.activeTab === 'settings' && <SettingsPanel />}
          </>
        )}

        {sidebar.collapsed && (
          <div className="flex flex-col space-y-2 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSidebarCollapsed(false);
                  setSidebarActiveTab(tab.id);
                }}
                className={`
                  p-2 rounded-lg transition-colors
                  ${sidebar.activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }
                `}
                title={tab.label}
              >
                {tab.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {!sidebar.collapsed && (
        <ResizeHandle
          direction="horizontal"
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-blue-500 transition-colors"
        />
      )}
    </div>
  );
}