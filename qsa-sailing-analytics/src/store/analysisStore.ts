/**
 * Analysis Store
 * Manages sailing analysis results and computational state
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  SailingSession,
  SailingRecord,
  RaceSegment,
  Maneuver,
  WindAnalysis,
  PolarDiagram,
  AnalysisProgress
} from '@/core/models';
import { AnalysisWorker } from '@/core/workers/analysis-worker';
import { detectRaces } from '@/core/analysis/race-detection';
import { detectManeuvers } from '@/core/analysis/maneuver-detection';
// TODO: Implement these analysis modules for full functionality
// import { analyzeWind } from '@/core/analysis/wind-analysis';
// import { generatePolarDiagram } from '@/core/analysis/polar-analysis';

interface AnalysisState {
  // Current analysis results
  races: RaceSegment[];
  maneuvers: Maneuver[];
  windAnalysis: WindAnalysis | null;
  polarDiagram: PolarDiagram | null;

  // Analysis state
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress[];
  analysisError: string | null;

  // Background worker
  analysisWorker: AnalysisWorker | null;

  // Cached computations
  computedMetrics: Record<string, any>;
  lastAnalyzedSession: string | null;

  // Analysis configuration
  config: {
    raceDetection: {
      minDuration: number;     // Minimum race duration in seconds
      speedThreshold: number;  // Minimum speed to be considered racing
      courseStability: number; // Required course stability
    };
    maneuverDetection: {
      courseChangeThreshold: number; // Minimum course change for tack/gybe
      speedChangeThreshold: number;  // Minimum speed change for maneuvers
      timeWindow: number;           // Analysis time window in seconds
    };
    windAnalysis: {
      sampleInterval: number;       // Wind sampling interval in seconds
      smoothingWindow: number;      // Moving average window size
    };
    polarGeneration: {
      minDataPoints: number;        // Minimum points per polar bin
      windSpeedBins: number[];      // Wind speed ranges for analysis
      excludeManeuvers: boolean;    // Exclude maneuver data from polar
    };
  };

  // Actions
  runFullAnalysis: (session: SailingSession) => Promise<void>;
  runRaceDetection: (session: SailingSession) => Promise<void>;
  runManeuverAnalysis: (session: SailingSession) => Promise<void>;
  runWindAnalysis: (session: SailingSession) => Promise<void>;
  runPolarAnalysis: (session: SailingSession) => Promise<void>;

  // Progress management
  setAnalyzing: (analyzing: boolean) => void;
  updateProgress: (taskId: string, progress: number, message?: string) => void;
  addProgressTask: (task: AnalysisProgress) => void;
  removeProgressTask: (taskId: string) => void;
  clearProgress: () => void;
  setError: (error: string | null) => void;

  // Configuration
  updateConfig: (updates: Partial<AnalysisState['config']>) => void;
  resetConfig: () => void;

  // Cache management
  getCachedMetric: (key: string) => any;
  setCachedMetric: (key: string, value: any) => void;
  clearCache: () => void;

  // Results management
  clearResults: () => void;
  exportResults: () => string;
  importResults: (data: string) => void;

  // Initialization
  initialize: () => void;
  cleanup: () => void;
}

// Default configuration
const defaultConfig: AnalysisState['config'] = {
  raceDetection: {
    minDuration: 300,        // 5 minutes minimum race
    speedThreshold: 3.0,     // 3 knots minimum speed
    courseStability: 15,     // ±15 degree course stability
  },
  maneuverDetection: {
    courseChangeThreshold: 45,  // 45 degree course change
    speedChangeThreshold: 1.0,  // 1 knot speed change
    timeWindow: 60,            // 60 second analysis window
  },
  windAnalysis: {
    sampleInterval: 10,        // 10 second intervals
    smoothingWindow: 5,        // 5 point moving average
  },
  polarGeneration: {
    minDataPoints: 20,         // 20 points minimum per bin
    windSpeedBins: [0, 5, 10, 15, 20, 25, 30, 35], // Wind speed ranges
    excludeManeuvers: true,    // Exclude maneuver data
  },
};

export const useAnalysisStore = create<AnalysisState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      races: [],
      maneuvers: [],
      windAnalysis: null,
      polarDiagram: null,
      isAnalyzing: false,
      analysisProgress: [],
      analysisError: null,
      analysisWorker: null,
      computedMetrics: {},
      lastAnalyzedSession: null,
      config: defaultConfig,

      // Run full analysis
      runFullAnalysis: async (session: SailingSession) => {
        const state = get();

        if (state.isAnalyzing) {
          return;
        }

        try {
          set({
            isAnalyzing: true,
            analysisError: null,
            lastAnalyzedSession: session.id,
          });

          // Clear previous results
          get().clearResults();

          // Run all analysis types in sequence
          await get().runRaceDetection(session);
          await get().runManeuverAnalysis(session);
          await get().runWindAnalysis(session);
          await get().runPolarAnalysis(session);

          // Emit completion event
          window.dispatchEvent(new CustomEvent('analysis-complete', {
            detail: {
              sessionId: session.id,
              results: {
                races: get().races,
                maneuvers: get().maneuvers,
                windAnalysis: get().windAnalysis,
                polarDiagram: get().polarDiagram,
              }
            }
          }));

        } catch (error) {
          set({
            analysisError: error instanceof Error ? error.message : 'Analysis failed',
          });
        } finally {
          set({
            isAnalyzing: false,
            analysisProgress: [],
          });
        }
      },

      // Run race detection
      runRaceDetection: async (session: SailingSession) => {
        const taskId = 'race-detection';
        const config = get().config.raceDetection;

        get().addProgressTask({
          id: taskId,
          name: 'Race Detection',
          progress: 0,
          message: 'Analyzing course data...',
        });

        try {
          const races = await detectRaces(session, config);

          set({ races });

          // Cache race statistics
          const raceStats = {
            totalRaces: races.length,
            totalRaceTime: races.reduce((sum, race) => sum + race.duration, 0),
            avgRaceTime: races.length > 0 ?
              races.reduce((sum, race) => sum + race.duration, 0) / races.length : 0,
          };
          get().setCachedMetric('raceStats', raceStats);

          get().updateProgress(taskId, 100, 'Race detection complete');

        } catch (error) {
          throw new Error(`Race detection failed: ${error}`);
        } finally {
          get().removeProgressTask(taskId);
        }
      },

      // Run maneuver analysis
      runManeuverAnalysis: async (session: SailingSession) => {
        const taskId = 'maneuver-analysis';
        const config = get().config.maneuverDetection;

        get().addProgressTask({
          id: taskId,
          name: 'Maneuver Analysis',
          progress: 0,
          message: 'Detecting tacks and gybes...',
        });

        try {
          const maneuvers = await detectManeuvers(session, config);

          set({ maneuvers });

          // Cache maneuver statistics
          const maneuverStats = {
            totalManeuvers: maneuvers.length,
            tacks: maneuvers.filter(m => m.type === 'tack').length,
            gybes: maneuvers.filter(m => m.type === 'gybe').length,
            avgDuration: maneuvers.length > 0 ?
              maneuvers.reduce((sum, m) => sum + m.duration, 0) / maneuvers.length : 0,
          };
          get().setCachedMetric('maneuverStats', maneuverStats);

          get().updateProgress(taskId, 100, 'Maneuver analysis complete');

        } catch (error) {
          throw new Error(`Maneuver analysis failed: ${error}`);
        } finally {
          get().removeProgressTask(taskId);
        }
      },

      // Run wind analysis
      runWindAnalysis: async (session: SailingSession) => {
        const taskId = 'wind-analysis';
        const config = get().config.windAnalysis;

        get().addProgressTask({
          id: taskId,
          name: 'Wind Analysis',
          progress: 0,
          message: 'Analyzing wind patterns...',
        });

        try {
          // TODO: Implement wind analysis
          // const windAnalysis = await analyzeWind(session.data, config);
          const windAnalysis = { averageSpeed: 0, maxSpeed: 0 } as any;

          set({ windAnalysis });

          // Cache wind statistics
          get().setCachedMetric('windStats', {
            avgWindSpeed: windAnalysis.averageSpeed,
            maxWindSpeed: windAnalysis.maxSpeed,
            avgWindDirection: windAnalysis.averageDirection,
            shifts: windAnalysis.shifts?.length || 0,
          });

          get().updateProgress(taskId, 100, 'Wind analysis complete');

        } catch (error) {
          throw new Error(`Wind analysis failed: ${error}`);
        } finally {
          get().removeProgressTask(taskId);
        }
      },

      // Run polar analysis
      runPolarAnalysis: async (session: SailingSession) => {
        const taskId = 'polar-analysis';
        const config = get().config.polarGeneration;

        get().addProgressTask({
          id: taskId,
          name: 'Polar Analysis',
          progress: 0,
          message: 'Generating polar diagram...',
        });

        try {
          // Filter out maneuver data if configured
          let analysisData = session.data;
          if (config.excludeManeuvers && get().maneuvers.length > 0) {
            const maneuverTimes = get().maneuvers.map(m => ({
              start: new Date(m.startTime).getTime(),
              end: new Date(m.endTime).getTime(),
            }));

            analysisData = session.data.filter(record => {
              const recordTime = new Date(record.timestamp).getTime();
              return !maneuverTimes.some(m =>
                recordTime >= m.start && recordTime <= m.end
              );
            });
          }

          // TODO: Implement polar diagram generation
          // const polarDiagram = await generatePolarDiagram(analysisData, config);
          const polarDiagram = {} as any;

          set({ polarDiagram });

          // Cache polar statistics
          get().setCachedMetric('polarStats', {
            dataPoints: polarDiagram.data.reduce((sum, row) =>
              sum + row.reduce((s, point) => s + (point ? 1 : 0), 0), 0),
            maxVmg: Math.max(...polarDiagram.vmgUpwind.concat(polarDiagram.vmgDownwind)),
            optimalUpwindAngle: polarDiagram.vmgUpwind.indexOf(
              Math.max(...polarDiagram.vmgUpwind)
            ) * 5 - 180, // Convert index to angle
          });

          get().updateProgress(taskId, 100, 'Polar analysis complete');

        } catch (error) {
          throw new Error(`Polar analysis failed: ${error}`);
        } finally {
          get().removeProgressTask(taskId);
        }
      },

      // Progress management
      setAnalyzing: (analyzing: boolean) => {
        set({ isAnalyzing: analyzing });
      },

      updateProgress: (taskId: string, progress: number, message?: string) => {
        set(state => ({
          analysisProgress: state.analysisProgress.map(task =>
            task.id === taskId
              ? { ...task, progress, message: message || task.message }
              : task
          ),
        }));
      },

      addProgressTask: (task: AnalysisProgress) => {
        set(state => ({
          analysisProgress: [...state.analysisProgress, task],
        }));
      },

      removeProgressTask: (taskId: string) => {
        set(state => ({
          analysisProgress: state.analysisProgress.filter(task => task.id !== taskId),
        }));
      },

      clearProgress: () => {
        set({ analysisProgress: [] });
      },

      setError: (error: string | null) => {
        set({ analysisError: error });
      },

      // Configuration
      updateConfig: (updates: Partial<AnalysisState['config']>) => {
        set(state => ({
          config: {
            ...state.config,
            ...updates,
            raceDetection: { ...state.config.raceDetection, ...updates.raceDetection },
            maneuverDetection: { ...state.config.maneuverDetection, ...updates.maneuverDetection },
            windAnalysis: { ...state.config.windAnalysis, ...updates.windAnalysis },
            polarGeneration: { ...state.config.polarGeneration, ...updates.polarGeneration },
          },
        }));
      },

      resetConfig: () => {
        set({ config: defaultConfig });
      },

      // Cache management
      getCachedMetric: (key: string) => {
        return get().computedMetrics[key];
      },

      setCachedMetric: (key: string, value: any) => {
        set(state => ({
          computedMetrics: { ...state.computedMetrics, [key]: value },
        }));
      },

      clearCache: () => {
        set({ computedMetrics: {} });
      },

      // Results management
      clearResults: () => {
        set({
          races: [],
          maneuvers: [],
          windAnalysis: null,
          polarDiagram: null,
          computedMetrics: {},
        });
      },

      exportResults: () => {
        const state = get();
        const exportData = {
          races: state.races,
          maneuvers: state.maneuvers,
          windAnalysis: state.windAnalysis,
          polarDiagram: state.polarDiagram,
          computedMetrics: state.computedMetrics,
          config: state.config,
          sessionId: state.lastAnalyzedSession,
          exportTime: new Date().toISOString(),
        };

        return JSON.stringify(exportData, null, 2);
      },

      importResults: (data: string) => {
        try {
          const imported = JSON.parse(data);

          set({
            races: imported.races || [],
            maneuvers: imported.maneuvers || [],
            windAnalysis: imported.windAnalysis || null,
            polarDiagram: imported.polarDiagram || null,
            computedMetrics: imported.computedMetrics || {},
            lastAnalyzedSession: imported.sessionId || null,
          });

          if (imported.config) {
            get().updateConfig(imported.config);
          }

        } catch (error) {
          throw new Error(`Failed to import analysis results: ${error}`);
        }
      },

      // Initialize store
      initialize: () => {
        // Initialize analysis worker
        const analysisWorker = new AnalysisWorker();
        set({ analysisWorker });

        // Listen for session changes to trigger analysis
        const handleSessionChange = (event: CustomEvent) => {
          const { session } = event.detail;

          if (session) {
            // Clear previous results when session changes
            get().clearResults();
            set({ lastAnalyzedSession: null });
          }
        };

        window.addEventListener('session-changed', handleSessionChange as EventListener);

        // Store cleanup function
        set({
          cleanup: () => {
            get().setAnalyzing(false);

            const worker = get().analysisWorker;
            if (worker) {
              worker.terminate();
            }

            window.removeEventListener('session-changed', handleSessionChange as EventListener);
          }
        });
      },

      // Cleanup store
      cleanup: () => {
        const state = get();

        if (state.analysisWorker) {
          state.analysisWorker.terminate();
        }

        set({
          analysisWorker: null,
          isAnalyzing: false,
          analysisProgress: [],
          analysisError: null,
        });
      },
    })),
    {
      name: 'analysis-store',
    }
  )
);

// Selectors for easy access
export const useAnalysisResults = () => useAnalysisStore(state => ({
  races: state.races,
  maneuvers: state.maneuvers,
  windAnalysis: state.windAnalysis,
  polarDiagram: state.polarDiagram,
}));

export const useAnalysisProgress = () => useAnalysisStore(state => ({
  isAnalyzing: state.isAnalyzing,
  progress: state.analysisProgress,
  error: state.analysisError,
}));

export const useAnalysisConfig = () => useAnalysisStore(state => state.config);

// Initialize store when imported
if (typeof window !== 'undefined') {
  useAnalysisStore.getState().initialize();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    useAnalysisStore.getState().cleanup();
  });
}