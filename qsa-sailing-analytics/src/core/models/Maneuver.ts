/**
 * Maneuver detection and analysis models
 */

export type ManeuverType = 'tack' | 'gybe' | 'mark_rounding' | 'start_sequence';

export interface ManeuverPhase {
  phase: 'entry' | 'turn' | 'exit';
  startTime: string;
  endTime: string;
  duration: number;  // seconds

  /** Performance metrics for this phase */
  avgSpeed: number;
  avgHeel: number;
  avgRudderAngle?: number;
  headingChange: number;  // Total heading change in degrees
  speedLoss: number;      // Speed lost during this phase
}

export interface Maneuver {
  id: string;
  sessionId: string;
  raceId?: string;
  legId?: string;

  /** Maneuver identification */
  type: ManeuverType;
  subtype?: string;  // 'port_tack', 'starboard_tack', 'windward_rounding', etc.

  /** Time bounds */
  startTime: string;    // When maneuver initiation began
  endTime: string;      // When maneuver was completed
  duration: number;     // Total maneuver time in seconds

  /** Pre-maneuver state */
  entry: {
    speed: number;           // Entry speed in knots
    heading: number;         // Entry heading in degrees
    twa: number;            // Entry true wind angle
    heel: number;           // Entry heel angle
    vmg: number;            // Entry VMG
    rudderAngle?: number;    // Entry rudder position
    position: {
      latitude: number;
      longitude: number;
    };
  };

  /** Post-maneuver state */
  exit: {
    speed: number;           // Exit speed in knots
    heading: number;         // Exit heading in degrees
    twa: number;            // Exit true wind angle
    heel: number;           // Exit heel angle
    vmg: number;            // Exit VMG
    rudderAngle?: number;    // Exit rudder position
    position: {
      latitude: number;
      longitude: number;
    };
  };

  /** Maneuver execution metrics */
  execution: {
    headingChange: number;      // Total heading change in degrees
    turnRate: number;           // Average turn rate in deg/sec
    maxTurnRate: number;        // Peak turn rate in deg/sec
    speedLoss: number;          // Speed lost during maneuver in knots
    vmgLoss: number;            // VMG lost during maneuver in knots
    distanceLost: number;       // Distance lost in meters
    timeLost: number;           // Time lost vs perfect maneuver in seconds
    maxHeel: number;            // Maximum heel during maneuver
    rudderWork: number;         // Total rudder movement in degrees
    smoothness: number;         // Execution smoothness score 0-1
  };

  /** Maneuver phases */
  phases: ManeuverPhase[];

  /** Environmental conditions */
  conditions: {
    windSpeed: number;          // Average wind speed during maneuver
    windDirection: number;      // Wind direction during maneuver
    waveState?: string;         // Wave conditions
    current?: {                 // Current conditions if available
      speed: number;
      direction: number;
    };
  };

  /** Quality and confidence */
  quality: {
    detection_confidence: number;  // 0-1 confidence in detection
    execution_grade: 'A' | 'B' | 'C' | 'D' | 'F';  // Overall execution grade
    dataQuality: number;          // 0-1 data quality during maneuver
    gpsAccuracy: number;          // GPS accuracy in meters
  };

  /** Data references */
  dataRange: {
    startIndex: number;     // Index in session data
    endIndex: number;       // Index in session data
  };

  /** Comparison baseline */
  benchmarks?: {
    targetDuration: number;     // Target maneuver duration
    targetSpeedLoss: number;    // Target speed loss
    targetVmgLoss: number;      // Target VMG loss
    classAverage: number;       // Class average performance
    personalBest: number;       // Personal best performance
  };
}

export interface ManeuverAnalysis {
  sessionId: string;
  totalManeuvers: number;

  /** Breakdown by type */
  breakdown: {
    tacks: number;
    gybes: number;
    markRoundings: number;
    startSequences: number;
  };

  /** Performance statistics */
  stats: {
    avgTackDuration: number;
    avgGybeDuration: number;
    avgTackSpeedLoss: number;
    avgGybeSpeedLoss: number;
    avgTackVmgLoss: number;
    avgGybeVmgLoss: number;
    bestTackTime: number;
    bestGybeTime: number;
    worstTackTime: number;
    worstGybeTime: number;
  };

  /** Quality distribution */
  qualityDistribution: {
    excellent: number;    // Grade A maneuvers
    good: number;         // Grade B maneuvers
    average: number;      // Grade C maneuvers
    poor: number;         // Grade D maneuvers
    failed: number;       // Grade F maneuvers
  };

  /** Trends */
  trends: {
    improvementOverTime: number;    // Performance improvement coefficient
    consistencyScore: number;       // Consistency in execution 0-1
    fatigueEffect: number;          // Performance degradation over time
  };

  /** Recommendations */
  recommendations: string[];
}

export interface ManeuverComparison {
  maneuvers: Maneuver[];
  baseline: Maneuver;  // Reference maneuver for comparison

  metrics: {
    durationComparison: number[];
    speedLossComparison: number[];
    vmgLossComparison: number[];
    smoothnessComparison: number[];
  };

  bestPractices: {
    fastestExecution: Maneuver;
    smoothestExecution: Maneuver;
    mostEfficient: Maneuver;
  };
}