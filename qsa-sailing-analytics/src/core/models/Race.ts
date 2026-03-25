/**
 * Race detection and analysis models
 */

export interface Mark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'start' | 'windward' | 'leeward' | 'gate' | 'finish' | 'offset';
  roundingDirection?: 'port' | 'starboard';
}

export interface Leg {
  id: string;
  raceId: string;
  legNumber: number;

  /** Time bounds */
  startTime: string;
  endTime: string;
  duration: number; // seconds

  /** Start and finish marks */
  fromMark?: Mark;
  toMark?: Mark;

  /** Leg characteristics */
  type: 'upwind' | 'downwind' | 'reach';
  targetTwa: number;     // Target true wind angle for this leg
  distance: number;      // Leg distance in nautical miles
  bearing: number;       // True bearing from start to finish in degrees

  /** Performance metrics */
  stats: {
    avgSpeed: number;           // Average boat speed in knots
    maxSpeed: number;           // Maximum boat speed in knots
    avgVmg: number;             // Average VMG in knots
    maxVmg: number;             // Maximum VMG in knots
    avgTwa: number;             // Average true wind angle in degrees
    avgTws: number;             // Average true wind speed in knots
    distanceSailed: number;     // Actual distance sailed in NM
    vmgEfficiency: number;      // VMG efficiency vs target (0-1)
    speedEfficiency: number;    // Speed efficiency vs target (0-1)
    trackingError: number;      // Average distance from rhumb line in meters
    tacksCount?: number;        // Number of tacks on this leg
    gybesCount?: number;        // Number of gybes on this leg
    timeOnStarboard?: number;   // Time on starboard tack in seconds
    timeOnPort?: number;        // Time on port tack in seconds
  };

  /** Data indices for quick access */
  dataRange: {
    startIndex: number;  // Index in session data array
    endIndex: number;    // Index in session data array
  };

  /** Weather conditions during leg */
  conditions: {
    avgWindSpeed: number;     // Average TWS during leg
    windSpeedRange: [number, number]; // [min, max] TWS
    avgWindDirection: number; // Average TWD during leg
    windShifts: number;       // Number of significant wind shifts
  };

  /** Quality metrics */
  quality: {
    completeness: number;     // Data completeness 0-1
    gpsAccuracy: number;      // Average GPS accuracy in meters
    confidence: number;       // Detection confidence 0-1
  };
}

export interface Race {
  id: string;
  sessionId: string;

  /** Race metadata */
  name: string;
  number?: number;        // Race number in series
  class?: string;         // Race class/division
  course?: string;        // Course configuration

  /** Time bounds */
  startTime: string;      // Race start time (gun)
  endTime: string;        // Race finish time
  duration: number;       // Total race duration in seconds

  /** Pre-start sequence */
  preStart?: {
    sequenceStart: string;    // When pre-start sequence began
    warning: string;          // Warning signal time
    preparatory: string;      // Preparatory signal time
    startGun: string;         // Actual start time
    startLinePosition: {      // Position at start
      latitude: number;
      longitude: number;
      distanceFromLine: number; // Distance from start line in meters
      speed: number;           // Speed at start in knots
    };
    startQuality: 'early' | 'onTime' | 'late' | 'ocs'; // Start quality assessment
  };

  /** Race course */
  course_config?: {
    type: 'windward-leeward' | 'triangle' | 'around-the-buoys' | 'offshore';
    marks: Mark[];
    laps: number;
  };

  /** Race legs */
  legs: Leg[];

  /** Overall race performance */
  performance: {
    totalDistance: number;        // Total distance sailed in NM
    rhumbLineDistance: number;    // Direct distance in NM
    distanceEfficiency: number;   // Rhumb / actual distance
    avgSpeed: number;             // Average speed over entire race
    avgVmg: number;              // Average VMG over entire race
    avgVmgUpwind: number;        // Average VMG upwind
    avgVmgDownwind: number;      // Average VMG downwind
    finishPosition?: number;      // Finish position if available
    finishTime?: string;          // Finish time
    totalTacks: number;           // Total tacks in race
    totalGybes: number;           // Total gybes in race
  };

  /** Weather summary */
  conditions: {
    avgWindSpeed: number;
    windSpeedRange: [number, number];
    avgWindDirection: number;
    windStability: number;        // Wind direction stability 0-1
    gustiness: number;            // Wind speed variation coefficient
  };

  /** Detection metadata */
  detection: {
    method: 'automatic' | 'manual' | 'imported';
    confidence: number;           // 0-1 confidence in race detection
    detectedAt: string;           // When this race was detected
    algorithm: string;            // Detection algorithm used
  };

  /** Quality assessment */
  quality: {
    dataCompleteness: number;     // 0-1
    trackingAccuracy: number;     // GPS accuracy during race
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface RaceComparison {
  races: Race[];
  metrics: {
    avgSpeedComparison: number[];
    vmgComparison: number[];
    distanceEfficiencyComparison: number[];
    maneuverCountComparison: number[];
  };
  weather: {
    windSpeedRanges: [number, number][];
    windDirections: number[];
  };
}