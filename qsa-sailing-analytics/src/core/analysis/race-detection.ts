/**
 * Race Detection Algorithm
 * Automatically detect races from sailing session data
 */

import type { SailingRecord, SailingSession, Race, Leg } from '../models';
import { generateId } from '../utils/id';
import { detectManeuvers } from './maneuver-detection';
import { calculateVMGMetrics } from './vmg';

/**
 * Detect races in a sailing session
 */
export function detectRaces(
  session: SailingSession,
  options: {
    minRaceDuration: number; // seconds
    maxGapDuration: number; // seconds
    maneuverThreshold: number; // minimum maneuvers to consider a race
    speedThreshold: number; // minimum average speed for racing
    windAngleThreshold: number; // minimum wind angle changes for racing
  } = {
    minRaceDuration: 300, // 5 minutes
    maxGapDuration: 30, // 30 seconds
    maneuverThreshold: 3, // 3+ maneuvers
    speedThreshold: 3, // 3+ knots average
    windAngleThreshold: 20, // 20+ degrees of wind angle variation
  }
): Race[] {
  const records = session.data;
  if (records.length < 60) return []; // Need at least 1 minute of data

  // First detect all maneuvers
  const maneuvers = detectManeuvers(records, session.id, {
    headingChangeThreshold: 60,
    windAngleChangeThreshold: 70,
    minDuration: 5,
    maxDuration: 120,
    speedChangeThreshold: 2,
  });

  // Find racing segments based on activity patterns
  const raceSegments = findRacingSegments(records, maneuvers, options);

  // Convert segments to full Race objects
  const races: Race[] = [];
  let raceNumber = 1;

  for (const segment of raceSegments) {
    const race = analyzeRaceSegment(session, segment, maneuvers, raceNumber);
    if (race) {
      races.push(race);
      raceNumber++;
    }
  }

  return races;
}

/**
 * Find segments of data that likely represent races
 */
function findRacingSegments(
  records: SailingRecord[],
  maneuvers: Array<{ startTime: string; endTime: string; type: string }>,
  options: Parameters<typeof detectRaces>[1]
): Array<{
  startIndex: number;
  endIndex: number;
  confidence: number;
}> {
  const segments: Array<{
    startIndex: number;
    endIndex: number;
    confidence: number;
  }> = [];

  let currentSegmentStart: number | null = null;
  let segmentActivity = 0;
  let segmentSpeeds: number[] = [];
  let segmentManeuvers = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const timeInSegment = currentSegmentStart !== null
      ? (new Date(record.timestamp).getTime() - new Date(records[currentSegmentStart].timestamp).getTime()) / 1000
      : 0;

    // Check if we're starting a new segment
    if (currentSegmentStart === null && isRacingBehavior(record, records, i)) {
      currentSegmentStart = i;
      segmentActivity = 0;
      segmentSpeeds = [];
      segmentManeuvers = 0;
    }

    // If we're in a segment, accumulate activity
    if (currentSegmentStart !== null) {
      if (record.bsp !== undefined) {
        segmentSpeeds.push(record.bsp);
      }

      // Count maneuvers in this segment
      const maneuversInRange = maneuvers.filter(m =>
        new Date(m.startTime).getTime() >= new Date(records[currentSegmentStart!].timestamp).getTime() &&
        new Date(m.startTime).getTime() <= new Date(record.timestamp).getTime()
      );
      segmentManeuvers = maneuversInRange.length;

      // Calculate activity score
      segmentActivity = calculateActivityScore(
        segmentSpeeds,
        segmentManeuvers,
        timeInSegment
      );

      // Check if segment should end
      const shouldEndSegment =
        timeInSegment > options.minRaceDuration && (
          !isRacingBehavior(record, records, i) ||
          segmentActivity < 0.3 ||
          hasLongGap(records, currentSegmentStart, i, options.maxGapDuration)
        );

      if (shouldEndSegment) {
        // Evaluate if this segment qualifies as a race
        if (qualifiesAsRace(segmentSpeeds, segmentManeuvers, timeInSegment, options)) {
          segments.push({
            startIndex: currentSegmentStart,
            endIndex: i,
            confidence: segmentActivity,
          });
        }

        currentSegmentStart = null;
      }
    }
  }

  // Handle final segment
  if (currentSegmentStart !== null) {
    const timeInSegment = (new Date(records[records.length - 1].timestamp).getTime() -
                          new Date(records[currentSegmentStart].timestamp).getTime()) / 1000;

    if (qualifiesAsRace(segmentSpeeds, segmentManeuvers, timeInSegment, options)) {
      segments.push({
        startIndex: currentSegmentStart,
        endIndex: records.length - 1,
        confidence: segmentActivity,
      });
    }
  }

  return segments;
}

/**
 * Check if current behavior indicates racing
 */
function isRacingBehavior(record: SailingRecord, records: SailingRecord[], index: number): boolean {
  // High speed
  const speed = record.bsp || record.sog || 0;
  if (speed > 5) return true;

  // Recent maneuver activity (look at last 5 minutes)
  const fiveMinutesAgo = new Date(record.timestamp).getTime() - 300000;
  const recentRecords = records.slice(Math.max(0, index - 50), index);

  const recentHeadingChanges = calculateHeadingVariation(recentRecords);
  if (recentHeadingChanges > 30) return true;

  // Wind angle variation (active sailing)
  const recentTWAVariation = calculateTWAVariation(recentRecords);
  if (recentTWAVariation > 20) return true;

  return false;
}

/**
 * Calculate heading variation over recent data
 */
function calculateHeadingVariation(records: SailingRecord[]): number {
  const headings = records.map(r => r.hdg).filter((h): h is number => h !== undefined);
  if (headings.length < 3) return 0;

  let maxChange = 0;
  for (let i = 1; i < headings.length; i++) {
    const change = Math.abs(headings[i] - headings[i - 1]);
    maxChange = Math.max(maxChange, change);
  }

  return maxChange;
}

/**
 * Calculate TWA variation over recent data
 */
function calculateTWAVariation(records: SailingRecord[]): number {
  const twas = records.map(r => r.twa).filter((twa): twa is number => twa !== undefined);
  if (twas.length < 3) return 0;

  const maxTWA = Math.max(...twas.map(Math.abs));
  const minTWA = Math.min(...twas.map(Math.abs));

  return maxTWA - minTWA;
}

/**
 * Calculate activity score for a segment
 */
function calculateActivityScore(
  speeds: number[],
  maneuvers: number,
  duration: number
): number {
  let score = 0;

  // Speed component
  if (speeds.length > 0) {
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    score += Math.min(avgSpeed / 8, 0.4); // Max 0.4 for speed
  }

  // Maneuver component
  const maneuverRate = duration > 0 ? (maneuvers / duration) * 3600 : 0; // per hour
  score += Math.min(maneuverRate / 10, 0.3); // Max 0.3 for maneuvers

  // Duration component
  if (duration > 300) { // 5 minutes
    score += 0.3;
  }

  return Math.min(score, 1.0);
}

/**
 * Check if segment qualifies as a race
 */
function qualifiesAsRace(
  speeds: number[],
  maneuvers: number,
  duration: number,
  options: Parameters<typeof detectRaces>[1]
): boolean {
  if (duration < options.minRaceDuration) return false;
  if (maneuvers < options.maneuverThreshold) return false;

  if (speeds.length > 0) {
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    if (avgSpeed < options.speedThreshold) return false;
  }

  return true;
}

/**
 * Check if there's a long gap in data
 */
function hasLongGap(
  records: SailingRecord[],
  startIndex: number,
  endIndex: number,
  maxGap: number
): boolean {
  for (let i = startIndex + 1; i <= endIndex; i++) {
    const gap = (new Date(records[i].timestamp).getTime() - new Date(records[i - 1].timestamp).getTime()) / 1000;
    if (gap > maxGap) return true;
  }
  return false;
}

/**
 * Analyze a race segment and create a full Race object
 */
function analyzeRaceSegment(
  session: SailingSession,
  segment: ReturnType<typeof findRacingSegments>[0],
  allManeuvers: Array<{ startTime: string; endTime: string; type: string }>,
  raceNumber: number
): Race | null {
  const raceRecords = session.data.slice(segment.startIndex, segment.endIndex + 1);
  if (raceRecords.length < 10) return null;

  const startRecord = raceRecords[0];
  const endRecord = raceRecords[raceRecords.length - 1];

  // Get maneuvers for this race
  const raceStartTime = new Date(startRecord.timestamp).getTime();
  const raceEndTime = new Date(endRecord.timestamp).getTime();

  const raceManeuvers = allManeuvers.filter(m =>
    new Date(m.startTime).getTime() >= raceStartTime &&
    new Date(m.endTime).getTime() <= raceEndTime
  );

  // Detect legs (simplified - based on maneuvers)
  const legs = detectRaceLegs(raceRecords, raceManeuvers);

  // Calculate performance metrics
  const performance = calculateRacePerformance(raceRecords);

  // Analyze conditions
  const conditions = analyzeRaceConditions(raceRecords);

  const race: Race = {
    id: generateId(),
    sessionId: session.id,
    name: `Race ${raceNumber}`,
    number: raceNumber,

    startTime: startRecord.timestamp,
    endTime: endRecord.timestamp,
    duration: (raceEndTime - raceStartTime) / 1000,

    legs,
    performance,
    conditions,

    detection: {
      method: 'automatic',
      confidence: segment.confidence,
      detectedAt: new Date().toISOString(),
      algorithm: 'activity-pattern-v1',
    },

    quality: {
      dataCompleteness: calculateDataCompleteness(raceRecords),
      trackingAccuracy: 5, // Assumed GPS accuracy
      overallQuality: segment.confidence > 0.8 ? 'excellent' :
                     segment.confidence > 0.6 ? 'good' :
                     segment.confidence > 0.4 ? 'fair' : 'poor',
    },
  };

  return race;
}

/**
 * Detect legs within a race (simplified)
 */
function detectRaceLegs(
  records: SailingRecord[],
  maneuvers: Array<{ startTime: string; endTime: string; type: string }>
): Leg[] {
  const legs: Leg[] = [];

  if (maneuvers.length === 0) {
    // Single leg race
    return [{
      id: generateId(),
      raceId: '', // Will be set by caller
      legNumber: 1,
      startTime: records[0].timestamp,
      endTime: records[records.length - 1].timestamp,
      duration: (new Date(records[records.length - 1].timestamp).getTime() - new Date(records[0].timestamp).getTime()) / 1000,
      type: 'upwind', // Default
      targetTwa: 45,
      distance: 0,
      bearing: 0,
      stats: calculateLegStats(records),
      conditions: calculateLegConditions(records),
      dataRange: { startIndex: 0, endIndex: records.length - 1 },
      quality: { completeness: 1, gpsAccuracy: 5, confidence: 0.8 },
    }];
  }

  // Create legs between maneuvers
  let legStart = 0;
  let legNumber = 1;

  for (const maneuver of maneuvers) {
    const maneuverStartIndex = records.findIndex(r => r.timestamp === maneuver.startTime);
    if (maneuverStartIndex > legStart) {
      const legRecords = records.slice(legStart, maneuverStartIndex);
      if (legRecords.length > 5) {
        legs.push(createLeg(legRecords, legNumber, legStart));
        legNumber++;
      }
    }
    legStart = records.findIndex(r => r.timestamp === maneuver.endTime) + 1;
  }

  // Final leg
  if (legStart < records.length - 5) {
    const legRecords = records.slice(legStart);
    legs.push(createLeg(legRecords, legNumber, legStart));
  }

  return legs;
}

/**
 * Create a leg from records
 */
function createLeg(records: SailingRecord[], legNumber: number, startIndex: number): Leg {
  const duration = (new Date(records[records.length - 1].timestamp).getTime() - new Date(records[0].timestamp).getTime()) / 1000;

  // Determine leg type from average TWA
  const twas = records.map(r => r.twa).filter((twa): twa is number => twa !== undefined);
  const avgTWA = twas.length > 0
    ? twas.reduce((sum, twa) => sum + Math.abs(twa), 0) / twas.length
    : 90;

  const type: 'upwind' | 'downwind' | 'reach' =
    avgTWA < 70 ? 'upwind' :
    avgTWA > 110 ? 'downwind' : 'reach';

  return {
    id: generateId(),
    raceId: '', // Set by caller
    legNumber,
    startTime: records[0].timestamp,
    endTime: records[records.length - 1].timestamp,
    duration,
    type,
    targetTwa: avgTWA,
    distance: calculateLegDistance(records),
    bearing: calculateLegBearing(records),
    stats: calculateLegStats(records),
    conditions: calculateLegConditions(records),
    dataRange: { startIndex, endIndex: startIndex + records.length - 1 },
    quality: { completeness: calculateDataCompleteness(records), gpsAccuracy: 5, confidence: 0.8 },
  };
}

/**
 * Calculate leg statistics
 */
function calculateLegStats(records: SailingRecord[]): Leg['stats'] {
  const speeds = records.map(r => r.bsp || r.sog || 0);
  const vmgData = records.map(r => calculateVMGMetrics(r));
  const vmgs = vmgData.map(v => v.vmg).filter(v => !isNaN(v));

  const tws = records.map(r => r.tws).filter((s): s is number => s !== undefined);
  const twa = records.map(r => r.twa).filter((a): a is number => a !== undefined);

  return {
    avgSpeed: speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0,
    maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
    avgVmg: vmgs.length > 0 ? vmgs.reduce((sum, v) => sum + v, 0) / vmgs.length : 0,
    maxVmg: vmgs.length > 0 ? Math.max(...vmgs) : 0,
    avgTwa: twa.length > 0 ? twa.reduce((sum, a) => sum + Math.abs(a), 0) / twa.length : 0,
    avgTws: tws.length > 0 ? tws.reduce((sum, s) => sum + s, 0) / tws.length : 0,
    distanceSailed: calculateLegDistance(records),
    vmgEfficiency: 0.85, // Placeholder
    speedEfficiency: 0.90, // Placeholder
    trackingError: 10, // Placeholder
  };
}

/**
 * Calculate leg conditions
 */
function calculateLegConditions(records: SailingRecord[]): Leg['conditions'] {
  const windSpeeds = records.map(r => r.tws).filter((s): s is number => s !== undefined);
  const windDirs = records.map(r => r.twd).filter((d): d is number => d !== undefined);

  return {
    avgWindSpeed: windSpeeds.length > 0 ? windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length : 0,
    windSpeedRange: windSpeeds.length > 0 ? [Math.min(...windSpeeds), Math.max(...windSpeeds)] : [0, 0],
    avgWindDirection: windDirs.length > 0 ? windDirs.reduce((sum, d) => sum + d, 0) / windDirs.length : 0,
    windShifts: calculateWindShifts(records),
  };
}

/**
 * Calculate approximate leg distance
 */
function calculateLegDistance(records: SailingRecord[]): number {
  let distance = 0;

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];

    if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
      // Simplified distance calculation
      const timeDelta = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      const speed = curr.bsp || curr.sog || 0;
      distance += (speed * timeDelta) / 3600; // Convert to nautical miles
    }
  }

  return distance;
}

/**
 * Calculate leg bearing
 */
function calculateLegBearing(records: SailingRecord[]): number {
  if (records.length < 2) return 0;

  const start = records[0];
  const end = records[records.length - 1];

  if (start.latitude && start.longitude && end.latitude && end.longitude) {
    const dLng = end.longitude - start.longitude;
    const dLat = end.latitude - start.latitude;

    const bearing = Math.atan2(dLng, dLat) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  return 0;
}

/**
 * Calculate race performance metrics
 */
function calculateRacePerformance(records: SailingRecord[]): Race['performance'] {
  const speeds = records.map(r => r.bsp || r.sog || 0);
  const vmgData = records.map(r => calculateVMGMetrics(r));

  const maneuverCounts = {
    totalTacks: 0, // Would be calculated from actual maneuvers
    totalGybes: 0,
  };

  return {
    totalDistance: calculateLegDistance(records),
    rhumbLineDistance: 0, // Would calculate straight-line distance
    distanceEfficiency: 0.85, // Placeholder
    avgSpeed: speeds.reduce((sum, s) => sum + s, 0) / speeds.length,
    avgVmg: vmgData.reduce((sum, v) => sum + v.vmg, 0) / vmgData.length,
    avgVmgUpwind: vmgData.filter(v => v.vmgUpwind > 0).reduce((sum, v) => sum + v.vmgUpwind, 0) / vmgData.filter(v => v.vmgUpwind > 0).length || 0,
    avgVmgDownwind: vmgData.filter(v => v.vmgDownwind > 0).reduce((sum, v) => sum + v.vmgDownwind, 0) / vmgData.filter(v => v.vmgDownwind > 0).length || 0,
    totalTacks: maneuverCounts.totalTacks,
    totalGybes: maneuverCounts.totalGybes,
  };
}

/**
 * Analyze race conditions
 */
function analyzeRaceConditions(records: SailingRecord[]): Race['conditions'] {
  const windSpeeds = records.map(r => r.tws).filter((s): s is number => s !== undefined);
  const windDirs = records.map(r => r.twd).filter((d): d is number => d !== undefined);

  const windStability = calculateWindStability(windDirs);
  const gustiness = calculateGustiness(windSpeeds);

  return {
    avgWindSpeed: windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length,
    windSpeedRange: [Math.min(...windSpeeds), Math.max(...windSpeeds)],
    avgWindDirection: windDirs.reduce((sum, d) => sum + d, 0) / windDirs.length,
    windStability,
    gustiness,
  };
}

/**
 * Helper functions
 */
function calculateDataCompleteness(records: SailingRecord[]): number {
  const fields = ['timestamp', 'latitude', 'longitude', 'bsp', 'hdg'];
  let total = 0;
  let present = 0;

  for (const record of records) {
    total += fields.length;
    present += fields.filter(field => record[field as keyof SailingRecord] !== undefined).length;
  }

  return total > 0 ? present / total : 0;
}

function calculateWindShifts(records: SailingRecord[]): number {
  let shifts = 0;
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1].twd;
    const curr = records[i].twd;
    if (prev !== undefined && curr !== undefined && Math.abs(curr - prev) > 10) {
      shifts++;
    }
  }
  return shifts;
}

function calculateWindStability(windDirs: number[]): number {
  if (windDirs.length < 2) return 1;

  const variance = windDirs.reduce((sum, dir, i, arr) => {
    const mean = arr.reduce((s, d) => s + d, 0) / arr.length;
    return sum + Math.pow(dir - mean, 2);
  }, 0) / windDirs.length;

  return Math.max(0, 1 - variance / 1800); // Normalize to 0-1
}

function calculateGustiness(windSpeeds: number[]): number {
  if (windSpeeds.length < 2) return 0;

  const mean = windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length;
  const variance = windSpeeds.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / windSpeeds.length;

  return Math.sqrt(variance) / mean; // Coefficient of variation
}