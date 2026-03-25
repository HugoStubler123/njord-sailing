/**
 * About Modal Component
 * Application information and credits
 */

import React from 'react';

interface AboutModalProps {
  modal: {
    id: string;
    title: string;
    data?: any;
  };
  onClose: () => void;
}

export function AboutModal({ modal, onClose }: AboutModalProps): React.ReactElement {
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
      <div className="p-6 text-center">
        {/* App Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </div>

        {/* App Info */}
        <h4 className="text-xl font-bold text-white mb-2">
          QSA Sailing Analytics
        </h4>
        <p className="text-gray-400 mb-4">
          Professional sailing performance analysis
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Version 1.0.0
        </p>

        {/* Features */}
        <div className="text-left space-y-2 mb-6">
          <h5 className="text-sm font-medium text-gray-300">Features:</h5>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• NMEA & GPX data import</li>
            <li>• Race detection & analysis</li>
            <li>• Maneuver identification</li>
            <li>• Wind analysis & polar diagrams</li>
            <li>• Interactive map visualization</li>
            <li>• Real-time telemetry charts</li>
          </ul>
        </div>

        {/* Technology */}
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
          <p>Built with Electron, React, and TypeScript</p>
          <p className="mt-2">© 2026 QSA Technologies</p>
        </div>
      </div>
    </div>
  );
}