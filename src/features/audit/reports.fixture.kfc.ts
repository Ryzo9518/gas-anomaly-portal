// ============================================================================
// REPORTS FIXTURE — KFC FRANCHISE (QSR) demo client (Gold Crown Foods).
//
// Mirrors reports.fixture.ts (Tourvest) exactly. QSR / fast-food franchise
// flavour: goods-receipt accrual exposure, three-way-match breaks, duplicate
// vendor invoices (duplicate payment), POs clustered below approval thresholds,
// weekend/cash-handling GL postings, obsolete stock, zero-cost items.
//
//   Story:  Health 44 → 57 → 69 · Leakage R1.10M → R0.76M → R0.51M
// ============================================================================

import type {
  AuditFinding,
  AuditReport,
  AuditUploadFile,
  Engagement,
  EngagementFinding,
} from "@/features/audit/reports.fixture";

export const CLIENT_INFO = {
  name: "Gold Crown Foods (KFC Franchise Group)",
  healthTarget: 78,
};

function uploads(year: string, submitted: string): AuditUploadFile[] {
  return [
    { fileType: "gl", fileTypeLabel: "General Ledger", fileTypeDescription: "GACCENTRY / GACCENTRYD journal lines (all stores)", filename: `goldcrown_gl_${year}.csv`, rows: 412_880, sizeBytes: 92_000_000, state: "passed", submittedAt: submitted },
    { fileType: "ap", fileTypeLabel: "Accounts Payable", fileTypeDescription: "BPSUPPLIER + PINVOICE (food, packaging, royalties)", filename: `goldcrown_ap_${year}.csv`, rows: 64_210, sizeBytes: 18_400_000, state: "passed", submittedAt: submitted },
    { fileType: "po", fileTypeLabel: "Purchase / Goods Receipt", fileTypeDescription: "PORDER + PRECEIPT three-way-match population", filename: `goldcrown_po_${year}.csv`, rows: 88_902, sizeBytes: 24_100_000, state: "passed", submittedAt: submitted },
    { fileType: "users", fileTypeLabel: "User & Access", fileTypeDescription: "AUTILIS store-manager menu × function profiles", filename: `goldcrown_users_${year}.csv`, rows: 642, sizeBytes: 410_000, state: "passed", submittedAt: submitted },
    { fileType: "workflows", fileTypeLabel: "Workflow & Approvals", fileTypeDescription: "AWRKHISTO PO approval trail", filename: `goldcrown_wf_${year}.csv`, rows: 29_330, sizeBytes: 4_800_000, state: "passed", submittedAt: submitted },
  ];
}

// ── 2024 · BASELINE ──────────────────────────────────────────────────────────
const FINDINGS_2024: AuditFinding[] = [
  { rank: 1, title: "Goods receipts > 90 days without a matching AP invoice (accrual exposure)", severity: "critical", category: "leakage", financialImpact: 320_000, estimatedHours: 36, recommendedFix: "Reconcile GRNI; chase or reverse stale receipts and book the true accrual. Add a 60-day GRNI ageing alert.", ownerRole: "Supply Chain Controller", status: "resolved" },
  { rank: 2, title: "Duplicate vendor invoice numbers (potential duplicate payment)", severity: "critical", category: "leakage", financialImpact: 188_000, estimatedHours: 28, recommendedFix: "Recover the duplicate payments; enforce a unique (vendor, invoice-no) constraint and a pre-payment duplicate check.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 3, title: "Three-way match failures (PO / Goods-Receipt / Invoice mismatch)", severity: "critical", category: "controls", financialImpact: 142_000, estimatedHours: 32, recommendedFix: "Enforce tolerance-based three-way match before payment; block off-match invoices.", ownerRole: "Supply Chain Controller", status: "resolved" },
  { rank: 4, title: "POs clustered just below the standard approval threshold", severity: "high", category: "controls", financialImpact: 96_000, estimatedHours: 20, recommendedFix: "Investigate threshold-splitting; add cumulative-spend approval logic per vendor/period.", ownerRole: "Procurement", status: "resolved" },
  { rank: 5, title: "Weekend GL postings on store cash accounts (out-of-hours fraud indicator)", severity: "high", category: "controls", financialImpact: 78_000, estimatedHours: 18, recommendedFix: "Review weekend cash postings per store; require maker-checker on cash journals.", ownerRole: "Finance Manager", status: "regressed" },
  { rank: 6, title: "Items with negative or zero cost price (CPRAMT_0)", severity: "high", category: "data_quality", financialImpact: 64_000, estimatedHours: 16, recommendedFix: "Correct the zero/negative standard costs; gate item activation on a valid cost.", ownerRole: "Stock Controller", status: "resolved" },
  { rank: 7, title: "Stock items with no movement in > 365 days (slow / obsolete)", severity: "medium", category: "efficiency", financialImpact: 52_000, estimatedHours: 14, recommendedFix: "Write down obsolete stock; introduce a slow-mover review at each store.", ownerRole: "Stock Controller", status: "resolved" },
  { rank: 8, title: "Vendor master records missing bank-account details", severity: "medium", category: "data_quality", financialImpact: 0, estimatedHours: 10, recommendedFix: "Back-fill and validate vendor bank details; block payment on incomplete records.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 9, title: "Royalty / marketing-levy accruals understated vs sales", severity: "medium", category: "leakage", financialImpact: 46_000, estimatedHours: 12, recommendedFix: "Reconcile levy accruals to franchised sales; automate the monthly accrual.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 10, title: "Large transactions with zero VAT despite a configured VAT account", severity: "low", category: "data_quality", financialImpact: 0, estimatedHours: 8, recommendedFix: "Review zero-VAT high-value lines; correct tax determination.", ownerRole: "Finance Manager", status: "resolved" },
];

// ── 2025 ─────────────────────────────────────────────────────────────────────
const FINDINGS_2025: AuditFinding[] = [
  { rank: 1, title: "Residual GRNI ageing on three high-volume stores", severity: "high", category: "leakage", financialImpact: 140_000, estimatedHours: 24, recommendedFix: "Extend the GRNI alert to store level; assign clearing ownership per store manager.", ownerRole: "Supply Chain Controller", status: "resolved" },
  { rank: 2, title: "Duplicate-payment control not covering credit notes", severity: "high", category: "leakage", financialImpact: 88_000, estimatedHours: 18, recommendedFix: "Extend the duplicate check to credits and re-issued invoices.", ownerRole: "AP Lead", status: "resolved" },
  { rank: 3, title: "Weekend cash postings (REGRESSION from 2024)", severity: "high", category: "controls", financialImpact: 78_000, estimatedHours: 18, recommendedFix: "Re-apply the maker-checker; the weekend lock was disabled during a POS rollout.", ownerRole: "Finance Manager", status: "in_progress" },
  { rank: 4, title: "Three-way-match tolerance set too wide on packaging vendors", severity: "medium", category: "controls", financialImpact: 60_000, estimatedHours: 14, recommendedFix: "Tighten tolerance bands; review packaging spend variances.", ownerRole: "Procurement", status: "resolved" },
  { rank: 5, title: "Obsolete-stock provision not applied at all sites", severity: "medium", category: "efficiency", financialImpact: 44_000, estimatedHours: 12, recommendedFix: "Apply the slow-mover write-down policy group-wide.", ownerRole: "Stock Controller", status: "resolved" },
  { rank: 6, title: "Vendors paid by multiple store entities (intercompany leakage)", severity: "medium", category: "leakage", financialImpact: 50_000, estimatedHours: 14, recommendedFix: "Consolidate shared vendors; net intercompany store balances.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 7, title: "Period-end posting spike at month close", severity: "low", category: "efficiency", financialImpact: 0, estimatedHours: 8, recommendedFix: "Pre-post recurring journals; smooth the close.", ownerRole: "Finance Manager", status: "resolved" },
  { rank: 8, title: "Store-manager accounts with stale passwords (>180 days)", severity: "low", category: "controls", financialImpact: 0, estimatedHours: 8, recommendedFix: "Enforce rotation; expire stale credentials.", ownerRole: "IT Lead", status: "resolved" },
];

// ── 2026 · LIVE cycle ────────────────────────────────────────────────────────
const FINDINGS_2026: AuditFinding[] = [
  { rank: 1, title: "Weekend cash postings still un-gated on two regions", severity: "high", category: "controls", financialImpact: 60_000, estimatedHours: 16, recommendedFix: "Roll the maker-checker to the remaining regions; remove the POS-rollout exemption.", ownerRole: "Finance Manager", status: "open" },
  { rank: 2, title: "GRNI > 90 days creeping back on new-store openings", severity: "high", category: "leakage", financialImpact: 96_000, estimatedHours: 20, recommendedFix: "Add GRNI clearing to the new-store go-live checklist.", ownerRole: "Supply Chain Controller", status: "open" },
  { rank: 3, title: "Duplicate vendor records sharing identical bank account", severity: "medium", category: "data_quality", financialImpact: 58_000, estimatedHours: 14, recommendedFix: "Merge duplicates keyed on bank account; add a uniqueness constraint.", ownerRole: "AP Lead", status: "open" },
  { rank: 4, title: "POs to vendors flagged one-time / non-trading", severity: "medium", category: "controls", financialImpact: 40_000, estimatedHours: 12, recommendedFix: "Block POs to one-time vendors without a buyer override and reason.", ownerRole: "Procurement", status: "in_progress" },
  { rank: 5, title: "Obsolete stock above provision at four sites", severity: "medium", category: "efficiency", financialImpact: 36_000, estimatedHours: 10, recommendedFix: "Write down and tighten ordering at the affected sites.", ownerRole: "Stock Controller", status: "open" },
  { rank: 6, title: "Active customers (corporate accounts) with no credit limit", severity: "low", category: "data_quality", financialImpact: 0, estimatedHours: 6, recommendedFix: "Set credit limits on corporate/event accounts.", ownerRole: "Finance Manager", status: "open" },
  { rank: 7, title: "Large payments to vendors created in the last 90 days (fast-money check)", severity: "low", category: "controls", financialImpact: 0, estimatedHours: 8, recommendedFix: "Hold first large payment to new vendors for verification.", ownerRole: "AP Lead", status: "open" },
];

export const REPORTS: AuditReport[] = [
  { id: "2024", shortLabel: "2024", cycleLabel: "2024 Baseline Audit", status: "complete", completedAt: "2024-06-18", healthScore: 44, leakageEstimate: 1_100_000, leakageRecoverable: 740_000, risks: { critical: 3, high: 3, medium: 3, low: 1 }, findings: FINDINGS_2024, uploadSubmittedAt: "2024-06-05", uploads: uploads("2024", "2024-06-07") },
  { id: "2025", shortLabel: "2025", cycleLabel: "2025 Annual Audit", status: "complete", completedAt: "2025-06-16", healthScore: 57, leakageEstimate: 760_000, leakageRecoverable: 470_000, risks: { critical: 0, high: 3, medium: 3, low: 2 }, findings: FINDINGS_2025, uploadSubmittedAt: "2025-06-02", uploads: uploads("2025", "2025-06-04") },
  { id: "2026", shortLabel: "2026", cycleLabel: "2026 Annual Audit", status: "complete", completedAt: "2026-06-15", healthScore: 69, leakageEstimate: 510_000, leakageRecoverable: 330_000, risks: { critical: 0, high: 2, medium: 3, low: 2 }, findings: FINDINGS_2026, uploadSubmittedAt: "2026-06-01", uploads: uploads("2026", "2026-06-03") },
];

export const REPORTS_DESC: AuditReport[] = [...REPORTS].sort(
  (a, b) => b.completedAt.localeCompare(a.completedAt),
);

export const LATEST_REPORT_ID = REPORTS_DESC[0].id;

function sumEst(fs: EngagementFinding[]): number {
  return fs.filter((f) => f.status !== "skipped").reduce((s, f) => s + f.estimatedImpact, 0);
}
function sumAct(fs: EngagementFinding[]): number {
  return fs.reduce((s, f) => s + (f.actualImpact ?? 0), 0);
}

const ENGAGEMENT_2024_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved", estimatedImpact: 320_000, actualImpact: 300_000 },
  { findingRank: 2, status: "resolved", estimatedImpact: 188_000, actualImpact: 180_000 },
  { findingRank: 3, status: "resolved", estimatedImpact: 142_000, actualImpact: 130_000 },
  { findingRank: 4, status: "resolved", estimatedImpact: 96_000, actualImpact: 84_000 },
  { findingRank: 5, status: "regressed", estimatedImpact: 78_000, actualImpact: 0 },
  { findingRank: 6, status: "resolved", estimatedImpact: 64_000, actualImpact: 60_000 },
  { findingRank: 7, status: "resolved", estimatedImpact: 52_000, actualImpact: 48_000 },
  { findingRank: 8, status: "resolved", estimatedImpact: 0, actualImpact: 0 },
  { findingRank: 9, status: "skipped", estimatedImpact: 46_000 },
  { findingRank: 10, status: "skipped", estimatedImpact: 0 },
];

const ENGAGEMENT_2025_FINDINGS: EngagementFinding[] = [
  { findingRank: 1, status: "resolved", estimatedImpact: 140_000, actualImpact: 132_000 },
  { findingRank: 2, status: "resolved", estimatedImpact: 88_000, actualImpact: 82_000 },
  { findingRank: 3, status: "included", estimatedImpact: 78_000 },
  { findingRank: 4, status: "resolved", estimatedImpact: 60_000, actualImpact: 56_000 },
  { findingRank: 5, status: "resolved", estimatedImpact: 44_000, actualImpact: 40_000 },
  { findingRank: 6, status: "resolved", estimatedImpact: 50_000, actualImpact: 46_000 },
  { findingRank: 7, status: "skipped", estimatedImpact: 0 },
  { findingRank: 8, status: "skipped", estimatedImpact: 0 },
];

export const SEED_ENGAGEMENTS: Record<string, Engagement> = {
  "2024": { reportId: "2024", status: "complete", submittedAt: "2024-07-08", improvementHoursPerMonth: 34, supportHoursPerMonth: 18, months: 6, estimatedSavings: sumEst(ENGAGEMENT_2024_FINDINGS), actualSavings: sumAct(ENGAGEMENT_2024_FINDINGS), findings: ENGAGEMENT_2024_FINDINGS },
  "2025": { reportId: "2025", status: "complete", submittedAt: "2025-07-14", improvementHoursPerMonth: 28, supportHoursPerMonth: 16, months: 9, estimatedSavings: sumEst(ENGAGEMENT_2025_FINDINGS), actualSavings: sumAct(ENGAGEMENT_2025_FINDINGS), findings: ENGAGEMENT_2025_FINDINGS },
  // "2026" intentionally absent → client builds the live engagement.
};
