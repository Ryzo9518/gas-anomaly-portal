// ============================================================================
// REPORTS FIXTURE — ASSET MANAGEMENT demo client (Meridian Capital Partners).
//
// Mirrors the shape and conventions of reports.fixture.ts (Tourvest) exactly —
// three cycles oldest→newest, one live (2026) engagement the client builds,
// two historical complete engagements (one with a regression). Findings are
// grounded in the real GAS X3 control audit: intercompany leakage, suspense /
// clearing balances, SoD on AP, management-fee revenue oversight, dormant
// high-privilege accounts, Benford anomalies on GL.
//
//   Story:  Health 48 → 60 → 71 · Leakage R1.40M → R0.98M → R0.64M
// ============================================================================

import type {
  AuditFinding,
  AuditReport,
  AuditUploadFile,
  Engagement,
  EngagementFinding,
} from "@/features/audit/reports.fixture";

// ── Client identity ──────────────────────────────────────────────────────────
export const CLIENT_INFO = {
  name: "Meridian Capital Partners",
  healthTarget: 82,
};

// ── Shared upload sets (the five Sage X3 exports per cycle) ──────────────────
function uploads(year: string, submitted: string): AuditUploadFile[] {
  return [
    { fileType: "gl", fileTypeLabel: "General Ledger", fileTypeDescription: "GACCENTRY / GACCENTRYD journal lines", filename: `meridian_gl_${year}.csv`, rows: 184_322, sizeBytes: 41_200_000, state: "passed", submittedAt: submitted },
    { fileType: "ap", fileTypeLabel: "Accounts Payable", fileTypeDescription: "BPSUPPLIER + PINVOICE open items", filename: `meridian_ap_${year}.csv`, rows: 22_104, sizeBytes: 6_900_000, state: "passed", submittedAt: submitted },
    { fileType: "po", fileTypeLabel: "Purchase Orders", fileTypeDescription: "PORDER / PORDERQ commitment lines", filename: `meridian_po_${year}.csv`, rows: 9_842, sizeBytes: 3_100_000, state: "passed", submittedAt: submitted },
    { fileType: "users", fileTypeLabel: "User & Access", fileTypeDescription: "AUTILIS menu × function profiles", filename: `meridian_users_${year}.csv`, rows: 318, sizeBytes: 240_000, state: "passed", submittedAt: submitted },
    { fileType: "workflows", fileTypeLabel: "Workflow & Approvals", fileTypeDescription: "AWRKHISTO approval trail", filename: `meridian_wf_${year}.csv`, rows: 14_550, sizeBytes: 2_400_000, state: "passed", submittedAt: submitted },
  ];
}

// ── 2024 · BASELINE — first audit, worst state ───────────────────────────────
const FINDINGS_2024: AuditFinding[] = [
  { rank: 1, title: "Intercompany leakage — same vendor paid by multiple legal entities", severity: "critical", category: "leakage", financialImpact: 410_000, estimatedHours: 40, recommendedFix: "Reconcile the duplicated vendor payments across FR/NA/DE entities; net intercompany positions and lock cross-entity vendor creation behind a single master.", ownerRole: "Group Financial Controller", status: "resolved" },
  { rank: 2, title: "Suspense / clearing accounts carrying material non-zero balances", severity: "critical", category: "controls", financialImpact: 295_000, estimatedHours: 32, recommendedFix: "Age and clear suspense balances; enforce a month-end zero-balance control with sign-off on any residual.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 3, title: "No segregation of duties across the AP module", severity: "critical", category: "controls", financialImpact: 220_000, estimatedHours: 32, recommendedFix: "Split invoice creation from approval; enforce a role-based workflow lock.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 4, title: "Large AR (management-fee) invoices where creator equals approver", severity: "high", category: "controls", financialImpact: 165_000, estimatedHours: 24, recommendedFix: "Add a maker-checker on all fee invoices over R100K; route to an independent reviewer.", ownerRole: "Revenue Controller", status: "resolved" },
  { rank: 5, title: "Dormant accounts retaining high-privilege function profiles", severity: "high", category: "controls", financialImpact: 0, estimatedHours: 16, recommendedFix: "Deactivate accounts idle 90+ days; quarterly privilege recertification.", ownerRole: "IT Lead", status: "resolved" },
  { rank: 6, title: "Trial-balance imbalance by company × period (consolidation integrity)", severity: "high", category: "data_quality", financialImpact: 88_000, estimatedHours: 20, recommendedFix: "Trace the company/period imbalances; correct mispostings before close and gate consolidation on a balanced TB.", ownerRole: "Group Financial Controller", status: "resolved" },
  { rank: 7, title: "Back-dated entries (accounting date earlier than creation date)", severity: "high", category: "controls", financialImpact: 72_000, estimatedHours: 18, recommendedFix: "Restrict back-dating to a bounded window behind secondary approval; audit historic back-dated GL.", ownerRole: "Finance Manager", status: "regressed" },
  { rank: 8, title: "AR open items > 1 year old (potential write-off / overstated assets)", severity: "medium", category: "data_quality", financialImpact: 54_000, estimatedHours: 16, recommendedFix: "Review and provide/write off aged debtors; introduce a 12-month ageing trigger.", ownerRole: "Revenue Controller", status: "resolved" },
  { rank: 9, title: "Benford's-Law deviation on GL line amounts (manual-entry clustering)", severity: "medium", category: "data_quality", financialImpact: 0, estimatedHours: 12, recommendedFix: "Investigate the leading-digit clusters; focus review on manual journals around thresholds.", ownerRole: "Internal Audit", status: "resolved" },
  { rank: 10, title: "Accounting periods still open in prior fiscal years", severity: "low", category: "efficiency", financialImpact: 0, estimatedHours: 8, recommendedFix: "Close prior-year periods; enforce a hard close calendar.", ownerRole: "Finance Manager", status: "resolved" },
];

// ── 2025 · improvement, one regression carried forward ───────────────────────
const FINDINGS_2025: AuditFinding[] = [
  { rank: 1, title: "Residual intercompany imbalances on netting accounts", severity: "high", category: "leakage", financialImpact: 180_000, estimatedHours: 28, recommendedFix: "Automate the intercompany netting reconciliation; alert on any non-netting balance over R25K.", ownerRole: "Group Financial Controller", status: "resolved" },
  { rank: 2, title: "Suspense balances re-accumulating after month 6", severity: "high", category: "controls", financialImpact: 120_000, estimatedHours: 20, recommendedFix: "Tighten the zero-balance control to weekly; assign a named owner per suspense account.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 3, title: "Back-dated GL entries (REGRESSION from 2024)", severity: "high", category: "controls", financialImpact: 72_000, estimatedHours: 18, recommendedFix: "Re-apply and harden the back-dating lock; the prior control was relaxed during year-end.", ownerRole: "Finance Manager", status: "in_progress" },
  { rank: 4, title: "Management-fee invoices missing independent approval on edge cases", severity: "medium", category: "controls", financialImpact: 96_000, estimatedHours: 16, recommendedFix: "Close the workflow gap for amended/credited fee invoices.", ownerRole: "Revenue Controller", status: "resolved" },
  { rank: 5, title: "Vendor master records missing bank-account details", severity: "medium", category: "data_quality", financialImpact: 44_000, estimatedHours: 12, recommendedFix: "Back-fill and validate vendor bank details; block payment runs on incomplete records.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 6, title: "Aged AR not provided per policy", severity: "medium", category: "data_quality", financialImpact: 38_000, estimatedHours: 12, recommendedFix: "Apply the ageing-provision matrix automatically at close.", ownerRole: "Revenue Controller", status: "resolved" },
  { rank: 7, title: "Customisation manifest drift (non-vanilla objects undocumented)", severity: "low", category: "efficiency", financialImpact: 0, estimatedHours: 10, recommendedFix: "Document and review specifics; flag undocumented customisations before upgrade.", ownerRole: "X3 Administrator", status: "resolved" },
  { rank: 8, title: "Period-end posting spike (last-week effect)", severity: "low", category: "efficiency", financialImpact: 0, estimatedHours: 8, recommendedFix: "Smooth the close calendar; pre-post recurring journals.", ownerRole: "Finance Manager", status: "resolved" },
];

// ── 2026 · LIVE cycle — the client builds the engagement on this report ──────
const FINDINGS_2026: AuditFinding[] = [
  { rank: 1, title: "Back-dated GL entries still possible at year-end (carried gap)", severity: "high", category: "controls", financialImpact: 64_000, estimatedHours: 16, recommendedFix: "Make the year-end back-dating lock permanent; remove the manual override.", ownerRole: "Finance Manager", status: "open" },
  { rank: 2, title: "Intercompany netting exceptions on two dormant entities", severity: "high", category: "leakage", financialImpact: 110_000, estimatedHours: 22, recommendedFix: "Resolve the residual positions on the dormant entities and close them in X3.", ownerRole: "Group Financial Controller", status: "open" },
  { rank: 3, title: "Users with both supervisor and end-user role flags (privilege concentration)", severity: "medium", category: "controls", financialImpact: 0, estimatedHours: 14, recommendedFix: "Separate supervisor and operational roles; recertify the affected users.", ownerRole: "IT Lead", status: "open" },
  { rank: 4, title: "Suspense account 18900 not fully cleared at H1", severity: "medium", category: "controls", financialImpact: 58_000, estimatedHours: 12, recommendedFix: "Clear and reclassify the residual; add it to the weekly zero-balance check.", ownerRole: "Finance Manager", status: "in_progress" },
  { rank: 5, title: "Aged AR write-off candidates above provision", severity: "medium", category: "data_quality", financialImpact: 42_000, estimatedHours: 10, recommendedFix: "Write off the irrecoverable balances; tighten the credit-control follow-up.", ownerRole: "Revenue Controller", status: "open" },
  { rank: 6, title: "Two vendors registered under the same VAT-ID", severity: "low", category: "data_quality", financialImpact: 0, estimatedHours: 6, recommendedFix: "Merge or document the duplicate registrations.", ownerRole: "AP Lead", status: "open" },
  { rank: 7, title: "GL postings outside business hours (00:00–06:00)", severity: "low", category: "controls", financialImpact: 0, estimatedHours: 8, recommendedFix: "Review the out-of-hours batch; confirm it is scheduled, not manual.", ownerRole: "Internal Audit", status: "open" },
];

export const REPORTS: AuditReport[] = [
  { id: "2024", shortLabel: "2024", cycleLabel: "2024 Baseline Audit", status: "complete", completedAt: "2024-05-14", healthScore: 48, leakageEstimate: 1_400_000, leakageRecoverable: 920_000, risks: { critical: 3, high: 4, medium: 2, low: 1 }, findings: FINDINGS_2024, uploadSubmittedAt: "2024-05-02", uploads: uploads("2024", "2024-05-04") },
  { id: "2025", shortLabel: "2025", cycleLabel: "2025 Annual Audit", status: "complete", completedAt: "2025-05-12", healthScore: 60, leakageEstimate: 980_000, leakageRecoverable: 610_000, risks: { critical: 0, high: 3, medium: 3, low: 2 }, findings: FINDINGS_2025, uploadSubmittedAt: "2025-04-28", uploads: uploads("2025", "2025-04-30") },
  { id: "2026", shortLabel: "2026", cycleLabel: "2026 Annual Audit", status: "complete", completedAt: "2026-05-11", healthScore: 71, leakageEstimate: 640_000, leakageRecoverable: 410_000, risks: { critical: 0, high: 2, medium: 3, low: 2 }, findings: FINDINGS_2026, uploadSubmittedAt: "2026-04-27", uploads: uploads("2026", "2026-04-29") },
];

export const REPORTS_DESC: AuditReport[] = [...REPORTS].sort(
  (a, b) => b.completedAt.localeCompare(a.completedAt),
);

export const LATEST_REPORT_ID = REPORTS_DESC[0].id;

// ── Seed engagements (2024 + 2025 complete; 2026 absent → built live) ────────
function sumEst(fs: EngagementFinding[]): number {
  return fs.filter((f) => f.status !== "skipped").reduce((s, f) => s + f.estimatedImpact, 0);
}
function sumAct(fs: EngagementFinding[]): number {
  return fs.reduce((s, f) => s + (f.actualImpact ?? 0), 0);
}

const ENGAGEMENT_2024_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved", estimatedImpact: 410_000, actualImpact: 388_000 },
  { findingRank: 2, status: "resolved", estimatedImpact: 295_000, actualImpact: 270_000 },
  { findingRank: 3, status: "resolved", estimatedImpact: 220_000, actualImpact: 205_000 },
  { findingRank: 4, status: "resolved", estimatedImpact: 165_000, actualImpact: 150_000 },
  { findingRank: 5, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 6, status: "resolved", estimatedImpact: 88_000, actualImpact: 80_000 },
  { findingRank: 7, status: "regressed", estimatedImpact: 72_000, actualImpact: 0 },
  { findingRank: 8, status: "skipped", estimatedImpact: 54_000 },
  { findingRank: 9, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 10, status: "skipped", estimatedImpact: 0 },
];

const ENGAGEMENT_2025_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved", estimatedImpact: 180_000, actualImpact: 172_000 },
  { findingRank: 2, status: "resolved", estimatedImpact: 120_000, actualImpact: 112_000 },
  { findingRank: 3, status: "included", estimatedImpact: 72_000 },
  { findingRank: 4, status: "resolved", estimatedImpact: 96_000, actualImpact: 90_000 },
  { findingRank: 5, status: "resolved", estimatedImpact: 44_000, actualImpact: 41_000 },
  { findingRank: 6, status: "resolved", estimatedImpact: 38_000, actualImpact: 36_000 },
  { findingRank: 7, status: "skipped", estimatedImpact: 0 },
  { findingRank: 8, status: "skipped", estimatedImpact: 0 },
];

export const SEED_ENGAGEMENTS: Record<string, Engagement> = {
  "2024": { reportId: "2024", status: "complete", submittedAt: "2024-06-03", improvementHoursPerMonth: 32, supportHoursPerMonth: 16, months: 6, estimatedSavings: sumEst(ENGAGEMENT_2024_FINDINGS), actualSavings: sumAct(ENGAGEMENT_2024_FINDINGS), findings: ENGAGEMENT_2024_FINDINGS },
  "2025": { reportId: "2025", status: "complete", submittedAt: "2025-06-09", improvementHoursPerMonth: 26, supportHoursPerMonth: 16, months: 9, estimatedSavings: sumEst(ENGAGEMENT_2025_FINDINGS), actualSavings: sumAct(ENGAGEMENT_2025_FINDINGS), findings: ENGAGEMENT_2025_FINDINGS },
  // "2026" intentionally absent → client builds the live engagement.
};
