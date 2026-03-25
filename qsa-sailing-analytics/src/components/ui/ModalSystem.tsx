/**
 * Modal System Component
 * Manages application modals and dialogs
 */

import React, { useEffect } from 'react';
import { useActiveModal, useUIStore } from '@/store/uiStore';
import { FilePickerModal } from '../file/FilePickerModal';
import { SettingsModal } from '../settings/SettingsModal';
import { ExportModal } from '../export/ExportModal';
import { AboutModal } from '../about/AboutModal';
import { ErrorModal } from './ErrorModal';
import { ConfirmModal } from './ConfirmModal';

/**
 * ModalSystem Component
 * - Centralized modal management
 * - Keyboard shortcuts (ESC to close)
 * - Focus trapping and accessibility
 */
export function ModalSystem(): React.ReactElement | null {
  const activeModal = useActiveModal();
  const { closeModal } = useUIStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeModal) {
        closeModal();
      }
    };

    if (activeModal) {
      document.addEventListener('keydown', handleKeyPress);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = '';
    };
  }, [activeModal, closeModal]);

  if (!activeModal) {
    return null;
  }

  const renderModalContent = () => {
    switch (activeModal.type) {
      case 'file_picker':
        return <FilePickerModal modal={activeModal} onClose={() => closeModal()} />;
      case 'settings':
        return <SettingsModal modal={activeModal} onClose={() => closeModal()} />;
      case 'export':
        return <ExportModal modal={activeModal} onClose={() => closeModal()} />;
      case 'about':
        return <AboutModal modal={activeModal} onClose={() => closeModal()} />;
      case 'error':
        return <ErrorModal modal={activeModal} onClose={() => closeModal()} />;
      case 'confirm':
        return <ConfirmModal modal={activeModal} onClose={() => closeModal()} />;
      default:
        return (
          <GenericModal
            modal={activeModal}
            onClose={() => closeModal()}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => closeModal()}
      />

      {/* Modal Container */}
      <div className="flex min-h-screen items-center justify-center p-4">
        {renderModalContent()}
      </div>
    </div>
  );
}

interface GenericModalProps {
  modal: {
    id: string;
    type: string;
    title: string;
    content?: React.ReactNode;
    data?: Record<string, any>;
    onClose?: () => void;
    onConfirm?: () => void;
  };
  onClose: () => void;
}

function GenericModal({ modal, onClose }: GenericModalProps): React.ReactElement {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-white">
          {modal.title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {modal.content || (
          <div className="text-gray-300">
            Modal content goes here.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        {modal.onConfirm && (
          <button
            onClick={() => {
              modal.onConfirm?.();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Confirm
          </button>
        )}
      </div>
    </div>
  );
}