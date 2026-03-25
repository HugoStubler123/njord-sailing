/**
 * Settings Modal Component
 * Full settings dialog
 */

import React from 'react';
import { SettingsPanel } from './SettingsPanel';

interface SettingsModalProps {
  modal: {
    id: string;
    title: string;
    data?: any;
  };
  onClose: () => void;
}

export function SettingsModal({ modal, onClose }: SettingsModalProps): React.ReactElement {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-white">{modal.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="h-96 overflow-hidden">
        <SettingsPanel />
      </div>
    </div>
  );
}