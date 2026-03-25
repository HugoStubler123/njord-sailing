/**
 * Race leg analysis utilities
 * Analyzes individual race legs for performance metrics
 */

import type { SailingRecord, Race, Leg } from '../models';
import { haversineDistance, totalDistance, bearing } from './geo-utils';
import { calculateVMG } from './vmg';

export interface LegMetrics {
  legId: string;
  startTime: string;
  endTime: string;
  duration: number;         // Duration in seconds
  distance: number;         // Distance sailed in meters
  avgBsp: number;          // Average boat speed
  maxBsp: number;          // Maximum boat speed
  avgTws: number;          // Average true wind speed
  avgTwa: number;          // Average true wind angle
  avgVmg: number;          // Average VMG
  vmgEfficiency: number;   // VMG efficiency percentage
  tacks: number;           // Number of tacks on this leg
  gybes: number;           // Number of gybes on this leg
  courseEfficiency: number; // Straight line distance / distance sailed
  windShifts: Array<{      // Significant wind shifts
    time: string;
    magnitude: number;
    direction: 'lift' | 'header';
  }>;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

/**
 * Analyze a single race leg
 * @param leg Leg definition from race detection
 * @param records All sailing records
 * @param maneuvers Detected maneuvers for this leg
 * @returns Detailed leg analysis
 */
export function analyzeLeg(
  leg: Leg,
  records: SailingRecord[],
  maneuvers?: Array<{ type: 'tack' | 'gybe'; timestamp: string }>
): LegMetrics {
  // Get records for this leg
  const startTime = new Date(leg.startTime);
  const endTime = new Date(leg.endTime);
  const legRecords = records.filter(r => {
    const recordTime = new Date(r.timestamp);
    return recordTime >= startTime && recordTime <= endTime;
  });

  if (legRecords.length === 0) {
    return createEmptyLegMetrics(leg);
  }

  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  // Calculate distance metrics
  const distanceSailed = totalDistance(legRecords);
  const straightLineDistance = leg.startLat && leg.startLon && leg.endLat && leg.endLon
    ? haversineDistance(
        { lat: leg.startLat, lon: leg.startLon },
        { lat: leg.endLat, lon: leg.endLon }
      )
    : distanceSailed;

  const courseEfficiency = straightLineDistance > 0 ? straightLineDistance / distanceSailed : 0;

  // Speed metrics
  const speeds = legRecords.map(r => r.bsp).filter((s): s is number => s !== undefined);
  const avgBsp = speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;
  const maxBsp = speeds.length > 0 ? Math.max(...speeds) : 0;

  // Wind metrics
  const windSpeeds = legRecords.map(r => r.tws).filter((s): s is number => s !== undefined);
  const windAngles = legRecords.map(r => r.twa).filter((a): a is number => a !== undefined);

  const avgTws = windSpeeds.length > 0 ? windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length : 0;
  const avgTwa = windAngles.length > 0 ?
    windAngles.reduce((sum, a) => sum + Math.abs(a), 0) / windAngles.length : 0;

  // VMG metrics
  const vmgData = legRecords.map(r => calculateVMG(r));
  const vmgValues = vmgData.map(v => v.vmg).filter((v): v is number => v !== undefined);
  const avgVmg = vmgValues.length > 0 ? vmgValues.reduce((sum, v) => sum + v, 0) / vmgValues.length : 0;

  // VMG efficiency (simplified - could be enhanced with polar data)
  const vmgEfficiency = avgBsp > 0 ? (avgVmg / avgBsp) * 100 : 0;

  // Count maneuvers
  const legManeuvers = maneuvers?.filter(m => {
    const mTime = new Date(m.timestamp);
    return mTime >= startTime && mTime <= endTime;
  }) || [];

  const tacks = legManeuvers.filter(m => m.type === 'tack').length;
  const gybes = legManeuvers.filter(m => m.type === 'gybe').length;

  // Detect wind shifts
  const windShifts = detectWindShifts(legRecords);

  // Calculate performance rating
  const performance = calculateLegPerformance(avgBsp, vmgEfficiency, courseEfficiency, avgTws);

  return {
    legId: leg.id,
    startTime: leg.startTime,
    endTime: leg.endTime,
    duration,
    distance: distanceSailed,
    avgBsp,
    maxBsp,
    avgTws,
    avgTwa,
    avgVmg,
    vmgEfficiency,
    tacks,
    gybes,
    courseEfficiency,
    windShifts,
    performance
  };
}

/**
 * Create empty leg metrics for legs with no data
 */
function createEmptyLegMetrics(leg: Leg): LegMetrics {
  return {
    legId: leg.id,
    startTime: leg.startTime,
    endTime: leg.endTime,
    duration: 0,
    distance: 0,
    avgBsp: 0,
    maxBsp: 0,
    avgTws: 0,
    avgTwa: 0,
    avgVmg: 0,
    vmgEfficiency: 0,
    tacks: 0,
    gybes: 0,
    courseEfficiency: 0,
    windShifts: [],
    performance: 'poor'
  };
}

/**
 * Detect significant wind shifts during a leg
 */
function detectWindShifts(records: SailingRecord[]): Array<{
  time: string;
  magnitude: number;
  direction: 'lift' | 'header';
}> {
  const shifts: Array<{ time: string; magnitude: number; direction: 'lift' | 'header' }> = [];

  if (records.length < 2) return shifts;

  let previousTwd: number | undefined;

  for (const record of records) {
    if (record.twd !== undefined) {
      if (previousTwd !== undefined) {
        let shiftMagnitude = record.twd - previousTwd;

        // Normalize shift to -180 to +180 range
        while (shiftMagnitude > 180) shiftMagnitude -= 360;
        while (shiftMagnitude < -180) shiftMagnitude += 360;

        // Consider shifts > 5 degrees as significant
        if (Math.abs(shiftMagnitude) > 5) {
          // Determine if it's a lift or header (simplified - in reality depends on tack)
          const direction = shiftMagnitude > 0 ? 'lift' : 'header';

          shifts.push({
            time: record.timestamp,
            magnitude: Math.abs(shiftMagnitude),
            direction
          });
        }
      }
      previousTwd = record.twd;
    }
  }

  return shifts;
}

/**
 * Calculate leg performance rating
 */
function calculateLegPerformance(
  avgBsp: number,
  vmgEfficiency: number,
  courseEfficiency: number,
  avgTws: number
): 'excellent' | 'good' | 'average' | 'poor' {
  // Normalize metrics (these thresholds would ideally come from boat-specific data)
  const speedScore = Math.min(100, (avgBsp / (avgTws * 0.7)) * 100); // Rough speed/wind ratio
  const vmgScore = Math.min(100, vmgEfficiency);
  const courseScore = courseEfficiency * 100;

  const overallScore = (speedScore + vmgScore + courseScore) / 3;

  if (overallScore >= 85) return 'excellent';
  if (overallScore >= 70) return 'good';
  if (overallScore >= 55) return 'average';
  return 'poor';
}

/**
 * Compare leg performance across multiple legs
 * @param legs Array of analyzed legs
 * @returns Comparative analysis
 */
export function compareLegPerformance(legs: LegMetrics[]): {
  bestLeg: LegMetrics | null;
  worstLeg: LegMetrics | null;
  averageMetrics: {
    avgBsp: number;
    avgVmg: number;
    vmgEfficiency: number;
    courseEfficiency: number;
  };
  trends: {
    speedTrend: 'improving' | 'declining' | 'stable';
    vmgTrend: 'improving' | 'declining' | 'stable';
  };
} {
  if (legs.length === 0) {
    return {
      bestLeg: null,
      worstLeg: null,
      averageMetrics: { avgBsp: 0, avgVmg: 0, vmgEfficiency: 0, courseEfficiency: 0 },
      trends: { speedTrend: 'stable', vmgTrend: 'stable' }
    };
  }

  // Find best and worst legs based on overall performance
  const performanceScores = legs.map(leg => {
    const speedScore = leg.avgBsp;
    const vmgScore = leg.vmgEfficiency;
    const courseScore = leg.courseEfficiency * 100;
    return (speedScore + vmgScore + courseScore) / 3;
  });

  const bestIndex = performanceScores.indexOf(Math.max(...performanceScores));
  const worstIndex = performanceScores.indexOf(Math.min(...performanceScores));

  const bestLeg = legs[bestIndex];
  const worstLeg = legs[worstIndex];

  // Calculate averages
  const avgBsp = legs.reduce((sum, leg) => sum + leg.avgBsp, 0) / legs.length;
  const avgVmg = legs.reduce((sum, leg) => sum + leg.avgVmg, 0) / legs.length;
  const vmgEfficiency = legs.reduce((sum, leg) => sum + leg.vmgEfficiency, 0) / legs.length;
  const courseEfficiency = legs.reduce((sum, leg) => sum + leg.courseEfficiency, 0) / legs.length;

  // Analyze trends (simple linear trend)
  const speedTrend = calculateTrend(legs.map(leg => leg.avgBsp));
  const vmgTrend = calculateTrend(legs.map(leg => leg.avgVmg));

  return {
    bestLeg,
    worstLeg,
    averageMetrics: { avgBsp, avgVmg, vmgEfficiency, courseEfficiency },
    trends: { speedTrend, vmgTrend }
  };
}

/**
 * Calculate simple trend from array of values
 */
function calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 3) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.ceil(values.length / 2));

  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

  const change = (secondAvg - firstAvg) / firstAvg;

  if (change > 0.05) return 'improving';  // 5% improvement
  if (change < -0.05) return 'declining'; // 5% decline
  return 'stable';
}

/**
 * Generate leg summary report
 * @param leg Analyzed leg
 * @returns Human-readable summary
 */
export function generateLegSummary(leg: LegMetrics): string {
  const durationMinutes = Math.round(leg.duration / 60);
  const distanceNm = Math.round(leg.distance / 1852 * 100) / 100; // Convert to nautical miles

  const summary = [
    `Leg ${leg.legId}: ${durationMinutes} minutes, ${distanceNm} NM`,
    `Speed: ${leg.avgBsp.toFixed(1)} kts avg (max ${leg.maxBsp.toFixed(1)} kts)`,
    `Wind: ${leg.avgTws.toFixed(1)} kts at ${leg.avgTwa.toFixed(0)}° TWA`,
    `VMG: ${leg.avgVmg.toFixed(1)} kts (${leg.vmgEfficiency.toFixed(0)}% efficiency)`,
    `Course efficiency: ${(leg.courseEfficiency * 100).toFixed(0)}%`,
  ];

  if (leg.tacks > 0 || leg.gybes > 0) {
    summary.push(`Maneuvers: ${leg.tacks} tacks, ${leg.gybes} gybes`);
  }

  if (leg.windShifts.length > 0) {
    summary.push(`Wind shifts: ${leg.windShifts.length} significant shifts`);
  }

  summary.push(`Performance: ${leg.performance}`);

  return summary.join('\n');
}