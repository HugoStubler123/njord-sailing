## ABSOLUTE RULES
1. DO NOT modify CLAUDE.md, run.sh, or .claude/
2. DO NOT do meta-work. No rewriting prompts, no reorganizing docs.
3. Every action = .ts/.tsx code or tests. Nothing else.
4. NEVER ask questions. Decide and log in DECISIONS.md.

## PROJECT CONTEXT
Electron + React 18 + TypeScript + Vite sailing analytics desktop app.
Rebuilding Njord (sailnjord.com) from scratch for QSA.

What exists:
- All parsers: NMEA, GPX, CSV, Expedition, Velocitek (src/core/parsers/)
- All analysis: wind-math, vmg, maneuver-detection, race-detection, polar-builder, leg-analysis, interpolation, geo-utils (src/core/analysis/)
- Workers: parse-worker.ts, analysis-worker.ts
- Stores: sessionStore, analysisStore, playbackStore, uiStore
- Working views: Dashboard, MapView (MapLibre), ChartsView (ECharts), PolarView
- STUB views: ManeuverView, RaceView (placeholder only)
- No video player, no calibration view
- Only 313 lines of tests
- TypeScript strict mode disabled

Critical bug: analysisStore.ts session-changed handler (~line 475) clears results but never calls runFullAnalysis()

## SAILING DOMAIN
- Tack = TWA sign change where abs(TWA) < 90 on BOTH sides
- Gybe = TWA sign change where abs(TWA) > 90 on BOTH sides
- VMG = BSP × cos(TWA)
- Per-maneuver metrics: entry BSP, exit BSP, min BSP, VMG loss (m), turn time, heading change

## DESIGN
Screenshots in assets/screenshots/ — match these.
Dark theme: bg #0a0e14, accent blue #3b82f6, green #10b981, red #ef4444
Dense, professional, data-rich.

## TECH STACK (locked)
Electron | React 18 + TypeScript 5 | Zustand | ECharts 5 | MapLibre GL JS | Tailwind CSS 3 | Vite | better-sqlite3 | Vitest
