/**
 * Analysis result types and algorithm interfaces
 */

import { SailingRecord, SailingSession, Race, Maneuver, PolarDiagram } from './';

export interface AnalysisResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata: {
    algorithm: string;
    version: string;
    processedAt: string;
    processingTime: number;  // milliseconds
    dataQuality: number;     // 0-1
  };
}

/**
 * Race Detection Algorithm Interface
 */
export interface RaceDetector {
  /** Algorithm name and version */
  readonly name: string;
  readonly version: string;

  /** Configuration options */
  options: {
    minRaceDuration: number;        // Minimum race duration in seconds
    maxGapDuration: number;         // Maximum data gap allowed in seconds
    maneuverThreshold: number;      // Minimum maneuvers to consider a race
    speedThreshold: number;         // Minimum average speed for racing
    windAngleThreshold: number;     // Minimum wind angle changes for racing
  };

  /** Detect races in session data */
  detectRaces(session: SailingSession): Promise<AnalysisResult<Race[]>>;

  /** Validate detected races */
  validateRaces(races: Race[], session: SailingSession): Race[];
}

/**
 * Maneuver Detection Algorithm Interface
 */
export interface ManeuverDetector {
  readonly name: string;
  readonly version: string;

  options: {
    headingChangeThreshold: number;   // Minimum heading change for maneuver (degrees)
    windAngleChangeThreshold: number; // Minimum TWA change for maneuver (degrees)
    minDuration: number;              // Minimum maneuver duration (seconds)
    maxDuration: number;              // Maximum maneuver duration (seconds)
    speedChangeThreshold: number;     // Speed change threshold for detection
  };

  /** Detect maneuvers in session data */
  detectManeuvers(session: SailingSession): Promise<AnalysisResult<Maneuver[]>>;

  /** Classify maneuver type */
  classifyManeuver(maneuver: Partial<Maneuver>): 'tack' | 'gybe' | 'mark_rounding' | 'start_sequence';

  /** Rate maneuver execution quality */
  rateExecution(maneuver: Maneuver): { grade: string; score: number; feedback: string[] };
}

/**
 * Polar Builder Algorithm Interface
 */
export interface PolarBuilder {
  readonly name: string;
  readonly version: string;

  options: {
    windSpeedBands: number[];        // Wind speed bands to generate (knots)
    angleResolution: number;         // TWA resolution in degrees
    minDataPoints: number;           // Minimum data points per bin
    outlierThreshold: number;        // Standard deviations for outlier removal
    smoothing: boolean;              // Apply smoothing to polar curves
  };

  /** Build polar diagram from session data */
  buildPolar(session: SailingSession): Promise<AnalysisResult<PolarDiagram>>;

  /** Filter and clean data for polar generation */
  filterData(records: SailingRecord[]): SailingRecord[];

  /** Bin data by wind speed and angle */
  binData(records: SailingRecord[]): Map<string, SailingRecord[]>;

  /** Generate polar curves from binned data */
  generateCurves(binnedData: Map<string, SailingRecord[]>): PolarDiagram['curves'];
}

/**
 * Wind Analysis Algorithm Interface
 */
export interface WindAnalyzer {
  readonly name: string;
  readonly version: string;

  /** Calculate true wind from apparent wind + boat data */
  calculateTrueWind(records: SailingRecord[]): SailingRecord[];

  /** Detect wind shifts */
  detectWindShifts(records: SailingRecord[]): Array<{
    timestamp: string;
    oldDirection: number;
    newDirection: number;
    magnitude: number;
    type: 'header' | 'lift' | 'veer' | 'back';
  }>;

  /** Analyze wind patterns */
  analyzeWindPatterns(records: SailingRecord[]): {
    averageSpeed: number;
    averageDirection: number;
    gustiness: number;        // Coefficient of variation
    persistence: number;      // Direction persistence 0-1
    shiftFrequency: number;   // Shifts per hour
    oscillationPeriod?: number; // Oscillation period in minutes
  };
}

/**
 * Performance Analyzer Interface
 */
export interface PerformanceAnalyzer {
  readonly name: string;
  readonly version: string;

  /** Calculate VMG for all records */
  calculateVmg(records: SailingRecord[]): SailingRecord[];

  /** Analyze performance vs polar targets */
  analyzeVsPolar(session: SailingSession, polar: PolarDiagram): {
    overallEfficiency: number;
    efficiencyByWindSpeed: Array<{ windSpeed: number; efficiency: number }>;
    underperformingConditions: Array<{ windSpeed: number; twa: number; gap: number }>;
    recommendations: string[];
  };

  /** Calculate sailing efficiency metrics */
  calculateEfficiency(records: SailingRecord[]): {
    vmgEfficiency: number;     // VMG vs theoretical max
    speedEfficiency: number;   // Speed vs polar target
    angleEfficiency: number;   // Sailing angle efficiency
    consistencyScore: number;  // Performance consistency
  };
}

/**
 * Course Analysis Interface
 */
export interface CourseAnalyzer {
  readonly name: string;
  readonly version: string;

  /** Analyze race course and legs */
  analyzeCourse(race: Race): {
    courseType: 'windward-leeward' | 'triangle' | 'around-the-buoys' | 'offshore';
    totalDistance: number;
    windwardDistance: number;
    downwindDistance: number;
    reachingDistance: number;
    courseEfficiency: number;  // Actual vs rhumb line distance
  };

  /** Detect mark roundings */
  detectMarkRoundings(records: SailingRecord[]): Array<{
    timestamp: string;
    position: { latitude: number; longitude: number };
    type: 'windward' | 'leeward' | 'gate';
    quality: number;  // Rounding quality 0-1
  }>;

  /** Calculate leg performance */
  analyzeLeg(records: SailingRecord[], legType: 'upwind' | 'downwind' | 'reach'): {
    avgSpeed: number;
    avgVmg: number;
    distance: number;
    duration: number;
    efficiency: number;
    trackingError: number;  // Average distance from optimal track
  };
}

/**
 * Data Processing Pipeline Interface
 */
export interface AnalysisPipeline {
  /** Registered analyzers */
  readonly analyzers: {
    raceDetector?: RaceDetector;
    maneuverDetector?: ManeuverDetector;
    polarBuilder?: PolarBuilder;
    windAnalyzer?: WindAnalyzer;
    performanceAnalyzer?: PerformanceAnalyzer;
    courseAnalyzer?: CourseAnalyzer;
  };

  /** Register analyzers */
  registerRaceDetector(detector: RaceDetector): void;
  registerManeuverDetector(detector: ManeuverDetector): void;
  registerPolarBuilder(builder: PolarBuilder): void;
  registerWindAnalyzer(analyzer: WindAnalyzer): void;
  registerPerformanceAnalyzer(analyzer: PerformanceAnalyzer): void;
  registerCourseAnalyzer(analyzer: CourseAnalyzer): void;

  /** Run full analysis pipeline */
  runFullAnalysis(session: SailingSession): Promise<{
    races: Race[];
    maneuvers: Maneuver[];
    polar: PolarDiagram;
    windAnalysis: any;
    performance: any;
    processingTime: number;
    errors: string[];
    warnings: string[];
  }>;

  /** Run specific analysis step */
  runStep(step: string, session: SailingSession): Promise<AnalysisResult>;
}

/**
 * Analysis Configuration
 */
export interface AnalysisConfig {
  algorithms: {
    raceDetection: string;      // Algorithm name to use
    maneuverDetection: string;
    polarGeneration: string;
    windAnalysis: string;
    performance: string;
    course: string;
  };

  /** Global processing options */
  processing: {
    useWebWorkers: boolean;     // Use Web Workers for heavy computation
    maxWorkers: number;         // Maximum number of workers
    chunkSize: number;          // Data chunk size for parallel processing
    timeoutMs: number;          // Analysis timeout in milliseconds
  };

  /** Data quality thresholds */
  quality: {
    minGpsAccuracy: number;     // Minimum GPS accuracy in meters
    maxSpeedSpike: number;      // Maximum allowed speed spike
    maxWindSpike: number;       // Maximum allowed wind spike
    minDataCompleteness: number; // Minimum data completeness 0-1
  };

  /** Output preferences */
  output: {
    precision: number;          // Decimal precision for numbers
    units: {
      speed: 'knots' | 'ms' | 'kmh';
      distance: 'nm' | 'km' | 'm';
      angle: 'degrees' | 'radians';
    };
    includeRawData: boolean;    // Include raw data in results
    compression: boolean;       // Compress analysis results
  };
}