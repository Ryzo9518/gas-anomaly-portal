# Pre-PR Checklist (The Law, in one screen)

Tick every box **before opening a pull request**. This is the enforced summary of
`AGENTS.md` and the handover package. If you cannot honestly tick a box, the PR is
not ready. (Mechanical gates 1–2 are also enforced by the local pre-commit hook —
see `.githooks/pre-commit` — but you remain responsible for the rest.)

> The PR template at `.github/pull_request_template.md` copies this list into every
> PR description automatically. Filling it in is part of opening a PR, not optional.

## Quality gates (AGENTS.md §3)

- [ ] **Gate 1 — `npm run typecheck`** passes (0 errors, no `any`, no implicit any).
- [ ] **Gate 2 — `npm run build`** succeeds (< 30s).
- [ ] **Gate 3 — manual visual check** at `PORT=5199 npm run dev`: ran the regression
      checklist in `QUALITY_GATES.md` (report switch rehydrates all screens, historical
      freeze + amber banner, cumulative KPI stays live, plan column toggles, URL shareable).
- [ ] **Multi-client change?** `npm run verify:isolation` prints `ISOLATION PASSED (bundle)`.

## The 5 Immutable Rules (AGENTS.md §2 — breaking any one = instant rejection)

- [ ] **1. `ReportContext` is the single source of truth.** No route holds local state
      that contradicts context. Every screen starts with `useReport()`.
- [ ] **2. `?report=` drives report selection.** Selection is never tracked in local
      state; `selectReport()` always updates the URL.
- [ ] **3. Historical reports are frozen.** When `isHistorical === true`, no mutations;
      `submitEngagement()` / `saveDraft()` are hard no-ops; amber banner shows.
- [ ] **4. Plan column == `engagement.findings` status.** Findings table and plan column
      both read from `engagement.findings` only — one source, always in sync.
- [ ] **5. Cumulative KPI never freezes.** `computeCumulative(engagementsById)` runs fresh
      every render, on every report including historical ones.

## Conventions (AGENTS.md §4)

- [ ] Stack unchanged — no new state library, router, or styling system.
- [ ] No new top-level directories under `src/`; existing structure reused.
- [ ] Naming respected: `*.route.tsx`, `*Context.tsx`, `use*()`, `PascalCase` types,
      `camelCase` state, `SCREAMING_SNAKE_CASE` constants.
- [ ] No hardcoded data in routes — data comes from context or fixtures.
- [ ] `ReportContext` reads from `useClient()` (the client registry) — no direct imports from individual client fixture files.
- [ ] No new brand colors — violet primary, amber historical, emerald success, red risk.
- [ ] Commit messages follow the `[FEATURE]` format in AGENTS.md §4.
- [ ] **CI scope respected.** GitHub Actions are allowed for *validation only* (AGENTS.md
      §4). Any workflow that deploys, holds secrets, or promotes a build needs a fresh
      recorded §4 amendment.

## Phase discipline (AGENTS.md §5)

- [ ] Phase 1 boundaries respected: front-end only on the mock adapter + fixtures; auth is
      **mocked, not missing**; backend changes (if any) stay behind `src/adapters/`.

---

**If every box is ticked, the PR honors the law.** If a box cannot be ticked, either fix
the work or, for a deliberate exception, record the decision in the PR and update the
relevant doc — never let the code and the law drift apart.
