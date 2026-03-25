/**
 * Store Index
 * Re-exports all store modules for easy import
 */

// Export stores
export { useUIStore } from './uiStore';
export { useSessionStore } from './sessionStore';
export { usePlaybackStore } from './playbackStore';
export { useAnalysisStore } from './analysisStore';

// Export selectors
export {
  useCurrentView,
  useSidebar,
  useTimeline,
  useNotifications,
  useActiveModal,
  usePreferences,
  useSelectedMetrics,
} from './uiStore';

export {
  useActiveSession,
  useSessionSummaries,
  useSessionLoading,
} from './sessionStore';

export {
  usePlaybackControls,
  useTimelineMarkers,
  useCurrentRecord,
} from './playbackStore';

export {
  useAnalysisResults,
  useAnalysisProgress,
  useAnalysisConfig,
} from './analysisStore';