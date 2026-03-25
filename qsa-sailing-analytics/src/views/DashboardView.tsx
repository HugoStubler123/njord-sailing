/**
 * Dashboard View Component
 * Main overview of sailing session data
 */

import React from 'react';
import { useActiveSession } from '@/store/sessionStore';
import { useAnalysisResults } from '@/store/analysisStore';
import { DemoDataLoader } from '@/components/demo/DemoDataLoader';

/**
 * DashboardView Component
 * - Session overview and statistics
 * - Quick access to analysis results
 * - Key performance metrics
 */
function DashboardView(): React.ReactElement {
  const activeSession = useActiveSession();
  const { races, maneuvers, windAnalysis, polarDiagram } = useAnalysisResults();

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-600">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 7a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-300 mb-2">
            Welcome to QSA Sailing Analytics
          </h2>
          <p className="text-gray-500 mb-4">
            Load a sailing session to start analyzing your performance
          </p>
          <DemoDataLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {activeSession.name}
          </h1>
          <p className="text-gray-400">
            {new Date(activeSession.startTime).toLocaleDateString()} • {Math.round(activeSession.duration / 60)} minutes
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Max Speed</h3>
              <p className="text-2xl font-bold text-white">
                {activeSession.stats.maxSpeed?.toFixed(1) || '--'} kts
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Avg Speed</h3>
              <p className="text-2xl font-bold text-white">
                {activeSession.stats.avgSpeed?.toFixed(1) || '--'} kts
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Distance</h3>
              <p className="text-2xl font-bold text-white">
                {activeSession.stats.totalDistance?.toFixed(2) || '--'} nm
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Races</h3>
              <p className="text-2xl font-bold text-white">
                {races.length}
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-white">Analysis Results</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Races Detected</span>
                <span className="text-white">{races.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Maneuvers</span>
                <span className="text-white">{maneuvers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Wind Analysis</span>
                <span className="text-white">{windAnalysis ? 'Complete' : 'Pending'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Polar Diagram</span>
                <span className="text-white">{polarDiagram ? 'Generated' : 'Pending'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-white">Session Data</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Data Points</span>
                <span className="text-white">{activeSession.data.length.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Duration</span>
                <span className="text-white">{Math.round(activeSession.duration / 60)} minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Location</span>
                <span className="text-white">{activeSession.location || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Boat</span>
                <span className="text-white">{activeSession.boat.name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;