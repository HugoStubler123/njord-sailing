/**
 * Polar diagram builder for sailing analytics
 * Builds performance polars from session data and compares against targets
 */

import type { SailingRecord } from '../models';

export interface PolarPoint {
  tws: number;          // True Wind Speed bin
  twa: number;          // True Wind Angle bin
  bsp: number;          // Best Boat Speed achieved
  vmg: number;          // VMG at this point
  sampleCount: number;  // Number of data points in this bin
  confidence: number;   // Confidence level (0-1)
}

export interface PolarDiagram {
  points: PolarPoint[];
  twsRange: { min: number; max: number };
  coverage: number;     // Percentage of polar covered by data
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface PolarBuilder {
  twsBins: number[];    // Wind speed bins (e.g., [6, 8, 10, 12, 14, 16, 20])
  twaBins: number[];    // Wind angle bins (e.g., [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170])
  minSamples: number;   // Minimum samples required for a bin
  percentile: number;   // Percentile for speed selection (e.g., 90th percentile)
}

/**
 * Create a default polar builder configuration
 */
export function createPolarBuilder(): PolarBuilder {
  return {
    twsBins: [6, 8, 10, 12, 14, 16, 20, 25],
    twaBins: [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170],
    minSamples: 10,
    percentile: 85  // Use 85th percentile for realistic but achievable speeds
  };
}

/**
 * Build polar diagram from sailing session data
 * @param records Array of sailing records
 * @param builder Polar builder configuration
 * @returns Generated polar diagram
 */
export function buildPolar(records: SailingRecord[], builder?: PolarBuilder): PolarDiagram {
  const config = builder || createPolarBuilder();
  const points: PolarPoint[] = [];

  // Filter records with required data
  const validRecords = records.filter(r =>
    r.tws !== undefined &&
    r.twa !== undefined &&
    r.bsp !== undefined &&
    r.tws > 2 &&  // Minimum wind speed
    r.bsp > 0     // Boat must be moving
  );

  if (validRecords.length === 0) {
    return {
      points: [],
      twsRange: { min: 0, max: 0 },
      coverage: 0,
      dataQuality: 'poor'
    };
  }

  const twsRange = {
    min: Math.min(...validRecords.map(r => r.tws!)),
    max: Math.max(...validRecords.map(r => r.tws!))
  };

  // Build polar points for each TWS/TWA bin combination
  for (let i = 0; i < config.twsBins.length - 1; i++) {
    const twsMin = config.twsBins[i];
    const twsMax = config.twsBins[i + 1];
    const twsCenter = (twsMin + twsMax) / 2;

    for (const twa of config.twaBins) {
      const binData = getBinData(validRecords, twsMin, twsMax, twa);

      if (binData.length >= config.minSamples) {
        const speeds = binData.map(r => r.bsp!).sort((a, b) => a - b);
        const percentileIndex = Math.floor(speeds.length * (config.percentile / 100));
        const bsp = speeds[percentileIndex] || speeds[speeds.length - 1];

        // Calculate VMG for this point
        const twaRad = Math.abs(twa) * Math.PI / 180;
        const vmg = bsp * Math.cos(twaRad);

        // Calculate confidence based on sample count and data spread
        const confidence = calculateConfidence(binData, config.minSamples);

        points.push({
          tws: twsCenter,
          twa,
          bsp,
          vmg,
          sampleCount: binData.length,
          confidence
        });
      }
    }
  }

  // Calculate coverage and data quality
  const totalPossibleBins = (config.twsBins.length - 1) * config.twaBins.length;
  const coverage = (points.length / totalPossibleBins) * 100;

  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (coverage >= 80 && points.every(p => p.confidence > 0.7)) dataQuality = 'excellent';
  else if (coverage >= 60 && points.every(p => p.confidence > 0.5)) dataQuality = 'good';
  else if (coverage >= 40) dataQuality = 'fair';

  return {
    points,
    twsRange,
    coverage,
    dataQuality
  };
}

/**
 * Get data points for a specific TWS/TWA bin
 */
function getBinData(
  records: SailingRecord[],
  twsMin: number,
  twsMax: number,
  twaCenter: number,
  twaTolerance: number = 5
): SailingRecord[] {
  return records.filter(r => {
    const tws = r.tws!;
    const twa = Math.abs(r.twa!);

    return tws >= twsMin &&
           tws < twsMax &&
           Math.abs(twa - twaCenter) <= twaTolerance;
  });
}

/**
 * Calculate confidence level for a bin based on data quality
 */
function calculateConfidence(binData: SailingRecord[], minSamples: number): number {
  if (binData.length < minSamples) return 0;

  // Base confidence on sample count
  let confidence = Math.min(1, binData.length / (minSamples * 3));

  // Reduce confidence if data is too spread out (low consistency)
  const speeds = binData.map(r => r.bsp!);
  const mean = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
  const stdDev = Math.sqrt(speeds.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / speeds.length);
  const coefficientOfVariation = stdDev / mean;

  if (coefficientOfVariation > 0.3) confidence *= 0.7;  // High variation
  else if (coefficientOfVariation > 0.2) confidence *= 0.85; // Moderate variation

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Find target speed for given wind conditions using polar
 * @param polar Polar diagram
 * @param tws True wind speed
 * @param twa True wind angle
 * @returns Target boat speed and VMG
 */
export function getTargetSpeed(
  polar: PolarDiagram,
  tws: number,
  twa: number
): { bsp: number; vmg: number; confidence: number } | null {
  // Find the best matching polar point
  let bestMatch: PolarPoint | null = null;
  let bestScore = Infinity;

  for (const point of polar.points) {
    // Score based on distance in TWS/TWA space
    const twsScore = Math.abs(point.tws - tws) / tws;
    const twaScore = Math.abs(point.twa - Math.abs(twa)) / 180;
    const totalScore = twsScore + twaScore;

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestMatch = point;
    }
  }

  if (!bestMatch || bestScore > 0.5) return null; // No good match found

  return {
    bsp: bestMatch.bsp,
    vmg: bestMatch.vmg,
    confidence: bestMatch.confidence
  };
}

/**
 * Compare actual performance against polar targets
 * @param records Sailing data
 * @param polar Target polar
 * @returns Performance analysis
 */
export function analyzePolarPerformance(
  records: SailingRecord[],
  polar: PolarDiagram
): {
  averageEfficiency: number;
  speedDeficit: number;
  vmgDeficit: number;
  binAnalysis: Array<{
    tws: number;
    twa: number;
    actualSpeed: number;
    targetSpeed: number;
    efficiency: number;
  }>;
} {
  const validRecords = records.filter(r =>
    r.tws !== undefined && r.twa !== undefined && r.bsp !== undefined
  );

  if (validRecords.length === 0) {
    return {
      averageEfficiency: 0,
      speedDeficit: 0,
      vmgDeficit: 0,
      binAnalysis: []
    };
  }

  let totalEfficiency = 0;
  let totalSpeedDeficit = 0;
  let totalVmgDeficit = 0;
  let validComparisons = 0;
  const binAnalysis: Array<{
    tws: number;
    twa: number;
    actualSpeed: number;
    targetSpeed: number;
    efficiency: number;
  }> = [];

  for (const record of validRecords) {
    const target = getTargetSpeed(polar, record.tws!, record.twa!);
    if (target && target.confidence > 0.5) {
      const efficiency = record.bsp! / target.bsp;
      const speedDeficit = target.bsp - record.bsp!;

      const actualVmg = record.bsp! * Math.cos(Math.abs(record.twa!) * Math.PI / 180);
      const vmgDeficit = target.vmg - actualVmg;

      totalEfficiency += efficiency;
      totalSpeedDeficit += speedDeficit;
      totalVmgDeficit += vmgDeficit;
      validComparisons++;

      binAnalysis.push({
        tws: record.tws!,
        twa: record.twa!,
        actualSpeed: record.bsp!,
        targetSpeed: target.bsp,
        efficiency
      });
    }
  }

  return {
    averageEfficiency: validComparisons > 0 ? totalEfficiency / validComparisons : 0,
    speedDeficit: validComparisons > 0 ? totalSpeedDeficit / validComparisons : 0,
    vmgDeficit: validComparisons > 0 ? totalVmgDeficit / validComparisons : 0,
    binAnalysis
  };
}

/**
 * Find optimal sailing angles for different wind speeds
 * @param polar Polar diagram
 * @returns Optimal angles for upwind and downwind VMG
 */
export function findOptimalAngles(polar: PolarDiagram): {
  upwind: Array<{ tws: number; optimalTwa: number; vmg: number }>;
  downwind: Array<{ tws: number; optimalTwa: number; vmg: number }>;
} {
  const twsValues = [...new Set(polar.points.map(p => p.tws))].sort((a, b) => a - b);
  const upwind: Array<{ tws: number; optimalTwa: number; vmg: number }> = [];
  const downwind: Array<{ tws: number; optimalTwa: number; vmg: number }> = [];

  for (const tws of twsValues) {
    // Find upwind optimum (TWA < 90)
    const upwindPoints = polar.points.filter(p => p.tws === tws && p.twa < 90);
    if (upwindPoints.length > 0) {
      const bestUpwind = upwindPoints.reduce((best, current) =>
        current.vmg > best.vmg ? current : best
      );
      upwind.push({
        tws,
        optimalTwa: bestUpwind.twa,
        vmg: bestUpwind.vmg
      });
    }

    // Find downwind optimum (TWA > 90)
    const downwindPoints = polar.points.filter(p => p.tws === tws && p.twa > 90);
    if (downwindPoints.length > 0) {
      const bestDownwind = downwindPoints.reduce((best, current) =>
        current.vmg > best.vmg ? current : best
      );
      downwind.push({
        tws,
        optimalTwa: bestDownwind.twa,
        vmg: bestDownwind.vmg
      });
    }
  }

  return { upwind, downwind };
}

/**
 * Export polar data to standard format
 * @param polar Polar diagram
 * @returns Polar data in standard format for sharing/import
 */
export function exportPolar(polar: PolarDiagram): {
  metadata: {
    created: string;
    coverage: number;
    dataQuality: string;
    pointCount: number;
  };
  data: Array<{ tws: number; twa: number; bsp: number; vmg: number }>;
} {
  return {
    metadata: {
      created: new Date().toISOString(),
      coverage: polar.coverage,
      dataQuality: polar.dataQuality,
      pointCount: polar.points.length
    },
    data: polar.points.map(p => ({
      tws: p.tws,
      twa: p.twa,
      bsp: p.bsp,
      vmg: p.vmg
    }))
  };
}