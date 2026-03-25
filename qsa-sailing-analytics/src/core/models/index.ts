/**
 * Core data models and interfaces for QSA Sailing Analytics
 *
 * This file exports all the TypeScript interfaces that define
 * the data structures used throughout the application.
 */

// Core data structures
export * from './SailingRecord';
export * from './SailingSession';

// Race and performance analysis
export * from './Race';
export * from './Maneuver';
export * from './Polar';
export * from './StartSequence';

// Data parsing and validation
export * from './Parser';

// Analysis algorithms and results
export * from './Analysis';

// UI and application state types
export * from './UI';

/**
 * Common utility types used across the application
 */

export type Timestamp = string;  // ISO 8601 timestamp string

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TimeRange = {
  start: Timestamp;
  end: Timestamp;
};

export type DataQuality = 'excellent' | 'good' | 'fair' | 'poor';

export type ConfidenceLevel = number;  // 0 to 1

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Application-wide constants
 */
export const CONSTANTS = {
  /** Default data sampling rate in Hz */
  DEFAULT_SAMPLE_RATE: 1,

  /** Maximum interpolation gap in seconds */
  MAX_INTERPOLATION_GAP: 30,

  /** Minimum race duration in seconds */
  MIN_RACE_DURATION: 300, // 5 minutes

  /** Default wind speed bands for polar generation */
  DEFAULT_WIND_BANDS: [6, 8, 10, 12, 14, 16, 18, 20, 25],

  /** Default TWA resolution for polar generation */
  DEFAULT_TWA_RESOLUTION: 5, // degrees

  /** GPS accuracy threshold in meters */
  GPS_ACCURACY_THRESHOLD: 10,

  /** Default units */
  DEFAULT_UNITS: {
    speed: 'knots' as const,
    distance: 'nm' as const,
    angle: 'degrees' as const,
    temperature: 'celsius' as const,
  },
} as const;

/**
 * Error types for the application
 */
export class SailingAnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SailingAnalyticsError';
  }
}

export class ParsingError extends SailingAnalyticsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PARSING_ERROR', details);
    this.name = 'ParsingError';
  }
}

export class AnalysisError extends SailingAnalyticsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ANALYSIS_ERROR', details);
    this.name = 'AnalysisError';
  }
}

export class ValidationError extends SailingAnalyticsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}