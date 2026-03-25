# Claude Code — Overnight Autonomous Build: QSA Njord (Sailing Analytics Desktop App)

## CONTINUATION PROTOCOL (READ FIRST)

**BEFORE writing any code, do this:**
1. Check if `qsa-sailing-analytics/` directory already exists
2. If it does, read `TODO.md`, `DECISIONS.md`, and `HANDOFF.md` (if present)
3. Run `find src -name "*.ts" -o -name "*.tsx" | wc -l` to count existing source files
4. Run `npm test` to check current test status
5. **Resume from the earliest incomplete phase.** Do NOT redo completed work.
6. If the app already builds (`npm run build`), skip to integration/polish phases.

**How to detect completed phases:**
- Phase 1 done if: `package.json`, `tsconfig.json`, `src/core/models/` exist with interfaces
- Phase 2 done if: `src/core/parsers/*.ts` and `src/core/analysis/*.ts` exist and tests pass
- Phase 3 done if: `electron/main.ts`, `electron/preload.ts`, `src/store/*.ts` exist
- Phase 4 done if: `src/views/*.tsx` and `src/components/` have real implementations (not just placeholders)
- Phase 5 done if: `npm run dev` starts without errors, end-to-end flow works
- Phase 6 done if: `npm run build && npm run package` succeeds

**If ALL phases are complete:** Run the full test suite, fix any remaining issues, verify `npm run dev` works, then write a final summary in `HANDOFF.md` and exit.

## MASTER DIRECTIVE

You are an autonomous engineering team rebuilding a professional sailing analytics desktop application from scratch. This is a Njord-equivalent (sailnjord.com) built by QSA. You operate as a multi-agent team. **You NEVER ask questions. You NEVER stop. You make every decision yourself.** When facing ambiguity, pick the best option, document why, and move on.

**If you hit a blocker**: work around it, log it in `DECISIONS.md`, continue. If tests fail: fix them. If you run out of context: write a detailed handoff in `HANDOFF.md`, summarize what's done, what's next, and `/compact` yourself. Then continue from the handoff.

---

## THE APP: QSA Sailing Analytics

A cross-platform desktop app (Electron + React + TypeScript) for professional sailing performance analysis. Think Njord Analytics + Njord Player rebuilt from scratch with modern architecture.

### Core Feature Set (in priority order)

#### P0 — Must ship tonight
1. **Data Ingestion Pipeline** — Parse sailing log files: NMEA 0183, GPX, CSV, Expedition, B&G, Velocitek, SailGP formats. Normalize to a unified internal schema (`SailingSession` with timestamped records of BSP, TWS, TWA, TWD, AWA, AWS, HDG, COG, SOG, lat/lon, heel, rudder, etc.)
2. **Interactive Map View** — MapLibre GL JS showing boat track colored by metric (speed, VMG, TWA). Playback timeline scrubber. Multi-boat overlay support.
3. **Telemetry Charts** — ECharts time-series synchronized with map. Multiple Y-axes. Cursor sync across all views. Metric selector panel.
4. **Race Detection & Leg Analysis** — Auto-detect races from maneuvers (tack/gybe sequences). Split into legs. Compute per-leg stats: distance sailed, avg BSP, avg VMG, VMG efficiency, time on leg.
5. **Maneuver Analysis** — Detect tacks and gybes. Compute: entry speed, exit speed, VMG loss, turn time, distance lost. Rank and compare maneuvers.
6. **Polar Performance** — Build polar diagram from session data. Compare actual vs target polars. BSP/VMG polar views. Export polar targets.

#### P1 — Should ship if time allows
7. **Video Player Integration** — Sync video playback with telemetry timeline. Data overlay on video (HUD). Time offset adjustment UI.
8. **Start Analysis** — Pre-start sequence detection. Speed buildup visualization. Position at gun relative to start line.
9. **Instrument Calibration Report** — HDG vs COG analysis, BSP vs SOG, wind instrument checks.
10. **Multi-Boat Comparison** — Load multiple boats, compare performance on same legs. Fleet rankings per leg.
11. **Report Generation** — Auto-generated PDF/HTML performance reports (race summary, maneuver report, calibration report). Shareable via email.

#### P2 — Nice to have
12. **Sail Crossover View** — TWS vs sail configuration database. Crossover recommendations.
13. **Mark Rounding Analysis** — Detect bearaway/roundup events. Speed profiles through roundings.
14. **Session Database** — SQLite local DB of all loaded sessions. Search, filter, compare across events.
15. **Wind Field Visualization** — Interpolated wind shifts/gusts displayed on map.

---

## TECH STACK (locked — do not deviate)

| Layer | Technology |
|---|---|
| Desktop shell | Electron (latest stable) |
| Frontend | React 18 + TypeScript 5 |
| State management | Zustand |
| Charts | ECharts 5 (via echarts-for-react) |
| Map | MapLibre GL JS |
| Video | HTML5 `<video>` with custom controls |
| Styling | Tailwind CSS 3 |
| Build | Vite + electron-builder |
| Local DB | SQLite via better-sqlite3 |
| Data processing | TypeScript workers (Web Workers for heavy parsing) |
| Testing | Vitest + Playwright (E2E) |
| Linting | ESLint + Prettier |

---

## ARCHITECTURE

```
qsa-sailing-analytics/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts            # IPC bridge
│   └── ipc/                  # IPC handlers (file dialogs, fs access)
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Layout.tsx
│   │   └── routes/
│   ├── components/
│   │   ├── map/              # MapLibre map view
│   │   ├── charts/           # ECharts telemetry panels
│   │   ├── video/            # Video player + overlay
│   │   ├── polar/            # Polar diagram view
│   │   ├── maneuvers/        # Maneuver analysis view
│   │   ├── race/             # Race overview & leg analysis
│   │   ├── timeline/         # Playback timeline / scrubber
│   │   ├── reports/          # Report generation views
│   │   └── ui/               # Shared UI components
│   ├── core/
│   │   ├── parsers/          # File format parsers (NMEA, GPX, CSV, etc.)
│   │   ├── analysis/         # Race detection, maneuver detection, polars
│   │   ├── models/           # TypeScript interfaces & types
│   │   ├── workers/          # Web Workers for heavy computation
│   │   └── utils/            # Math, geo, interpolation, time utils
│   ├── store/                # Zustand stores
│   │   ├── sessionStore.ts
│   │   ├── uiStore.ts
│   │   ├── playbackStore.ts
│   │   └── analysisStore.ts
│   └── styles/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── assets/                   # Icons, fonts, sample data
├── DECISIONS.md              # All architectural decisions logged here
├── HANDOFF.md                # Context handoff file for /compact cycles
├── TODO.md                   # Running task tracker
└── package.json
```

---

## AGENT ROLES — Execute in this order

### Phase 1: Architecture & Planning (Agent: /senior-architect)

**Directive**: Design the full system. Do NOT code yet.

1. Create the project scaffold with all directories
2. Write all TypeScript interfaces in `src/core/models/`:
   - `SailingRecord` (single timestamped data point)
   - `SailingSession` (full session with metadata)
   - `Race`, `Leg`, `Maneuver`, `PolarTarget`, `StartSequence`
   - Parser interfaces, analysis result types
3. Write `ARCHITECTURE.md` documenting data flow, IPC protocol, state management patterns
4. Write `TODO.md` with every task broken into small implementable chunks
5. Set up `package.json`, `tsconfig.json`, `vite.config.ts`, `electron-builder.yml`, `.eslintrc`, `.prettierrc`
6. Set up Vitest config and a hello-world test that passes

**Exit criteria**: `npm install` works. `npm run lint` works. `npm test` passes. All interfaces defined.

### Phase 2: Core Data Engine (Agent: /senior-data-scientist)

**Directive**: Build all data parsing and analysis. Pure TypeScript, no UI.

1. Implement parsers in `src/core/parsers/`:
   - `nmea-parser.ts` — NMEA 0183 sentences (RMC, MWV, VHW, HDG, VWR, MWD)
   - `gpx-parser.ts` — GPX tracks
   - `csv-parser.ts` — Generic CSV with column mapping
   - `expedition-parser.ts` — Expedition log format
   - `velocitek-parser.ts` — Velocitek VCC/SpeedPuck
   - `universal-loader.ts` — Auto-detect format, route to correct parser
2. Implement analysis in `src/core/analysis/`:
   - `wind-math.ts` — True wind calculation from apparent + BSP, wind angle normalization
   - `vmg.ts` — VMG computation (upwind/downwind), VMG efficiency vs polar targets
   - `maneuver-detection.ts` — Tack/gybe detection from HDG/TWA changes, entry/exit metrics
   - `race-detection.ts` — Race segmentation from maneuver patterns + speed profiles
   - `polar-builder.ts` — Build polars from session data, binning by TWS/TWA
   - `leg-analysis.ts` — Per-leg statistics computation
   - `interpolation.ts` — Time-series resampling, gap filling, smoothing
   - `geo-utils.ts` — Haversine, bearing, great circle, coordinate transforms
3. Implement Web Workers in `src/core/workers/`:
   - `parse-worker.ts` — Offload file parsing
   - `analysis-worker.ts` — Offload race/maneuver detection
4. Write unit tests for EVERY parser and analysis function. Use synthetic data. Tests MUST pass.

**Exit criteria**: Can parse a synthetic NMEA file → get a `SailingSession` → detect races → detect maneuvers → compute polars. All tests green.

### Phase 3: Electron Shell & State (Agent: /senior-fullstack)

**Directive**: Wire up Electron, IPC, state management, and data flow.

1. Implement `electron/main.ts`:
   - Window creation, menu bar, file dialog IPC
   - Recent files tracking
   - Dev tools in development mode
2. Implement `electron/preload.ts`:
   - Expose safe IPC bridge (`contextBridge.exposeInMainWorld`)
   - File open/save dialogs
   - File system read for log files
3. Implement `electron/ipc/`:
   - `file-handlers.ts` — Open file dialog, read file, return buffer to renderer
   - `session-handlers.ts` — Save/load `.qsa` session files (JSON)
4. Implement Zustand stores:
   - `sessionStore` — Loaded sessions, active session, boat metadata
   - `playbackStore` — Current timestamp, play/pause, playback speed, scrubber position
   - `uiStore` — Active view, panel visibility, selected metrics
   - `analysisStore` — Computed analysis results (races, maneuvers, polars)
5. Wire parser → store → analysis pipeline:
   - User opens file → IPC → parser worker → sessionStore → trigger analysis worker → analysisStore
6. Build the app shell layout with sidebar navigation, main content area, bottom timeline

**Exit criteria**: Can open the app, load a file via dialog, see parsed data in store (verify via React DevTools equivalent / console logs). App doesn't crash.

### Phase 4: UI — All Views (Agent: /senior-frontend + /ui-ux-pro-max)

**Directive**: Build every view. Make it look professional. Dark theme. Think Bloomberg terminal meets modern design.

**Design language**:
- Dark background (#0a0e14), accent blue (#3b82f6), accent green (#10b981) for positive, red (#ef4444) for negative
- Font: JetBrains Mono for data, system sans-serif for UI
- Dense but readable data display
- Smooth transitions, no jank

Build these views:

1. **Dashboard / Session Overview**
   - Session metadata card (date, location, duration, boat)
   - Quick stats: distance sailed, avg BSP, max BSP, races detected, maneuvers count
   - Mini-map preview, mini-polar preview

2. **Map View** (`components/map/`)
   - MapLibre with dark basemap (Carto Dark Matter or similar free tile)
   - Boat track as GeoJSON line, colored by selected metric (speed, VMG, TWA)
   - Color legend
   - Boat position marker synced with playback timestamp
   - Multi-boat support (different track colors)
   - Zoom to track bounds on load

3. **Telemetry Charts** (`components/charts/`)
   - ECharts with dark theme
   - Default: BSP, TWS, TWA, VMG stacked vertically with shared x-axis (time)
   - Metric selector: user picks which channels to display
   - Cursor crosshair synced with map marker and playback position
   - Click on chart → update playback position
   - Brush zoom on x-axis

4. **Polar View** (`components/polar/`)
   - Polar diagram (TWA on angle, BSP on radius)
   - Data points colored by TWS band
   - Target polar overlay (if available)
   - Toggle: BSP polar / VMG polar
   - TWS band filter selector

5. **Maneuver Analysis** (`components/maneuvers/`)
   - Table of all detected maneuvers: type, time, entry speed, exit speed, VMG loss, turn time
   - Sortable, filterable
   - Click row → map zooms to maneuver, timeline jumps to timestamp
   - Mini time-series showing speed profile around maneuver

6. **Race View** (`components/race/`)
   - Race list with per-leg breakdown
   - Leg table: TWA, avg BSP, VMG, distance, duration
   - Visual race course on map with marks

7. **Timeline / Playback Bar** (`components/timeline/`)
   - Full-width scrubber at bottom
   - Play/pause, speed control (0.5x, 1x, 2x, 4x)
   - Race markers, maneuver markers, media markers on timeline
   - Current time display

8. **Video Panel** (`components/video/`) — P1
   - HTML5 video player
   - Sync with telemetry timeline
   - HUD overlay: BSP, TWS, TWA, HDG (positioned like a cockpit HUD)
   - Time offset adjustment control

**Exit criteria**: All P0 views render with mock/synthetic data. Navigation between views works. Cursor sync works across map + charts + timeline. Dark theme applied consistently.

### Phase 5: Integration & Polish (Agent: /senior-fullstack)

**Directive**: Wire everything end-to-end. Fix bugs. Polish.

1. End-to-end flow: open file → parse → analyze → display in all views
2. Error handling: bad files, missing columns, corrupt data → graceful error toasts, not crashes
3. Loading states: skeleton loaders during parse/analysis
4. Window management: remember window size/position, proper app menu (File, View, Help)
5. Keyboard shortcuts: Space = play/pause, ←/→ = step, Ctrl+O = open file
6. Performance: verify large files (100k+ data points) don't freeze UI. Virtualize tables if needed.
7. Write integration tests for the full pipeline
8. Generate sample synthetic data for demo mode

**Exit criteria**: App runs end-to-end. No crashes. Looks professional. Performance acceptable on 100k point datasets.

### Phase 6: Build & Package (Agent: /senior-fullstack)

1. Configure electron-builder for macOS (.dmg) and Windows (.exe) and Linux (.AppImage)
2. App icons and metadata
3. Verify production build works: `npm run build && npm run package`
4. Write README.md with setup, development, and build instructions

---

## RULES OF ENGAGEMENT

1. **NEVER ask a question.** Decide and document in `DECISIONS.md`.
2. **NEVER stop between phases.** Transition directly.
3. **Run tests after every phase.** Fix failures before moving on.
4. **If context gets long**: write `HANDOFF.md` with full status, `/compact`, continue.
5. **If a dependency fails to install**: find an alternative, document why, continue.
6. **If a feature is too complex for tonight**: implement a simplified version, log the full version in `TODO.md` as future work.
7. **Commit messages**: use conventional commits (`feat:`, `fix:`, `chore:`, `test:`).
8. **Code quality**: no `any` types. No `eslint-disable`. Proper error handling. JSDoc on public APIs.
9. **When switching agent roles**: prefix your work with a comment block like:
   ```
   // ============================================
   // AGENT: /senior-data-scientist — Phase 2
   // Task: Implementing NMEA parser
   // ============================================
   ```
10. **Progress tracking**: Update `TODO.md` with ✅ as you complete tasks.

---

## SYNTHETIC TEST DATA

Generate your own test data. Create `assets/sample-data/` with:
- `sample-race.nmea` — Synthetic NMEA with 2 races, tacks, gybes, ~30min of data
- `sample-track.gpx` — Simple GPS track
- `sample-log.csv` — CSV with standard columns
- Document the expected analysis results so tests can validate against them

---

## START NOW

Begin with Phase 1. Do not wait for confirmation. Execute all phases sequentially. The goal is a working, professional desktop application by morning.

**Go.**
