/**
 * Parser interfaces for different sailing data formats
 */

import { SailingRecord, SailingSession } from './';

export type SupportedFormat = 'nmea' | 'gpx' | 'csv' | 'expedition' | 'velocitek' | 'bg' | 'sailgp';

export interface ParseResult {
  success: boolean;
  session?: SailingSession;
  error?: string;
  warnings?: string[];
  stats: {
    recordsProcessed: number;
    recordsParsed: number;
    parseTime: number;      // Parse time in milliseconds
    memoryUsed: number;     // Memory used in bytes
  };
}

export interface ParserOptions {
  /** Skip validation for faster parsing */
  skipValidation?: boolean;

  /** Maximum number of records to parse (for testing) */
  maxRecords?: number;

  /** Time zone for timestamp parsing */
  timeZone?: string;

  /** Custom column mappings for CSV */
  columnMapping?: Record<string, string>;

  /** GPS coordinate format */
  coordinateFormat?: 'decimal' | 'dms' | 'auto';

  /** Wind angle convention */
  windAngleConvention?: 'port_negative' | 'port_positive' | 'auto';

  /** Speed units */
  speedUnit?: 'knots' | 'ms' | 'kmh' | 'mph';

  /** Interpolate missing data */
  interpolateGaps?: boolean;

  /** Maximum gap to interpolate (seconds) */
  maxInterpolationGap?: number;

  /** Progress callback for large files */
  onProgress?: (progress: number) => void;
}

export interface BaseParser {
  /** File format this parser handles */
  readonly format: SupportedFormat;

  /** File extensions this parser supports */
  readonly extensions: string[];

  /** MIME types this parser supports */
  readonly mimeTypes: string[];

  /** Detect if this parser can handle the file */
  canParse(buffer: ArrayBuffer, filename?: string): boolean;

  /** Parse the file buffer into a sailing session */
  parse(buffer: ArrayBuffer, filename: string, options?: ParserOptions): Promise<ParseResult>;

  /** Validate parsed data */
  validate(session: SailingSession): { valid: boolean; errors: string[] };
}

/**
 * NMEA 0183 Parser Interface
 */
export interface NmeaParser extends BaseParser {
  format: 'nmea';

  /** Supported NMEA sentence types */
  readonly supportedSentences: string[];

  /** Parse individual NMEA sentence */
  parseSentence(sentence: string): Partial<SailingRecord> | null;

  /** Merge partial records into complete records */
  mergeRecords(partials: Partial<SailingRecord>[], timeWindow?: number): SailingRecord[];
}

/**
 * GPX Parser Interface
 */
export interface GpxParser extends BaseParser {
  format: 'gpx';

  /** Extract track points from GPX */
  extractTrackPoints(gpxXml: string): SailingRecord[];

  /** Extract waypoints as marks */
  extractWaypoints(gpxXml: string): Array<{ name: string; lat: number; lon: number; time?: string }>;
}

/**
 * CSV Parser Interface
 */
export interface CsvParser extends BaseParser {
  format: 'csv';

  /** Auto-detect column mapping from header */
  detectColumns(headers: string[]): Record<string, string>;

  /** Suggest column mappings */
  suggestMapping(headers: string[]): Array<{
    csvColumn: string;
    sailingField: keyof SailingRecord;
    confidence: number;
  }>;
}

/**
 * Expedition Log Parser Interface
 */
export interface ExpeditionParser extends BaseParser {
  format: 'expedition';

  /** Parse Expedition log header */
  parseHeader(lines: string[]): {
    columns: string[];
    units: Record<string, string>;
    startTime: string;
    boat: string;
  };
}

/**
 * Velocitek Parser Interface
 */
export interface VelocitekParser extends BaseParser {
  format: 'velocitek';

  /** Parse VCC binary format */
  parseVcc(buffer: ArrayBuffer): SailingRecord[];

  /** Parse SpeedPuck CSV format */
  parseSpeedPuck(csvData: string): SailingRecord[];
}

/**
 * B&G Parser Interface
 */
export interface BgParser extends BaseParser {
  format: 'bg';

  /** Parse B&G Zeus log format */
  parseZeusLog(buffer: ArrayBuffer): SailingRecord[];

  /** Parse B&G network data */
  parseNetworkData(data: string): SailingRecord[];
}

/**
 * Universal File Loader Interface
 */
export interface UniversalLoader {
  /** Registered parsers */
  readonly parsers: BaseParser[];

  /** Register a new parser */
  registerParser(parser: BaseParser): void;

  /** Auto-detect file format and parse */
  load(buffer: ArrayBuffer, filename: string, options?: ParserOptions): Promise<ParseResult>;

  /** Get appropriate parser for file */
  getParser(buffer: ArrayBuffer, filename?: string): BaseParser | null;

  /** Get parser by format */
  getParserByFormat(format: SupportedFormat): BaseParser | null;

  /** List all supported formats */
  getSupportedFormats(): Array<{
    format: SupportedFormat;
    name: string;
    extensions: string[];
    description: string;
  }>;
}

/**
 * Data validation utilities
 */
export interface DataValidator {
  /** Validate individual sailing record */
  validateRecord(record: SailingRecord): { valid: boolean; errors: string[] };

  /** Validate entire session */
  validateSession(session: SailingSession): { valid: boolean; errors: string[]; warnings: string[] };

  /** Check for common data quality issues */
  checkDataQuality(session: SailingSession): {
    gpsJumps: number;
    speedSpikes: number;
    windSpikes: number;
    missingData: Array<{ field: string; percentage: number }>;
    recommendations: string[];
  };

  /** Sanitize and clean data */
  cleanData(session: SailingSession): SailingSession;
}

/**
 * Parser factory for creating parsers
 */
export interface ParserFactory {
  createNmeaParser(): NmeaParser;
  createGpxParser(): GpxParser;
  createCsvParser(): CsvParser;
  createExpeditionParser(): ExpeditionParser;
  createVelocitekParser(): VelocitekParser;
  createBgParser(): BgParser;
  createUniversalLoader(): UniversalLoader;
  createDataValidator(): DataValidator;
}