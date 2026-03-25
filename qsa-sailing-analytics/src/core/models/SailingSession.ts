import { SailingRecord } from './SailingRecord';

/**
 * Complete sailing session with metadata and telemetry data
 */
export interface SailingSession {
  /** Session metadata */
  id: string;
  name: string;
  description?: string;

  /** Time bounds */
  startTime: string;  // ISO timestamp
  endTime: string;    // ISO timestamp
  duration: number;   // Duration in seconds

  /** Location and event info */
  location?: string;
  event?: string;
  course?: string;

  /** Boat information */
  boat: {
    name: string;
    class?: string;
    sailNumber?: string;
    length?: number;      // Length Overall in meters
    beam?: number;        // Beam in meters
    displacement?: number; // Displacement in kg
  };

  /** Crew information */
  crew: {
    helmsman?: string;
    tactician?: string;
    trimmer?: string;
    crew?: string[];
  };

  /** Weather conditions */
  conditions?: {
    windSpeedRange?: [number, number];  // [min, max] in knots
    windDirection?: number;              // Average wind direction in degrees
    waveHeight?: number;                 // Significant wave height in meters
    visibility?: string;
    temperature?: number;                // Air temperature in celsius
  };

  /** Telemetry data */
  data: SailingRecord[];

  /** Session statistics */
  stats: {
    totalDistance: number;           // Total distance sailed in NM
    maxSpeed: number;               // Maximum boat speed in knots
    avgSpeed: number;               // Average boat speed in knots
    maxWindSpeed: number;           // Maximum true wind speed in knots
    avgWindSpeed: number;           // Average true wind speed in knots
    maxHeel: number;                // Maximum heel angle in degrees
    racesDetected: number;          // Number of races detected
    maneuversCount: number;         // Total maneuvers (tacks + gybes)
    tacksCount: number;             // Number of tacks
    gybesCount: number;             // Number of gybes
    timeUpwind: number;             // Time spent sailing upwind in seconds
    timeDownwind: number;           // Time spent sailing downwind in seconds
    avgVmgUpwind?: number;          // Average VMG upwind in knots
    avgVmgDownwind?: number;        // Average VMG downwind in knots
  };

  /** File metadata */
  file?: {
    name: string;
    size: number;
    format: string;     // nmea, gpx, csv, expedition, velocitek
    imported: string;   // Import timestamp
    checksum?: string;  // MD5 hash for duplicate detection
  };

  /** Data quality metrics */
  quality: {
    completeness: number;     // 0-1, percentage of expected data points present
    gpsAccuracy: number;      // Average GPS accuracy in meters
    windDataQuality: number;  // 0-1, wind data quality score
    interpolatedPoints: number; // Number of interpolated data points
    gaps: Array<{            // Data gaps > 5 seconds
      start: string;
      end: string;
      duration: number;
    }>;
  };

  /** Analysis results cache */
  analysis?: {
    races?: string[];        // IDs of detected races
    polars?: string[];       // IDs of generated polars
    maneuvers?: string[];    // IDs of detected maneuvers
    lastAnalyzed: string;    // When analysis was last run
    version: string;         // Analysis algorithm version
  };
}

export interface SessionSummary {
  id: string;
  name: string;
  startTime: string;
  duration: number;
  location?: string;
  event?: string;
  boat: { name: string; class?: string };
  stats: {
    totalDistance: number;
    maxSpeed: number;
    avgSpeed: number;
    racesDetected: number;
  };
  file?: { name: string; format: string };
}