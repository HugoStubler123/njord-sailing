/**
 * Resize Handle Component
 * Provides drag handles for resizing panels and components
 */

import React, { useRef, useEffect } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResizeStart: () => void;
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
  className?: string;
}

/**
 * ResizeHandle Component
 * - Drag-to-resize functionality
 * - Horizontal and vertical orientations
 * - Mouse capture during resize operations
 */
export function ResizeHandle({
  direction,
  onResizeStart,
  onResize,
  onResizeEnd,
  className = ''
}: ResizeHandleProps): React.ReactElement {
  const isDragging = useRef(false);
  const lastPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    isDragging.current = true;
    lastPosition.current = { x: event.clientX, y: event.clientY };

    onResizeStart();

    // Capture mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = event.clientX - lastPosition.current.x;
    const deltaY = event.clientY - lastPosition.current.y;

    if (direction === 'horizontal') {
      onResize(deltaX);
      lastPosition.current.x = event.clientX;
    } else {
      onResize(deltaY);
      lastPosition.current.y = event.clientY;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    // Release mouse capture
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    onResizeEnd();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isDragging.current) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };
  }, []);

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
      style={{
        cursor: direction === 'horizontal' ? 'ew-resize' : 'ns-resize'
      }}
    />
  );
}