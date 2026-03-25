/**
 * Export Modal Component
 * Data export functionality
 */

import React, { useState } from 'react';

interface ExportModalProps {
  modal: {
    id: string;
    title: string;
    data?: {
      format?: string;
    };
  };
  onClose: () => void;
}

export function ExportModal({ modal, onClose }: ExportModalProps): React.ReactElement {
  const [format, setFormat] = useState(modal.data?.format || 'csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Export logic would go here
      console.log('Exporting as', format);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
      <div className="p-6">
        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Export Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="csv">CSV</option>
              <option value="gpx">GPX</option>
              <option value="json">JSON</option>
              <option value="qsa">QSA Session</option>
            </select>
          </div>

          {/* Options based on format */}
          {format === 'csv' && (
            <div className="text-sm text-gray-400">
              Exports sailing data as comma-separated values
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}