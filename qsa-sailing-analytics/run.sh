#!/bin/bash
MAX_RESTARTS=15
COUNT=0

PROMPT='Read CLAUDE.md.

You are a team of senior engineers operating in /gsd mode. You work autonomously. You never ask questions.

## PHASE 1: AUDIT (do this first, every time)

Read these files and understand the full state:
- CLAUDE.md
- HANDOFF.md (if exists — resume from here)
- TODO.md
- DECISIONS.md
- src/store/analysisStore.ts (the critical bug)
- src/store/sessionStore.ts
- src/views/ (all views — identify stubs vs real)
- src/core/analysis/maneuver-detection.ts
- Run: npm run build
- Run: npx vitest run
- Run: ls assets/real-data/ assets/screenshots/
- Summarize: what works, what is broken, what is stub, what is missing

## PHASE 2: PLAN

Based on the audit, create a detailed execution plan in TODO.md.
Break ALL remaining work into small tasks (max 50 lines of code each).
Group tasks by agent skill:

/senior-fullstack tasks:
- Fix analysis wiring (the critical bug)
- Electron IPC improvements
- Store wiring and data flow
- Build pipeline and packaging

/senior-data-scientist tasks:
- Fix maneuver detection (tack = TWA sign change |TWA|<90, gybe = |TWA|>90)
- Generate synthetic test data (2000 NMEA records, realistic race)
- Write all unit tests
- Validate analysis algorithms with real data

/senior-frontend + /ui-ux-pro-max tasks:
- ManeuverView (replace stub): sortable table, speed profiles, summary stats
- RaceView (replace stub): leg table, race summary, mini map
- VideoView (new): HTML5 video, playback sync, HUD overlay, time offset
- CalibrationView (new): HDG vs COG, BSP vs SOG scatter plots
- MapView enhancements: color legend, maneuver markers, metric toggle
- ChartsView enhancements: metric selector, brush zoom, maneuver markers
- PolarView enhancements: target overlay, TWS band selector
- Timeline bar: play/pause, speed control, race/maneuver markers
- Dashboard: show real analysis results
- Polish: loading skeletons, error toasts, keyboard shortcuts

/senior-architect tasks:
- Enable TypeScript strict mode, fix all type errors
- Performance optimization for large datasets
- electron-builder packaging config
- README.md

Each task in the plan must have:
- [ ] One-line description
- Files to create/modify
- Acceptance criteria (what "done" looks like)

## PHASE 3: EXECUTE

Work through the plan in order. For each task:
1. Write the code
2. Run tests (npx vitest run) or build (npm run build)
3. Fix any failures
4. Mark task done in TODO.md
5. git add -A && git commit -m "feat: <description>"
6. Move to next task immediately

IMPORTANT EXECUTION RULES:
- Check assets/screenshots/ before building ANY view
- Use assets/real-data/ for testing if files exist
- If context fills up: write HANDOFF.md with exact position, then stop
- Never ask questions
- Never modify CLAUDE.md, run.sh, .claude/
- Every action produces code or tests

Start now. Phase 1 first.'

while [ $COUNT -lt $MAX_RESTARTS ]; do
    COUNT=$((COUNT + 1))
    echo ""
    echo "=========================================="
    echo "  /gsd RUN #$COUNT / $MAX_RESTARTS — $(date)"
    echo "=========================================="

    claude --dangerously-skip-permissions \
           --model claude-sonnet-4-20250514 \
           --max-turns 200 \
           -p "$PROMPT"

    echo "[$(date)] Exit code $?"

    if grep -q "ALL TASKS COMPLETE\|ALL DONE\|packaging.*done\|v1.0" TODO.md 2>/dev/null; then
        echo ""
        echo "=========================================="
        echo "  ✅ ALL COMPLETE — $(date)"
        echo "=========================================="
        break
    fi

    echo "Restarting in 10s..."
    sleep 10
done

echo ""
echo "=== Finished at $(date) ==="
echo "=== Commits ==="
git log --oneline | head -30
echo "=== Status ==="
grep -E "✅|\[x\]|COMPLETE|STUB|TODO" TODO.md 2>/dev/null | tail -20
