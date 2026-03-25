/**
 * Time-series interpolation and resampling utilities
 * Provides functions for gap filling, smoothing, and data resampling
 */

import type { SailingRecord } from '../models';

export interface InterpolationOptions {
  method: 'linear' | 'cubic' | 'nearest';
  maxGapSeconds?: number;  // Maximum gap to interpolate across
  smoothingFactor?: number; // 0-1, amount of smoothing to apply
}

/**
 * Linear interpolation between two values
 * @param x0 First x value
 * @param y0 First y value
 * @param x1 Second x value
 * @param y1 Second y value
 * @param x Target x value
 * @returns Interpolated y value
 */
export function linearInterpolate(x0: number, y0: number, x1: number, y1: number, x: number): number {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
}

/**
 * Interpolate missing values in sailing data
 * @param records Array of sailing records with potential gaps
 * @param options Interpolation configuration
 * @returns Records with interpolated values
 */
export function interpolateGaps(
  records: SailingRecord[],
  options: InterpolationOptions = { method: 'linear' }
): SailingRecord[] {
  if (records.length < 2) return records;

  const result: SailingRecord[] = [];
  const maxGapMs = (options.maxGapSeconds || 30) * 1000;

  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    result.push({ ...current });

    // Look ahead to find next valid record
    if (i < records.length - 1) {
      const next = records[i + 1];
      const timeDiff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();

      // If gap is too large, don't interpolate
      if (timeDiff > maxGapMs) continue;

      // Check if interpolation is needed
      const needsInterpolation = hasSignificantGap(current, next);
      if (needsInterpolation && timeDiff > 1000) { // Only interpolate gaps > 1 second
        const interpolatedRecords = interpolateBetweenRecords(current, next, options.method);
        result.push(...interpolatedRecords);
      }
    }
  }

  return result;
}

/**
 * Check if there's a significant gap between two records that needs interpolation
 */
function hasSignificantGap(record1: SailingRecord, record2: SailingRecord): boolean {
  const timeDiff = new Date(record2.timestamp).getTime() - new Date(record1.timestamp).getTime();
  return timeDiff > 2000; // More than 2 seconds
}

/**
 * Interpolate records between two data points
 */
function interpolateBetweenRecords(
  start: SailingRecord,
  end: SailingRecord,
  method: 'linear' | 'cubic' | 'nearest'
): SailingRecord[] {
  const startTime = new Date(start.timestamp).getTime();
  const endTime = new Date(end.timestamp).getTime();
  const timeDiff = endTime - startTime;

  // Create interpolated points every 1 second
  const interpolatedRecords: SailingRecord[] = [];
  const steps = Math.floor(timeDiff / 1000) - 1; // Exclude start and end points

  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1); // Interpolation factor 0-1
    const timestamp = new Date(startTime + t * timeDiff).toISOString();

    const interpolated: SailingRecord = {
      timestamp,
      lat: interpolateValue(start.lat, end.lat, t),
      lon: interpolateValue(start.lon, end.lon, t),
      bsp: interpolateValue(start.bsp, end.bsp, t),
      hdg: interpolateAngle(start.hdg, end.hdg, t),
      aws: interpolateValue(start.aws, end.aws, t),
      awa: interpolateAngle(start.awa, end.awa, t),
      tws: interpolateValue(start.tws, end.tws, t),
      twa: interpolateAngle(start.twa, end.twa, t),
      twd: interpolateAngle(start.twd, end.twd, t),
      sog: interpolateValue(start.sog, end.sog, t),
      cog: interpolateAngle(start.cog, end.cog, t),
    };

    interpolatedRecords.push(interpolated);
  }

  return interpolatedRecords;
}

/**
 * Interpolate a numeric value
 */
function interpolateValue(start?: number, end?: number, t: number): number | undefined {
  if (start === undefined || end === undefined) return undefined;
  return start + (end - start) * t;
}

/**
 * Interpolate an angular value (handles wraparound)
 */
function interpolateAngle(start?: number, end?: number, t: number): number | undefined {
  if (start === undefined || end === undefined) return undefined;

  // Find the shortest angular distance
  let diff = end - start;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const result = start + diff * t;

  // Normalize to 0-360 range
  return ((result % 360) + 360) % 360;
}

/**
 * Resample data to a fixed time interval
 * @param records Original records
 * @param intervalSeconds Target interval in seconds
 * @returns Resampled records
 */
export function resampleData(
  records: SailingRecord[],
  intervalSeconds: number = 1
): SailingRecord[] {
  if (records.length < 2) return records;

  const result: SailingRecord[] = [];
  const intervalMs = intervalSeconds * 1000;

  const startTime = new Date(records[0].timestamp).getTime();
  const endTime = new Date(records[records.length - 1].timestamp).getTime();

  let currentTime = startTime;
  let recordIndex = 0;

  while (currentTime <= endTime) {
    const timestamp = new Date(currentTime).toISOString();

    // Find the records to interpolate between
    while (recordIndex < records.length - 1 &&
           new Date(records[recordIndex + 1].timestamp).getTime() < currentTime) {
      recordIndex++;
    }

    if (recordIndex >= records.length - 1) {
      // Use the last record
      result.push({ ...records[records.length - 1], timestamp });
    } else {
      const before = records[recordIndex];
      const after = records[recordIndex + 1];
      const beforeTime = new Date(before.timestamp).getTime();
      const afterTime = new Date(after.timestamp).getTime();

      if (currentTime === beforeTime) {
        result.push({ ...before, timestamp });
      } else if (currentTime === afterTime) {
        result.push({ ...after, timestamp });
      } else {
        // Interpolate between before and after
        const t = (currentTime - beforeTime) / (afterTime - beforeTime);
        const interpolated = interpolateBetweenRecords(before, after, 'linear')[0];
        if (interpolated) {
          result.push({ ...interpolated, timestamp });
        }
      }
    }

    currentTime += intervalMs;
  }

  return result;
}

/**
 * Apply smoothing to sailing data using moving average
 * @param records Input records
 * @param windowSize Number of points for smoothing window
 * @returns Smoothed records
 */
export function smoothData(
  records: SailingRecord[],
  windowSize: number = 5
): SailingRecord[] {
  if (records.length <= windowSize) return records;

  const result: SailingRecord[] = [...records];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = halfWindow; i < records.length - halfWindow; i++) {
    const window = records.slice(i - halfWindow, i + halfWindow + 1);

    // Smooth numeric values
    result[i] = {
      ...result[i],
      bsp: averageValue(window.map(r => r.bsp)),
      aws: averageValue(window.map(r => r.aws)),
      tws: averageValue(window.map(r => r.tws)),
      sog: averageValue(window.map(r => r.sog)),
    };

    // Smooth angular values
    if (window.every(r => r.hdg !== undefined)) {
      result[i].hdg = averageAngle(window.map(r => r.hdg!));
    }
    if (window.every(r => r.awa !== undefined)) {
      result[i].awa = averageAngle(window.map(r => r.awa!));
    }
    if (window.every(r => r.twa !== undefined)) {
      result[i].twa = averageAngle(window.map(r => r.twa!));
    }
    if (window.every(r => r.twd !== undefined)) {
      result[i].twd = averageAngle(window.map(r => r.twd!));
    }
    if (window.every(r => r.cog !== undefined)) {
      result[i].cog = averageAngle(window.map(r => r.cog!));
    }
  }

  return result;
}

/**
 * Calculate average of numeric values (ignoring undefined)
 */
function averageValue(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((v): v is number => v !== undefined);
  if (defined.length === 0) return undefined;
  return defined.reduce((sum, v) => sum + v, 0) / defined.length;
}

/**
 * Calculate circular average of angles
 */
function averageAngle(angles: number[]): number {
  if (angles.length === 0) return 0;

  let sinSum = 0;
  let cosSum = 0;

  for (const angle of angles) {
    const rad = (angle * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }

  const avgRad = Math.atan2(sinSum / angles.length, cosSum / angles.length);
  let avgDeg = (avgRad * 180) / Math.PI;

  // Normalize to 0-360
  return ((avgDeg % 360) + 360) % 360;
}

/**
 * Remove outliers from data using IQR method
 * @param records Input records
 * @param field Field to analyze for outliers
 * @param factor IQR multiplier (default 1.5)
 * @returns Records with outliers removed
 */
export function removeOutliers(
  records: SailingRecord[],
  field: keyof SailingRecord,
  factor: number = 1.5
): SailingRecord[] {
  const values = records
    .map(r => r[field])
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);

  if (values.length < 4) return records;

  const q1Index = Math.floor(values.length * 0.25);
  const q3Index = Math.floor(values.length * 0.75);
  const q1 = values[q1Index];
  const q3 = values[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - factor * iqr;
  const upperBound = q3 + factor * iqr;

  return records.filter(record => {
    const value = record[field];
    if (typeof value !== 'number') return true;
    return value >= lowerBound && value <= upperBound;
  });
}