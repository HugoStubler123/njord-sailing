/**
 * Wind Mathematics and Calculations
 * Core algorithms for sailing wind analysis
 */

import type { SailingRecord } from '../models';
import { toRadians, toDegrees, normalizeAngle, normalizeAngleSigned } from '../utils/math';

/**
 * Calculate true wind from apparent wind and boat data
 */
export function calculateTrueWind(record: SailingRecord): {
  tws?: number;
  twa?: number;
  twd?: number;
} {
  const { aws, awa, bsp, hdg } = record;

  if (aws === undefined || awa === undefined || bsp === undefined) {
    return {};
  }

  // Convert to radians for calculations
  const awaRad = toRadians(awa);
  const bspKnots = bsp;
  const awsKnots = aws;

  // Calculate true wind components
  // TWS and TWA using vector addition
  const awsX = awsKnots * Math.sin(awaRad); // Apparent wind east component
  const awsY = awsKnots * Math.cos(awaRad); // Apparent wind north component

  // Subtract boat velocity vector
  const twsX = awsX; // Boat doesn't affect east-west wind component directly
  const twsY = awsY + bspKnots; // Add boat speed to apparent wind north component

  // Calculate true wind speed and angle
  const tws = Math.sqrt(twsX * twsX + twsY * twsY);
  const twaRad = Math.atan2(twsX, twsY);
  let twa = toDegrees(twaRad);

  // Normalize TWA to -180 to 180 range
  twa = normalizeAngleSigned(twa);

  // Calculate true wind direction if heading is available
  let twd: number | undefined;
  if (hdg !== undefined) {
    twd = normalizeAngle(hdg + twa);
  }

  return {
    tws: Math.abs(tws),
    twa,
    twd,
  };
}

/**
 * Calculate apparent wind from true wind and boat data
 */
export function calculateApparentWind(
  tws: number,
  twa: number,
  bsp: number
): {
  aws: number;
  awa: number;
} {
  const twaRad = toRadians(twa);

  // True wind components
  const twsX = tws * Math.sin(twaRad);
  const twsY = tws * Math.cos(twaRad);

  // Subtract boat velocity
  const awsX = twsX;
  const awsY = twsY - bsp;

  // Calculate apparent wind
  const aws = Math.sqrt(awsX * awsX + awsY * awsY);
  const awaRad = Math.atan2(awsX, awsY);
  const awa = normalizeAngleSigned(toDegrees(awaRad));

  return { aws, awa };
}

/**
 * Calculate Velocity Made Good (VMG) upwind and downwind
 */
export function calculateVMG(record: SailingRecord): {
  vmg?: number;
  vmgUpwind?: number;
  vmgDownwind?: number;
} {
  const { bsp, twa } = record;

  if (bsp === undefined || twa === undefined) {
    return {};
  }

  // VMG is the component of boat speed in the direction of the true wind
  const twaRad = toRadians(Math.abs(twa));
  const vmgComponent = bsp * Math.cos(twaRad);

  // Determine if sailing upwind or downwind
  const absTwa = Math.abs(twa);
  const isUpwind = absTwa < 90;
  const isDownwind = absTwa > 90;

  return {
    vmg: vmgComponent,
    vmgUpwind: isUpwind ? vmgComponent : 0,
    vmgDownwind: isDownwind ? vmgComponent : 0,
  };
}

/**
 * Calculate wind shift magnitude and direction
 */
export function calculateWindShift(
  previousTwd: number,
  currentTwd: number
): {
  magnitude: number;
  direction: 'header' | 'lift' | 'veer' | 'back';
  type: 'oscillating' | 'persistent';
} {
  const shift = normalizeAngleSigned(currentTwd - previousTwd);
  const magnitude = Math.abs(shift);

  let direction: 'header' | 'lift' | 'veer' | 'back';

  if (shift > 0) {
    direction = 'veer'; // Wind shifts clockwise
  } else {
    direction = 'back'; // Wind shifts counter-clockwise
  }

  // For boat-relative terms (header/lift), we'd need boat heading and tack
  // This is simplified - in practice you'd determine if it's a header or lift
  // based on which tack the boat is on

  return {
    magnitude,
    direction,
    type: magnitude > 10 ? 'persistent' : 'oscillating',
  };
}

/**
 * Calculate wind gradient (vertical wind shear)
 */
export function calculateWindGradient(
  windSpeedLow: number,
  windSpeedHigh: number,
  heightLow: number = 2, // Typical instrument height
  heightHigh: number = 10 // Masthead height
): {
  gradient: number; // Wind speed increase per meter of height
  shearExponent: number; // Power law exponent
} {
  const heightRatio = heightHigh / heightLow;
  const speedRatio = windSpeedHigh / windSpeedLow;

  const gradient = (windSpeedHigh - windSpeedLow) / (heightHigh - heightLow);
  const shearExponent = Math.log(speedRatio) / Math.log(heightRatio);

  return { gradient, shearExponent };
}

/**
 * Estimate wind at different heights using power law
 */
export function estimateWindAtHeight(
  referenceSpeed: number,
  referenceHeight: number,
  targetHeight: number,
  shearExponent: number = 0.143 // Typical over water
): number {
  const heightRatio = targetHeight / referenceHeight;
  return referenceSpeed * Math.pow(heightRatio, shearExponent);
}

/**
 * Calculate wind steadiness (consistency over time)
 */
export function calculateWindSteadiness(
  windDirections: number[],
  timeWindow: number = 300 // 5 minutes
): {
  steadiness: number; // 0-1, where 1 = perfectly steady
  averageDirection: number;
  standardDeviation: number;
  oscillationPeriod?: number; // In seconds, if oscillating
} {
  if (windDirections.length < 2) {
    return {
      steadiness: 0,
      averageDirection: windDirections[0] || 0,
      standardDeviation: 0,
    };
  }

  // Calculate circular mean and standard deviation
  let sinSum = 0;
  let cosSum = 0;

  for (const dir of windDirections) {
    sinSum += Math.sin(toRadians(dir));
    cosSum += Math.cos(toRadians(dir));
  }

  const meanSin = sinSum / windDirections.length;
  const meanCos = cosSum / windDirections.length;

  const averageDirection = normalizeAngle(toDegrees(Math.atan2(meanSin, meanCos)));
  const resultantLength = Math.sqrt(meanSin * meanSin + meanCos * meanCos);

  // Circular standard deviation
  const circularVariance = 1 - resultantLength;
  const standardDeviation = toDegrees(Math.sqrt(-2 * Math.log(resultantLength)));

  // Steadiness is inverse of variance
  const steadiness = Math.max(0, 1 - circularVariance * 2);

  // Detect oscillation pattern (simplified)
  let oscillationPeriod: number | undefined;
  if (windDirections.length >= 6) {
    oscillationPeriod = detectWindOscillation(windDirections, timeWindow);
  }

  return {
    steadiness,
    averageDirection,
    standardDeviation: isNaN(standardDeviation) ? 0 : standardDeviation,
    oscillationPeriod,
  };
}

/**
 * Detect wind oscillation period
 */
function detectWindOscillation(
  windDirections: number[],
  totalTime: number
): number | undefined {
  if (windDirections.length < 6) return undefined;

  // Find zero crossings around the mean
  const mean = windDirections.reduce((sum, dir) => sum + dir, 0) / windDirections.length;
  const crossings: number[] = [];

  for (let i = 1; i < windDirections.length; i++) {
    const prev = windDirections[i - 1] - mean;
    const curr = windDirections[i] - mean;

    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      crossings.push(i);
    }
  }

  if (crossings.length < 4) return undefined;

  // Calculate periods between crossings (full cycle = 2 crossings)
  const periods: number[] = [];
  for (let i = 2; i < crossings.length; i += 2) {
    const periodSamples = crossings[i] - crossings[i - 2];
    const periodTime = (periodSamples / windDirections.length) * totalTime;
    periods.push(periodTime);
  }

  if (periods.length === 0) return undefined;

  // Return average period
  return periods.reduce((sum, period) => sum + period, 0) / periods.length;
}

/**
 * Calculate wind statistics for a time period
 */
export function calculateWindStatistics(records: SailingRecord[]): {
  averageSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  averageDirection: number;
  gustiness: number; // Coefficient of variation
  steadiness: number;
  shifts: Array<{
    timestamp: string;
    magnitude: number;
    direction: string;
  }>;
} {
  const windspeeds = records.map(r => r.tws).filter((s): s is number => s !== undefined);
  const winddirections = records.map(r => r.twd).filter((d): d is number => d !== undefined);

  if (windspeeds.length === 0) {
    return {
      averageSpeed: 0,
      maxSpeed: 0,
      minSpeed: 0,
      averageDirection: 0,
      gustiness: 0,
      steadiness: 0,
      shifts: [],
    };
  }

  // Speed statistics
  const averageSpeed = windspeeds.reduce((sum, s) => sum + s, 0) / windspeeds.length;
  const maxSpeed = Math.max(...windspeeds);
  const minSpeed = Math.min(...windspeeds);

  // Gustiness (coefficient of variation)
  const speedStdDev = Math.sqrt(
    windspeeds.reduce((sum, s) => sum + Math.pow(s - averageSpeed, 2), 0) / windspeeds.length
  );
  const gustiness = averageSpeed > 0 ? speedStdDev / averageSpeed : 0;

  // Direction statistics
  const directionStats = calculateWindSteadiness(winddirections);

  // Detect significant shifts
  const shifts: Array<{ timestamp: string; magnitude: number; direction: string }> = [];
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];

    if (prev.twd !== undefined && curr.twd !== undefined) {
      const shift = calculateWindShift(prev.twd, curr.twd);
      if (shift.magnitude > 5) {
        shifts.push({
          timestamp: curr.timestamp,
          magnitude: shift.magnitude,
          direction: shift.direction,
        });
      }
    }
  }

  return {
    averageSpeed,
    maxSpeed,
    minSpeed,
    averageDirection: directionStats.averageDirection,
    gustiness,
    steadiness: directionStats.steadiness,
    shifts,
  };
}

/**
 * Smooth wind data to remove noise while preserving real changes
 */
export function smoothWindData(
  records: SailingRecord[],
  windowSize: number = 5
): SailingRecord[] {
  if (records.length <= windowSize) return records;

  const smoothed: SailingRecord[] = [...records];

  for (let i = Math.floor(windowSize / 2); i < records.length - Math.floor(windowSize / 2); i++) {
    const window = records.slice(i - Math.floor(windowSize / 2), i + Math.floor(windowSize / 2) + 1);

    // Smooth wind speed (simple average)
    const windSpeeds = window.map(r => r.tws).filter((s): s is number => s !== undefined);
    if (windSpeeds.length > 0) {
      smoothed[i] = {
        ...smoothed[i],
        tws: windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length,
      };
    }

    // Smooth wind direction (circular average)
    const windDirs = window.map(r => r.twd).filter((d): d is number => d !== undefined);
    if (windDirs.length > 0) {
      let sinSum = 0;
      let cosSum = 0;
      for (const dir of windDirs) {
        sinSum += Math.sin(toRadians(dir));
        cosSum += Math.cos(toRadians(dir));
      }
      const averageDir = normalizeAngle(toDegrees(Math.atan2(sinSum / windDirs.length, cosSum / windDirs.length)));
      smoothed[i] = {
        ...smoothed[i],
        twd: averageDir,
      };
    }
  }

  return smoothed;
}