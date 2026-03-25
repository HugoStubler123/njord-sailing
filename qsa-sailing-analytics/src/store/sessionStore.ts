/**
 * Session Store
 * Manages loaded sailing sessions and active session state
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { SailingSession, SessionSummary } from '@/core/models';
import { ParseWorker } from '@/core/workers/parse-worker';

interface SessionState {
  // Loaded sessions
  sessions: Record<string, SailingSession>;
  sessionSummaries: Record<string, SessionSummary>;

  // Active session
  activeSessionId: string | null;
  activeSession: SailingSession | null;

  // Loading state
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;

  // File import
  parseWorker: ParseWorker | null;

  // Actions
  setActiveSession: (sessionId: string) => void;
  addSession: (session: SailingSession) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<SailingSession>) => void;
  clearSessions: () => void;

  // File operations
  loadFile: (buffer: ArrayBuffer, filename: string) => Promise<void>;
  setLoading: (loading: boolean, progress?: number, message?: string) => void;
  setError: (error: string | null) => void;

  // Initialization
  initialize: () => void;
  cleanup: () => void;
}

export const useSessionStore = create<SessionState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      sessions: {},
      sessionSummaries: {},
      activeSessionId: null,
      activeSession: null,
      isLoading: false,
      loadingProgress: 0,
      loadingMessage: '',
      error: null,
      parseWorker: null,

      // Set active session
      setActiveSession: (sessionId: string) => {
        const state = get();
        const session = state.sessions[sessionId];

        if (session) {
          set({
            activeSessionId: sessionId,
            activeSession: session,
            error: null,
          });

          // Emit event for other stores to react
          window.dispatchEvent(new CustomEvent('session-changed', {
            detail: { sessionId, session }
          }));
        } else {
          set({ error: `Session ${sessionId} not found` });
        }
      },

      // Add new session
      addSession: (session: SailingSession) => {
        const state = get();

        // Create session summary
        const summary: SessionSummary = {
          id: session.id,
          name: session.name,
          startTime: session.startTime,
          duration: session.duration,
          location: session.location,
          event: session.event,
          boat: session.boat,
          stats: {
            totalDistance: session.stats.totalDistance,
            maxSpeed: session.stats.maxSpeed,
            avgSpeed: session.stats.avgSpeed,
            racesDetected: session.stats.racesDetected,
          },
          file: session.file,
        };

        set({
          sessions: {
            ...state.sessions,
            [session.id]: session,
          },
          sessionSummaries: {
            ...state.sessionSummaries,
            [session.id]: summary,
          },
          activeSessionId: session.id,
          activeSession: session,
          error: null,
        });

        // Save to localStorage for persistence
        try {
          const sessionsToSave = Object.keys(state.sessions).slice(0, 5); // Keep last 5 sessions
          const sessionData = sessionsToSave.reduce((acc, id) => {
            acc[id] = state.sessions[id];
            return acc;
          }, {} as Record<string, SailingSession>);

          localStorage.setItem('qsa-sessions', JSON.stringify(sessionData));
        } catch (error) {
          console.warn('Failed to save sessions to localStorage:', error);
        }

        // Emit event
        window.dispatchEvent(new CustomEvent('session-added', {
          detail: { session, summary }
        }));
      },

      // Remove session
      removeSession: (sessionId: string) => {
        const state = get();
        const newSessions = { ...state.sessions };
        const newSummaries = { ...state.sessionSummaries };

        delete newSessions[sessionId];
        delete newSummaries[sessionId];

        const newState: Partial<SessionState> = {
          sessions: newSessions,
          sessionSummaries: newSummaries,
        };

        // If removing active session, clear it
        if (state.activeSessionId === sessionId) {
          newState.activeSessionId = null;
          newState.activeSession = null;
        }

        set(newState);

        // Update localStorage
        try {
          localStorage.setItem('qsa-sessions', JSON.stringify(newSessions));
        } catch (error) {
          console.warn('Failed to update localStorage:', error);
        }
      },

      // Update session
      updateSession: (sessionId: string, updates: Partial<SailingSession>) => {
        const state = get();
        const currentSession = state.sessions[sessionId];

        if (!currentSession) {
          set({ error: `Session ${sessionId} not found` });
          return;
        }

        const updatedSession = { ...currentSession, ...updates };

        const newState: Partial<SessionState> = {
          sessions: {
            ...state.sessions,
            [sessionId]: updatedSession,
          },
        };

        // Update active session if it's the same
        if (state.activeSessionId === sessionId) {
          newState.activeSession = updatedSession;
        }

        set(newState);

        // Emit event
        window.dispatchEvent(new CustomEvent('session-updated', {
          detail: { sessionId, session: updatedSession }
        }));
      },

      // Clear all sessions
      clearSessions: () => {
        set({
          sessions: {},
          sessionSummaries: {},
          activeSessionId: null,
          activeSession: null,
          error: null,
        });

        localStorage.removeItem('qsa-sessions');
      },

      // Load file using web worker
      loadFile: async (buffer: ArrayBuffer, filename: string) => {
        const state = get();

        if (!state.parseWorker) {
          set({ error: 'Parse worker not initialized' });
          return;
        }

        try {
          set({
            isLoading: true,
            loadingProgress: 0,
            loadingMessage: `Loading ${filename}...`,
            error: null,
          });

          const result = await state.parseWorker.parseFile(
            buffer,
            filename,
            {
              onProgress: (progress: number) => {
                set({
                  loadingProgress: progress,
                  loadingMessage: `Parsing ${filename}... ${Math.round(progress * 100)}%`,
                });
              },
            }
          );

          if (result.success && result.session) {
            get().addSession(result.session);
          } else {
            set({ error: result.error || 'Failed to parse file' });
          }

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        } finally {
          set({
            isLoading: false,
            loadingProgress: 0,
            loadingMessage: '',
          });
        }
      },

      // Set loading state
      setLoading: (loading: boolean, progress?: number, message?: string) => {
        set({
          isLoading: loading,
          loadingProgress: progress || 0,
          loadingMessage: message || '',
        });
      },

      // Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Initialize store
      initialize: () => {
        // Initialize parse worker
        const parseWorker = new ParseWorker();
        set({ parseWorker });

        // Load sessions from localStorage
        try {
          const savedSessions = localStorage.getItem('qsa-sessions');
          if (savedSessions) {
            const sessions = JSON.parse(savedSessions) as Record<string, SailingSession>;

            // Create summaries for saved sessions
            const summaries: Record<string, SessionSummary> = {};
            Object.values(sessions).forEach(session => {
              summaries[session.id] = {
                id: session.id,
                name: session.name,
                startTime: session.startTime,
                duration: session.duration,
                location: session.location,
                event: session.event,
                boat: session.boat,
                stats: {
                  totalDistance: session.stats.totalDistance,
                  maxSpeed: session.stats.maxSpeed,
                  avgSpeed: session.stats.avgSpeed,
                  racesDetected: session.stats.racesDetected,
                },
                file: session.file,
              };
            });

            set({
              sessions,
              sessionSummaries: summaries,
            });
          }
        } catch (error) {
          console.warn('Failed to load sessions from localStorage:', error);
        }
      },

      // Cleanup store
      cleanup: () => {
        const state = get();

        if (state.parseWorker) {
          state.parseWorker.terminate();
        }

        set({
          parseWorker: null,
          isLoading: false,
          error: null,
        });
      },
    })),
    {
      name: 'session-store',
    }
  )
);

// Selectors for easy access to derived state
export const useActiveSession = () => useSessionStore(state => state.activeSession);
export const useSessionSummaries = () => useSessionStore(state =>
  Object.values(state.sessionSummaries).sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )
);
export const useSessionLoading = () => useSessionStore(state => ({
  isLoading: state.isLoading,
  progress: state.loadingProgress,
  message: state.loadingMessage,
}));

// Initialize store when imported
if (typeof window !== 'undefined') {
  useSessionStore.getState().initialize();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    useSessionStore.getState().cleanup();
  });
}