/**
 * Web Worker for sailing data analysis
 * Offloads heavy analysis computation from the main thread
 */

import type { SailingSession, Race, Maneuver } from '../models';
import { detectRaces } from '../analysis/race-detection';
import { detectManeuvers } from '../analysis/maneuver-detection';
import { calculateWindStatistics, smoothWindData } from '../analysis/wind-math';
import { calculateVMGStatistics } from '../analysis/vmg';

// Analysis types that can be performed
type AnalysisType = 'races' | 'maneuvers' | 'wind' | 'vmg' | 'all';

// Worker message types
interface AnalysisMessage {
  type: 'analyze';
  payload: {
    session: SailingSession;
    analysisTypes: AnalysisType[];
    options?: Record<string, any>;
  };
}

interface ProgressMessage {
  type: 'progress';
  payload: {
    progress: number;
    stage: string;
    message?: string;
  };
}

interface ResultMessage {
  type: 'result';
  payload: {
    races?: Race[];
    maneuvers?: Maneuver[];
    windAnalysis?: any;
    vmgAnalysis?: any;
    processingTime: number;
  };
}

interface ErrorMessage {
  type: 'error';
  payload: {
    error: string;
    stage?: string;
    details?: Record<string, unknown>;
  };
}

type WorkerMessage = AnalysisMessage | ProgressMessage | ResultMessage | ErrorMessage;

// Worker context check
const isWorker = typeof importScripts === 'function';

if (isWorker) {
  // Running in Web Worker context
  self.onmessage = async function(event: MessageEvent<AnalysisMessage>) {
    const { type, payload } = event.data;

    if (type === 'analyze') {
      const startTime = Date.now();

      try {
        const { session, analysisTypes, options = {} } = payload;
        const results: ResultMessage['payload'] = {
          processingTime: 0,
        };

        const totalStages = analysisTypes.length;
        let currentStage = 0;

        // Helper function to send progress updates
        const sendProgress = (stage: string, stageProgress: number, message?: string) => {
          const overallProgress = (currentStage + stageProgress) / totalStages;
          const progressMessage: ProgressMessage = {
            type: 'progress',
            payload: {
              progress: overallProgress,
              stage,
              message,
            },
          };
          self.postMessage(progressMessage);
        };

        // Process each requested analysis type
        for (const analysisType of analysisTypes) {
          currentStage = analysisTypes.indexOf(analysisType);

          switch (analysisType) {
            case 'races':
              sendProgress('races', 0, 'Detecting races...');
              results.races = await analyzeRaces(session, options, sendProgress);
              break;

            case 'maneuvers':
              sendProgress('maneuvers', 0, 'Detecting maneuvers...');
              results.maneuvers = await analyzeManeuvers(session, options, sendProgress);
              break;

            case 'wind':
              sendProgress('wind', 0, 'Analyzing wind patterns...');
              results.windAnalysis = await analyzeWind(session, options, sendProgress);
              break;

            case 'vmg':
              sendProgress('vmg', 0, 'Analyzing VMG performance...');
              results.vmgAnalysis = await analyzeVMG(session, options, sendProgress);
              break;

            case 'all':
              // Run all analysis types
              sendProgress('comprehensive', 0, 'Running comprehensive analysis...');

              sendProgress('comprehensive', 0.1, 'Detecting maneuvers...');
              results.maneuvers = await analyzeManeuvers(session, options, () => {});

              sendProgress('comprehensive', 0.4, 'Detecting races...');
              results.races = await analyzeRaces(session, options, () => {});

              sendProgress('comprehensive', 0.7, 'Analyzing wind patterns...');
              results.windAnalysis = await analyzeWind(session, options, () => {});

              sendProgress('comprehensive', 0.9, 'Analyzing VMG performance...');
              results.vmgAnalysis = await analyzeVMG(session, options, () => {});
              break;
          }

          sendProgress(analysisType, 1, `${analysisType} analysis complete`);
        }

        results.processingTime = Date.now() - startTime;

        // Send final result
        const resultMessage: ResultMessage = {
          type: 'result',
          payload: results,
        };
        self.postMessage(resultMessage);

      } catch (error) {
        const errorMessage: ErrorMessage = {
          type: 'error',
          payload: {
            error: error instanceof Error ? error.message : 'Unknown analysis error',
            details: error instanceof Error ? { stack: error.stack } : undefined,
          },
        };
        self.postMessage(errorMessage);
      }
    }
  };

  // Analysis functions
  async function analyzeRaces(
    session: SailingSession,
    options: any,
    sendProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<Race[]> {
    sendProgress('races', 0.2, 'Processing session data...');

    const raceOptions = {
      minRaceDuration: options.minRaceDuration || 300,
      maxGapDuration: options.maxGapDuration || 30,
      maneuverThreshold: options.maneuverThreshold || 3,
      speedThreshold: options.speedThreshold || 3,
      windAngleThreshold: options.windAngleThreshold || 20,
    };

    sendProgress('races', 0.5, 'Analyzing activity patterns...');
    const races = detectRaces(session, raceOptions);

    sendProgress('races', 1.0, `Found ${races.length} races`);
    return races;
  }

  async function analyzeManeuvers(
    session: SailingSession,
    options: any,
    sendProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<Maneuver[]> {
    sendProgress('maneuvers', 0.2, 'Detecting heading changes...');

    const maneuverOptions = {
      headingChangeThreshold: options.headingChangeThreshold || 60,
      windAngleChangeThreshold: options.windAngleChangeThreshold || 70,
      minDuration: options.minDuration || 5,
      maxDuration: options.maxDuration || 120,
      speedChangeThreshold: options.speedChangeThreshold || 2,
    };

    sendProgress('maneuvers', 0.5, 'Analyzing maneuver quality...');
    const maneuvers = detectManeuvers(session.data, session.id, maneuverOptions);

    sendProgress('maneuvers', 1.0, `Found ${maneuvers.length} maneuvers`);
    return maneuvers;
  }

  async function analyzeWind(
    session: SailingSession,
    options: any,
    sendProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<any> {
    sendProgress('wind', 0.3, 'Calculating wind statistics...');

    const windStats = calculateWindStatistics(session.data);

    sendProgress('wind', 0.6, 'Smoothing wind data...');
    const smoothedData = smoothWindData(session.data, options.smoothingWindow || 5);

    sendProgress('wind', 0.9, 'Analyzing patterns...');

    return {
      statistics: windStats,
      smoothedDataCount: smoothedData.length,
      analysis: {
        dominantDirection: windStats.averageDirection,
        stability: windStats.steadiness,
        gustFactor: windStats.gustiness,
        shiftFrequency: windStats.shifts.length,
      },
    };
  }

  async function analyzeVMG(
    session: SailingSession,
    options: any,
    sendProgress: (stage: string, progress: number, message?: string) => void
  ): Promise<any> {
    sendProgress('vmg', 0.4, 'Calculating VMG statistics...');

    const vmgStats = calculateVMGStatistics(session.data, options.targets);

    sendProgress('vmg', 0.8, 'Generating recommendations...');

    return {
      statistics: vmgStats,
      analysis: {
        overallEfficiency: vmgStats.vmgEfficiency,
        upwindPerformance: vmgStats.averageVMGUpwind,
        downwindPerformance: vmgStats.averageVMGDownwind,
        consistencyScore: vmgStats.maxVMG > 0 ? vmgStats.averageVMG / vmgStats.maxVMG : 0,
      },
      recommendations: vmgStats.recommendations,
    };
  }
}

// Main thread interface for using the worker
export class AnalysisWorker {
  private worker: Worker | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./analysis-worker.ts', import.meta.url));
    }
  }

  async runAnalysis(
    session: SailingSession,
    analysisTypes: AnalysisType[] = ['all'],
    options: Record<string, any> = {},
    onProgress?: (progress: number, stage: string, message?: string) => void
  ): Promise<{
    races?: Race[];
    maneuvers?: Maneuver[];
    windAnalysis?: any;
    vmgAnalysis?: any;
    processingTime: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to synchronous analysis if Web Workers not available
        this.runSyncAnalysis(session, analysisTypes, options)
          .then(resolve)
          .catch(reject);
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'result':
            this.worker!.removeEventListener('message', handleMessage);
            resolve(payload);
            break;

          case 'error':
            this.worker!.removeEventListener('message', handleMessage);
            reject(new Error(payload.error));
            break;

          case 'progress':
            if (onProgress) {
              onProgress(payload.progress, payload.stage, payload.message);
            }
            break;
        }
      };

      this.worker.addEventListener('message', handleMessage);

      const analysisMessage: AnalysisMessage = {
        type: 'analyze',
        payload: { session, analysisTypes, options },
      };
      this.worker.postMessage(analysisMessage);
    });
  }

  private async runSyncAnalysis(
    session: SailingSession,
    analysisTypes: AnalysisType[],
    options: Record<string, any>
  ): Promise<{
    races?: Race[];
    maneuvers?: Maneuver[];
    windAnalysis?: any;
    vmgAnalysis?: any;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const results: any = {};

    if (analysisTypes.includes('races') || analysisTypes.includes('all')) {
      results.races = detectRaces(session);
    }

    if (analysisTypes.includes('maneuvers') || analysisTypes.includes('all')) {
      results.maneuvers = detectManeuvers(session.data, session.id);
    }

    if (analysisTypes.includes('wind') || analysisTypes.includes('all')) {
      results.windAnalysis = {
        statistics: calculateWindStatistics(session.data),
        smoothedDataCount: session.data.length,
      };
    }

    if (analysisTypes.includes('vmg') || analysisTypes.includes('all')) {
      results.vmgAnalysis = {
        statistics: calculateVMGStatistics(session.data),
      };
    }

    results.processingTime = Date.now() - startTime;
    return results;
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Export types for use in main thread
export type { AnalysisMessage, ProgressMessage, ResultMessage, ErrorMessage, AnalysisType };

// Default export for use as worker
export default self;