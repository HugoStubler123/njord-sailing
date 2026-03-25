/**
 * GPX Parser Implementation
 * Parses GPS tracks in GPX format
 */

import type { GpxParser, ParserOptions, ParseResult } from '../models/Parser';
import type { SailingRecord, SailingSession } from '../models';
import { generateId } from '../utils/id';
import { isValidCoordinate, isValidTimestamp } from '../utils/validation';

export class GpxParserImpl implements GpxParser {
  readonly format = 'gpx' as const;
  readonly extensions = ['.gpx'];
  readonly mimeTypes = ['application/gpx+xml', 'text/xml', 'application/xml'];

  canParse(buffer: ArrayBuffer, filename?: string): boolean {
    const text = new TextDecoder().decode(buffer.slice(0, 1024));

    // Check for GPX XML structure
    if (text.includes('<gpx') && text.includes('xmlns')) return true;

    // Check filename extension
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      return this.extensions.includes(`.${ext}`);
    }

    return false;
  }

  async parse(buffer: ArrayBuffer, filename: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsParsed = 0;

    try {
      const text = new TextDecoder().decode(buffer);

      // Extract track points
      const records = this.extractTrackPoints(text);
      recordsProcessed = text.split('<trkpt').length - 1;
      recordsParsed = records.length;

      // Extract waypoints as potential marks/buoys
      const waypoints = this.extractWaypoints(text);

      // Sort records by timestamp
      records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Create session
      const session = this.createSession(records, waypoints, filename, options);

      // Validate if requested
      if (!options.skipValidation) {
        const validation = this.validate(session);
        if (!validation.valid) {
          return {
            success: false,
            error: `Validation failed: ${validation.errors.join(', ')}`,
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
        warnings: waypoints.length > 0 ? [`Found ${waypoints.length} waypoints`] : undefined,
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

  extractTrackPoints(gpxXml: string): SailingRecord[] {
    const records: SailingRecord[] = [];

    // Parse track points using regex (for simplicity - in production, use proper XML parser)
    const trkptRegex = /<trkpt[^>]+lat="([^"]+)"[^>]+lon="([^"]+)"[^>]*>(.*?)<\/trkpt>/gs;
    let match;

    while ((match = trkptRegex.exec(gpxXml)) !== null) {
      const [, latStr, lonStr, content] = match;

      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lonStr);

      if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
        continue;
      }

      const record: SailingRecord = {
        timestamp: this.extractTimestamp(content) || new Date().toISOString(),
        latitude,
        longitude,
      };

      // Extract elevation as depth (approximate)
      const elevation = this.extractElement(content, 'ele');
      if (elevation !== null) {
        // Convert elevation to depth (negative elevation = depth below sea level)
        record.depth = elevation < 0 ? Math.abs(elevation) : undefined;
      }

      // Extract speed if available
      const speed = this.extractElement(content, 'speed');
      if (speed !== null) {
        // GPX speed is typically in m/s, convert to knots
        record.sog = speed * 1.94384; // m/s to knots
      }

      // Extract course if available
      const course = this.extractElement(content, 'course');
      if (course !== null) {
        record.cog = course;
      }

      // Extract extensions (Garmin, etc.)
      const extensions = this.extractExtensions(content);
      if (extensions.heartRate) {
        // Could store as crew performance data
      }
      if (extensions.cadence) {
        // Sailing doesn't have cadence, but some devices might store other data
      }
      if (extensions.temperature) {
        record.waterTemp = extensions.temperature;
      }

      records.push(record);
    }

    return records;
  }

  extractWaypoints(gpxXml: string): Array<{ name: string; lat: number; lon: number; time?: string }> {
    const waypoints: Array<{ name: string; lat: number; lon: number; time?: string }> = [];

    const wptRegex = /<wpt[^>]+lat="([^"]+)"[^>]+lon="([^"]+)"[^>]*>(.*?)<\/wpt>/gs;
    let match;

    while ((match = wptRegex.exec(gpxXml)) !== null) {
      const [, latStr, lonStr, content] = match;

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);

      if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lon, -180, 180)) {
        continue;
      }

      const name = this.extractElement(content, 'name') as string || 'Unnamed Waypoint';
      const time = this.extractTimestamp(content);

      waypoints.push({ name, lat, lon, time: time || undefined });
    }

    return waypoints;
  }

  private extractTimestamp(content: string): string | null {
    const timeMatch = content.match(/<time>([^<]+)<\/time>/);
    if (timeMatch) {
      const timestamp = timeMatch[1];
      return isValidTimestamp(timestamp) ? timestamp : null;
    }
    return null;
  }

  private extractElement(content: string, elementName: string): number | string | null {
    const regex = new RegExp(`<${elementName}>([^<]+)<\/${elementName}>`, 'i');
    const match = content.match(regex);

    if (match) {
      const value = match[1];

      // Try to parse as number first
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue;
      }

      // Return as string
      return value.trim();
    }

    return null;
  }

  private extractExtensions(content: string): Record<string, any> {
    const extensions: Record<string, any> = {};

    // Garmin TrackPointExtension
    const tpxRegex = /<(?:gpxtpx:|)TrackPointExtension[^>]*>(.*?)<\/(?:gpxtpx:|)TrackPointExtension>/s;
    const tpxMatch = content.match(tpxRegex);

    if (tpxMatch) {
      const tpxContent = tpxMatch[1];

      // Extract heart rate
      const hr = this.extractElement(tpxContent, 'hr');
      if (hr !== null) extensions.heartRate = hr;

      // Extract cadence
      const cad = this.extractElement(tpxContent, 'cad');
      if (cad !== null) extensions.cadence = cad;

      // Extract temperature
      const atemp = this.extractElement(tpxContent, 'atemp');
      if (atemp !== null) extensions.temperature = atemp;

      // Extract water temperature
      const wtemp = this.extractElement(tpxContent, 'wtemp');
      if (wtemp !== null) extensions.waterTemperature = wtemp;
    }

    return extensions;
  }

  private calculateSpeed(records: SailingRecord[]): SailingRecord[] {
    if (records.length < 2) return records;

    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];

      if (curr.sog === undefined && prev.latitude !== undefined && prev.longitude !== undefined &&
          curr.latitude !== undefined && curr.longitude !== undefined) {

        const timeGap = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
        if (timeGap > 0) {
          const distance = this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
          curr.sog = distance / (timeGap / 3600); // knots
        }
      }
    }

    return records;
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

  private createSession(
    records: SailingRecord[],
    waypoints: Array<{ name: string; lat: number; lon: number; time?: string }>,
    filename: string,
    options: ParserOptions
  ): SailingSession {
    if (records.length === 0) {
      throw new Error('No valid track points found');
    }

    // Calculate speeds if not present
    const recordsWithSpeed = this.calculateSpeed(records);

    const startTime = recordsWithSpeed[0].timestamp;
    const endTime = recordsWithSpeed[recordsWithSpeed.length - 1].timestamp;
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < recordsWithSpeed.length; i++) {
      const prev = recordsWithSpeed[i - 1];
      const curr = recordsWithSpeed[i];

      if (prev.latitude !== undefined && prev.longitude !== undefined &&
          curr.latitude !== undefined && curr.longitude !== undefined) {
        totalDistance += this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      }
    }

    // Extract metadata from GPX (if available)
    const metadata = this.extractMetadata(waypoints);

    // Calculate basic statistics
    const speeds = recordsWithSpeed.map(r => r.sog).filter((s): s is number => s !== undefined);

    return {
      id: generateId(),
      name: filename.replace(/\.[^/.]+$/, ''),
      description: metadata.description,
      startTime,
      endTime,
      duration,
      location: metadata.location,
      boat: {
        name: metadata.boatName || 'Unknown Boat',
      },
      crew: {},
      data: recordsWithSpeed,
      stats: {
        totalDistance,
        maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        maxWindSpeed: 0, // No wind data in basic GPX
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
        completeness: this.calculateCompleteness(recordsWithSpeed),
        gpsAccuracy: 3, // GPX typically has good GPS accuracy
        windDataQuality: 0, // No wind data in basic GPX
        interpolatedPoints: 0,
        gaps: this.findDataGaps(recordsWithSpeed),
      },
      file: {
        name: filename,
        size: JSON.stringify(recordsWithSpeed).length,
        format: 'gpx',
        imported: new Date().toISOString(),
      },
    };
  }

  private extractMetadata(waypoints: Array<{ name: string; lat: number; lon: number; time?: string }>) {
    // Try to extract meaningful metadata from waypoints
    let description: string | undefined;
    let location: string | undefined;
    let boatName: string | undefined;

    for (const waypoint of waypoints) {
      const nameLower = waypoint.name.toLowerCase();

      if (nameLower.includes('start') || nameLower.includes('finish')) {
        if (!location) location = waypoint.name;
      }

      if (nameLower.includes('boat') || nameLower.includes('yacht')) {
        if (!boatName) boatName = waypoint.name;
      }
    }

    return { description, location, boatName };
  }

  private calculateCompleteness(records: SailingRecord[]): number {
    if (records.length === 0) return 0;

    const requiredFields = ['timestamp', 'latitude', 'longitude'];
    const optionalFields = ['sog', 'cog'];

    let score = 0;
    const totalPossibleScore = records.length * (requiredFields.length + optionalFields.length);

    for (const record of records) {
      // Required fields
      for (const field of requiredFields) {
        if (record[field as keyof SailingRecord] !== undefined) {
          score += 1;
        }
      }

      // Optional fields (partial credit)
      for (const field of optionalFields) {
        if (record[field as keyof SailingRecord] !== undefined) {
          score += 0.5;
        }
      }
    }

    return score / totalPossibleScore;
  }

  private findDataGaps(records: SailingRecord[]): Array<{ start: string; end: string; duration: number }> {
    const gaps: Array<{ start: string; end: string; duration: number }> = [];
    const maxGap = 30; // seconds

    for (let i = 1; i < records.length; i++) {
      const prevTime = new Date(records[i - 1].timestamp).getTime();
      const currTime = new Date(records[i].timestamp).getTime();
      const gapDuration = (currTime - prevTime) / 1000;

      if (gapDuration > maxGap) {
        gaps.push({
          start: records[i - 1].timestamp,
          end: records[i].timestamp,
          duration: gapDuration,
        });
      }
    }

    return gaps;
  }

  validate(session: SailingSession): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (session.data.length === 0) {
      errors.push('No track points found');
    }

    if (session.duration <= 0) {
      errors.push('Invalid track duration');
    }

    // Check if we have GPS coordinates
    const hasGPS = session.data.some(r => r.latitude !== undefined && r.longitude !== undefined);
    if (!hasGPS) {
      errors.push('No GPS coordinates found');
    }

    // Check for minimum track length
    if (session.stats.totalDistance < 0.1) {
      errors.push('Track too short (< 0.1 NM)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}