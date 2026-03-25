/**
 * File Picker Modal Component
 * Handles file selection and upload in web mode
 */

import React, { useState, useRef } from 'react';

interface FilePickerModalProps {
  modal: {
    id: string;
    title: string;
    data?: any;
  };
  onClose: () => void;
}

/**
 * FilePickerModal Component
 * - File drag-and-drop support
 * - File type validation
 * - Progress feedback
 */
export function FilePickerModal({ modal, onClose }: FilePickerModalProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      console.log('File selected:', file.name, buffer.byteLength);

      // Here would integrate with session store to load file
      // For now just log and close
      onClose();
    } catch (error) {
      console.error('Failed to read file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const acceptedTypes = '.nmea,.gpx,.csv,.log,.txt,.vcc,.exp';

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
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver
              ? 'border-blue-500 bg-blue-500 bg-opacity-10'
              : 'border-gray-600 hover:border-gray-500'
            }
          `}
        >
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 7a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-300 mb-2">Drop sailing log files here</p>
          <p className="text-sm text-gray-500">or click to browse</p>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Browse Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          {isLoading ? 'Loading...' : 'Browse Files'}
        </button>

        {/* Supported Formats */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Supported formats:</p>
          <p>NMEA (.nmea, .log, .txt), GPX (.gpx), CSV (.csv), VCC (.vcc), Expedition (.exp)</p>
        </div>
      </div>
    </div>
  );
}