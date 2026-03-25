/**
 * Analysis Panel Component
 * Controls and displays sailing data analysis
 */

import React from 'react';
import { useAnalysisProgress, useAnalysisResults } from '@/store/analysisStore';
import { useActiveSession } from '@/store/sessionStore';
import { LoadingSpinner } from '../ui/LoadingSpinner';

/**
 * AnalysisPanel Component
 * - Analysis control buttons
 * - Progress indicators
 * - Results summary
 */
export function AnalysisPanel(): React.ReactElement {
  const activeSession = useActiveSession();
  const { isAnalyzing, progress, error } = useAnalysisProgress();
  const { races, maneuvers, windAnalysis, polarDiagram } = useAnalysisResults();

  const hasResults = races.length > 0 || maneuvers.length > 0 || windAnalysis || polarDiagram;

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Analysis</h3>
        {isAnalyzing && <LoadingSpinner size="sm" />}
      </div>

      {/* Analysis Controls */}
      <div className="space-y-2">
        <button
          disabled={!activeSession || isAnalyzing}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
        >
          Run Full Analysis
        </button>

        <div className="grid grid-cols-2 gap-1">
          <button
            disabled={!activeSession || isAnalyzing}
            className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            Races
          </button>
          <button
            disabled={!activeSession || isAnalyzing}
            className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            Maneuvers
          </button>
          <button
            disabled={!activeSession || isAnalyzing}
            className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            Wind
          </button>
          <button
            disabled={!activeSession || isAnalyzing}
            className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            Polar
          </button>
        </div>
      </div>

      {/* Progress */}
      {progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((task) => (
            <div key={task.id} className="bg-gray-700 rounded p-2">
              <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                <span>{task.name}</span>
                <span>{Math.round(task.progress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all"
                  style={{ width: `${task.progress * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-600 bg-opacity-10 border border-red-500 rounded p-2">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Results Summary */}
      {hasResults && !isAnalyzing && (
        <div className="space-y-2 text-xs">
          <h4 className="text-gray-200 font-medium">Results</h4>
          <div className="space-y-1 text-gray-400">
            {races.length > 0 && (
              <div>🏁 {races.length} races detected</div>
            )}
            {maneuvers.length > 0 && (
              <div>⛵ {maneuvers.length} maneuvers detected</div>
            )}
            {windAnalysis && (
              <div>💨 Wind analysis complete</div>
            )}
            {polarDiagram && (
              <div>📊 Polar diagram generated</div>
            )}
          </div>
        </div>
      )}

      {/* No Session */}
      {!activeSession && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Load a session to run analysis</p>
        </div>
      )}
    </div>
  );
}