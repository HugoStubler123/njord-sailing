/**
 * Demo Data Loader Component
 * Loads sample data for testing and demonstration
 */

import React from 'react';
import { useSessionStore } from '@/store/sessionStore';

const SAMPLE_NMEA = `$GPRMC,123456,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
$IIVWR,144,R,12.4,N,6.4,M,23.1,K*5D
$IIVHW,083.0,T,084.0,M,5.2,N,9.6,K*6E
$IIHDG,084.0,0.0,E,3.1,W*2E

$GPRMC,123500,A,4807.045,N,01131.010,E,023.1,085.2,230394,003.1,W*60
$IIVWR,142,R,12.8,N,6.6,M,23.7,K*5A
$IIVHW,085.0,T,086.0,M,5.5,N,10.2,K*61
$IIHDG,086.0,0.0,E,3.1,W*2C

$GPRMC,123504,A,4807.052,N,01131.020,E,024.8,086.1,230394,003.1,W*6F
$IIVWR,140,R,13.2,N,6.8,M,24.3,K*57
$IIVHW,086.0,T,087.0,M,5.8,N,10.7,K*66
$IIHDG,087.0,0.0,E,3.1,W*2F`;

export function DemoDataLoader(): React.ReactElement {
  const { loadFile, isLoading, error } = useSessionStore();

  const loadDemoData = async () => {
    try {
      const buffer = new TextEncoder().encode(SAMPLE_NMEA).buffer;
      await loadFile(buffer, 'demo-race.nmea');
    } catch (err) {
      console.error('Failed to load demo data:', err);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={loadDemoData}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors"
      >
        {isLoading ? 'Loading...' : 'Load Demo Data'}
      </button>
      {error && (
        <p className="mt-2 text-red-400 text-sm">
          Error: {error}
        </p>
      )}
    </div>
  );
}