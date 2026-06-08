# Data Model and State

All types and seed data live in one file: `src/features/audit/reports.fixture.ts`.
`src/features/audit/audit.fixture.ts` is a compatibility shim that re-exports from it. Do not import from the shim in new code.

---

## Core Types

### Enumerations

```typescript
type Severity         = "critical" | "high" | "medium" | "low";
type Category         = "controls" | "data_quality" | "leakage" | "efficiency";
type FindingStatus    = "open" | "in_progress" | "resolved" | "accepted_risk";
type ValidationState  = "pending" | "passed" | "failed";
type AuditStatus      = "awaiting_data" | "validating" | "running" | "complete" | "failed";

// Engagement lifecycle — the plan a client submits to the consultancy.
type EngagementStatus =
  | "none"       // audit done, no plan built yet
  | "draft"      // saved locally, not sent
  | "submitted"  // sent to Jera, awaiting SLA
  | "active"     // SLA signed, work in flight
  | "complete";  // cycle closed, actuals recorded

// Per-finding status WITHIN an engagement.
type EngagementFindingStatus =
  | "included"   // in the plan, work pending
  | "skipped"    // deliberately left out of this engagement
  | "resolved"   // fixed and verified
  | "regressed"; // was resolved, then re-appeared
```

---

## Entity Definitions

### AuditFinding

One finding from an audit run. Immutable per report — findings do not change between renders.

```typescript
interface AuditFinding {
  rank: number;            // 1–10+; lower = higher priority
  title: string;
  severity: Severity;
  category: Category;
  financialImpact: number; // ZAR leakage attributed to this finding
  estimatedHours: number;  // remediation effort in hours
  recommendedFix: string;
  ownerRole: string;
  status: FindingStatus;   // current remediation status of the finding itself
}
```

### EngagementFinding

A finding's status within a specific engagement plan.

```typescript
interface EngagementFinding {
  findingRank: number;
  status: EngagementFindingStatus;
  estimatedImpact: number;   // ZAR expected to be recovered
  actualImpact?: number;     // ZAR actually recovered — only set on complete cycles
}
```

### Engagement

The remediation plan the client builds and submits to Jera for one audit cycle.

```typescript
interface Engagement {
  reportId: string;
  status: EngagementStatus;
  submittedAt?: string;             // ISO — set on submit
  improvementHoursPerMonth: number; // proactive improvement work per month
  supportHoursPerMonth: number;     // reactive support hours per month
  months: number;                   // duration of the engagement (3/6/9/12)
  estimatedSavings: number;         // sum of included findings' estimatedImpact
  actualSavings?: number;           // sum of actualImpact — set on complete
  findings: EngagementFinding[];    // one entry per finding in the report
}
```

**State machine:**
```
none → draft → submitted → active → complete
```
No reversals. No skipping steps.

### AuditUploadFile

One of the five Sage X3 export files submitted for an audit cycle.

```typescript
interface AuditUploadFile {
  fileType: "gl" | "ap" | "po" | "users" | "workflows";
  fileTypeLabel: string;           // e.g. "General Ledger"
  fileTypeDescription: string;     // explains what the file contains
  filename: string;                // actual filename
  rows: number;
  sizeBytes: number;
  state: ValidationState;          // always "passed" for completed cycles
  submittedAt: string;             // ISO — when the file was validated
}
```

### AuditReport

One complete audit cycle. Immutable once created.

```typescript
interface AuditReport {
  id: string;               // bare year string: "2024", "2025", "2026"
  shortLabel: string;       // same as id — used for the selector pill, e.g. "2026"
  cycleLabel: string;       // full label, e.g. "2026 Annual Audit"
  status: AuditStatus;
  completedAt: string;      // ISO date
  healthScore: number;      // 0–100
  leakageEstimate: number;  // ZAR total leakage identified
  leakageRecoverable: number;
  risks: Record<Severity, number>; // count per severity level
  findings: AuditFinding[];
  uploadSubmittedAt: string; // when the client submitted the data batch
  uploads: AuditUploadFile[]; // the five Sage X3 export files
}
```

**Critical:** `shortLabel` is a bare year string (`"2026"`), not `"2026 Audit"`. The upload screen derives the next cycle year via `parseInt(selectedReport.shortLabel, 10) + 1`.

### CumulativeSummary

Aggregated metrics across all completed engagements. Always derived fresh — never stored.

```typescript
interface CumulativeSummary {
  cyclesCompleted: number;
  totalRecovered: number;          // sum of actualSavings across all complete engagements
  totalEstimated: number;          // sum of estimatedSavings across all complete engagements
  totalFindingsResolved: number;
  totalFindingsRegressed: number;
  healthGain: number;              // latest healthScore - earliest healthScore
}
```

Computed by `computeCumulative(engagementsById)` in `ReportContext`. Runs on every render.

---

## Seed Data

Three reports covering 2024–2026. All in `REPORTS` and `SEED_ENGAGEMENTS` in `reports.fixture.ts`.

### Reports

| id | shortLabel | cycleLabel | healthScore | leakageEstimate | Status |
|----|-----------|------------|-------------|-----------------|--------|
| "2024" | "2024" | "2024 Baseline Audit" | 51 | R920K | complete |
| "2025" | "2025" | "2025 Annual Audit" | 62 | R720K | complete |
| "2026" | "2026" | "2026 Annual Audit" | 74 | R480K | complete |

### Engagements (SEED_ENGAGEMENTS)

| Report | Engagement Status | Notes |
|--------|------------------|-------|
| "2024" | complete | 1 regressed finding (rank 3, R68K not realised) |
| "2025" | complete | 1 regressed finding (rank 5, R42K not realised) |
| "2026" | absent (null) | Live cycle — client builds it on the Engagement screen |

The 2026 report has no entry in `SEED_ENGAGEMENTS`. `engagementsById["2026"]` returns `undefined`, so `engagement` from `useReport()` is `null` for the current cycle.

### Client Info

```typescript
const CLIENT_INFO = {
  name: "Tourvest Travel Group",
  healthTarget: 80,
};
```

### Exported Constants and Functions

```typescript
export const REPORTS: AuditReport[];        // oldest first
export const REPORTS_DESC: AuditReport[];   // newest first (used by the selector)
export const LATEST_REPORT_ID: string;      // "2026"
export const SEED_ENGAGEMENTS: Record<string, Engagement>;

export function priorReportOf(id: string): AuditReport | null;
export function computeCumulative(engagementsById: Record<string, Engagement>): CumulativeSummary;
export function totalRisks(r: Record<Severity, number>): number;
export function severeRisks(r: Record<Severity, number>): number;
```

---

## State Architecture

### Engagement State (Session Only)

Engagements are held in React state inside `ReportContext`, seeded from `SEED_ENGAGEMENTS` on first render. Mutations via `submitEngagement()` and `saveDraft()` update this state. There is no localStorage, no IndexedDB — state resets on page refresh.

```typescript
const [engagementsById, setEngagementsById] = React.useState<Record<string, Engagement>>(
  () => ({ ...SEED_ENGAGEMENTS })
);
```

### Report Selection (URL-Driven)

```typescript
const urlReportId = searchParams.get("report");
// Self-heal: if URL loses the param, rememberedReportId restores it
const selectedReportId = isValidReport(urlReportId) ? urlReportId : rememberedReportId;
```

### Auth State (Zustand)

```typescript
// src/state/authStore.ts
// Managed via Zustand. Populated by the mock auth adapter.
```

---

## Immutable Rules

1. **`shortLabel` is a bare year string** — `"2026"`, not `"2026 Audit"`. Never use it as a full label.
2. **`id` equals `shortLabel`** — e.g. `id: "2026"`, `shortLabel: "2026"`.
3. **Engagements are indexed by report id** — `engagementsById["2026"]` maps to the 2026 plan.
4. **`CumulativeSummary` uses `cyclesCompleted`** — not `cycleCount`. The field is `cyclesCompleted`.
5. **The 2026 engagement is intentionally absent** — `SEED_ENGAGEMENTS` has no `"2026"` key. This is correct: the live cycle starts with no plan.
6. **All fixture data is in `reports.fixture.ts`** — there is no separate `engagements.fixture.ts`.
7. **`EngagementFinding.actualImpact` is optional** — only set for complete cycles. A skipped finding has no `actualImpact`.
