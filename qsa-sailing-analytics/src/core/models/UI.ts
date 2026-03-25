/**
 * UI state and component prop types
 */

import { SailingRecord, SailingSession, Race, Maneuver, PolarDiagram } from './';

/**
 * Application view types
 */
export type ViewType =
  | 'dashboard'
  | 'map'
  | 'charts'
  | 'polar'
  | 'maneuvers'
  | 'race'
  | 'video'
  | 'reports';

/**
 * Metric types for visualization
 */
export type MetricType =
  | 'bsp'           // Boat Speed
  | 'sog'           // Speed Over Ground
  | 'vmg'           // Velocity Made Good
  | 'tws'           // True Wind Speed
  | 'twa'           // True Wind Angle
  | 'twd'           // True Wind Direction
  | 'aws'           // Apparent Wind Speed
  | 'awa'           // Apparent Wind Angle
  | 'hdg'           // Heading
  | 'cog'           // Course Over Ground
  | 'heel'          // Heel Angle
  | 'rudder'        // Rudder Angle
  | 'depth';        // Water Depth

/**
 * Color scheme types
 */
export type ColorScheme = 'speed' | 'vmg' | 'twa' | 'tws' | 'heel' | 'custom';

/**
 * Timeline playback state
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;        // Current timestamp offset in seconds
  duration: number;           // Total duration in seconds
  playbackSpeed: number;      // Playback speed multiplier (0.5x, 1x, 2x, 4x)
  loop: boolean;              // Loop playback
  markers: TimelineMarker[];  // Important markers on timeline
}

/**
 * Timeline markers for important events
 */
export interface TimelineMarker {
  id: string;
  type: 'race_start' | 'race_finish' | 'tack' | 'gybe' | 'mark_rounding' | 'video_sync' | 'custom';
  timestamp: number;          // Timestamp offset in seconds
  label: string;
  color: string;
  clickable: boolean;
}

/**
 * Map view configuration
 */
export interface MapViewState {
  center: [number, number];   // [longitude, latitude]
  zoom: number;
  bearing: number;            // Map rotation
  pitch: number;              // Map tilt
  followBoat: boolean;        // Whether map follows boat position
  showTrack: boolean;         // Show complete track
  trackColorScheme: ColorScheme;
  showMarkers: boolean;       // Show race markers/buoys
  showGrid: boolean;          // Show coordinate grid
  basemap: 'satellite' | 'nautical' | 'dark' | 'light';
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  id: string;
  type: 'time_series' | 'polar' | 'scatter' | 'histogram';
  title: string;
  metrics: MetricType[];      // Metrics to display
  yAxes: Array<{
    id: string;
    position: 'left' | 'right';
    label: string;
    unit: string;
    min?: number;
    max?: number;
    metrics: MetricType[];    // Which metrics use this axis
  }>;
  height: number;             // Chart height in pixels
  showCursor: boolean;        // Show crosshair cursor
  showBrush: boolean;         // Show brush for zoom/selection
  syncWithTimeline: boolean;  // Sync with main timeline
}

/**
 * Panel layout configuration
 */
export interface PanelLayout {
  id: string;
  name: string;
  panels: Array<{
    id: string;
    type: 'chart' | 'map' | 'polar' | 'data_table' | 'video';
    position: { x: number; y: number; w: number; h: number };
    config: ChartConfig | MapViewState | PolarViewConfig;
    visible: boolean;
  }>;
  isDefault: boolean;
}

/**
 * Polar view configuration
 */
export interface PolarViewConfig {
  windSpeedFilter?: [number, number];  // Wind speed range filter
  showTargets: boolean;                // Show target polar overlay
  showData: boolean;                   // Show actual data points
  colorByWindSpeed: boolean;           // Color points by wind speed
  viewType: 'speed' | 'vmg';          // Speed polar vs VMG polar
  gridLines: boolean;                  // Show polar grid
  angleLabels: boolean;                // Show angle labels
  speedRings: boolean;                 // Show speed rings
}

/**
 * Data table configuration
 */
export interface DataTableConfig {
  columns: Array<{
    key: MetricType | 'timestamp';
    label: string;
    width?: number;
    sortable?: boolean;
    format?: 'number' | 'time' | 'angle' | 'speed';
    precision?: number;
  }>;
  pageSize: number;
  virtualScrolling: boolean;   // Use virtual scrolling for large datasets
  exportEnabled: boolean;      // Enable CSV export
  filterEnabled: boolean;      // Enable column filtering
}

/**
 * Video player configuration
 */
export interface VideoConfig {
  videoUrl: string;
  timeOffset: number;          // Offset between video time and telemetry time
  showOverlay: boolean;        // Show telemetry overlay on video
  overlayMetrics: MetricType[]; // Which metrics to show in overlay
  overlayPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  syncWithTimeline: boolean;   // Sync video playback with timeline
  playbackRate: number;        // Video playback rate
}

/**
 * UI preferences and settings
 */
export interface UIPreferences {
  theme: 'dark' | 'light';
  units: {
    speed: 'knots' | 'ms' | 'kmh';
    distance: 'nm' | 'km' | 'm';
    temperature: 'celsius' | 'fahrenheit';
    angle: 'degrees' | 'radians';
  };
  numberFormat: {
    precision: number;
    thousandsSeparator: ',' | ' ' | '';
    decimalSeparator: '.' | ',';
  };
  defaultLayout: string;       // Default panel layout ID
  autoSave: boolean;           // Auto-save session changes
  confirmDestructive: boolean; // Confirm destructive actions
  animations: boolean;         // Enable UI animations
  tooltips: boolean;           // Show tooltips
  keyboardShortcuts: boolean;  // Enable keyboard shortcuts
}

/**
 * Application state for navigation and UI
 */
export interface ApplicationState {
  currentView: ViewType;
  currentSession?: string;     // Current session ID
  loadedSessions: string[];    // IDs of loaded sessions

  sidebar: {
    visible: boolean;
    collapsed: boolean;
    activeTab: 'sessions' | 'analysis' | 'settings';
  };

  timeline: {
    visible: boolean;
    height: number;
    playback: PlaybackState;
  };

  panels: {
    layout: PanelLayout;
    fullscreen?: string;       // ID of panel in fullscreen mode
  };

  modal: {
    type?: 'file_picker' | 'settings' | 'export' | 'about' | 'error';
    visible: boolean;
    data?: unknown;
  };

  loading: {
    global: boolean;
    tasks: Array<{
      id: string;
      message: string;
      progress?: number;       // 0-100
    }>;
  };

  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timeout?: number;
    actions?: Array<{
      label: string;
      action: string;
    }>;
  }>;
}

/**
 * Export configuration types
 */
export type ExportFormat = 'csv' | 'gpx' | 'kml' | 'pdf' | 'png' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  timeRange?: [number, number];  // Export time range
  metrics?: MetricType[];        // Which metrics to include
  resolution?: number;           // For image exports
  includeMetadata?: boolean;     // Include session metadata
  filename?: string;             // Custom filename
}

/**
 * Keyboard shortcut definitions
 */
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  context?: ViewType[];          // Views where shortcut is active
}

/**
 * Search and filter types
 */
export interface SearchFilter {
  query?: string;
  dateRange?: [string, string];
  boat?: string;
  location?: string;
  event?: string;
  minDuration?: number;
  maxDuration?: number;
  hasRaces?: boolean;
  hasVideo?: boolean;
  dataQuality?: DataQuality[];
}

/**
 * Component prop types for reusable components
 */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

export interface MetricSelectorProps extends BaseComponentProps {
  selectedMetrics: MetricType[];
  availableMetrics: MetricType[];
  onSelectionChange: (metrics: MetricType[]) => void;
  maxSelection?: number;
  groupByCategory?: boolean;
}

export interface TimelineScrubberProps extends BaseComponentProps {
  duration: number;
  currentTime: number;
  markers: TimelineMarker[];
  onTimeChange: (time: number) => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
  showLabels?: boolean;
}