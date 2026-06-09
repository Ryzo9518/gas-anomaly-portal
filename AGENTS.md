# GAS Anomaly Portal — Governance (The Law)

This file is the **binding governance** for the GAS Anomaly Portal
(`anomaly.gasecosys.co.za`). Every developer and every AI agent that touches
this repository MUST follow it. Where this file and the handover package agree,
that is the law. Where a question is not covered here, defer to the handover
package in `docs/claude-handoff/`.

> Root `CLAUDE.md` is a compatibility shim that points here. This file
> (`AGENTS.md`) is canonical.

---

## 1. Required reading (in order, before writing any code)

The full law lives in `docs/claude-handoff/`. Read it in the mandated order:

1. `docs/claude-handoff/00-READ_FIRST.md` — entry point, reading order
2. `docs/claude-handoff/ARCHITECTURE.md` — report-scoped system design + 10 invariants
3. `docs/claude-handoff/DATA_MODEL_AND_STATE.md` — entities, fields, relationships
4. `docs/claude-handoff/FILE_STRUCTURE_AND_CONVENTIONS.md` — where everything lives, naming
5. `docs/claude-handoff/BUILD_PROCESS_AND_RULES.md` — the 5-step build contract + immutable rules
6. `docs/claude-handoff/QUALITY_GATES.md` — what must pass before shipping
7. `docs/claude-handoff/INTEGRATION_POINTS.md` — Phase 2 backend contracts
8. `docs/claude-handoff/LESSONS_LEARNED.md` — 10 non-negotiable lessons
9. `docs/claude-handoff/FEATURE_TEMPLATE.md` — how to add a feature safely
10. `docs/claude-handoff/TROUBLESHOOTING.md` — common failures and fixes
11. `docs/claude-handoff/CRITICAL_RULES_CHECKLIST.md` — 1-page summary, read before every commit

**Do not skip the reading order. The answer is almost always already in a doc.**

---

## 2. The 5 Immutable Rules (breaking any one = instant rejection)

Full detail in `BUILD_PROCESS_AND_RULES.md` and `CRITICAL_RULES_CHECKLIST.md`.

1. **`ReportContext` is the single source of truth.** No route may hold local
   state that contradicts context. Every screen starts with `useReport()`.
2. **The URL param `?report=` drives report selection.** Never track the
   selected report in local state. `selectReport()` always updates the URL.
3. **Historical reports are frozen.** If `isHistorical === true`, no mutations.
   `submitEngagement()` / `saveDraft()` are hard no-ops off the latest report.
   The amber banner is law, not a suggestion.
4. **Plan column == `engagement.findings` status.** Both the findings table and
   the plan column read from `engagement.findings` only. One source, always in sync.
5. **The cumulative KPI never freezes.** `computeCumulative(engagementsById)`
   runs fresh every render, on every report including historical ones.

The 10 architectural invariants in `ARCHITECTURE.md` (every screen calls
`useReport()`, engagement state machine is linear `none → draft → submitted →
active → complete`, `mode=new` does not create a report, auth is mocked-not-missing,
etc.) carry the same weight.

---

## 3. Quality gates — all three must pass before every commit

```bash
npm run typecheck   # Gate 1: 0 TypeScript errors. No `any`, no implicit any.
npm run build       # Gate 2: production build succeeds (< 30s)
PORT=5199 npm run dev   # Gate 3: manual visual check at http://localhost:5199
```

Gate 3 must confirm the regression checklist in `QUALITY_GATES.md`
(report switch rehydrates all screens, historical freeze + amber banner,
cumulative KPI stays live, plan column toggles, URL shareability).

`5199` is the project's standing dev/preview port (see `.claude/launch.json`).

**Local enforcement (sanctioned, not CI).** Gates 1–2 are enforced automatically
by a local pre-commit hook (`.githooks/pre-commit`, wired by `npm run prepare` via
`git config core.hooksPath`). This is local-only enforcement and is consistent with
the no-GitHub-Actions rule in §4 — it is the *approved* substitute for cloud CI, not
an exception to it. A clone activates the hook on first `npm install`; no manual step.
Gate 3 and `verify:isolation` cannot be machine-checked at commit time and remain the
committer's responsibility — see the one-screen `docs/claude-handoff/PRE_PR_CHECKLIST.md`
(mirrored into every PR by `.github/pull_request_template.md`).

---

## 4. Conventions (binding)

- **Stack is fixed:** React 18 + Vite 5 + TypeScript 5 (strict) + Tailwind 3 +
  React Router 6 + TanStack Query 5 + Zustand + Radix UI. Do not introduce a new
  state library, router, or styling system.
- **No new top-level directories** under `src/`. Use the existing structure.
- **Naming:** routes `*.route.tsx`, context `*Context.tsx`, hooks `use*()`,
  types `PascalCase`, state `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- **No hardcoded data in routes** — all data comes from context or the fixtures.
- **Fixtures:** `ReportContext` imports from `fixture.active` only — never directly
  from `reports.fixture` or `reports.fixture.clean`.
- **Colors are locked** (violet primary, amber historical banner, emerald success,
  red risk). Use Tailwind classes; do not introduce new brand colors.
- **Commit message format:**
  ```
  [FEATURE] Brief description

  - What changed
  - Why it changed
  - Related lesson: [LESSON-N]   (if applicable)
  ```
- **CI policy — GitHub Actions are NOT used (standing rule).** Quality gates run
  locally before commit, enforced by the pre-commit hook described in §3. Do not add
  `.github/workflows/` without an explicit, recorded decision to amend this law. Note
  that the local hook (`.githooks/`) and the PR template (`.github/pull_request_template.md`)
  are **not** Actions — they run on the developer's machine / in the PR body, never on
  GitHub's runners — and are therefore permitted under this rule.

---

## 5. Phase discipline

- **Phase 1 (current):** front-end only, runs on the local mock adapter and
  TypeScript fixtures. Auth is **mocked, not missing** — never describe it as
  future work.
- **Phase 2:** the FastAPI backend slots in **behind the adapter seam** with no
  view-layer or router rework. Follow the Phase 2 migration checklist in
  `INTEGRATION_POINTS.md`. The only boundary that changes is `src/adapters/`.

---

## 6. Deployment governance (Hetzner — `anomaly.gasecosys.co.za`)

The live build on Hetzner MUST comply with this law. The full runbook is in
`docs/deployment/HETZNER_DEPLOYMENT.md`. The non-negotiables:

1. **Deploy only from committed source on `main`.** No hand-edited files on the
   server. The server build is `npm ci && npm run typecheck && npm run build`.
2. **All three quality gates pass before a deploy is promoted.** A deploy that
   fails typecheck or build is never published.
3. **Serve the built `dist/` as a static SPA with an `index.html` fallback**
   (`try_files $uri $uri/ /index.html;`). This app is client-side routed;
   without the fallback, deep links and refreshes 404.
4. **No GitHub Actions / cloud CI** drives the deploy (per §4). Deployment is the
   documented manual/scripted process in the runbook.
5. **HTTPS only** at `anomaly.gasecosys.co.za`, with HTTP redirected to HTTPS.
6. **The fixture mode is an explicit, recorded build-time choice** (`demo` vs
   `clean`) — never left ambiguous. See the runbook.
7. **The deployed commit SHA is recorded** so the live site is always traceable
   to an exact source revision.
