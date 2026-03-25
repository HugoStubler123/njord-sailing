/**
 * Loading Spinner Component
 * Reusable spinner with different sizes and optional message
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

/**
 * LoadingSpinner Component
 * - Different sizes for various use cases
 * - Optional loading message
 * - Customizable styling
 */
export function LoadingSpinner({
  size = 'md',
  message,
  className = ''
}: LoadingSpinnerProps): React.ReactElement {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      {/* Spinner */}
      <div
        className={`
          ${sizeClasses[size]}
          border-2 border-gray-600 border-t-blue-500
          rounded-full animate-spin
        `}
      />

      {/* Message */}
      {message && (
        <p className="text-sm text-gray-400 text-center animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}