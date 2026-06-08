# Architecture: GAS Anomaly Audit Portal

## System Overview

GAS Anomaly is a client-facing audit portal for Sage X3 ERP. Each annual audit run produces a **Report** containing a health score, leakage estimate, and ranked findings. The client views their report, builds a remediation plan (an **Engagement**), and submits it to the consultancy (Jera), who formalises it into an SLA.

**Stack:** React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + React Router 6 + TanStack Query 5 + Zustand + Radix UI

**Phase 1:** runs entirely on a local mock adapter — no real backend required for demo. The FastAPI backend slots in behind the adapter seam in Phase 2 with no view-layer rework.

---

## Report-Scoped Design Principle

Every screen in the app is scoped to **one selected report at a time**. Switch the report and the entire app rehydrates — KPIs, findings, engagement status, upload files. This is the Datadog time-window / Snyk scan-picker pattern.

The selected report lives in the URL as `?report=2026`. This makes it shareable, bookmarkable, and survivable across browser back/forward. `ReportContext` reads the URL param and distributes the selected report to every screen.

**Self-healing:** If a `<NavLink>` strips the `?report=` param (e.g. a bare `/findings` link), `ReportContext` detects the missing param and rewrites the URL from memory using `replace: true` — no flash, no history spam.

---

## ReportContext — Single Source of Truth

`src/features/audit/ReportContext.tsx`

Every route starts with:
```typescript
const { selectedReport, isHistorical, engagement, canEditEngagement } = useReport();
```

**Complete context API:**

```typescript
interface ReportContextValue {
  reports: AuditReport[];              // all reports, newest first
  selectedReport: AuditReport;
  selectedReportId: string;            // e.g. "2026"
  selectReport: (id: string) => void;  // updates ?report= in URL

  priorReport: AuditReport | null;     // chronological predecessor (null at baseline)
  priorEngagement: Engagement | null;  // prior cycle's plan (used for carry-over defaults)
  isBaseline: boolean;                 // true when no prior report exists
  isLatest: boolean;                   // true when selected is the newest report
  isHistorical: boolean;               // true when selected is NOT the newest report

  engagement: Engagement | null;       // plan for the selected report; null if none built yet
  engagementsById: Record<string, Engagement>;
  canEditEngagement: boolean;          // isLatest AND plan is none/draft
  submitEngagement: (input) => void;   // status → submitted; all screens update
  saveDraft: (input) => void;          // status → draft

  cumulative: CumulativeSummary;       // derived live every render, never cached

  selectedReportUploads: AuditUploadFile[];  // the 5 Sage X3 exports for this cycle

  reportSearch: string;                // "?report=2026" ready-made string
  linkWithReport: (path: string) => string; // appends ?report=ID to any path
}
```

**`canEditEngagement` exact logic:**
```typescript
canEditEngagement =
  isLatest &&
  (!engagement || engagement.status === "none" || engagement.status === "draft")
```
Once submitted — or on any historical report — the engagement is permanently read-only. No edit affordance exists anywhere in the UI.

**Mutation hard freeze guard:** `submitEngagement()` and `saveDraft()` both return early if `selectedReportId !== LATEST_REPORT_ID`. Historical mutations are impossible even if the UI guard were bypassed.

---

## Data Flow

```
URL (?report=2026)
        ↓
  ReportContext (reads URL, holds engagement session state)
        ↓
  useReport() in every route
        ↓
  selectedReport + engagement + cumulative → render
```

Mutations travel in reverse:
```
User action (submit, save draft)
        ↓
  submitEngagement() / saveDraft() in ReportContext
        ↓
  setEngagementsById (React state update)
        ↓
  All screens re-render with the updated plan simultaneously
```

---

## Screen-by-Screen Breakdown

### Dashboard (`/dashboard`)
- KPI strip: health score, leakage, open risks, cumulative total recovered
- Cumulative "total to date" card: computed fresh every render from `computeCumulative(engagementsById)` — never freezes when viewing historical reports
- YoY card: dark editorial card (deep indigo gradient `#1e1b4b → #2d2360 → #1a1744`) showing percentage improvement between `selectedReport.healthScore` and `priorReport.healthScore`
- Shows engagement outcome band when the selected report has a complete engagement

### Findings (`/findings`)
- 10 findings table for `selectedReport.findings`, ranked by severity and financial impact
- **Plan column:** appears when any engagement exists for the selected report; shows per-finding badge (`In plan / Skipped / Resolved / Regressed`)
- Plan column and findings table both read from `engagement.findings` — single source, always in sync
- Historical reports show amber banner in TopBar; table has no edit affordances

### Engagement (`/engagement`)

Three distinct views selected at route entry:
```typescript
if (canEditEngagement) return <EngagementBuilder />;       // live cycle, none/draft
if (engagement)        return <LockedEngagementView />;    // submitted/active/complete, or historical with plan
return                        <NoEngagementView />;        // historical, no plan recorded
```

**EngagementBuilder:** Client selects findings from a checkbox table, sets monthly hours + spread duration, and clicks "Submit to Jera". Calling `submitEngagement()` updates context — all screens update immediately. The builder re-renders as `LockedEngagementView` on the same navigation.

**Carry-over defaults:** When a prior cycle's engagement exists, the builder pre-selects findings that were `regressed` or `skipped` last cycle (findings marked `resolved` are excluded). User can override any default before submitting.

**LockedEngagementView:** Read-only. Shows plan summary donut chart, hour allocations, and for complete cycles: actual vs estimated savings and regression warnings. A lock notice explains why editing is unavailable (different message for historical vs submitted-current vs complete).

**NoEngagementView:** Defensive fallback — historical cycle with no recorded plan. Shows a read-only notice and a link back to Findings.

### Upload Centre (`/upload`)

Two modes, controlled by `?mode=new` and whether the selected report has uploads:

```typescript
const isNewAudit = searchParams.get("mode") === "new";
const isArchive  = uploads.length > 0 && !isNewAudit;
```

**Archive view** (`isArchive = true`): the selected cycle has completed uploads. Displays:
- `ArchiveStatusBar` — emerald shield badge, "N of N files validated", "Submission locked" chip
- `OutcomeBand` — violet gradient strip with health score, finding count, leakage estimate, and "View audit report" button
- 3-column `FileCard` grid — one card per Sage X3 export file (GL, AP, PO, Users, Workflows)

**Intake view** (`isArchive = false`): no uploads yet, or `?mode=new` is set. When `isNewCycle = true` (mode=new), the flow is:
1. `CycleLockBanner` — violet gradient strip with lock icon and emerald "Closed" chip; explains why the prior cycle is locked and when the next window opens
2. Section subheading — "2027 Annual Audit Setup" (year = `parseInt(selectedReport.shortLabel, 10) + 1`)
3. `ScriptDownloadCard` (Step 1 of 2) — download export scripts for Sage X3, indigo icon badge, "Download scripts v2.1" button
4. `ZipDropZone` (Step 2 of 2) — drag-and-drop `.zip` upload; animated `ExtractionTile` components appear one-by-one as files are unpacked; "Submit for audit" appears when all 5 pass
5. Violet gradient OR divider — "or run a mid-cycle check"
6. `AnomalySnapshotCard` — premium out-of-cycle anomaly scan; "Request Snapshot" CTA, pricing shown inline

"Run new audit" button in the archive header navigates to `/upload?report=2026&mode=new`.

### TopBar (`src/shell/TopBar.tsx`)

- **Report selector pill:** violet (`bg-violet-50 border-violet-400`) on latest; amber (`bg-amber-100 border-amber-400`) on historical
- **`mode=new` override:** when `?mode=new` is in the URL, the selector shows the next year and "New" instead of the current year and "Audit" — derived via `parseInt(selectedReport.shortLabel, 10) + 1`. This is upload-screen context, not a new report.
- **Historical amber banner:** shown below the header bar on every page when `isHistorical` is true. Shows cycle label and (for complete cycles) savings recovered vs planned.
- **Dropdown:** lists all reports with cycleLabel, health score, finding count, and engagement status badge

### Finding Detail (`/findings/:rank`)
- Reads `selectedReport.findings.find(f => f.rank === rank)`
- Fully report-scoped — switching the report changes the finding shown

### Login (`/login`)
- Full mocked auth flow: `LoginCard`, `Hero`, `MobileHero` components in `src/features/login/`
- `AuthPort` interface: `src/ports/auth.port.ts`
- Mock implementation: `src/adapters/mock/auth.mock.ts`
- Auth state: Zustand store at `src/state/authStore.ts`
- Public surface: `src/adapters/index.ts` — views import ONLY from here, never from `@/adapters/mock`

---

## Auth Architecture

Auth is mocked in Phase 1, not absent. The login screen and auth infrastructure are fully built.

```
src/features/login/      Hero, LoginCard, MobileHero (UI components)
src/routes/login.route.tsx    /login route
src/ports/auth.port.ts        AuthPort interface (the contract)
src/adapters/index.ts         public adapter surface (wraps current implementation)
src/adapters/mock/auth.mock.ts  Phase 1 mock implementation
src/state/authStore.ts        Zustand auth state
```

To wire a real backend in Phase 2:
1. Add `src/adapters/bff/auth.bff.ts` implementing `AuthPort`
2. Switch `CURRENT_ADAPTER` in `src/adapters/index.ts` (or set `VITE_ADAPTER=bff`)
3. Uncomment the proxy entry in `vite.config.ts`

No view-layer or router rework needed.

---

## Key Invariants (Non-Negotiable)

1. **Every screen calls `useReport()`** — no hardcoded fixture data in routes
2. **URL `?report=` is the source of truth** — `selectReport()` always updates the URL, never local state only
3. **Historical reports are frozen** — `canEditEngagement` is `false` on any non-latest report; `submitEngagement()` is a hard no-op off latest
4. **Plan column = `engagement.findings`** — single source; never derive finding status from a separate store
5. **Cumulative KPI never freezes** — `computeCumulative(engagementsById)` runs fresh every render regardless of which report is selected
6. **Engagement state is linear** — `none → draft → submitted → active → complete`; no reversals, no skipping steps
7. **Every internal nav link uses `linkWithReport(path)`** — to preserve `?report=ID` across navigation
8. **No edit affordance on historical** — `LockedEngagementView` and `NoEngagementView` have zero edit buttons; by design
9. **`mode=new` does not create a new report** — it is a URL flag that puts the upload screen in intake mode for the next cycle year; the report in context is still the current cycle
10. **Auth is mocked, not missing** — never describe auth as "future work"; the login screen, auth store, and adapter seam are all present
