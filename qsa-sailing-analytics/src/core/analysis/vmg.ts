/**
 * Velocity Made Good (VMG) Analysis
 * Performance calculations for sailing efficiency
 */

import type { SailingRecord, PolarTarget } from '../models';
import { toRadians, normalizeAngleSigned } from '../utils/math';

/**
 * Calculate comprehensive VMG metrics for a record
 */
export function calculateVMGMetrics(record: SailingRecord, targets?: PolarTarget[]): {
  vmg: number;
  vmgUpwind: number;
  vmgDownwind: number;
  vmgEfficiency: number; // 0-1, actual vs theoretical max
  angleEfficiency: number; // How close to optimal angle
  speedEfficiency: number; // How close to target boat speed
  recommendation?: string;
} {
  const { bsp, twa, tws } = record;

  if (bsp === undefined || twa === undefined) {
    return {
      vmg: 0,
      vmgUpwind: 0,
      vmgDownwind: 0,
      vmgEfficiency: 0,
      angleEfficiency: 0,
      speedEfficiency: 0,
    };
  }

  // Calculate VMG
  const absTwa = Math.abs(twa);
  const twaRad = toRadians(absTwa);
  const vmgComponent = bsp * Math.cos(twaRad);

  const isUpwind = absTwa < 90;
  const vmgUpwind = isUpwind ? vmgComponent : 0;
  const vmgDownwind = !isUpwind ? vmgComponent : 0;

  // Calculate efficiency against targets if available
  let vmgEfficiency = 0;
  let angleEfficiency = 0;
  let speedEfficiency = 0;
  let recommendation: string | undefined;

  if (targets && tws !== undefined) {
    const analysis = analyzeVMGAgainstTargets(bsp, twa, tws, targets);
    vmgEfficiency = analysis.vmgEfficiency;
    angleEfficiency = analysis.angleEfficiency;
    speedEfficiency = analysis.speedEfficiency;
    recommendation = analysis.recommendation;
  }

  return {
    vmg: vmgComponent,
    vmgUpwind,
    vmgDownwind,
    vmgEfficiency,
    angleEfficiency,
    speedEfficiency,
    recommendation,
  };
}

/**
 * Analyze VMG performance against polar targets
 */
function analyzeVMGAgainstTargets(
  bsp: number,
  twa: number,
  tws: number,
  targets: PolarTarget[]
): {
  vmgEfficiency: number;
  angleEfficiency: number;
  speedEfficiency: number;
  recommendation: string;
} {
  // Find closest target for this wind speed and angle
  const target = findClosestTarget(twa, tws, targets);

  if (!target) {
    return {
      vmgEfficiency: 0,
      angleEfficiency: 0,
      speedEfficiency: 0,
      recommendation: 'No polar data available for these conditions',
    };
  }

  // Calculate actual VMG
  const actualVMG = bsp * Math.cos(toRadians(Math.abs(twa)));

  // Calculate target VMG
  const targetVMG = target.targetVmg;

  // VMG efficiency
  const vmgEfficiency = targetVMG > 0 ? Math.min(actualVMG / targetVMG, 1) : 0;

  // Speed efficiency
  const speedEfficiency = target.targetBsp > 0 ? Math.min(bsp / target.targetBsp, 1) : 0;

  // Angle efficiency (how close to optimal angle)
  const optimalAngle = findOptimalVMGAngle(tws, targets, Math.abs(twa) < 90);
  const angleDifference = Math.abs(Math.abs(twa) - Math.abs(optimalAngle));
  const angleEfficiency = Math.max(0, 1 - angleDifference / 30); // 30 degree tolerance

  // Generate recommendation
  let recommendation = '';
  if (vmgEfficiency < 0.85) {
    if (speedEfficiency < 0.9) {
      recommendation = 'Increase boat speed - trim sails or ease sheets';
    } else if (angleEfficiency < 0.8) {
      const absTwa = Math.abs(twa);
      if (absTwa < 90) {
        recommendation = optimalAngle < absTwa ? 'Point higher (closer to wind)' : 'Bear away slightly';
      } else {
        recommendation = optimalAngle > absTwa ? 'Bear away more' : 'Head up slightly';
      }
    } else {
      recommendation = 'Good angle, focus on boat speed';
    }
  } else {
    recommendation = 'Good VMG - maintain current settings';
  }

  return {
    vmgEfficiency,
    angleEfficiency,
    speedEfficiency,
    recommendation,
  };
}

/**
 * Find the closest polar target for given conditions
 */
function findClosestTarget(twa: number, tws: number, targets: PolarTarget[]): PolarTarget | null {
  if (targets.length === 0) return null;

  let closest = targets[0];
  let minDistance = calculateTargetDistance(twa, tws, closest);

  for (const target of targets) {
    const distance = calculateTargetDistance(twa, tws, target);
    if (distance < minDistance) {
      minDistance = distance;
      closest = target;
    }
  }

  return minDistance < 50 ? closest : null; // Reasonable interpolation distance
}

function calculateTargetDistance(twa: number, tws: number, target: PolarTarget): number {
  const twaDiff = Math.abs(Math.abs(twa) - Math.abs(target.twa));
  const twsDiff = Math.abs(tws - target.tws);

  // Weight TWA difference more heavily
  return twaDiff * 2 + twsDiff;
}

/**
 * Find optimal VMG angle for given wind speed
 */
function findOptimalVMGAngle(tws: number, targets: PolarTarget[], upwind: boolean): number {
  const relevantTargets = targets.filter(target => {
    const isUpwindTarget = Math.abs(target.twa) < 90;
    return isUpwindTarget === upwind && Math.abs(target.tws - tws) < 4;
  });

  if (relevantTargets.length === 0) {
    // Default angles if no targets
    return upwind ? 42 : 150;
  }

  // Find angle with best VMG
  let bestAngle = relevantTargets[0].twa;
  let bestVMG = relevantTargets[0].targetVmg;

  for (const target of relevantTargets) {
    if (target.targetVmg > bestVMG) {
      bestVMG = target.targetVmg;
      bestAngle = target.twa;
    }
  }

  return bestAngle;
}

/**
 * Calculate VMG statistics for a session or leg
 */
export function calculateVMGStatistics(
  records: SailingRecord[],
  targets?: PolarTarget[]
): {
  averageVMG: number;
  maxVMG: number;
  averageVMGUpwind: number;
  averageVMGDownwind: number;
  vmgEfficiency: number;
  timeUpwind: number; // seconds
  timeDownwind: number; // seconds
  distanceUpwind: number; // nautical miles
  distanceDownwind: number; // nautical miles
  bestVMGMoments: Array<{
    timestamp: string;
    vmg: number;
    bsp: number;
    twa: number;
  }>;
  recommendations: string[];
} {
  if (records.length === 0) {
    return {
      averageVMG: 0,
      maxVMG: 0,
      averageVMGUpwind: 0,
      averageVMGDownwind: 0,
      vmgEfficiency: 0,
      timeUpwind: 0,
      timeDownwind: 0,
      distanceUpwind: 0,
      distanceDownwind: 0,
      bestVMGMoments: [],
      recommendations: [],
    };
  }

  const vmgData = records.map(record => calculateVMGMetrics(record, targets));
  const validVMG = vmgData.filter(data => !isNaN(data.vmg));

  if (validVMG.length === 0) {
    return {
      averageVMG: 0,
      maxVMG: 0,
      averageVMGUpwind: 0,
      averageVMGDownwind: 0,
      vmgEfficiency: 0,
      timeUpwind: 0,
      timeDownwind: 0,
      distanceUpwind: 0,
      distanceDownwind: 0,
      bestVMGMoments: [],
      recommendations: [],
    };
  }

  // Calculate averages
  const averageVMG = validVMG.reduce((sum, data) => sum + data.vmg, 0) / validVMG.length;
  const maxVMG = Math.max(...validVMG.map(data => data.vmg));

  // Upwind/downwind analysis
  const upwindData = validVMG.filter(data => data.vmgUpwind > 0);
  const downwindData = validVMG.filter(data => data.vmgDownwind > 0);

  const averageVMGUpwind = upwindData.length > 0
    ? upwindData.reduce((sum, data) => sum + data.vmgUpwind, 0) / upwindData.length
    : 0;

  const averageVMGDownwind = downwindData.length > 0
    ? downwindData.reduce((sum, data) => sum + data.vmgDownwind, 0) / downwindData.length
    : 0;

  // Time and distance analysis
  const timeInterval = records.length > 1
    ? (new Date(records[records.length - 1].timestamp).getTime() - new Date(records[0].timestamp).getTime()) / 1000
    : 0;

  const timeUpwind = (upwindData.length / validVMG.length) * timeInterval;
  const timeDownwind = (downwindData.length / validVMG.length) * timeInterval;

  // Estimate distances (simplified)
  const distanceUpwind = (averageVMGUpwind * timeUpwind) / 3600; // Convert to NM
  const distanceDownwind = (averageVMGDownwind * timeDownwind) / 3600;

  // Overall VMG efficiency
  const vmgEfficiency = validVMG.length > 0
    ? validVMG.reduce((sum, data) => sum + data.vmgEfficiency, 0) / validVMG.length
    : 0;

  // Find best VMG moments
  const sortedByVMG = records
    .map((record, index) => ({ record, vmg: vmgData[index] }))
    .filter(item => item.vmg && !isNaN(item.vmg.vmg))
    .sort((a, b) => b.vmg.vmg - a.vmg.vmg)
    .slice(0, 5);

  const bestVMGMoments = sortedByVMG.map(item => ({
    timestamp: item.record.timestamp,
    vmg: item.vmg.vmg,
    bsp: item.record.bsp || 0,
    twa: item.record.twa || 0,
  }));

  // Generate recommendations
  const recommendations = generateVMGRecommendations(vmgData, records);

  return {
    averageVMG,
    maxVMG,
    averageVMGUpwind,
    averageVMGDownwind,
    vmgEfficiency,
    timeUpwind,
    timeDownwind,
    distanceUpwind,
    distanceDownwind,
    bestVMGMoments,
    recommendations,
  };
}

/**
 * Generate performance recommendations based on VMG analysis
 */
function generateVMGRecommendations(
  vmgData: ReturnType<typeof calculateVMGMetrics>[],
  records: SailingRecord[]
): string[] {
  const recommendations: string[] = [];

  // Overall efficiency check
  const avgEfficiency = vmgData.reduce((sum, data) => sum + data.vmgEfficiency, 0) / vmgData.length;

  if (avgEfficiency < 0.8) {
    recommendations.push('Overall VMG efficiency is below 80% - focus on trim and boat handling');
  }

  // Angle efficiency
  const avgAngleEff = vmgData.reduce((sum, data) => sum + data.angleEfficiency, 0) / vmgData.length;
  if (avgAngleEff < 0.7) {
    recommendations.push('Consider sailing closer to optimal angles for better VMG');
  }

  // Speed efficiency
  const avgSpeedEff = vmgData.reduce((sum, data) => sum + data.speedEfficiency, 0) / vmgData.length;
  if (avgSpeedEff < 0.8) {
    recommendations.push('Focus on boat speed - check sail trim and crew movement');
  }

  // Consistency check
  const vmgValues = vmgData.map(data => data.vmg).filter(vmg => !isNaN(vmg));
  if (vmgValues.length > 0) {
    const mean = vmgValues.reduce((sum, vmg) => sum + vmg, 0) / vmgValues.length;
    const variance = vmgValues.reduce((sum, vmg) => sum + Math.pow(vmg - mean, 2), 0) / vmgValues.length;
    const cv = Math.sqrt(variance) / mean;

    if (cv > 0.3) {
      recommendations.push('Work on consistency - VMG varies significantly during session');
    }
  }

  // Wind-specific recommendations
  const upwindRecords = records.filter(r => r.twa !== undefined && Math.abs(r.twa) < 90);
  const downwindRecords = records.filter(r => r.twa !== undefined && Math.abs(r.twa) >= 90);

  if (upwindRecords.length > downwindRecords.length * 2) {
    recommendations.push('Predominantly upwind sailing - focus on pointing and footing balance');
  } else if (downwindRecords.length > upwindRecords.length * 2) {
    recommendations.push('Predominantly downwind sailing - focus on deep angles and speed');
  }

  return recommendations;
}

/**
 * Calculate theoretical maximum VMG for conditions
 */
export function calculateTheoreticalMaxVMG(
  tws: number,
  maxBoatSpeed: number = 15, // Reasonable maximum for most sailboats
  optimalUpwindAngle: number = 42,
  optimalDownwindAngle: number = 150
): {
  maxVMGUpwind: number;
  maxVMGDownwind: number;
  optimalUpwindSpeed: number;
  optimalDownwindSpeed: number;
} {
  // Simplified theoretical calculation
  // In practice, this would come from VPP (Velocity Prediction Program)

  // Upwind calculation - assumes speed decreases as you point higher
  const upwindSpeedFactor = Math.max(0.3, 1 - (45 - optimalUpwindAngle) * 0.02);
  const optimalUpwindSpeed = Math.min(maxBoatSpeed * upwindSpeedFactor, maxBoatSpeed);
  const maxVMGUpwind = optimalUpwindSpeed * Math.cos(toRadians(optimalUpwindAngle));

  // Downwind calculation - assumes best VMG is not at dead run
  const downwindSpeedFactor = Math.min(1.2, 1 + (tws / 20) * 0.3); // Surfing effect
  const optimalDownwindSpeed = Math.min(maxBoatSpeed * downwindSpeedFactor, maxBoatSpeed);
  const maxVMGDownwind = optimalDownwindSpeed * Math.cos(toRadians(180 - optimalDownwindAngle));

  return {
    maxVMGUpwind,
    maxVMGDownwind,
    optimalUpwindSpeed,
    optimalDownwindSpeed,
  };
}