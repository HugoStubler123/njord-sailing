/**
 * Confirm Modal Component
 * Displays confirmation dialogs for destructive or important actions
 */

import React from 'react';

interface ConfirmModalProps {
  modal: {
    id: string;
    title: string;
    data?: {
      message?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: 'danger' | 'warning' | 'primary';
    };
    onConfirm?: () => void;
  };
  onClose: () => void;
}

/**
 * ConfirmModal Component
 * - Confirmation dialogs for user actions
 * - Different visual variants for different action types
 * - Keyboard navigation support
 */
export function ConfirmModal({ modal, onClose }: ConfirmModalProps): React.ReactElement {
  const {
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary'
  } = modal.data || {};

  const handleConfirm = () => {
    modal.onConfirm?.();
    onClose();
  };

  const variantStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      iconBg: 'bg-red-100',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      iconBg: 'bg-yellow-100',
    },
    primary: {
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      iconBg: 'bg-blue-100',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
      <div className="p-6">
        {/* Icon and Title */}
        <div className="flex items-center space-x-4 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center bg-opacity-10`}>
            {style.icon}
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">
              {modal.title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`
              px-4 py-2 text-white font-medium rounded transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
              ${style.confirmButton}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}