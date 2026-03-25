/**
 * Expedition Log Parser Implementation
 * Parses Expedition racing software log files
 */

import type { ExpeditionParser, ParserOptions, ParseResult } from '../models/Parser';
import type { SailingRecord, SailingSession } from '../models';
import { generateId } from '../utils/id';
import { isValidSpeed, isValidAngle, isValidCoordinate } from '../utils/validation';

export class ExpeditionParserImpl implements ExpeditionParser {
  readonly format = 'expedition' as const;
  readonly extensions = ['.log', '.txt', '.exp'];
  readonly mimeTypes = ['text/plain', 'application/octet-stream'];

  canParse(buffer: ArrayBuffer, filename?: string): boolean {
    const text = new TextDecoder().decode(buffer.slice(0, 2048));

    // Check for Expedition log header patterns
    if (text.includes('!AIVDM') || text.includes('Expedition')) return true;
    if (text.includes('Time,Lat,Lng,SOG,COG,TWD,TWS,AWA,AWS,BSP,HDG')) return true;

    // Check filename
    if (filename?.toLowerCase().includes('expedition')) return true;

    return false;
  }

  async parse(buffer: ArrayBuffer, filename: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsParsed = 0;

    try {
      const text = new TextDecoder().decode(buffer);
      const lines = text.split('\n').filter(line => line.trim());

      // Parse header to understand format
      const header = this.parseHeader(lines);

      const records: SailingRecord[] = [];
      let dataStartIndex = 0;

      // Find start of data (skip header lines)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Time') && lines[i].includes(',')) {
          dataStartIndex = i + 1;
          break;
        }
      }

      // Parse data lines
      for (let i = dataStartIndex; i < lines.length; i++) {
        recordsProcessed++;

        if (options.maxRecords && recordsParsed >= options.maxRecords) {
          break;
        }

        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        const record = this.parseDataLine(line, header.columns);
        if (record) {
          records.push(record);
          recordsParsed++;

          if (options.onProgress && recordsParsed % 1000 === 0) {
            options.onProgress(recordsParsed / (lines.length - dataStartIndex));
          }
        }
      }

      if (records.length === 0) {
        throw new Error('No valid data records found');
      }

      // Sort by timestamp
      records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Create session
      const session = this.createSession(records, header, filename);

      return {
        success: true,
        session,
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

  parseHeader(lines: string[]): {
    columns: string[];
    units: Record<string, string>;
    startTime: string;
    boat: string;
  } {
    const columns: string[] = [];
    const units: Record<string, string> = {};
    let startTime = new Date().toISOString();
    let boat = 'Unknown Boat';

    for (const line of lines) {
      // Look for column header
      if (line.includes('Time') && line.includes(',')) {
        const cols = line.split(',').map(col => col.trim());
        columns.push(...cols);
        break;
      }

      // Extract metadata
      if (line.includes('Boat:')) {
        boat = line.split('Boat:')[1]?.trim() || boat;
      }

      if (line.includes('Start:')) {
        const timeStr = line.split('Start:')[1]?.trim();
        if (timeStr) {
          try {
            startTime = new Date(timeStr).toISOString();
          } catch {
            // Keep default
          }
        }
      }
    }

    return { columns, units, startTime, boat };
  }

  private parseDataLine(line: string, columns: string[]): SailingRecord | null {
    const values = line.split(',').map(val => val.trim());

    if (values.length !== columns.length) return null;

    const record: Partial<SailingRecord> = {};

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i].toLowerCase();
      const value = values[i];

      if (!value || value === '') continue;

      try {
        if (column.includes('time')) {
          record.timestamp = new Date(value).toISOString();
        } else if (column.includes('lat')) {
          const lat = parseFloat(value);
          if (isValidCoordinate(lat, -90, 90)) record.latitude = lat;
        } else if (column.includes('lng') || column.includes('lon')) {
          const lng = parseFloat(value);
          if (isValidCoordinate(lng, -180, 180)) record.longitude = lng;
        } else if (column.includes('sog')) {
          const sog = parseFloat(value);
          if (isValidSpeed(sog)) record.sog = sog;
        } else if (column.includes('bsp')) {
          const bsp = parseFloat(value);
          if (isValidSpeed(bsp)) record.bsp = bsp;
        } else if (column.includes('cog')) {
          const cog = parseFloat(value);
          if (isValidAngle(cog, 0, 360)) record.cog = cog;
        } else if (column.includes('hdg')) {
          const hdg = parseFloat(value);
          if (isValidAngle(hdg, 0, 360)) record.hdg = hdg;
        } else if (column.includes('twd')) {
          const twd = parseFloat(value);
          if (isValidAngle(twd, 0, 360)) record.twd = twd;
        } else if (column.includes('tws')) {
          const tws = parseFloat(value);
          if (isValidSpeed(tws)) record.tws = tws;
        } else if (column.includes('twa')) {
          const twa = parseFloat(value);
          if (isValidAngle(twa, -180, 180)) record.twa = twa;
        } else if (column.includes('awa')) {
          const awa = parseFloat(value);
          if (isValidAngle(awa, -180, 180)) record.awa = awa;
        } else if (column.includes('aws')) {
          const aws = parseFloat(value);
          if (isValidSpeed(aws)) record.aws = aws;
        }
      } catch {
        // Skip invalid values
      }
    }

    if (!record.timestamp) {
      record.timestamp = new Date().toISOString();
    }

    return Object.keys(record).length > 1 ? record as SailingRecord : null;
  }

  private createSession(
    records: SailingRecord[],
    header: ReturnType<ExpeditionParserImpl['parseHeader']>,
    filename: string
  ): SailingSession {
    const startTime = records[0].timestamp;
    const endTime = records[records.length - 1].timestamp;
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

    const speeds = records.map(r => r.bsp || r.sog).filter((s): s is number => s !== undefined);
    const windSpeeds = records.map(r => r.tws).filter((s): s is number => s !== undefined);

    return {
      id: generateId(),
      name: filename.replace(/\.[^/.]+$/, ''),
      startTime,
      endTime,
      duration,
      boat: { name: header.boat },
      crew: {},
      data: records,
      stats: {
        totalDistance: 0,
        maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        maxWindSpeed: windSpeeds.length > 0 ? Math.max(...windSpeeds) : 0,
        avgWindSpeed: windSpeeds.length > 0 ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length : 0,
        maxHeel: 0,
        racesDetected: 0,
        maneuversCount: 0,
        tacksCount: 0,
        gybesCount: 0,
        timeUpwind: 0,
        timeDownwind: 0,
      },
      quality: {
        completeness: 0.8, // Expedition usually has good data
        gpsAccuracy: 3,
        windDataQuality: 0.9,
        interpolatedPoints: 0,
        gaps: [],
      },
      file: {
        name: filename,
        size: JSON.stringify(records).length,
        format: 'expedition',
        imported: new Date().toISOString(),
      },
    };
  }

  validate(session: SailingSession): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (session.data.length === 0) {
      errors.push('No data records found');
    }

    return { valid: errors.length === 0, errors };
  }
}