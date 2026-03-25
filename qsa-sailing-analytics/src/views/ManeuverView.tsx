/**
 * Maneuver View Component
 * Maneuver analysis and timeline visualization
 */

import React from 'react';
import { useActiveSession } from '@/store/sessionStore';
import { useAnalysisResults } from '@/store/analysisStore';

function ManeuverView(): React.ReactElement {
  const activeSession = useActiveSession();
  const { maneuvers } = useAnalysisResults();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-medium text-white">Maneuver Analysis</h2>
        <div className="text-sm text-gray-400">
          {activeSession ? `${activeSession.name}` : 'No session loaded'}
        </div>
      </div>

      <div className="flex-1 bg-gray-800 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
          <p>Maneuver analysis will be implemented here</p>
          <p className="text-sm mt-2">
            {maneuvers.length > 0 ? `${maneuvers.length} maneuvers detected` : 'Run analysis to detect tacks and gybes'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ManeuverView;