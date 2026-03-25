# QSA Sailing Analytics - System Architecture

## Overview

QSA Sailing Analytics is a cross-platform desktop application built with Electron, React, and TypeScript for professional sailing performance analysis. The architecture is designed for high performance, real-time data visualization, and extensible analysis capabilities.

## Core Design Principles

1. **Data-First Architecture**: All components are designed around the central `SailingRecord` and `SailingSession` data structures
2. **Performance-Optimized**: Web Workers for heavy computation, virtualized rendering for large datasets
3. **Extensible Analysis**: Plugin-style analysis algorithms with standardized interfaces
4. **Real-time Synchronization**: Cursor sync across all views (map, charts, timeline, video)
5. **Professional UX**: Bloomberg terminal-inspired dark UI with dense, readable data display

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   File System   │  │       IPC       │  │  Window Mgmt │ │
│  │     Access      │  │    Handlers     │  │   & Menus    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                  Electron Renderer Process                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   React Application                     │ │
│  │                                                         │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │ │
│  │  │   UI Layer    │  │ State Manager │  │  Data Layer │ │ │
│  │  │  (Components) │  │   (Zustand)   │  │  (Parsers)  │ │ │
│  │  └───────────────┘  └───────────────┘  └─────────────┘ │ │
│  │                                                         │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │                Web Workers                        │ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │ │ │
│  │  │  │   Parser    │  │  Analysis   │  │ Export/Import│ │ │ │
│  │  │  │   Worker    │  │   Worker    │  │    Worker    │ │ │ │
│  │  │  └─────────────┘  └─────────────┘  └──────────────┘ │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### 1. Data Ingestion Pipeline

```
File Selection (Electron Dialog)
        ↓
File Read (Main Process)
        ↓ IPC
Buffer Transfer (Renderer)
        ↓
Format Detection (Universal Loader)
        ↓
Parser Worker (Web Worker)
        ↓
Data Validation & Cleaning
        ↓
Session Store (Zustand)
        ↓
Analysis Worker (Web Worker)
        ↓
Analysis Results (Analysis Store)
        ↓
UI Components (React)
```

### 2. Real-time Synchronization

All views maintain cursor synchronization through a central playback state:

```typescript
PlaybackStore (Zustand) {
  currentTime: number;        // Current timestamp offset
  isPlaying: boolean;
  playbackSpeed: number;
}

// All components subscribe to playback state
Map Component ← ─ ┐
Chart Components ← ─ ┼ ← PlaybackStore.currentTime
Video Player ← ─ ┘
Timeline Scrubber ← (also updates the store)
```

### 3. State Management Pattern

```typescript
// Zustand stores with TypeScript
interface AppState {
  // Data stores
  sessions: SessionStore;      // Loaded sessions and metadata
  analysis: AnalysisStore;     // Analysis results cache

  // UI stores
  playback: PlaybackStore;     // Timeline and cursor sync
  ui: UIStore;                 // View state, preferences, modals
}

// Store composition pattern
const useAppStore = create<AppState>((set, get) => ({
  sessions: createSessionStore(set, get),
  analysis: createAnalysisStore(set, get),
  playback: createPlaybackStore(set, get),
  ui: createUIStore(set, get),
}));
```

## Component Architecture

### Core Components Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   │   ├── SessionList
│   │   ├── AnalysisPanel
│   │   └── SettingsPanel
│   ├── MainContent
│   │   ├── Dashboard
│   │   ├── MapView (MapLibre GL JS)
│   │   ├── ChartsView (ECharts)
│   │   ├── PolarView (Custom Canvas)
│   │   ├── ManeuversView (Table + Charts)
│   │   ├── RaceView (Analysis Tables)
│   │   └── VideoView (HTML5 Video + Overlay)
│   └── Timeline
│       ├── PlaybackControls
│       ├── TimelineScrubber
│       └── EventMarkers
└── Modals
    ├── FileImportModal
    ├── ExportModal
    ├── SettingsModal
    └── ErrorModal
```

### Data Visualization Strategy

#### MapLibre GL JS Integration
```typescript
// Map component with synchronized boat position
const MapView: React.FC = () => {
  const currentTime = usePlaybackStore(s => s.currentTime);
  const session = useSessionStore(s => s.activeSession);

  // Find current position from session data
  const currentRecord = useMemo(() =>
    findRecordAtTime(session.data, currentTime), [session, currentTime]);

  // Update map markers and boat position
  useEffect(() => {
    if (mapRef.current && currentRecord) {
      updateBoatMarker(currentRecord.latitude, currentRecord.longitude);
    }
  }, [currentRecord]);
};
```

#### ECharts Time Series Integration
```typescript
// Chart component with cursor synchronization
const TelemetryChart: React.FC<ChartProps> = ({ metrics }) => {
  const currentTime = usePlaybackStore(s => s.currentTime);

  // Chart cursor line synchronized with global timeline
  const option = useMemo(() => ({
    xAxis: { type: 'time' },
    yAxis: metrics.map(createYAxis),
    series: metrics.map(createSeries),
    graphic: [{
      type: 'line',
      position: [timeToPixel(currentTime), 0],  // Sync cursor
      style: { stroke: '#3b82f6' }
    }]
  }), [metrics, currentTime]);
};
```

## IPC Protocol Design

### File Operations
```typescript
// Main process handlers
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Sailing Logs', extensions: ['nmea', 'gpx', 'csv', 'log'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.filePaths[0]) {
    const buffer = await fs.readFile(result.filePaths[0]);
    return { buffer, filename: path.basename(result.filePaths[0]) };
  }
});

// Renderer process usage
const openFile = async () => {
  const file = await window.electronAPI.file.open();
  if (file) {
    // Send to parser worker
    const result = await parseFile(file.buffer, file.filename);
    // Update session store
    sessionStore.addSession(result.session);
  }
};
```

### Session Management
```typescript
// Save/load sessions as .qsa files (JSON format)
ipcMain.handle('session:save', async (event, sessionData) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${sessionData.name}.qsa`,
    filters: [{ name: 'QSA Session', extensions: ['qsa'] }]
  });

  if (result.filePath) {
    await fs.writeFile(result.filePath, JSON.stringify(sessionData, null, 2));
    return result.filePath;
  }
});
```

## Web Workers Architecture

### Parser Worker
```typescript
// src/core/workers/parse-worker.ts
self.onmessage = async (e) => {
  const { buffer, filename, options } = e.data;

  try {
    // Auto-detect format
    const parser = getParserForFile(buffer, filename);

    // Parse with progress updates
    const result = await parser.parse(buffer, filename, {
      ...options,
      onProgress: (progress) => {
        self.postMessage({ type: 'progress', progress });
      }
    });

    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
```

### Analysis Worker
```typescript
// src/core/workers/analysis-worker.ts
self.onmessage = async (e) => {
  const { session, analysisTypes } = e.data;
  const results = {};

  // Run requested analysis types
  if (analysisTypes.includes('races')) {
    results.races = await detectRaces(session);
  }

  if (analysisTypes.includes('maneuvers')) {
    results.maneuvers = await detectManeuvers(session);
  }

  if (analysisTypes.includes('polar')) {
    results.polar = await buildPolar(session);
  }

  self.postMessage({ type: 'complete', results });
};
```

## Performance Optimizations

### Large Dataset Handling
```typescript
// Virtual scrolling for large data tables
const VirtualizedTable: React.FC = ({ data }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(50);

  // Only render visible rows
  const visibleData = useMemo(() =>
    data.slice(startIndex, endIndex), [data, startIndex, endIndex]);

  return (
    <div onScroll={handleScroll}>
      {visibleData.map(renderRow)}
    </div>
  );
};

// Chart data decimation for smooth rendering
const decimateData = (data: SailingRecord[], maxPoints: number) => {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};
```

### Memory Management
```typescript
// Session data with lazy loading
class SessionManager {
  private loadedSessions = new Map<string, SailingSession>();
  private sessionCache = new LRUCache<string, SailingRecord[]>(10); // Keep 10 sessions in memory

  async getSessionData(sessionId: string): Promise<SailingRecord[]> {
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    // Load from disk/indexedDB if not in memory
    const data = await this.loadSessionFromStorage(sessionId);
    this.sessionCache.set(sessionId, data);
    return data;
  }
}
```

## Analysis Algorithm Framework

### Pluggable Analysis Architecture
```typescript
// Analysis algorithms implement common interface
interface AnalysisAlgorithm<T> {
  name: string;
  version: string;
  analyze(session: SailingSession): Promise<AnalysisResult<T>>;
}

// Analysis pipeline with configurable algorithms
class AnalysisPipeline {
  private algorithms = new Map<string, AnalysisAlgorithm<any>>();

  register<T>(name: string, algorithm: AnalysisAlgorithm<T>) {
    this.algorithms.set(name, algorithm);
  }

  async runAnalysis(session: SailingSession, steps: string[]) {
    const results = {};
    for (const step of steps) {
      const algorithm = this.algorithms.get(step);
      if (algorithm) {
        results[step] = await algorithm.analyze(session);
      }
    }
    return results;
  }
}
```

## Error Handling Strategy

### Graceful Degradation
```typescript
// Error boundaries for component isolation
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('Component error:', error, errorInfo);

    // Show fallback UI
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback message="This component encountered an error" />;
    }
    return this.props.children;
  }
}

// Data validation with fallbacks
const validateAndCleanData = (records: SailingRecord[]): SailingRecord[] => {
  return records.map(record => ({
    ...record,
    // Fallback to SOG if BSP is invalid
    bsp: isValidSpeed(record.bsp) ? record.bsp : record.sog,
    // Interpolate missing GPS coordinates
    latitude: record.latitude || interpolateGPS(record, 'latitude'),
    longitude: record.longitude || interpolateGPS(record, 'longitude'),
  })).filter(record => isValidRecord(record));
};
```

## Build and Deployment

### Development Build
```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "vite build && electron-builder",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Production Build
- **macOS**: .dmg with code signing
- **Windows**: .exe with installer
- **Linux**: .AppImage for universal compatibility

### Performance Targets
- **Cold Start**: < 3 seconds to app ready
- **File Loading**: 100k records in < 5 seconds
- **Analysis**: Race detection in < 10 seconds for 2-hour session
- **Rendering**: Smooth 60fps timeline scrubbing
- **Memory**: < 500MB for typical session (1M+ records)

## Security Considerations

1. **File Access**: Electron sandbox with limited file system access
2. **IPC Validation**: All IPC messages validated with TypeScript schemas
3. **Data Sanitization**: All user inputs sanitized before processing
4. **Auto-updates**: Signed updates through electron-updater

## Future Extensibility

### Plugin System
```typescript
// Plugin interface for future extensions
interface Plugin {
  name: string;
  version: string;
  init(app: Application): void;

  // Optional hooks
  parsers?: BaseParser[];
  analyzers?: AnalysisAlgorithm<any>[];
  components?: React.ComponentType<any>[];
}

// Plugin registration
class PluginManager {
  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    plugin.init(this.app);

    // Register plugin components
    if (plugin.parsers) {
      plugin.parsers.forEach(p => this.app.registerParser(p));
    }
  }
}
```

This architecture provides a solid foundation for a professional sailing analytics application with room for future growth and extensibility.