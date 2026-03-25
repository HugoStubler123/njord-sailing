/**
 * Velocitek Parser Implementation
 * Parses Velocitek SpeedPuck and VCC data files
 */

import type { VelocitekParser, ParserOptions, ParseResult } from '../models/Parser';
import type { SailingRecord, SailingSession } from '../models';
import { generateId } from '../utils/id';
import { isValidSpeed, isValidCoordinate } from '../utils/validation';

export class VelocitekParserImpl implements VelocitekParser {
  readonly format = 'velocitek' as const;
  readonly extensions = ['.vcc', '.csv', '.txt'];
  readonly mimeTypes = ['application/octet-stream', 'text/csv', 'text/plain'];

  canParse(buffer: ArrayBuffer, filename?: string): boolean {
    // Check filename
    if (filename) {
      const name = filename.toLowerCase();
      if (name.includes('velocitek') || name.includes('speedpuck') || name.endsWith('.vcc')) {
        return true;
      }
    }

    // Check for VCC binary signature
    if (buffer.byteLength > 8) {
      const view = new DataView(buffer);
      const signature = view.getUint32(0, true);
      if (signature === 0x56434320) { // 'VCC ' in little endian
        return true;
      }
    }

    // Check for SpeedPuck CSV format
    const text = new TextDecoder().decode(buffer.slice(0, 512));
    if (text.includes('SpeedPuck') || text.includes('velocitek')) {
      return true;
    }

    return false;
  }

  async parse(buffer: ArrayBuffer, filename: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      let records: SailingRecord[];

      // Determine format by file extension or content
      if (filename.toLowerCase().endsWith('.vcc')) {
        records = this.parseVcc(buffer);
      } else {
        const text = new TextDecoder().decode(buffer);
        records = this.parseSpeedPuck(text);
      }

      if (records.length === 0) {
        throw new Error('No valid records found');
      }

      // Sort by timestamp
      records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Create session
      const session = this.createSession(records, filename);

      return {
        success: true,
        session,
        stats: {
          recordsProcessed: records.length,
          recordsParsed: records.length,
          parseTime: Date.now() - startTime,
          memoryUsed: JSON.stringify(session).length,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        stats: {
          recordsProcessed: 0,
          recordsParsed: 0,
          parseTime: Date.now() - startTime,
          memoryUsed: 0,
        },
      };
    }
  }

  parseVcc(buffer: ArrayBuffer): SailingRecord[] {
    // VCC is a binary format - simplified parsing
    const records: SailingRecord[] = [];
    const view = new DataView(buffer);

    // Check signature
    if (view.getUint32(0, true) !== 0x56434320) {
      throw new Error('Invalid VCC file signature');
    }

    let offset = 16; // Skip header
    const baseTime = Date.now() - 3600000; // 1 hour ago as baseline

    while (offset + 20 <= buffer.byteLength) {
      try {
        // Read record (simplified structure)
        const timeOffset = view.getUint32(offset, true); // Seconds from base
        const latitude = view.getFloat64(offset + 4, true);
        const longitude = view.getFloat64(offset + 12, true);
        const speed = view.getFloat32(offset + 20, true); // Speed in knots

        const timestamp = new Date(baseTime + timeOffset * 1000).toISOString();

        if (isValidCoordinate(latitude, -90, 90) &&
            isValidCoordinate(longitude, -180, 180) &&
            isValidSpeed(speed)) {
          records.push({
            timestamp,
            latitude,
            longitude,
            sog: speed,
            source: 'velocitek-vcc',
          });
        }

        offset += 24;
      } catch {
        break;
      }
    }

    return records;
  }

  parseSpeedPuck(csvData: string): SailingRecord[] {
    const records: SailingRecord[] = [];
    const lines = csvData.split('\n').filter(line => line.trim());

    if (lines.length < 2) return records;

    // Find header line
    let headerIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('time') || line.includes('speed') || line.includes('lat')) {
        headerIndex = i;
        break;
      }
    }

    const headers = lines[headerIndex].split(',').map(h => h.trim().toLowerCase());

    // Map column indices
    const columnMap = {
      time: this.findColumnIndex(headers, ['time', 'timestamp', 'utc']),
      lat: this.findColumnIndex(headers, ['lat', 'latitude']),
      lon: this.findColumnIndex(headers, ['lon', 'lng', 'longitude']),
      speed: this.findColumnIndex(headers, ['speed', 'sog', 'knots']),
      course: this.findColumnIndex(headers, ['course', 'cog', 'bearing']),
    };

    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      if (values.length < headers.length) continue;

      try {
        const record: Partial<SailingRecord> = {
          source: 'velocitek-speedpuck',
        };

        // Parse timestamp
        if (columnMap.time >= 0 && values[columnMap.time]) {
          record.timestamp = new Date(values[columnMap.time]).toISOString();
        } else {
          record.timestamp = new Date().toISOString();
        }

        // Parse position
        if (columnMap.lat >= 0 && values[columnMap.lat]) {
          const lat = parseFloat(values[columnMap.lat]);
          if (isValidCoordinate(lat, -90, 90)) {
            record.latitude = lat;
          }
        }

        if (columnMap.lon >= 0 && values[columnMap.lon]) {
          const lon = parseFloat(values[columnMap.lon]);
          if (isValidCoordinate(lon, -180, 180)) {
            record.longitude = lon;
          }
        }

        // Parse speed
        if (columnMap.speed >= 0 && values[columnMap.speed]) {
          const speed = parseFloat(values[columnMap.speed]);
          if (isValidSpeed(speed)) {
            record.sog = speed;
          }
        }

        // Parse course
        if (columnMap.course >= 0 && values[columnMap.course]) {
          const course = parseFloat(values[columnMap.course]);
          if (course >= 0 && course <= 360) {
            record.cog = course;
          }
        }

        if (record.timestamp && (record.latitude || record.sog)) {
          records.push(record as SailingRecord);
        }
      } catch {
        continue;
      }
    }

    return records;
  }

  private findColumnIndex(headers: string[], patterns: string[]): number {
    for (const pattern of patterns) {
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].includes(pattern)) {
          return i;
        }
      }
    }
    return -1;
  }

  private createSession(records: SailingRecord[], filename: string): SailingSession {
    const startTime = records[0].timestamp;
    const endTime = records[records.length - 1].timestamp;
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];

      if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
        totalDistance += this.calculateDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        );
      }
    }

    const speeds = records.map(r => r.sog).filter((s): s is number => s !== undefined);

    return {
      id: generateId(),
      name: filename.replace(/\.[^/.]+$/, ''),
      startTime,
      endTime,
      duration,
      boat: { name: 'Velocitek Device' },
      crew: {},
      data: records,
      stats: {
        totalDistance,
        maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        maxWindSpeed: 0, // Velocitek doesn't measure wind
        avgWindSpeed: 0,
        maxHeel: 0,
        racesDetected: 0,
        maneuversCount: 0,
        tacksCount: 0,
        gybesCount: 0,
        timeUpwind: 0,
        timeDownwind: 0,
      },
      quality: {
        completeness: 0.7, // GPS only, no wind data
        gpsAccuracy: 2, // Velocitek has good GPS accuracy
        windDataQuality: 0,
        interpolatedPoints: 0,
        gaps: [],
      },
      file: {
        name: filename,
        size: JSON.stringify(records).length,
        format: 'velocitek',
        imported: new Date().toISOString(),
      },
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  validate(session: SailingSession): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (session.data.length === 0) {
      errors.push('No data records found');
    }

    if (session.stats.totalDistance < 0.01) {
      errors.push('Track too short');
    }

    return { valid: errors.length === 0, errors };
  }
}