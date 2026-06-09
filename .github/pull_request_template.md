<!--
  This template is a static PR description — NOT GitHub Actions / CI.
  It is consistent with the no-Actions rule in AGENTS.md §4.
  The canonical, always-current version of this checklist lives at
  docs/claude-handoff/PRE_PR_CHECKLIST.md.
-->

## What changed & why

<!-- One or two sentences. Link the related LESSON-N if applicable. -->

## Pre-PR checklist (the law — tick before requesting review)

### Quality gates (AGENTS.md §3)
- [ ] `npm run typecheck` passes (0 errors, no `any`)
- [ ] `npm run build` succeeds (< 30s)
- [ ] Manual visual check ran the `QUALITY_GATES.md` regression list
- [ ] Multi-client change → `npm run verify:isolation` prints `ISOLATION PASSED (bundle)` (or N/A)

### The 5 Immutable Rules (AGENTS.md §2)
- [ ] 1 — `ReportContext` is the single source of truth; every screen uses `useReport()`
- [ ] 2 — `?report=` drives selection; never tracked in local state
- [ ] 3 — Historical reports are frozen (no mutations; amber banner)
- [ ] 4 — Plan column == `engagement.findings` status (one source)
- [ ] 5 — Cumulative KPI computed fresh every render, including historical

### Conventions & phase (AGENTS.md §4–§5)
- [ ] Stack / directory / naming / color conventions respected
- [ ] CI scope respected — Actions allowed for validation only; deploy/secret workflows need a §4 amendment
- [ ] Phase 1 boundaries respected (auth mocked-not-missing; backend behind `src/adapters/`)

<!-- Full detail: docs/claude-handoff/PRE_PR_CHECKLIST.md -->
