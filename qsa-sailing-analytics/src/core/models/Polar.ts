/**
 * Polar diagram and target performance models
 */

export interface PolarDataPoint {
  twa: number;          // True Wind Angle in degrees
  tws: number;          // True Wind Speed in knots
  bsp: number;          // Boat Speed in knots
  vmg: number;          // Velocity Made Good in knots
  count: number;        // Number of data points in this bin
  confidence: number;   // Statistical confidence 0-1

  /** Source data statistics */
  stats: {
    bspStdDev: number;    // Standard deviation of boat speed
    vmgStdDev: number;    // Standard deviation of VMG
    minBsp: number;       // Minimum boat speed in bin
    maxBsp: number;       // Maximum boat speed in bin
    medianBsp: number;    // Median boat speed in bin
  };
}

export interface PolarCurve {
  windSpeed: number;               // Wind speed for this curve in knots
  dataPoints: PolarDataPoint[];   // Data points for this wind speed

  /** Curve characteristics */
  metrics: {
    maxVmgUpwind: number;          // Maximum VMG upwind
    maxVmgDownwind: number;        // Maximum VMG downwind
    optimalTwaUpwind: number;      // Optimal TWA for upwind VMG
    optimalTwaDownwind: number;    // Optimal TWA for downwind VMG
    maxSpeed: number;              // Maximum boat speed on curve
    maxSpeedTwa: number;           // TWA for maximum boat speed
    closeHauledAngle: number;      // Close-hauled angle limit
    runningAngle: number;          // Dead running angle limit
  };

  /** Data quality */
  quality: {
    coverage: number;              // Angle coverage percentage 0-1
    dataQuality: number;           // Overall data quality 0-1
    minDataPoints: number;         // Minimum data points in any bin
    avgDataPoints: number;         // Average data points per bin
  };
}

export interface PolarDiagram {
  id: string;
  sessionId: string;
  name: string;

  /** Generation metadata */
  generated: string;          // Generation timestamp
  algorithm: string;          // Algorithm used
  version: string;            // Algorithm version

  /** Boat configuration */
  boat: {
    name: string;
    class?: string;
    sailConfiguration?: string;  // Main + jib, main + spinnaker, etc.
    weight?: number;             // Crew weight configuration
    conditions?: string;         // Flat water, choppy, etc.
  };

  /** Wind speed curves */
  curves: PolarCurve[];         // One curve per wind speed band
  windSpeedBands: number[];     // Wind speed bands used (6, 8, 10, 12, 14, 16, etc.)

  /** Target data (if available) */
  targets?: {
    source: string;             // Source of target data
    curves: PolarCurve[];       // Target polar curves
    metadata?: {
      designer: string;
      date: string;
      conditions: string;
    };
  };

  /** Performance analysis vs targets */
  analysis?: {
    overallEfficiency: number;    // Overall efficiency vs target 0-1
    upwindEfficiency: number;     // Upwind efficiency vs target
    downwindEfficiency: number;   // Downwind efficiency vs target
    reachEfficiency: number;      // Reaching efficiency vs target

    /** Efficiency by wind speed */
    efficiencyByWindSpeed: Array<{
      windSpeed: number;
      efficiency: number;
      sampleSize: number;
    }>;

    /** Areas for improvement */
    improvements: Array<{
      windSpeed: number;
      twaRange: [number, number];
      currentPerformance: number;
      targetPerformance: number;
      gap: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  };

  /** Export formats */
  export?: {
    csv: string;               // CSV export data
    expedition: string;        // Expedition format
    tacticalSoftware: string;  // Other racing software format
  };
}

export interface PolarTarget {
  twa: number;          // True wind angle
  tws: number;          // True wind speed
  targetBsp: number;    // Target boat speed
  targetVmg: number;    // Target VMG
  tolerance: number;    // Acceptable tolerance +/-
  priority: 'high' | 'medium' | 'low';
}

export interface PolarPerformance {
  sessionId: string;
  polarId?: string;

  /** Real-time performance tracking */
  currentPerformance: {
    efficiency: number;        // Current efficiency vs polar 0-1
    speedDeficit: number;      // Speed deficit vs target in knots
    vmgDeficit: number;        // VMG deficit vs target in knots
    recommendation: string;    // Performance recommendation
  };

  /** Session summary */
  sessionSummary: {
    avgEfficiency: number;     // Average efficiency during session
    timeOnTarget: number;      // Percentage of time within target range
    bestPerformance: number;   // Best efficiency achieved
    worstPerformance: number;  // Worst efficiency in session

    /** Performance by sailing angle */
    upwindPerformance: number;
    reachingPerformance: number;
    downwindPerformance: number;
  };

  /** Performance trends */
  trends: {
    improvementOverTime: number;  // Performance improvement during session
    consistencyScore: number;     // Consistency in hitting targets
    weatherSensitivity: number;   // How much performance varies with conditions
  };

  /** Recommendations */
  recommendations: Array<{
    category: 'sail_trim' | 'helm' | 'crew_work' | 'tactics';
    message: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;              // Estimated performance impact
  }>;
}

export interface PolarComparison {
  baseline: PolarDiagram;
  comparisons: PolarDiagram[];

  /** Comparison metrics */
  metrics: {
    speedComparison: Array<{
      windSpeed: number;
      twa: number;
      baselineSpeed: number;
      comparisonSpeeds: number[];
      differences: number[];
    }>;

    vmgComparison: Array<{
      windSpeed: number;
      baselineVmgUpwind: number;
      baselineVmgDownwind: number;
      comparisonVmgUpwind: number[];
      comparisonVmgDownwind: number[];
    }>;
  };

  /** Overall assessment */
  assessment: {
    bestOverall: string;        // ID of best performing polar
    bestUpwind: string;         // ID of best upwind polar
    bestDownwind: string;       // ID of best downwind polar
    mostConsistent: string;     // ID of most consistent polar
  };
}