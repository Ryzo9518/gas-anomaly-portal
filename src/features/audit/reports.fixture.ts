// ============================================================================
// REPORTS FIXTURE — the report-scoped data model for the GAS audit portal.
//
// THE MENTAL MODEL
//   • Each audit cycle produces ONE AuditReport (findings + KPI snapshot).
//   • Each report MAY have ONE Engagement (the remediation plan the client
//     builds and submits to Jera). An engagement moves through:
//       none → draft → submitted → active → complete
//   • When an engagement completes, each EngagementFinding gains an
//     `actualImpact` so we can show ESTIMATED vs ACTUAL recovery, and flag
//     any finding that REGRESSED (was resolved, then came back).
//   • CumulativeSummary is DERIVED, never stored — it sums actuals across
//     every completed engagement (the "total recovered to date" number).
//
// EVERY SCREEN reads the SELECTED report from ReportContext. Switch the
// report → the whole app rehydrates. Historical reports are frozen.
// ============================================================================

// ── Shared enums (single source — audit.fixture.ts re-exports these) ────────

export type Severity = "critical" | "high" | "medium" | "low";
export type Category = "controls" | "data_quality" | "leakage" | "efficiency";
export type FindingStatus = "open" | "in_progress" | "resolved" | "accepted_risk";
export type ValidationState = "pending" | "passed" | "failed";
export type AuditStatus =
  | "awaiting_data"
  | "validating"
  | "running"
  | "complete"
  | "failed";

// Engagement lifecycle — the plan a client submits to the consultancy.
export type EngagementStatus =
  | "none"       // audit done, no plan built yet (the current cycle)
  | "draft"      // saved locally, not sent
  | "submitted"  // sent to Jera, awaiting SLA
  | "active"     // SLA signed, work in flight
  | "complete";  // cycle closed, actuals recorded

// Per-finding status WITHIN an engagement (drives the findings-table overlay).
export type EngagementFindingStatus =
  | "included"   // in the plan, work pending
  | "skipped"    // deliberately left out of this engagement
  | "resolved"   // fixed and verified
  | "regressed"; // was resolved, then re-appeared — flagged

// ── Entities ────────────────────────────────────────────────────────────────

export interface AuditFinding {
  rank: number;
  title: string;
  severity: Severity;
  category: Category;
  financialImpact: number; // ZAR
  estimatedHours: number;
  recommendedFix: string;
  ownerRole: string;
  status: FindingStatus;
}

export interface EngagementFinding {
  findingRank: number;
  status: EngagementFindingStatus;
  estimatedImpact: number;        // ZAR we expected to recover
  actualImpact?: number;          // ZAR actually recovered (complete cycles only)
}

export interface Engagement {
  reportId: string;
  status: EngagementStatus;
  submittedAt?: string;            // ISO — set on submit
  improvementHoursPerMonth: number;
  supportHoursPerMonth: number;
  months: number;
  estimatedSavings: number;        // sum of included estimatedImpact
  actualSavings?: number;          // sum of actualImpact (complete cycles)
  findings: EngagementFinding[];
}

// One upload entry per Sage X3 export file submitted for an audit cycle.
export interface AuditUploadFile {
  fileType: "gl" | "ap" | "po" | "users" | "workflows";
  fileTypeLabel: string;
  fileTypeDescription: string;
  filename: string;
  rows: number;
  sizeBytes: number;
  state: ValidationState; // always "passed" for completed audit cycles
  submittedAt: string;    // ISO — when this file was validated and ingested
}

export interface AuditReport {
  id: string;
  shortLabel: string;              // for the selector pill, e.g. "2026"
  cycleLabel: string;              // full label, e.g. "2026 Annual Audit"
  status: AuditStatus;
  completedAt: string;             // ISO date
  healthScore: number;
  leakageEstimate: number;
  leakageRecoverable: number;
  risks: Record<Severity, number>;
  findings: AuditFinding[];
  uploadSubmittedAt: string;       // when the client submitted the data batch to Jera
  uploads: AuditUploadFile[];      // the five Sage X3 exports for this cycle
}

// Zero-value sentinel for a client that has NO audit reports yet (a just-created
// client before its data is loaded). ReportContext substitutes this so the app
// never crashes dereferencing a missing report; screens that would show it are
// gated behind `hasReports` and render an empty state instead. Compile-checked
// against AuditReport, so a shape change here surfaces immediately.
export const EMPTY_REPORT: AuditReport = {
  id: "",
  shortLabel: "",
  cycleLabel: "",
  status: "awaiting_data",
  completedAt: "",
  healthScore: 0,
  leakageEstimate: 0,
  leakageRecoverable: 0,
  risks: { critical: 0, high: 0, medium: 0, low: 0 },
  findings: [],
  uploadSubmittedAt: "",
  uploads: [],
};

export interface CumulativeSummary {
  cyclesCompleted: number;
  totalRecovered: number;          // sum of actualSavings across complete engagements
  totalEstimated: number;          // sum of estimatedSavings across complete engagements
  totalFindingsResolved: number;
  totalFindingsRegressed: number;
  healthGain: number;              // latest healthScore − earliest healthScore
}

// ── Client identity ──────────────────────────────────────────────────────────

export const CLIENT_INFO = {
  name: "Tourvest Travel Group",
  healthTarget: 80,
};

// ============================================================================
// THE THREE REPORTS  (oldest → newest; selector renders newest first)
// Story:  Health 51 → 62 → 74 · Leakage R920K → R720K → R480K
// ============================================================================

// ── 2024 · BASELINE — first audit, the worst state ──────────────────────────
const FINDINGS_2024: AuditFinding[] = [
  {
    rank: 1,
    title: "No segregation of duties across the AP module",
    severity: "critical", category: "controls",
    financialImpact: 180_000, estimatedHours: 32,
    recommendedFix: "Split invoice creation and approval roles. Enforce a role-based workflow lock.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 2,
    title: "Duplicate vendor records sharing bank details",
    severity: "critical", category: "data_quality",
    financialImpact: 95_000, estimatedHours: 32,
    recommendedFix: "Merge duplicate vendors keyed on bank account. Add a uniqueness constraint.",
    ownerRole: "AP Lead", status: "resolved",
  },
  {
    rank: 3,
    title: "PO approval thresholds bypassed via journal entries",
    severity: "critical", category: "controls",
    financialImpact: 68_000, estimatedHours: 24,
    recommendedFix: "Lock journals over R50K behind secondary approval. Audit historic back-dating.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 4,
    title: "Dormant user accounts retaining active permissions",
    severity: "high", category: "controls",
    financialImpact: 0, estimatedHours: 16,
    recommendedFix: "Deactivate accounts idle 90+ days. Schedule a quarterly access review.",
    ownerRole: "IT Lead", status: "resolved",
  },
  {
    rank: 5,
    title: "GL account 4100 mixing multiple expense categories",
    severity: "high", category: "data_quality",
    financialImpact: 42_000, estimatedHours: 16,
    recommendedFix: "Split 4100 into dedicated child accounts. Reclassify trailing 12 months.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 6,
    title: "Vendor payment terms inconsistent across the master",
    severity: "high", category: "efficiency",
    financialImpact: 38_000, estimatedHours: 16,
    recommendedFix: "Standardise on Net 30 unless contractually overridden. Back-fill records.",
    ownerRole: "AP Lead", status: "resolved",
  },
  {
    rank: 7,
    title: "Manual bank reconciliations with no maker-checker",
    severity: "high", category: "controls",
    financialImpact: 55_000, estimatedHours: 20,
    recommendedFix: "Introduce a maker-checker step on every reconciliation over R25K.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 8,
    title: "PO receipt confirmations missing on 21% of POs",
    severity: "medium", category: "efficiency",
    financialImpact: 22_000, estimatedHours: 8,
    recommendedFix: "Auto-reminder on POs unconfirmed after 14 days. Escalate after 30.",
    ownerRole: "Procurement", status: "in_progress",
  },
  {
    rank: 9,
    title: "Foreign currency revaluation runs intermittently",
    severity: "medium", category: "data_quality",
    financialImpact: 18_000, estimatedHours: 8,
    recommendedFix: "Make month-end FX revaluation a mandatory workflow step.",
    ownerRole: "Finance Manager", status: "in_progress",
  },
  {
    rank: 10,
    title: "Training records not linked to access provisioning",
    severity: "medium", category: "controls",
    financialImpact: 0, estimatedHours: 8,
    recommendedFix: "Gate module access behind training completion. Back-fill existing users.",
    ownerRole: "IT Lead", status: "open",
  },
  {
    rank: 11,
    title: "CFO dashboards built on cached overnight data",
    severity: "low", category: "efficiency",
    financialImpact: 17_000, estimatedHours: 4,
    recommendedFix: "Move dashboards to a live source; keep a snapshot for board-pack parity.",
    ownerRole: "IT Lead", status: "open",
  },
];

// ── 2025 · YEAR ONE — improvement underway ──────────────────────────────────
const FINDINGS_2025: AuditFinding[] = [
  {
    rank: 1,
    title: "Residual SoD overlap on two AP approver accounts",
    severity: "high", category: "controls",
    financialImpact: 120_000, estimatedHours: 24,
    recommendedFix: "Remove the remaining dual-role grants and lock via workflow.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 2,
    title: "New duplicate vendors created since the last merge",
    severity: "high", category: "data_quality",
    financialImpact: 95_000, estimatedHours: 20,
    recommendedFix: "Run the dedup job monthly; enforce the bank-detail constraint at entry.",
    ownerRole: "AP Lead", status: "resolved",
  },
  {
    rank: 3,
    title: "Journal back-dating still possible in prior period",
    severity: "high", category: "controls",
    financialImpact: 68_000, estimatedHours: 16,
    recommendedFix: "Hard-close prior periods; require CFO sign-off to reopen.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 4,
    title: "Access reviews completed late in two quarters",
    severity: "medium", category: "controls",
    financialImpact: 0, estimatedHours: 12,
    recommendedFix: "Automate the review schedule with escalation reminders.",
    ownerRole: "IT Lead", status: "resolved",
  },
  {
    rank: 5,
    title: "Expense reclassification on 4100 regressed",
    severity: "high", category: "data_quality",
    financialImpact: 42_000, estimatedHours: 16,
    recommendedFix: "Re-apply the child-account split; lock 4100 against direct postings.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 6,
    title: "Early-payment discounts missed on 30% of invoices",
    severity: "high", category: "leakage",
    financialImpact: 50_000, estimatedHours: 16,
    recommendedFix: "Flag discount-eligible invoices in the AP queue; prioritise by deadline.",
    ownerRole: "AP Lead", status: "resolved",
  },
  {
    rank: 7,
    title: "PO receipt confirmations still missing on 9% of POs",
    severity: "medium", category: "efficiency",
    financialImpact: 22_000, estimatedHours: 8,
    recommendedFix: "Tighten the auto-reminder window to 7 days.",
    ownerRole: "Procurement", status: "resolved",
  },
  {
    rank: 8,
    title: "FX revaluation owner not formally assigned",
    severity: "medium", category: "data_quality",
    financialImpact: 18_000, estimatedHours: 8,
    recommendedFix: "Name a permanent owner; add the step to the month-end checklist.",
    ownerRole: "Finance Manager", status: "resolved",
  },
  {
    rank: 9,
    title: "Training-gate not enforced for contractors",
    severity: "medium", category: "controls",
    financialImpact: 0, estimatedHours: 8,
    recommendedFix: "Extend the training gate to contractor onboarding.",
    ownerRole: "IT Lead", status: "open",
  },
  {
    rank: 10,
    title: "Board-pack snapshot drifts from live numbers",
    severity: "low", category: "efficiency",
    financialImpact: 17_000, estimatedHours: 4,
    recommendedFix: "Stamp every snapshot with its source timestamp.",
    ownerRole: "IT Lead", status: "open",
  },
];

// ── 2026 · CURRENT — fresh audit, engagement not yet built ───────────────────
// (Identical to the array the dashboard has been polished against.)
const FINDINGS_2026: AuditFinding[] = [
  {
    rank: 1,
    title: "Segregation of duties conflict in AP module",
    severity: "critical", category: "controls",
    financialImpact: 180_000, estimatedHours: 32,
    recommendedFix:
      "Split invoice creation and approval roles across 3 users currently holding both. Enforce via role-based workflow lock.",
    ownerRole: "Finance Manager", status: "open",
  },
  {
    rank: 2,
    title: "Duplicate vendor records with shared bank details",
    severity: "critical", category: "data_quality",
    financialImpact: 95_000, estimatedHours: 32,
    recommendedFix:
      "Merge 7 duplicate vendor records identified by matching bank account numbers. Add uniqueness constraint on the bank-details field.",
    ownerRole: "AP Lead", status: "open",
  },
  {
    rank: 3,
    title: "PO approval thresholds bypassed via journal entries",
    severity: "high", category: "controls",
    financialImpact: 68_000, estimatedHours: 16,
    recommendedFix:
      "Add a workflow lock on journals over R50K requiring secondary approval. Audit historic journals for back-dating patterns.",
    ownerRole: "Finance Manager", status: "in_progress",
  },
  {
    rank: 4,
    title: "Dormant user accounts with active permissions",
    severity: "high", category: "controls",
    financialImpact: 0, estimatedHours: 16,
    recommendedFix:
      "Deactivate 18 user accounts inactive for more than 90 days. Schedule a quarterly access-review workflow.",
    ownerRole: "IT Lead", status: "in_progress",
  },
  {
    rank: 5,
    title: "GL account 4100 used for multiple expense categories",
    severity: "high", category: "data_quality",
    financialImpact: 42_000, estimatedHours: 16,
    recommendedFix:
      "Split 4100 into dedicated child accounts (Travel, Marketing, Office). Reclassify the trailing 12 months.",
    ownerRole: "Finance Manager", status: "open",
  },
  {
    rank: 6,
    title: "Invoice payment terms inconsistent across vendors",
    severity: "high", category: "efficiency",
    financialImpact: 38_000, estimatedHours: 16,
    recommendedFix:
      "Standardise on Net 30 unless contractually overridden. Update vendor master defaults and back-fill existing records.",
    ownerRole: "AP Lead", status: "open",
  },
  {
    rank: 7,
    title: "PO receipt confirmations missing on 12% of POs",
    severity: "medium", category: "efficiency",
    financialImpact: 22_000, estimatedHours: 8,
    recommendedFix:
      "Auto-reminder workflow on POs unconfirmed after 14 days. Escalate to procurement lead after 30 days.",
    ownerRole: "Procurement", status: "open",
  },
  {
    rank: 8,
    title: "Foreign currency revaluation runs intermittently",
    severity: "medium", category: "data_quality",
    financialImpact: 18_000, estimatedHours: 8,
    recommendedFix:
      "Schedule month-end FX revaluation as a mandatory workflow step. Owner: Finance Manager.",
    ownerRole: "Finance Manager", status: "in_progress",
  },
  {
    rank: 9,
    title: "User training records not linked to access provisioning",
    severity: "medium", category: "controls",
    financialImpact: 0, estimatedHours: 8,
    recommendedFix:
      "Add a training-complete gate before granting module access. Back-fill records for existing users.",
    ownerRole: "IT Lead", status: "open",
  },
  {
    rank: 10,
    title: "Reporting workflows trigger off cached overnight data",
    severity: "low", category: "efficiency",
    financialImpact: 17_000, estimatedHours: 4,
    recommendedFix:
      "Move CFO dashboards to a live data source. Keep cached snapshot for board-pack consistency only.",
    ownerRole: "IT Lead", status: "open",
  },
];

// ── Per-cycle upload manifests ───────────────────────────────────────────────
// Each cycle's five Sage X3 exports — what the client submitted before the audit ran.
// Descriptions are shared across cycles (same file types, same requirements).

const _D = {
  gl:        "Transaction-level export covering all journal entries, account codes, and debit/credit splits. Used to detect backdating patterns, reclassification anomalies, and GL-to-AP reconciliation gaps.",
  ap:        "Vendor master and payable transactions. Validates payment terms compliance, flags duplicate vendor bank accounts, and detects split invoicing that bypasses PO approval thresholds.",
  po:        "Purchase order headers and line items. Cross-referenced against GL and AP to validate the 3-way match and identify POs with missing or late receipt confirmations.",
  users:     "User account roster with role and department assignments. Scanned for dormant accounts, SoD conflicts, and access grants that exceed the user's defined role scope.",
  workflows: "Approval chain definitions and threshold configurations. Validates that approval limits match policy and that no workflows have been modified to bypass controls.",
} as const;

const UPLOADS_2024: AuditUploadFile[] = [
  { fileType: "gl",        fileTypeLabel: "General Ledger",   fileTypeDescription: _D.gl,        filename: "GL_2024_Annual.csv",   rows: 94_231, sizeBytes: 15_834_112, state: "passed", submittedAt: "2024-04-01" },
  { fileType: "ap",        fileTypeLabel: "Accounts Payable", fileTypeDescription: _D.ap,        filename: "AP_2024_Annual.csv",   rows: 15_432, sizeBytes: 2_876_544,  state: "passed", submittedAt: "2024-04-01" },
  { fileType: "po",        fileTypeLabel: "Purchase Orders",  fileTypeDescription: _D.po,        filename: "PO_2024_Annual.csv",   rows: 11_203, sizeBytes: 1_245_678,  state: "passed", submittedAt: "2024-04-01" },
  { fileType: "users",     fileTypeLabel: "Users & Roles",    fileTypeDescription: _D.users,     filename: "Users_2024.csv",        rows: 523,    sizeBytes: 178_432,    state: "passed", submittedAt: "2024-04-01" },
  { fileType: "workflows", fileTypeLabel: "Workflows",        fileTypeDescription: _D.workflows, filename: "Workflows_2024.csv",    rows: 118,    sizeBytes: 65_234,     state: "passed", submittedAt: "2024-04-01" },
];

const UPLOADS_2025: AuditUploadFile[] = [
  { fileType: "gl",        fileTypeLabel: "General Ledger",   fileTypeDescription: _D.gl,        filename: "GL_2025_Annual.csv",   rows: 91_087, sizeBytes: 15_134_567, state: "passed", submittedAt: "2025-03-24" },
  { fileType: "ap",        fileTypeLabel: "Accounts Payable", fileTypeDescription: _D.ap,        filename: "AP_2025_Annual.csv",   rows: 13_892, sizeBytes: 2_567_432,  state: "passed", submittedAt: "2025-03-24" },
  { fileType: "po",        fileTypeLabel: "Purchase Orders",  fileTypeDescription: _D.po,        filename: "PO_2025_Annual.csv",   rows: 9_941,  sizeBytes: 1_102_345,  state: "passed", submittedAt: "2025-03-24" },
  { fileType: "users",     fileTypeLabel: "Users & Roles",    fileTypeDescription: _D.users,     filename: "Users_2025.csv",        rows: 501,    sizeBytes: 167_890,    state: "passed", submittedAt: "2025-03-24" },
  { fileType: "workflows", fileTypeLabel: "Workflows",        fileTypeDescription: _D.workflows, filename: "Workflows_2025.csv",    rows: 131,    sizeBytes: 71_234,     state: "passed", submittedAt: "2025-03-24" },
];

const UPLOADS_2026: AuditUploadFile[] = [
  { fileType: "gl",        fileTypeLabel: "General Ledger",   fileTypeDescription: _D.gl,        filename: "GL_2026Q1.csv",         rows: 87_432, sizeBytes: 14_234_112, state: "passed", submittedAt: "2026-03-28" },
  { fileType: "ap",        fileTypeLabel: "Accounts Payable", fileTypeDescription: _D.ap,        filename: "AP_2026Q1.csv",         rows: 12_341, sizeBytes: 2_345_678,  state: "passed", submittedAt: "2026-03-28" },
  { fileType: "po",        fileTypeLabel: "Purchase Orders",  fileTypeDescription: _D.po,        filename: "PO_2026Q1.csv",         rows: 8_932,  sizeBytes: 1_023_456,  state: "passed", submittedAt: "2026-03-28" },
  { fileType: "users",     fileTypeLabel: "Users & Roles",    fileTypeDescription: _D.users,     filename: "Users.csv",             rows: 487,    sizeBytes: 156_789,    state: "passed", submittedAt: "2026-03-28" },
  { fileType: "workflows", fileTypeLabel: "Workflows",        fileTypeDescription: _D.workflows, filename: "Workflows.csv",         rows: 142,    sizeBytes: 78_945,     state: "passed", submittedAt: "2026-03-28" },
];

export const REPORTS: AuditReport[] = [
  {
    id: "2024",
    shortLabel: "2024",
    cycleLabel: "2024 Baseline Audit",
    status: "complete",
    completedAt: "2024-04-10",
    healthScore: 51,
    leakageEstimate: 920_000,
    leakageRecoverable: 610_000,
    risks: { critical: 7, high: 8, medium: 5, low: 3 },
    findings: FINDINGS_2024,
    uploadSubmittedAt: "2024-04-01",
    uploads: UPLOADS_2024,
  },
  {
    id: "2025",
    shortLabel: "2025",
    cycleLabel: "2025 Annual Audit",
    status: "complete",
    completedAt: "2025-04-08",
    healthScore: 62,
    leakageEstimate: 720_000,
    leakageRecoverable: 480_000,
    risks: { critical: 5, high: 6, medium: 4, low: 2 },
    findings: FINDINGS_2025,
    uploadSubmittedAt: "2025-03-24",
    uploads: UPLOADS_2025,
  },
  {
    id: "2026",
    shortLabel: "2026",
    cycleLabel: "2026 Annual Audit",
    status: "complete",
    completedAt: "2026-04-12",
    healthScore: 74,
    leakageEstimate: 480_000,
    leakageRecoverable: 320_000,
    risks: { critical: 2, high: 4, medium: 3, low: 1 },
    findings: FINDINGS_2026,
    uploadSubmittedAt: "2026-03-28",
    uploads: UPLOADS_2026,
  },
];

// Newest first — used by the selector and "latest report" logic.
export const REPORTS_DESC: AuditReport[] = [...REPORTS].sort(
  (a, b) => b.completedAt.localeCompare(a.completedAt),
);

export const LATEST_REPORT_ID = REPORTS_DESC[0].id;

// ============================================================================
// SEED ENGAGEMENTS
//   2024  → complete, with a REGRESSION (rank 3 came back: R68K not realised)
//   2025  → complete, clean recovery
//   2026  → NONE (the live cycle the client builds on the Engagement page)
// ============================================================================

const ENGAGEMENT_2024_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved",  estimatedImpact: 180_000, actualImpact: 165_000 },
  { findingRank: 2, status: "resolved",  estimatedImpact: 95_000,  actualImpact: 88_000 },
  { findingRank: 3, status: "regressed", estimatedImpact: 68_000,  actualImpact: 0 },
  { findingRank: 4, status: "resolved",  estimatedImpact: 0,       actualImpact: 0 },
  { findingRank: 5, status: "resolved",  estimatedImpact: 42_000,  actualImpact: 38_000 },
  { findingRank: 6, status: "resolved",  estimatedImpact: 38_000,  actualImpact: 21_000 },
  { findingRank: 7, status: "resolved",  estimatedImpact: 55_000,  actualImpact: 0 }, // partial loss
  // ranks 8–11 deliberately left out of the 2024 plan:
  { findingRank: 8,  status: "skipped",  estimatedImpact: 22_000 },
  { findingRank: 9,  status: "skipped",  estimatedImpact: 18_000 },
  { findingRank: 10, status: "skipped",  estimatedImpact: 0 },
  { findingRank: 11, status: "skipped",  estimatedImpact: 17_000 },
];

const ENGAGEMENT_2025_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved",  estimatedImpact: 120_000, actualImpact: 118_000 },
  { findingRank: 2, status: "resolved",  estimatedImpact: 95_000,  actualImpact: 92_000 },
  { findingRank: 3, status: "resolved",  estimatedImpact: 68_000,  actualImpact: 60_000 },
  { findingRank: 4, status: "resolved",  estimatedImpact: 0,       actualImpact: 0 },
  { findingRank: 5, status: "regressed", estimatedImpact: 42_000,  actualImpact: 0 },
  { findingRank: 6, status: "resolved",  estimatedImpact: 50_000,  actualImpact: 48_000 },
  { findingRank: 7, status: "resolved",  estimatedImpact: 22_000,  actualImpact: 22_000 },
  { findingRank: 8, status: "resolved",  estimatedImpact: 18_000,  actualImpact: 18_000 },
  // ranks 9–10 skipped:
  { findingRank: 9,  status: "skipped",  estimatedImpact: 0 },
  { findingRank: 10, status: "skipped",  estimatedImpact: 17_000 },
];

function sumEst(fs: EngagementFinding[]): number {
  return fs.filter((f) => f.status !== "skipped").reduce((s, f) => s + f.estimatedImpact, 0);
}
function sumAct(fs: EngagementFinding[]): number {
  return fs.reduce((s, f) => s + (f.actualImpact ?? 0), 0);
}

export const SEED_ENGAGEMENTS: Record<string, Engagement> = {
  "2024": {
    reportId: "2024",
    status: "complete",
    submittedAt: "2024-05-02",
    improvementHoursPerMonth: 28,
    supportHoursPerMonth: 16,
    months: 6,
    estimatedSavings: sumEst(ENGAGEMENT_2024_FINDINGS),
    actualSavings: sumAct(ENGAGEMENT_2024_FINDINGS),
    findings: ENGAGEMENT_2024_FINDINGS,
  },
  "2025": {
    reportId: "2025",
    status: "complete",
    submittedAt: "2025-05-06",
    improvementHoursPerMonth: 22,
    supportHoursPerMonth: 16,
    months: 9,
    estimatedSavings: sumEst(ENGAGEMENT_2025_FINDINGS),
    actualSavings: sumAct(ENGAGEMENT_2025_FINDINGS),
    findings: ENGAGEMENT_2025_FINDINGS,
  },
  // "2026" intentionally absent → engagement === null → client builds it live.
};

// ============================================================================
// DERIVATIONS / HELPERS
// ============================================================================

export function totalRisks(r: Record<Severity, number>): number {
  return r.critical + r.high + r.medium + r.low;
}

export function severeRisks(r: Record<Severity, number>): number {
  return r.critical + r.high;
}

