// ============================================================================
// REPORTS FIXTURE — LOJAF Pty Ltd (Sage X3 entity RPS01).
//
// Grounded in the REAL GAS data-integrity audit (RPS01, 2026): a 280-point
// control framework, 111 controls evaluable and tested over 100% of population,
// 5 significant deficiencies, 18 control findings, ~R1.1M indicative exposure.
// The live (2026) cycle reproduces those real numbers and finding titles —
// super-user / unrestricted function profiles, sensitive config tables without
// change auditing, duplicate supplier invoices and overpayments, voucher=payment
// SoD breaches, aged suspense balances, back-dated entries, duplicate suppliers
// by normalised name, vendor-master gaps, and inventory valuation issues.
//
// Mirrors reports.fixture.ts (Tourvest) exactly: three cycles oldest→newest,
// the 2026 cycle live (engagement built by the client), two historical complete
// engagements (one carrying a regression). The 2026 audit opinion is
// "significant improvement required" — the journey has improved but is not done.
//
//   Story:  Health 39 → 51 → 58 · Leakage R2.10M → R1.50M → R1.10M
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
  name: "LOJAF Pty Ltd",
  healthTarget: 80,
};

// ── Shared upload sets (the five Sage X3 exports per cycle, entity RPS01) ────
function uploads(year: string, submitted: string): AuditUploadFile[] {
  return [
    { fileType: "gl", fileTypeLabel: "General Ledger", fileTypeDescription: "GACCENTRY / GACCENTRYD legal & IFRS ledger journal lines (RPS01)", filename: `RPS01_gl_${year}.csv`, rows: 268_540, sizeBytes: 58_400_000, state: "passed", submittedAt: submitted },
    { fileType: "ap", fileTypeLabel: "Accounts Payable", fileTypeDescription: "PINVOICE supplier invoices + BPSUPPLIER vendor master & open items", filename: `RPS01_ap_${year}.csv`, rows: 31_220, sizeBytes: 8_700_000, state: "passed", submittedAt: submitted },
    { fileType: "po", fileTypeLabel: "Purchase Orders", fileTypeDescription: "PORDER / PORDERQ commitment lines for three-way match", filename: `RPS01_po_${year}.csv`, rows: 12_905, sizeBytes: 3_600_000, state: "passed", submittedAt: submitted },
    { fileType: "users", fileTypeLabel: "User & Access", fileTypeDescription: "AUTILIS users × ASYSACCES function profiles & all-access flags", filename: `RPS01_users_${year}.csv`, rows: 412, sizeBytes: 310_000, state: "passed", submittedAt: submitted },
    { fileType: "workflows", fileTypeLabel: "Audit & Config", fileTypeDescription: "AAUDITTRACK / AOBJDEF change-audit configuration & history", filename: `RPS01_config_${year}.csv`, rows: 9_870, sizeBytes: 1_900_000, state: "passed", submittedAt: submitted },
  ];
}

// ── 2024 · BASELINE — first audit, worst state ───────────────────────────────
const FINDINGS_2024: AuditFinding[] = [
  { rank: 1, title: "Duplicate supplier invoices — same supplier, document reference and amount", severity: "critical", category: "leakage", financialImpact: 565_000, estimatedHours: 36, recommendedFix: "Recover confirmed duplicate payments; enable the X3 duplicate-invoice control to block same supplier+reference+amount at entry.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 2, title: "Active super-user accounts holding unrestricted all-function access", severity: "critical", category: "controls", financialImpact: 0, estimatedHours: 32, recommendedFix: "Remove the all-access function profile from operational users; restrict super-user to a break-glass account with logging.", ownerRole: "X3 Administrator", status: "resolved" },
  { rank: 3, title: "Same user created the source voucher and its payment (SoD breach)", severity: "critical", category: "controls", financialImpact: 322_000, estimatedHours: 28, recommendedFix: "Split voucher creation from payment authorisation; enforce a maker-checker workflow lock on the payment run.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 4, title: "Suspense / clearing accounts carrying aged (>30 day) unreconciled balances", severity: "high", category: "controls", financialImpact: 408_000, estimatedHours: 26, recommendedFix: "Age and clear suspense balances; enforce a month-end zero-balance control with escalation past 30 days.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 5, title: "Overpayments — paid amount exceeds the invoiced amount", severity: "high", category: "leakage", financialImpact: 170_000, estimatedHours: 20, recommendedFix: "Recover supplier overpayments; block payment lines that exceed the matched invoice value.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 6, title: "Back-dated entries — validation date precedes the accounting date", severity: "high", category: "controls", financialImpact: 122_000, estimatedHours: 20, recommendedFix: "Restrict back-dating to a bounded window behind secondary approval; audit the 40 violating rows.", ownerRole: "Finance Manager", status: "regressed" },
  { rank: 7, title: "Sensitive security / configuration tables without change auditing enabled", severity: "high", category: "controls", financialImpact: 0, estimatedHours: 16, recommendedFix: "Turn on field-level audit tracking for AUTILIS, ASYSACCES and bank/VAT config tables.", ownerRole: "X3 Administrator", status: "resolved" },
  { rank: 8, title: "Duplicate suppliers by normalised name (e.g. APPLE ×2, UNITED PARCEL SERVICE ×2)", severity: "medium", category: "data_quality", financialImpact: 84_000, estimatedHours: 16, recommendedFix: "Run a merge review on the 6 name collisions; add a normalised-name uniqueness check at vendor creation.", ownerRole: "Master Data Owner", status: "resolved" },
  { rank: 9, title: "Vendor master records missing bank details and pay-to partner codes", severity: "medium", category: "data_quality", financialImpact: 0, estimatedHours: 12, recommendedFix: "Back-fill and validate vendor bank details; block payment runs on incomplete records.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 10, title: "Negative stock at site level and expired lots beyond NRV", severity: "medium", category: "data_quality", financialImpact: 31_000, estimatedHours: 12, recommendedFix: "Investigate negative on-hand; implement weekly ABC cycle counting with variance and quarterly NRV review.", ownerRole: "Inventory Controller", status: "resolved" },
  { rank: 11, title: "Customer open balances exceeding authorised credit limits", severity: "low", category: "controls", financialImpact: 0, estimatedHours: 8, recommendedFix: "Enforce the credit-limit block on order release; review the over-limit accounts.", ownerRole: "Credit Controller", status: "resolved" },
];

// ── 2025 · improvement, one regression carried forward ───────────────────────
const FINDINGS_2025: AuditFinding[] = [
  { rank: 1, title: "Residual duplicate-invoice exceptions on amended documents", severity: "high", category: "leakage", financialImpact: 210_000, estimatedHours: 24, recommendedFix: "Extend the duplicate-invoice control to credited and amended invoices; recover the residual overpayments.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 2, title: "Back-dated GL entries (REGRESSION from 2024)", severity: "high", category: "controls", financialImpact: 122_000, estimatedHours: 20, recommendedFix: "Re-apply and harden the back-dating lock; the prior control was relaxed during year-end close.", ownerRole: "Finance Manager", status: "in_progress" },
  { rank: 3, title: "Suspense balances re-accumulating after month 6", severity: "high", category: "controls", financialImpact: 165_000, estimatedHours: 20, recommendedFix: "Tighten the zero-balance control to weekly; assign a named owner per suspense account.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 4, title: "A small number of operational users retain supervisor flags", severity: "medium", category: "controls", financialImpact: 0, estimatedHours: 14, recommendedFix: "Separate supervisor and end-user role flags; recertify the affected accounts.", ownerRole: "X3 Administrator", status: "resolved" },
  { rank: 5, title: "Voucher=payment SoD overlap on two treasury accounts", severity: "medium", category: "controls", financialImpact: 96_000, estimatedHours: 16, recommendedFix: "Close the remaining dual-role grants on the treasury payment workflow.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 6, title: "Vendor master still missing bank details on new records", severity: "medium", category: "data_quality", financialImpact: 0, estimatedHours: 10, recommendedFix: "Enforce mandatory bank-detail capture at vendor creation.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 7, title: "Duplicate partner by EU VAT registration number", severity: "low", category: "data_quality", financialImpact: 0, estimatedHours: 8, recommendedFix: "Merge or document the duplicate VAT registrations.", ownerRole: "Master Data Owner", status: "resolved" },
  { rank: 8, title: "Inventory valuation gap on expired lots not fully provided", severity: "low", category: "data_quality", financialImpact: 24_000, estimatedHours: 8, recommendedFix: "Apply the NRV write-down matrix automatically at period close.", ownerRole: "Inventory Controller", status: "resolved" },
];

// ── 2026 · LIVE cycle — the REAL RPS01 audit; engagement built by the client ──
// Opinion: "significant improvement required" — 5 significant deficiencies,
// 18 control findings, ~R1.1M indicative exposure across the headline items.
const FINDINGS_2026: AuditFinding[] = [
  { rank: 1, title: "Duplicate supplier invoices — same supplier, document reference and amount", severity: "high", category: "leakage", financialImpact: 408_000, estimatedHours: 28, recommendedFix: "Recover the confirmed duplicate payments and block same supplier+reference+amount at entry (F-P2P-001).", ownerRole: "AP Lead", status: "open" },
  { rank: 2, title: "Suspense / clearing accounts with aged (>30 day) unreconciled balances", severity: "high", category: "controls", financialImpact: 322_000, estimatedHours: 24, recommendedFix: "Clear and reconcile the aged residuals; enforce a month-end zero-balance control with >30-day escalation.", ownerRole: "Finance Manager", status: "open" },
  { rank: 3, title: "Overpayments — paid amount exceeds the invoiced amount", severity: "high", category: "leakage", financialImpact: 170_000, estimatedHours: 18, recommendedFix: "Recover the supplier overpayments; block payment lines exceeding the matched invoice value.", ownerRole: "AP Lead", status: "in_progress" },
  { rank: 4, title: "Back-dated entries — validation date precedes accounting date (40 rows)", severity: "high", category: "controls", financialImpact: 122_000, estimatedHours: 18, recommendedFix: "Make the back-dating lock permanent behind secondary approval; clear the 40 violating rows (F-R2R).", ownerRole: "Finance Manager", status: "open" },
  { rank: 5, title: "Same user created the source voucher and its payment (SoD breach)", severity: "high", category: "controls", financialImpact: 102_000, estimatedHours: 20, recommendedFix: "Enforce maker-checker on the payment run; remove the dual-role grant that allows self-payment.", ownerRole: "Finance Manager", status: "open" },
  { rank: 6, title: "Active super-user accounts holding unrestricted all-function access", severity: "medium", category: "controls", financialImpact: 0, estimatedHours: 16, recommendedFix: "Strip the all-access function profile from operational users; restrict super-user to a logged break-glass account (F-ITGC).", ownerRole: "X3 Administrator", status: "open" },
  { rank: 7, title: "Sensitive security / configuration tables without change auditing enabled", severity: "medium", category: "controls", financialImpact: 0, estimatedHours: 12, recommendedFix: "Enable field-level audit tracking on access, bank and VAT configuration tables.", ownerRole: "X3 Administrator", status: "open" },
  { rank: 8, title: "Duplicate suppliers by normalised name (6 collisions, e.g. APPLE ×2, UPS ×2)", severity: "medium", category: "data_quality", financialImpact: 64_000, estimatedHours: 14, recommendedFix: "Run a merge review on the collisions; add a normalised-name uniqueness check at vendor creation (F-P2P-012).", ownerRole: "Master Data Owner", status: "open" },
  { rank: 9, title: "Vendor master gaps — missing bank details / pay-to partner codes", severity: "medium", category: "data_quality", financialImpact: 0, estimatedHours: 10, recommendedFix: "Back-fill and validate vendor bank details; block payment runs on incomplete records.", ownerRole: "AP Lead", status: "open" },
  { rank: 10, title: "Negative stock at site level and expired lots beyond NRV", severity: "low", category: "data_quality", financialImpact: 31_000, estimatedHours: 10, recommendedFix: "Investigate negative on-hand; weekly ABC cycle counting with variance and quarterly NRV review (F-INVEN-001).", ownerRole: "Inventory Controller", status: "open" },
  { rank: 11, title: "Customer open balances exceeding authorised credit limits", severity: "low", category: "controls", financialImpact: 0, estimatedHours: 8, recommendedFix: "Enforce the credit-limit block on order release; review the over-limit accounts (F-R2R-012 area).", ownerRole: "Credit Controller", status: "open" },
  { rank: 12, title: "VAT / currency configuration gaps — rates missing or not effective", severity: "low", category: "data_quality", financialImpact: 0, estimatedHours: 8, recommendedFix: "Add effective rate rows for the affected VAT codes and currencies; remove orphan rate references.", ownerRole: "Master Data Owner", status: "open" },
];

export const REPORTS: AuditReport[] = [
  { id: "2024", shortLabel: "2024", cycleLabel: "2024 Baseline Audit", status: "complete", completedAt: "2024-05-20", healthScore: 39, leakageEstimate: 2_100_000, leakageRecoverable: 1_360_000, risks: { critical: 4, high: 6, medium: 3, low: 1 }, findings: FINDINGS_2024, uploadSubmittedAt: "2024-05-08", uploads: uploads("2024", "2024-05-10") },
  { id: "2025", shortLabel: "2025", cycleLabel: "2025 Annual Audit", status: "complete", completedAt: "2025-05-19", healthScore: 51, leakageEstimate: 1_500_000, leakageRecoverable: 940_000, risks: { critical: 1, high: 6, medium: 3, low: 2 }, findings: FINDINGS_2025, uploadSubmittedAt: "2025-05-05", uploads: uploads("2025", "2025-05-07") },
  { id: "2026", shortLabel: "2026", cycleLabel: "2026 Annual Audit", status: "complete", completedAt: "2026-06-09", healthScore: 58, leakageEstimate: 1_100_000, leakageRecoverable: 700_000, risks: { critical: 0, high: 5, medium: 4, low: 3 }, findings: FINDINGS_2026, uploadSubmittedAt: "2026-05-28", uploads: uploads("2026", "2026-05-30") },
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
  { findingRank: 1, status: "resolved", estimatedImpact: 565_000, actualImpact: 528_000 },
  { findingRank: 2, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 3, status: "resolved", estimatedImpact: 322_000, actualImpact: 300_000 },
  { findingRank: 4, status: "resolved", estimatedImpact: 408_000, actualImpact: 372_000 },
  { findingRank: 5, status: "resolved", estimatedImpact: 170_000, actualImpact: 158_000 },
  { findingRank: 6, status: "regressed", estimatedImpact: 122_000, actualImpact: 0 },
  { findingRank: 7, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 8, status: "resolved", estimatedImpact: 84_000, actualImpact: 76_000 },
  { findingRank: 9, status: "skipped", estimatedImpact: 0 },
  { findingRank: 10, status: "skipped", estimatedImpact: 31_000 },
  { findingRank: 11, status: "skipped", estimatedImpact: 0 },
];

const ENGAGEMENT_2025_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved", estimatedImpact: 210_000, actualImpact: 198_000 },
  { findingRank: 2, status: "included", estimatedImpact: 122_000 },
  { findingRank: 3, status: "resolved", estimatedImpact: 165_000, actualImpact: 152_000 },
  { findingRank: 4, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 5, status: "resolved", estimatedImpact: 96_000, actualImpact: 88_000 },
  { findingRank: 6, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 7, status: "skipped", estimatedImpact: 0 },
  { findingRank: 8, status: "skipped", estimatedImpact: 24_000 },
];

export const SEED_ENGAGEMENTS: Record<string, Engagement> = {
  "2024": { reportId: "2024", status: "complete", submittedAt: "2024-06-10", improvementHoursPerMonth: 34, supportHoursPerMonth: 16, months: 6, estimatedSavings: sumEst(ENGAGEMENT_2024_FINDINGS), actualSavings: sumAct(ENGAGEMENT_2024_FINDINGS), findings: ENGAGEMENT_2024_FINDINGS },
  "2025": { reportId: "2025", status: "complete", submittedAt: "2025-06-16", improvementHoursPerMonth: 28, supportHoursPerMonth: 16, months: 9, estimatedSavings: sumEst(ENGAGEMENT_2025_FINDINGS), actualSavings: sumAct(ENGAGEMENT_2025_FINDINGS), findings: ENGAGEMENT_2025_FINDINGS },
  // "2026" intentionally absent → client builds the live engagement.
};
