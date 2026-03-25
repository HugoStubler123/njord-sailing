/**
 * Playback Store
 * Manages timeline playback and cursor synchronization across all views
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { TimelineMarker, SailingRecord } from '@/core/models';

interface PlaybackState {
  // Playback control
  isPlaying: boolean;
  currentTime: number;         // Current time offset in seconds from session start
  duration: number;            // Total session duration in seconds
  playbackSpeed: number;       // Playback speed multiplier (0.25x, 0.5x, 1x, 2x, 4x, 8x)
  loop: boolean;               // Loop playback when reaching end

  // Timeline data
  sessionStartTime: string | null;  // ISO timestamp of session start
  markers: TimelineMarker[];        // Important events on timeline
  currentRecord: SailingRecord | null;  // Current sailing record at cursor position

  // Playback interval
  playbackInterval: number | null;

  // Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  stepForward: () => void;
  stepBackward: () => void;
  skipToStart: () => void;
  skipToEnd: () => void;

  // Timeline management
  setDuration: (duration: number) => void;
  setSessionStartTime: (startTime: string) => void;
  addMarker: (marker: TimelineMarker) => void;
  removeMarker: (markerId: string) => void;
  clearMarkers: () => void;
  jumpToMarker: (markerId: string) => void;

  // Record management
  setCurrentRecord: (record: SailingRecord | null) => void;
  findRecordAtTime: (time: number) => SailingRecord | null;

  // Initialization
  initialize: () => void;
  cleanup: () => void;
  reset: () => void;
}

// Playback speed options
export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8];
const STEP_SIZE = 5; // seconds

export const usePlaybackStore = create<PlaybackState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackSpeed: 1,
      loop: false,
      sessionStartTime: null,
      markers: [],
      currentRecord: null,
      playbackInterval: null,

      // Play
      play: () => {
        const state = get();

        if (state.isPlaying || state.duration === 0) return;

        // Reset to start if at end
        if (state.currentTime >= state.duration) {
          set({ currentTime: 0 });
        }

        const interval = window.setInterval(() => {
          const currentState = get();

          if (!currentState.isPlaying) {
            clearInterval(currentState.playbackInterval!);
            set({ playbackInterval: null });
            return;
          }

          const nextTime = currentState.currentTime + (currentState.playbackSpeed / 10); // 100ms intervals

          if (nextTime >= currentState.duration) {
            if (currentState.loop) {
              set({ currentTime: 0 });
            } else {
              get().pause();
              set({ currentTime: currentState.duration });
            }
          } else {
            set({ currentTime: nextTime });
          }

          // Update current record
          const record = get().findRecordAtTime(get().currentTime);
          if (record !== get().currentRecord) {
            set({ currentRecord: record });
          }
        }, 100); // 10 FPS update rate

        set({
          isPlaying: true,
          playbackInterval: interval,
        });

        // Emit play event
        window.dispatchEvent(new CustomEvent('playback-play'));
      },

      // Pause
      pause: () => {
        const state = get();

        if (state.playbackInterval) {
          clearInterval(state.playbackInterval);
        }

        set({
          isPlaying: false,
          playbackInterval: null,
        });

        // Emit pause event
        window.dispatchEvent(new CustomEvent('playback-pause'));
      },

      // Stop
      stop: () => {
        get().pause();
        set({ currentTime: 0 });

        // Update current record
        const record = get().findRecordAtTime(0);
        set({ currentRecord: record });

        // Emit stop event
        window.dispatchEvent(new CustomEvent('playback-stop'));
      },

      // Toggle play/pause
      togglePlay: () => {
        const state = get();
        if (state.isPlaying) {
          get().pause();
        } else {
          get().play();
        }
      },

      // Set current time
      setCurrentTime: (time: number) => {
        const state = get();
        const clampedTime = Math.max(0, Math.min(time, state.duration));

        set({ currentTime: clampedTime });

        // Update current record
        const record = get().findRecordAtTime(clampedTime);
        set({ currentRecord: record });

        // Emit time change event
        window.dispatchEvent(new CustomEvent('playback-time-change', {
          detail: { time: clampedTime, record }
        }));
      },

      // Set playback speed
      setPlaybackSpeed: (speed: number) => {
        if (PLAYBACK_SPEEDS.includes(speed)) {
          set({ playbackSpeed: speed });

          // Emit speed change event
          window.dispatchEvent(new CustomEvent('playback-speed-change', {
            detail: { speed }
          }));
        }
      },

      // Set loop
      setLoop: (loop: boolean) => {
        set({ loop });
      },

      // Step forward
      stepForward: () => {
        const state = get();
        const nextTime = Math.min(state.currentTime + STEP_SIZE, state.duration);
        get().setCurrentTime(nextTime);
      },

      // Step backward
      stepBackward: () => {
        const state = get();
        const prevTime = Math.max(state.currentTime - STEP_SIZE, 0);
        get().setCurrentTime(prevTime);
      },

      // Skip to start
      skipToStart: () => {
        get().setCurrentTime(0);
      },

      // Skip to end
      skipToEnd: () => {
        const state = get();
        get().setCurrentTime(state.duration);
      },

      // Set duration
      setDuration: (duration: number) => {
        set({
          duration,
          currentTime: 0, // Reset to start when changing sessions
        });

        // Update current record
        const record = get().findRecordAtTime(0);
        set({ currentRecord: record });
      },

      // Set session start time
      setSessionStartTime: (startTime: string) => {
        set({ sessionStartTime: startTime });
      },

      // Add marker
      addMarker: (marker: TimelineMarker) => {
        const state = get();
        const newMarkers = [...state.markers, marker];

        // Sort markers by timestamp
        newMarkers.sort((a, b) => a.timestamp - b.timestamp);

        set({ markers: newMarkers });
      },

      // Remove marker
      removeMarker: (markerId: string) => {
        const state = get();
        const newMarkers = state.markers.filter(m => m.id !== markerId);
        set({ markers: newMarkers });
      },

      // Clear markers
      clearMarkers: () => {
        set({ markers: [] });
      },

      // Jump to marker
      jumpToMarker: (markerId: string) => {
        const state = get();
        const marker = state.markers.find(m => m.id === markerId);

        if (marker) {
          get().setCurrentTime(marker.timestamp);

          // Emit marker jump event
          window.dispatchEvent(new CustomEvent('playback-marker-jump', {
            detail: { marker }
          }));
        }
      },

      // Set current record
      setCurrentRecord: (record: SailingRecord | null) => {
        set({ currentRecord: record });
      },

      // Find record at specific time - this will be replaced with actual session data
      findRecordAtTime: (time: number): SailingRecord | null => {
        // This is a placeholder - actual implementation will come from session store
        // For now, return null
        return null;
      },

      // Initialize
      initialize: () => {
        // Listen for session changes to update timeline
        const handleSessionChange = (event: CustomEvent) => {
          const { session } = event.detail;

          if (session) {
            const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000;

            get().reset();
            set({
              duration,
              sessionStartTime: session.startTime,
            });

            // Create a function that can find records from the session data
            const findRecord = (time: number): SailingRecord | null => {
              if (!session.data || session.data.length === 0) return null;

              const sessionStart = new Date(session.startTime).getTime();
              const targetTime = sessionStart + (time * 1000);

              // Find closest record by timestamp
              let closest = session.data[0];
              let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTime);

              for (const record of session.data) {
                const diff = Math.abs(new Date(record.timestamp).getTime() - targetTime);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = record;
                }
              }

              return closest;
            };

            // Replace the findRecordAtTime function
            get().findRecordAtTime = findRecord;

            // Set initial record
            const initialRecord = findRecord(0);
            set({ currentRecord: initialRecord });
          }
        };

        window.addEventListener('session-changed', handleSessionChange as EventListener);

        // Store the cleanup function
        set({
          cleanup: () => {
            get().pause();
            window.removeEventListener('session-changed', handleSessionChange as EventListener);
          }
        });
      },

      // Cleanup
      cleanup: () => {
        const state = get();

        if (state.playbackInterval) {
          clearInterval(state.playbackInterval);
        }

        set({
          isPlaying: false,
          playbackInterval: null,
        });
      },

      // Reset
      reset: () => {
        get().pause();
        set({
          currentTime: 0,
          duration: 0,
          markers: [],
          currentRecord: null,
          sessionStartTime: null,
        });
      },
    })),
    {
      name: 'playback-store',
    }
  )
);

// Selectors for easy access
export const usePlaybackControls = () => usePlaybackStore(state => ({
  isPlaying: state.isPlaying,
  currentTime: state.currentTime,
  duration: state.duration,
  playbackSpeed: state.playbackSpeed,
  loop: state.loop,
  play: state.play,
  pause: state.pause,
  stop: state.stop,
  togglePlay: state.togglePlay,
  setCurrentTime: state.setCurrentTime,
  setPlaybackSpeed: state.setPlaybackSpeed,
  setLoop: state.setLoop,
}));

export const useTimelineMarkers = () => usePlaybackStore(state => ({
  markers: state.markers,
  addMarker: state.addMarker,
  removeMarker: state.removeMarker,
  jumpToMarker: state.jumpToMarker,
}));

export const useCurrentRecord = () => usePlaybackStore(state => state.currentRecord);

// Keyboard shortcuts
if (typeof window !== 'undefined') {
  const handleKeyPress = (event: KeyboardEvent) => {
    // Only handle if no input is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.getAttribute('contenteditable') === 'true');

    if (isInputFocused) return;

    const state = usePlaybackStore.getState();

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        state.togglePlay();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        state.stepBackward();
        break;
      case 'ArrowRight':
        event.preventDefault();
        state.stepForward();
        break;
      case 'Home':
        event.preventDefault();
        state.skipToStart();
        break;
      case 'End':
        event.preventDefault();
        state.skipToEnd();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);

  // Initialize store
  usePlaybackStore.getState().initialize();
}