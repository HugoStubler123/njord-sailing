/**
 * CSV Parser Implementation
 * Parses sailing data from CSV files with configurable column mapping
 */

import type { CsvParser, ParserOptions, ParseResult } from '../models/Parser';
import type { SailingRecord, SailingSession } from '../models';
import { generateId } from '../utils/id';
import { isValidSpeed, isValidAngle, isValidCoordinate, isValidTimestamp } from '../utils/validation';

export class CsvParserImpl implements CsvParser {
  readonly format = 'csv' as const;
  readonly extensions = ['.csv', '.txt'];
  readonly mimeTypes = ['text/csv', 'text/plain', 'application/csv'];

  // Common column name variations for auto-detection
  private readonly columnMappings = {
    timestamp: ['time', 'timestamp', 'date', 'datetime', 'utc', 'gmt', 'local_time'],
    latitude: ['lat', 'latitude', 'lat_deg', 'position_lat', 'gps_lat'],
    longitude: ['lon', 'lng', 'longitude', 'lon_deg', 'position_lon', 'gps_lon'],
    bsp: ['bsp', 'boat_speed', 'stw', 'speed_through_water', 'boatspeed', 'boat_spd'],
    sog: ['sog', 'speed_over_ground', 'gps_speed', 'ground_speed', 'speed'],
    cog: ['cog', 'course_over_ground', 'gps_course', 'course', 'heading_gps'],
    hdg: ['hdg', 'heading', 'compass', 'mag_heading', 'magnetic_heading'],
    tws: ['tws', 'true_wind_speed', 'wind_speed_true', 'true_wind_spd'],
    twa: ['twa', 'true_wind_angle', 'wind_angle_true', 'true_wind_dir'],
    twd: ['twd', 'true_wind_direction', 'wind_direction_true'],
    aws: ['aws', 'apparent_wind_speed', 'wind_speed_apparent', 'app_wind_spd'],
    awa: ['awa', 'apparent_wind_angle', 'wind_angle_apparent', 'app_wind_dir'],
    heel: ['heel', 'heel_angle', 'roll', 'list'],
    trim: ['trim', 'pitch', 'bow_down'],
    rudder: ['rudder', 'rudder_angle', 'helm'],
    depth: ['depth', 'water_depth', 'depth_below_keel', 'sounder'],
    vmg: ['vmg', 'velocity_made_good', 'vmg_upwind', 'vmg_downwind'],
    waterTemp: ['water_temp', 'water_temperature', 'sea_temp'],
    airTemp: ['air_temp', 'air_temperature', 'outside_temp'],
  };

  canParse(buffer: ArrayBuffer, filename?: string): boolean {
    const text = new TextDecoder().decode(buffer.slice(0, 2048));

    // Check for CSV-like structure
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    // Should have multiple columns
    const maxSeparatorCount = Math.max(commaCount, semicolonCount, tabCount);
    if (maxSeparatorCount < 2) return false;

    // Check if second line has similar structure
    if (lines.length > 1) {
      const secondLine = lines[1];
      const secondCommaCount = (secondLine.match(/,/g) || []).length;
      const secondSemicolonCount = (secondLine.match(/;/g) || []).length;
      const secondTabCount = (secondLine.match(/\t/g) || []).length;
      const secondMaxCount = Math.max(secondCommaCount, secondSemicolonCount, secondTabCount);

      // Column counts should be similar
      if (Math.abs(maxSeparatorCount - secondMaxCount) > 2) return false;
    }

    // Check filename extension
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      return this.extensions.includes(`.${ext}`);
    }

    return true;
  }

  async parse(buffer: ArrayBuffer, filename: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsParsed = 0;

    try {
      const text = new TextDecoder().decode(buffer);
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row');
      }

      // Detect separator
      const separator = this.detectSeparator(lines[0]);

      // Parse header
      const headers = this.parseRow(lines[0], separator);

      // Detect column mapping
      const columnMapping = options.columnMapping || this.detectColumns(headers);

      const records: SailingRecord[] = [];
      const warnings: string[] = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        recordsProcessed++;

        if (options.maxRecords && recordsParsed >= options.maxRecords) {
          break;
        }

        const row = this.parseRow(lines[i], separator);
        if (row.length === 0) continue;

        try {
          const record = this.parseRecord(row, headers, columnMapping, options);
          if (record) {
            records.push(record);
            recordsParsed++;

            // Progress callback
            if (options.onProgress && recordsParsed % 1000 === 0) {
              options.onProgress(recordsParsed / lines.length);
            }
          }
        } catch (error) {
          warnings.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      if (records.length === 0) {
        throw new Error('No valid records could be parsed');
      }

      // Sort records by timestamp
      records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Create session
      const session = this.createSession(records, filename, options);

      // Validate if requested
      if (!options.skipValidation) {
        const validation = this.validate(session);
        if (!validation.valid) {
          return {
            success: false,
            error: `Validation failed: ${validation.errors.join(', ')}`,
            warnings,
            stats: {
              recordsProcessed,
              recordsParsed,
              parseTime: Date.now() - startTime,
              memoryUsed: JSON.stringify(records).length,
            },
          };
        }
      }

      return {
        success: true,
        session,
        warnings: warnings.length > 0 ? warnings : undefined,
        stats: {
          recordsProcessed,
          recordsParsed,
          parseTime: Date.now() - startTime,
          memoryUsed: JSON.stringify(session).length,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        stats: {
          recordsProcessed,
          recordsParsed,
          parseTime: Date.now() - startTime,
          memoryUsed: 0,
        },
      };
    }
  }

  private detectSeparator(headerLine: string): string {
    const separators = [',', ';', '\t', '|'];
    let bestSeparator = ',';
    let maxCount = 0;

    for (const sep of separators) {
      const count = (headerLine.match(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestSeparator = sep;
      }
    }

    return bestSeparator;
  }

  private parseRow(row: string, separator: string): string[] {
    // Simple CSV parsing (doesn't handle quoted fields with separators)
    return row.split(separator).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
  }

  detectColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '_');

      for (const [fieldName, variations] of Object.entries(this.columnMappings)) {
        for (const variation of variations) {
          if (header.includes(variation.toLowerCase())) {
            mapping[fieldName] = headers[i];
            break;
          }
        }
        if (mapping[fieldName]) break;
      }
    }

    return mapping;
  }

  suggestMapping(headers: string[]): Array<{
    csvColumn: string;
    sailingField: keyof SailingRecord;
    confidence: number;
  }> {
    const suggestions: Array<{
      csvColumn: string;
      sailingField: keyof SailingRecord;
      confidence: number;
    }> = [];

    for (const header of headers) {
      const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let bestMatch: { field: keyof SailingRecord; confidence: number } | null = null;

      for (const [fieldName, variations] of Object.entries(this.columnMappings)) {
        for (const variation of variations) {
          if (headerLower === variation) {
            bestMatch = { field: fieldName as keyof SailingRecord, confidence: 1.0 };
            break;
          } else if (headerLower.includes(variation)) {
            const confidence = variation.length / headerLower.length;
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { field: fieldName as keyof SailingRecord, confidence };
            }
          }
        }
        if (bestMatch && bestMatch.confidence === 1.0) break;
      }

      if (bestMatch && bestMatch.confidence > 0.5) {
        suggestions.push({
          csvColumn: header,
          sailingField: bestMatch.field,
          confidence: bestMatch.confidence,
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private parseRecord(
    row: string[],
    headers: string[],
    columnMapping: Record<string, string>,
    options: ParserOptions
  ): SailingRecord | null {
    const record: Partial<SailingRecord> = {};

    // Create index mapping
    const headerIndex: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerIndex[header] = index;
    });

    // Parse each mapped field
    for (const [fieldName, csvColumn] of Object.entries(columnMapping)) {
      const columnIndex = headerIndex[csvColumn];
      if (columnIndex === undefined || columnIndex >= row.length) continue;

      const value = row[columnIndex];
      if (!value || value === '') continue;

      try {
        switch (fieldName) {
          case 'timestamp':
            record.timestamp = this.parseTimestamp(value, options);
            break;

          case 'latitude':
          case 'longitude':
            const coord = this.parseCoordinate(value, fieldName);
            if (coord !== undefined) {
              record[fieldName] = coord;
            }
            break;

          case 'bsp':
          case 'sog':
          case 'tws':
          case 'aws':
            const speed = this.parseSpeed(value);
            if (speed !== undefined) {
              record[fieldName] = speed;
            }
            break;

          case 'twa':
          case 'awa':
            const windAngle = this.parseAngle(value, -180, 180);
            if (windAngle !== undefined) {
              record[fieldName] = windAngle;
            }
            break;

          case 'hdg':
          case 'cog':
          case 'twd':
            const heading = this.parseAngle(value, 0, 360);
            if (heading !== undefined) {
              record[fieldName] = heading;
            }
            break;

          case 'heel':
          case 'trim':
          case 'rudder':
            const angle = this.parseAngle(value, -90, 90);
            if (angle !== undefined) {
              record[fieldName] = angle;
            }
            break;

          case 'depth':
          case 'vmg':
          case 'waterTemp':
          case 'airTemp':
            const numValue = this.parseNumber(value);
            if (numValue !== undefined) {
              record[fieldName] = numValue;
            }
            break;
        }
      } catch (error) {
        // Skip invalid values
        continue;
      }
    }

    // Must have timestamp and at least one other field
    if (!record.timestamp || Object.keys(record).length < 2) {
      return null;
    }

    return record as SailingRecord;
  }

  private parseTimestamp(value: string, options: ParserOptions): string {
    // Try various timestamp formats
    const formats = [
      // ISO formats
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      // Date and time
      /^\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d{3})?$/,
      // Unix timestamp (seconds)
      /^\d{10}(\.\d{3})?$/,
      // Excel serial date
      /^\d{5}(\.\d+)?$/,
    ];

    let timestamp: string;

    // Unix timestamp
    if (/^\d{10}(\.\d{3})?$/.test(value)) {
      const unixTime = parseFloat(value) * 1000; // Convert to milliseconds
      timestamp = new Date(unixTime).toISOString();
    }
    // Excel serial date
    else if (/^\d{5}(\.\d+)?$/.test(value)) {
      const excelEpoch = new Date(1899, 11, 30); // Excel epoch
      const days = parseFloat(value);
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      timestamp = date.toISOString();
    }
    // Try direct parsing
    else {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid timestamp format: ${value}`);
      }
      timestamp = date.toISOString();
    }

    if (!isValidTimestamp(timestamp)) {
      throw new Error(`Invalid timestamp: ${value}`);
    }

    return timestamp;
  }

  private parseCoordinate(value: string, type: 'latitude' | 'longitude'): number | undefined {
    const num = parseFloat(value);
    if (isNaN(num)) return undefined;

    const bounds = type === 'latitude' ? [-90, 90] : [-180, 180];
    return isValidCoordinate(num, bounds[0], bounds[1]) ? num : undefined;
  }

  private parseSpeed(value: string): number | undefined {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : isValidSpeed(num) ? num : undefined;
  }

  private parseAngle(value: string, min: number, max: number): number | undefined {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : isValidAngle(num, min, max) ? num : undefined;
  }

  private parseNumber(value: string): number | undefined {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  private createSession(records: SailingRecord[], filename: string, options: ParserOptions): SailingSession {
    const startTime = records[0].timestamp;
    const endTime = records[records.length - 1].timestamp;
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

    // Calculate basic statistics
    const speeds = records.map(r => r.bsp || r.sog).filter((s): s is number => s !== undefined);
    const windSpeeds = records.map(r => r.tws).filter((s): s is number => s !== undefined);

    return {
      id: generateId(),
      name: filename.replace(/\.[^/.]+$/, ''),
      startTime,
      endTime,
      duration,
      boat: {
        name: 'Unknown Boat',
      },
      crew: {},
      data: records,
      stats: {
        totalDistance: 0, // Will be calculated later
        maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        maxWindSpeed: windSpeeds.length > 0 ? Math.max(...windSpeeds) : 0,
        avgWindSpeed: windSpeeds.length > 0 ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length : 0,
        maxHeel: records.map(r => r.heel).filter((h): h is number => h !== undefined).reduce((a, b) => Math.max(a, Math.abs(b)), 0) || 0,
        racesDetected: 0,
        maneuversCount: 0,
        tacksCount: 0,
        gybesCount: 0,
        timeUpwind: 0,
        timeDownwind: 0,
      },
      quality: {
        completeness: this.calculateCompleteness(records),
        gpsAccuracy: 10, // Unknown GPS accuracy for CSV
        windDataQuality: this.calculateWindDataQuality(records),
        interpolatedPoints: 0,
        gaps: [],
      },
      file: {
        name: filename,
        size: JSON.stringify(records).length,
        format: 'csv',
        imported: new Date().toISOString(),
      },
    };
  }

  private calculateCompleteness(records: SailingRecord[]): number {
    if (records.length === 0) return 0;

    const fields = ['timestamp', 'latitude', 'longitude', 'bsp', 'tws', 'hdg'];
    let totalFields = 0;
    let presentFields = 0;

    for (const record of records) {
      totalFields += fields.length;
      presentFields += fields.filter(field => record[field as keyof SailingRecord] !== undefined).length;
    }

    return totalFields > 0 ? presentFields / totalFields : 0;
  }

  private calculateWindDataQuality(records: SailingRecord[]): number {
    if (records.length === 0) return 0;

    let hasWindData = 0;
    for (const record of records) {
      if (record.tws !== undefined || record.aws !== undefined ||
          record.twa !== undefined || record.awa !== undefined) {
        hasWindData++;
      }
    }

    return hasWindData / records.length;
  }

  validate(session: SailingSession): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (session.data.length === 0) {
      errors.push('No data records found');
    }

    if (session.duration <= 0) {
      errors.push('Invalid duration');
    }

    // Check for minimum data quality
    if (session.quality.completeness < 0.2) {
      errors.push('Data completeness too low (< 20%)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}