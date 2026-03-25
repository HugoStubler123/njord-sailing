/**
 * Content Area Component
 * Renders the appropriate view based on the current view state
 */

import React, { Suspense, lazy } from 'react';
import { useCurrentView } from '@/store/uiStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from 'react-error-boundary';
import { ViewErrorFallback } from '@/components/ui/ViewErrorFallback';

// Lazy load views for better performance
const DashboardView = lazy(() => import('@/views/DashboardView'));
const MapView = lazy(() => import('@/views/MapView'));
const ChartsView = lazy(() => import('@/views/ChartsView'));
const PolarView = lazy(() => import('@/views/PolarView'));
const ManeuverView = lazy(() => import('@/views/ManeuverView'));
const RaceView = lazy(() => import('@/views/RaceView'));

/**
 * ContentArea Component
 * - Renders current view with error boundaries
 * - Handles loading states for lazy-loaded views
 * - Provides consistent layout container
 */
export function ContentArea(): React.ReactElement {
  const currentView = useCurrentView();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'map':
        return <MapView />;
      case 'charts':
        return <ChartsView />;
      case 'polar':
        return <PolarView />;
      case 'maneuvers':
        return <ManeuverView />;
      case 'race':
        return <RaceView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      <ErrorBoundary
        FallbackComponent={ViewErrorFallback}
        onError={(error, errorInfo) => {
          console.error(`Error in ${currentView} view:`, error, errorInfo);
        }}
        resetKeys={[currentView]}
      >
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner
                size="lg"
                message={`Loading ${currentView} view...`}
              />
            </div>
          }
        >
          {renderView()}
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}