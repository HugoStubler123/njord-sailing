/**
 * Race start sequence analysis models
 */

export interface StartLine {
  id: string;
  name: string;

  /** Start line endpoints */
  pin: {
    latitude: number;
    longitude: number;
    name?: string;          // Pin boat name or mark name
  };

  boat: {
    latitude: number;
    longitude: number;
    name?: string;          // Committee boat name
  };

  /** Line characteristics */
  length: number;           // Start line length in meters
  bearing: number;          // True bearing of start line in degrees
  bias: number;            // Line bias in degrees (+ = port favored)

  /** Wind conditions at start */
  windDirection: number;    // True wind direction at start
  windSpeed: number;       // Wind speed at start in knots
  windShift: number;       // Wind shift during sequence in degrees
}

export interface StartingPosition {
  timestamp: string;
  position: {
    latitude: number;
    longitude: number;
  };

  /** Position relative to start line */
  distanceFromLine: number;    // Distance from start line in meters (+ = pre-start side)
  distanceFromPin: number;     // Distance from pin end in meters
  distanceFromBoat: number;    // Distance from boat end in meters
  positionOnLine: number;      // Position along line 0-1 (0 = pin, 1 = boat)

  /** Speed and heading */
  speed: number;              // Boat speed in knots
  heading: number;            // Boat heading in degrees
  courseToStart: number;      // Course needed to reach start line

  /** Tactical position */
  rightOfWayPosition: boolean;  // True if in right-of-way position
  clearAir: boolean;           // True if in clear air
  roomToAccelerate: boolean;   // True if room to accelerate
}

export interface StartSequence {
  id: string;
  raceId: string;
  sessionId: string;

  /** Sequence timing */
  sequenceStart: string;      // When start sequence began (usually -5:00)
  warningSignal: string;      // Warning signal time (usually -4:00)
  preparatorySignal: string;  // Preparatory signal time (usually -1:00)
  startSignal: string;        // Actual start signal time (0:00)

  /** Start line configuration */
  startLine: StartLine;

  /** Boat positions throughout sequence */
  positions: StartingPosition[];  // Position samples throughout sequence

  /** Key moments analysis */
  keyMoments: {
    /** At warning signal (-4:00) */
    warning: {
      position: StartingPosition;
      analysis: string;
    };

    /** At preparatory signal (-1:00) */
    preparatory: {
      position: StartingPosition;
      analysis: string;
    };

    /** At 30 seconds */
    thirtySeconds: {
      position: StartingPosition;
      speed: number;
      acceleration: number;
      analysis: string;
    };

    /** At start signal */
    start: {
      position: StartingPosition;
      speed: number;
      acceleration: number;
      timeError: number;        // Seconds early (-) or late (+)
      analysis: string;
    };

    /** 30 seconds after start */
    postStart: {
      position: StartingPosition;
      speed: number;
      ranking?: number;         // Estimated position in fleet
      analysis: string;
    };
  };

  /** Start execution analysis */
  execution: {
    startQuality: 'excellent' | 'good' | 'average' | 'poor' | 'ocs';
    timeError: number;          // Time error at start in seconds
    speedAtStart: number;       // Speed at start gun
    accelerationPhase: {
      startTime: string;        // When acceleration began
      duration: number;         // Acceleration duration in seconds
      initialSpeed: number;     // Speed when acceleration started
      finalSpeed: number;       // Speed at start gun
      efficiency: number;       // Acceleration efficiency 0-1
    };

    lineBias: number;          // Line bias at start (-180 to 180)
    endFavored: 'pin' | 'boat' | 'neutral';  // Which end was favored
    endChosen: 'pin' | 'boat' | 'middle';    // Which end was chosen

    tacticalScore: number;     // Overall tactical score 0-100
  };

  /** Environmental factors */
  conditions: {
    windSpeed: number;         // Average wind speed during sequence
    windDirection: number;     // Average wind direction during sequence
    windShift: number;         // Total wind shift during sequence
    currentSet: number;        // Current direction in degrees
    currentDrift: number;      // Current speed in knots
    waveState: string;         // Wave conditions
  };

  /** Fleet context (if available) */
  fleet?: {
    totalBoats: number;
    estimatedPosition: number;     // Estimated position at start (1 = best)
    nearbyBoats: Array<{
      id: string;
      name?: string;
      position: StartingPosition;
      threat: 'high' | 'medium' | 'low';
    }>;
  };

  /** Performance metrics */
  metrics: {
    overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    speedBuildup: number;      // Speed building efficiency 0-1
    positioning: number;       // Positioning score 0-1
    timing: number;           // Timing accuracy 0-1
    tactics: number;          // Tactical execution 0-1
    cleanStart: boolean;      // Clean start achieved
    rightOfWay: number;       // Percentage of time in right of way
  };

  /** Comparison and benchmarks */
  benchmarks?: {
    personalBest: StartSequence;
    classBest: StartSequence;
    recommendations: string[];
  };

  /** Data quality */
  quality: {
    positionAccuracy: number;  // GPS accuracy during sequence
    dataCompleteness: number;  // Data completeness 0-1
    windDataQuality: number;   // Wind data quality 0-1
  };
}

export interface StartAnalysis {
  sessionId: string;
  totalStarts: number;

  /** Performance summary */
  summary: {
    avgGrade: string;              // Average grade across all starts
    avgTimeError: number;          // Average time error in seconds
    avgSpeedAtStart: number;       // Average speed at start
    cleanStarts: number;           // Number of clean starts
    ocsCount: number;              // Number of OCS starts
    avgTacticalScore: number;      // Average tactical score

    bestStart: StartSequence;      // Best start in session
    worstStart: StartSequence;     // Worst start in session
  };

  /** Trends and patterns */
  trends: {
    improvementOverTime: number;   // Improvement trend
    consistencyScore: number;      // Consistency in execution
    preferredStrategy: string;     // Pin, boat, or middle preference
    strengthsWeaknesses: {
      speedBuildup: 'strength' | 'weakness' | 'average';
      positioning: 'strength' | 'weakness' | 'average';
      timing: 'strength' | 'weakness' | 'average';
      tactics: 'strength' | 'weakness' | 'average';
    };
  };

  /** Recommendations for improvement */
  recommendations: Array<{
    category: 'speed_building' | 'positioning' | 'timing' | 'tactics';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImprovement: number;  // Expected improvement in tactical score
  }>;
}