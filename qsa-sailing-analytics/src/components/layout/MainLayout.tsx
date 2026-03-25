/**
 * Main Layout Component
 * Orchestrates the primary application layout with header, sidebar, content, and timeline
 */

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ContentArea } from './ContentArea';
import { Timeline } from './Timeline';
import { useSidebar, useTimeline } from '@/store';

/**
 * MainLayout Component
 * - Responsive layout that adapts to window size
 * - Collapsible sidebar with drag resize
 * - Content area that switches between views
 * - Optional timeline for playback control
 */
export function MainLayout(): React.ReactElement {
  const sidebar = useSidebar();
  const timeline = useTimeline();

  return (
    <div className="flex flex-col h-full">
      {/* Application Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar.visible && (
          <Sidebar />
        )}

        {/* Content Area */}
        <ContentArea />
      </div>

      {/* Timeline */}
      {timeline.visible && (
        <Timeline />
      )}
    </div>
  );
}