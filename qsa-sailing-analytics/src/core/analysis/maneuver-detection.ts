/**
 * Maneuver Detection and Analysis
 * Detect tacks, gybes, and mark roundings from sailing data
 */

import type { SailingRecord, Maneuver, ManeuverPhase } from '../models';
import { generateId } from '../utils/id';
import { angleDifference, normalizeAngleSigned } from '../utils/math';
import { calculateVMGMetrics } from './vmg';

/**
 * Detect all maneuvers in a sailing session
 */
export function detectManeuvers(
  records: SailingRecord[],
  sessionId: string,
  options: {
    headingChangeThreshold: number;
    windAngleChangeThreshold: number;
    minDuration: number;
    maxDuration: number;
    speedChangeThreshold: number;
  } = {
    headingChangeThreshold: 60, // degrees
    windAngleChangeThreshold: 70, // degrees
    minDuration: 5, // seconds
    maxDuration: 120, // seconds
    speedChangeThreshold: 2, // knots
  }
): Maneuver[] {
  if (records.length < 10) return [];

  const maneuvers: Maneuver[] = [];
  const candidates = findManeuverCandidates(records, options);

  for (const candidate of candidates) {
    const maneuver = analyzeManeuver(candidate, records, sessionId, options);
    if (maneuver) {
      maneuvers.push(maneuver);
    }
  }

  return maneuvers.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * Find potential maneuver candidates based on heading and wind angle changes
 */
function findManeuverCandidates(
  records: SailingRecord[],
  options: ReturnType<typeof detectManeuvers>['arguments'][2]
): Array<{
  startIndex: number;
  endIndex: number;
  type: 'potential_tack' | 'potential_gybe' | 'potential_rounding';
}> {
  const candidates: Array<{
    startIndex: number;
    endIndex: number;
    type: 'potential_tack' | 'potential_gybe' | 'potential_rounding';
  }> = [];

  let maneuverStart: number | null = null;
  let initialHeading: number | null = null;
  let initialTWA: number | null = null;
  let initialSpeed: number | null = null;

  for (let i = 1; i < records.length; i++) {
    const current = records[i];
    const previous = records[i - 1];

    if (!current.hdg && !current.twa) continue;

    // Calculate changes
    const headingChange = current.hdg && previous.hdg
      ? Math.abs(angleDifference(previous.hdg, current.hdg))
      : 0;

    const twaChange = current.twa !== undefined && previous.twa !== undefined
      ? Math.abs(angleDifference(previous.twa, current.twa))
      : 0;

    const speedChange = current.bsp && previous.bsp
      ? Math.abs(current.bsp - previous.bsp)
      : 0;

    // Detect start of potential maneuver
    if (maneuverStart === null &&
        (headingChange > options.headingChangeThreshold / 3 ||
         twaChange > options.windAngleChangeThreshold / 3 ||
         speedChange > options.speedChangeThreshold / 2)) {

      maneuverStart = i - 1;
      initialHeading = previous.hdg || null;
      initialTWA = previous.twa;
      initialSpeed = previous.bsp || previous.sog || null;
      continue;
    }

    // Check if we're in a potential maneuver
    if (maneuverStart !== null) {
      const timeElapsed = (new Date(current.timestamp).getTime() - new Date(records[maneuverStart].timestamp).getTime()) / 1000;

      // Check for end of maneuver (stabilization)
      const recentStability = checkStability(records.slice(Math.max(0, i - 3), i + 1));

      if (recentStability || timeElapsed > options.maxDuration) {
        // Analyze the complete maneuver
        if (timeElapsed >= options.minDuration) {
          const totalHeadingChange = initialHeading && current.hdg
            ? Math.abs(angleDifference(initialHeading, current.hdg))
            : 0;

          const totalTWAChange = initialTWA !== undefined && current.twa !== undefined
            ? angleDifference(initialTWA, current.twa)
            : 0;

          // Classify maneuver type
          let type: 'potential_tack' | 'potential_gybe' | 'potential_rounding' = 'potential_rounding';

          if (Math.abs(totalTWAChange) > options.windAngleChangeThreshold) {
            // Determine if tack or gybe based on wind angle crossing
            const crossedWind = checkWindAngleCrossing(records.slice(maneuverStart, i + 1));
            if (crossedWind) {
              const avgTWA = calculateAverageTWA(records.slice(maneuverStart, i + 1));
              type = Math.abs(avgTWA) < 90 ? 'potential_tack' : 'potential_gybe';
            }
          }

          candidates.push({
            startIndex: maneuverStart,
            endIndex: i,
            type,
          });
        }

        // Reset for next maneuver
        maneuverStart = null;
        initialHeading = null;
        initialTWA = null;
        initialSpeed = null;
      }
    }
  }

  return candidates;
}

/**
 * Check if recent data shows stability (end of maneuver)
 */
function checkStability(recentRecords: SailingRecord[]): boolean {
  if (recentRecords.length < 2) return false;

  let stable = true;
  for (let i = 1; i < recentRecords.length; i++) {
    const current = recentRecords[i];
    const previous = recentRecords[i - 1];

    const headingChange = current.hdg && previous.hdg
      ? Math.abs(angleDifference(previous.hdg, current.hdg))
      : 0;

    const twaChange = current.twa !== undefined && previous.twa !== undefined
      ? Math.abs(angleDifference(previous.twa, current.twa))
      : 0;

    if (headingChange > 10 || twaChange > 15) {
      stable = false;
      break;
    }
  }

  return stable;
}

/**
 * Check if wind angle crosses from one side to the other (tack/gybe indicator)
 */
function checkWindAngleCrossing(records: SailingRecord[]): boolean {
  const twaValues = records.map(r => r.twa).filter((twa): twa is number => twa !== undefined);

  if (twaValues.length < 2) return false;

  const startSide = twaValues[0] > 0 ? 'starboard' : 'port';
  const endSide = twaValues[twaValues.length - 1] > 0 ? 'starboard' : 'port';

  return startSide !== endSide;
}

/**
 * Calculate average TWA during maneuver
 */
function calculateAverageTWA(records: SailingRecord[]): number {
  const twaValues = records.map(r => r.twa).filter((twa): twa is number => twa !== undefined);

  if (twaValues.length === 0) return 0;

  // Use absolute average to determine upwind vs downwind
  return twaValues.reduce((sum, twa) => sum + Math.abs(twa), 0) / twaValues.length;
}

/**
 * Analyze a maneuver candidate and create a full Maneuver object
 */
function analyzeManeuver(
  candidate: ReturnType<typeof findManeuverCandidates>[0],
  records: SailingRecord[],
  sessionId: string,
  options: Parameters<typeof detectManeuvers>[2]
): Maneuver | null {
  const maneuverRecords = records.slice(candidate.startIndex, candidate.endIndex + 1);

  if (maneuverRecords.length < 2) return null;

  const startRecord = maneuverRecords[0];
  const endRecord = maneuverRecords[maneuverRecords.length - 1];

  // Determine actual maneuver type
  const type = classifyManeuver(maneuverRecords, candidate.type);
  if (!type) return null;

  // Analyze phases
  const phases = analyzeManeuverPhases(maneuverRecords);

  // Calculate execution metrics
  const execution = calculateExecutionMetrics(maneuverRecords, type);

  // Get environmental conditions
  const conditions = analyzeManeuverConditions(maneuverRecords);

  // Assess quality
  const quality = assessManeuverQuality(maneuverRecords, execution, type);

  const maneuver: Maneuver = {
    id: generateId(),
    sessionId,
    type,

    startTime: startRecord.timestamp,
    endTime: endRecord.timestamp,
    duration: (new Date(endRecord.timestamp).getTime() - new Date(startRecord.timestamp).getTime()) / 1000,

    entry: {
      speed: startRecord.bsp || startRecord.sog || 0,
      heading: startRecord.hdg || 0,
      twa: startRecord.twa || 0,
      heel: startRecord.heel || 0,
      vmg: calculateVMGMetrics(startRecord).vmg,
      position: {
        latitude: startRecord.latitude || 0,
        longitude: startRecord.longitude || 0,
      },
    },

    exit: {
      speed: endRecord.bsp || endRecord.sog || 0,
      heading: endRecord.hdg || 0,
      twa: endRecord.twa || 0,
      heel: endRecord.heel || 0,
      vmg: calculateVMGMetrics(endRecord).vmg,
      position: {
        latitude: endRecord.latitude || 0,
        longitude: endRecord.longitude || 0,
      },
    },

    execution,
    phases,
    conditions,
    quality,

    dataRange: {
      startIndex: candidate.startIndex,
      endIndex: candidate.endIndex,
    },
  };

  return maneuver;
}

/**
 * Classify the specific type of maneuver
 */
function classifyManeuver(
  records: SailingRecord[],
  candidateType: string
): 'tack' | 'gybe' | 'mark_rounding' | 'start_sequence' | null {
  if (records.length < 2) return null;

  const twaValues = records.map(r => r.twa).filter((twa): twa is number => twa !== undefined);
  if (twaValues.length < 2) return null;

  const startTWA = twaValues[0];
  const endTWA = twaValues[twaValues.length - 1];
  const twaChange = angleDifference(startTWA, endTWA);

  const crossedWind = checkWindAngleCrossing(records);

  if (crossedWind && Math.abs(twaChange) > 70) {
    const avgAbsTWA = calculateAverageTWA(records);
    return avgAbsTWA < 90 ? 'tack' : 'gybe';
  }

  // Check for mark rounding (significant heading change without crossing wind)
  const headingChange = records[0].hdg && records[records.length - 1].hdg
    ? Math.abs(angleDifference(records[0].hdg, records[records.length - 1].hdg))
    : 0;

  if (headingChange > 45 && !crossedWind) {
    return 'mark_rounding';
  }

  return null;
}

/**
 * Analyze maneuver phases (entry, turn, exit)
 */
function analyzeManeuverPhases(records: SailingRecord[]): ManeuverPhase[] {
  const phases: ManeuverPhase[] = [];

  if (records.length < 3) return phases;

  // Simple 3-phase division: entry (first 30%), turn (middle 40%), exit (last 30%)
  const entryEnd = Math.floor(records.length * 0.3);
  const turnEnd = Math.floor(records.length * 0.7);

  // Entry phase
  const entryRecords = records.slice(0, entryEnd);
  phases.push(analyzePhase('entry', entryRecords));

  // Turn phase
  const turnRecords = records.slice(entryEnd, turnEnd);
  phases.push(analyzePhase('turn', turnRecords));

  // Exit phase
  const exitRecords = records.slice(turnEnd);
  phases.push(analyzePhase('exit', exitRecords));

  return phases;
}

/**
 * Analyze individual phase of maneuver
 */
function analyzePhase(
  phase: 'entry' | 'turn' | 'exit',
  records: SailingRecord[]
): ManeuverPhase {
  if (records.length === 0) {
    return {
      phase,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      avgSpeed: 0,
      avgHeel: 0,
      headingChange: 0,
      speedLoss: 0,
    };
  }

  const startTime = records[0].timestamp;
  const endTime = records[records.length - 1].timestamp;
  const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

  // Calculate averages
  const speeds = records.map(r => r.bsp || r.sog || 0);
  const heels = records.map(r => r.heel || 0);
  const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
  const avgHeel = heels.reduce((sum, h) => sum + Math.abs(h), 0) / heels.length;

  // Heading change
  const headingChange = records[0].hdg && records[records.length - 1].hdg
    ? Math.abs(angleDifference(records[0].hdg, records[records.length - 1].hdg))
    : 0;

  // Speed loss
  const startSpeed = speeds[0];
  const endSpeed = speeds[speeds.length - 1];
  const speedLoss = Math.max(0, startSpeed - endSpeed);

  return {
    phase,
    startTime,
    endTime,
    duration,
    avgSpeed,
    avgHeel,
    headingChange,
    speedLoss,
  };
}

/**
 * Calculate execution metrics
 */
function calculateExecutionMetrics(
  records: SailingRecord[],
  type: 'tack' | 'gybe' | 'mark_rounding' | 'start_sequence'
): Maneuver['execution'] {
  const startRecord = records[0];
  const endRecord = records[records.length - 1];

  // Heading change
  const headingChange = startRecord.hdg && endRecord.hdg
    ? Math.abs(angleDifference(startRecord.hdg, endRecord.hdg))
    : 0;

  // Turn rate
  const duration = (new Date(endRecord.timestamp).getTime() - new Date(startRecord.timestamp).getTime()) / 1000;
  const turnRate = duration > 0 ? headingChange / duration : 0;

  // Maximum turn rate
  let maxTurnRate = 0;
  for (let i = 1; i < records.length; i++) {
    if (records[i].hdg && records[i - 1].hdg) {
      const timeStep = (new Date(records[i].timestamp).getTime() - new Date(records[i - 1].timestamp).getTime()) / 1000;
      const stepTurnRate = timeStep > 0
        ? Math.abs(angleDifference(records[i - 1].hdg!, records[i].hdg!)) / timeStep
        : 0;
      maxTurnRate = Math.max(maxTurnRate, stepTurnRate);
    }
  }

  // Speed and VMG losses
  const startSpeed = startRecord.bsp || startRecord.sog || 0;
  const endSpeed = endRecord.bsp || endRecord.sog || 0;
  const speeds = records.map(r => r.bsp || r.sog || 0);
  const minSpeed = Math.min(...speeds);
  const speedLoss = startSpeed - minSpeed;

  const startVMG = calculateVMGMetrics(startRecord).vmg;
  const endVMG = calculateVMGMetrics(endRecord).vmg;
  const vmgLoss = Math.max(0, startVMG - endVMG);

  // Distance and time lost (simplified calculation)
  const distanceLost = speedLoss * duration * 0.000514444; // Convert to nautical miles
  const timeLost = duration * 0.1; // Simplified - would need reference maneuver

  // Maximum heel
  const heels = records.map(r => Math.abs(r.heel || 0));
  const maxHeel = Math.max(...heels);

  // Rudder work (if available)
  const rudderAngles = records.map(r => Math.abs(r.rudder || 0));
  const rudderWork = rudderAngles.reduce((sum, angle) => sum + angle, 0);

  // Smoothness score
  const smoothness = calculateSmoothness(records);

  return {
    headingChange,
    turnRate,
    maxTurnRate,
    speedLoss,
    vmgLoss,
    distanceLost,
    timeLost,
    maxHeel,
    rudderWork,
    smoothness,
  };
}

/**
 * Calculate smoothness of maneuver execution
 */
function calculateSmoothness(records: SailingRecord[]): number {
  if (records.length < 3) return 1;

  let totalVariation = 0;
  let validSteps = 0;

  // Calculate rate of change variations (jerkiness)
  for (let i = 2; i < records.length; i++) {
    const curr = records[i];
    const prev = records[i - 1];
    const prev2 = records[i - 2];

    if (curr.hdg && prev.hdg && prev2.hdg) {
      const rate1 = angleDifference(prev2.hdg, prev.hdg);
      const rate2 = angleDifference(prev.hdg, curr.hdg);
      const acceleration = Math.abs(rate2 - rate1);
      totalVariation += acceleration;
      validSteps++;
    }
  }

  if (validSteps === 0) return 1;

  const avgVariation = totalVariation / validSteps;
  // Convert to 0-1 score where lower variation = higher smoothness
  return Math.max(0, 1 - avgVariation / 30); // 30 degrees of variation = 0 smoothness
}

/**
 * Analyze environmental conditions during maneuver
 */
function analyzeManeuverConditions(records: SailingRecord[]): Maneuver['conditions'] {
  const windSpeeds = records.map(r => r.tws).filter((s): s is number => s !== undefined);
  const windDirections = records.map(r => r.twd).filter((d): d is number => d !== undefined);

  return {
    windSpeed: windSpeeds.length > 0
      ? windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length
      : 0,
    windDirection: windDirections.length > 0
      ? windDirections.reduce((sum, d) => sum + d, 0) / windDirections.length
      : 0,
  };
}

/**
 * Assess overall quality and grade the maneuver
 */
function assessManeuverQuality(
  records: SailingRecord[],
  execution: Maneuver['execution'],
  type: 'tack' | 'gybe' | 'mark_rounding' | 'start_sequence'
): Maneuver['quality'] {
  // Confidence in detection
  const detection_confidence = records.length >= 5 && execution.headingChange > 45 ? 0.9 : 0.6;

  // Execution grade based on multiple factors
  let score = 100;

  // Penalize excessive speed loss
  if (execution.speedLoss > 3) score -= 20;
  else if (execution.speedLoss > 1.5) score -= 10;

  // Penalize long duration
  const targetDuration = type === 'tack' ? 15 : 20; // seconds
  const duration = (new Date(records[records.length - 1].timestamp).getTime() - new Date(records[0].timestamp).getTime()) / 1000;
  if (duration > targetDuration * 2) score -= 15;
  else if (duration > targetDuration * 1.5) score -= 5;

  // Reward smoothness
  score += (execution.smoothness - 0.5) * 20;

  // Data quality
  const hasGoodData = records.every(r => r.hdg !== undefined && (r.bsp !== undefined || r.sog !== undefined));
  const dataQuality = hasGoodData ? 0.9 : 0.6;

  const gpsAccuracy = 3; // Assumed good GPS

  // Convert score to letter grade
  let execution_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) execution_grade = 'A';
  else if (score >= 80) execution_grade = 'B';
  else if (score >= 70) execution_grade = 'C';
  else if (score >= 60) execution_grade = 'D';
  else execution_grade = 'F';

  return {
    detection_confidence,
    execution_grade,
    dataQuality,
    gpsAccuracy,
  };
}