/**
 * Navigation Tab Component
 * Individual tab in the sidebar navigation
 */

import React from 'react';

interface NavigationTabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

/**
 * NavigationTab Component
 * - Individual navigation tab
 * - Active state styling
 * - Icon and label display
 */
export function NavigationTab({ id, label, icon, isActive, onClick }: NavigationTabProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium transition-colors
        ${isActive
          ? 'bg-blue-600 text-white border-b-2 border-blue-400'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
        }
      `}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}