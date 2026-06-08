// ============================================================================
// audit.fixture.ts — BACKWARDS-COMPAT SHIM.
//
// The real, report-scoped data model now lives in reports.fixture.ts and is
// consumed through ReportContext. This file remains so the screens that are
// NOT yet report-aware (upload, report, finding-detail) keep working: it
// re-exports the shared types and derives the old "current / prior" snapshots
// from the newest two reports. There is ONE source of truth (REPORTS) — these
// are just views onto it.
// ============================================================================

import { REPORTS_DESC } from "@/features/audit/reports.fixture";
import type { AuditReport, Severity } from "@/features/audit/reports.fixture";

// Re-export the canonical enums + entity types (callers import them from here).
export type {
  Severity,
  Category,
  FindingStatus,
  ValidationState,
  AuditStatus,
  AuditFinding,
  EngagementStatus,
  EngagementFindingStatus,
  EngagementFinding,
  Engagement,
  AuditReport,
  CumulativeSummary,
} from "@/features/audit/reports.fixture";

export {
  CLIENT_INFO,
  totalRisks,
  severeRisks,
} from "@/features/audit/reports.fixture";

// ── Legacy "run summary" shape (no findings/id) — derived from a report ──────
export interface AuditRunSummary {
  cycleLabel: string;
  status: AuditReport["status"];
  healthScore: number;
  leakageEstimate: number;
  leakageRecoverable: number;
  risks: Record<Severity, number>;
  completedAt: string;
}

function toRunSummary(r: AuditReport): AuditRunSummary {
  return {
    cycleLabel: r.cycleLabel,
    status: r.status,
    healthScore: r.healthScore,
    leakageEstimate: r.leakageEstimate,
    leakageRecoverable: r.leakageRecoverable,
    risks: r.risks,
    completedAt: r.completedAt,
  };
}

// Newest report = "current", the one before it = "prior".
export const CURRENT_AUDIT: AuditRunSummary = toRunSummary(REPORTS_DESC[0]);
export const PRIOR_AUDIT: AuditRunSummary = toRunSummary(REPORTS_DESC[1]);

// Findings of the newest report — used by finding-detail (current cycle).
export const FINDINGS = REPORTS_DESC[0].findings;

// ── Helpers kept for legacy callers (operate on the current findings) ────────
export function actionsResolved(): number {
  return FINDINGS.filter((f) => f.status === "resolved").length;
}
export function actionsInProgress(): number {
  return FINDINGS.filter((f) => f.status === "in_progress").length;
}

// ── Upload status (unchanged — pertains to ingesting a NEW audit) ────────────
export interface UploadedFileStatus {
  fileType: "gl" | "ap" | "po" | "users" | "workflows";
  fileTypeLabel: string;
  fileTypeDescription: string;
  filename: string | null;
  rows: number | null;
  sizeBytes: number | null;
  state: import("@/features/audit/reports.fixture").ValidationState | null;
  notes: string | null;
}

export const UPLOAD_STATUS: UploadedFileStatus[] = [
  {
    fileType: "gl",
    fileTypeLabel: "General Ledger",
    fileTypeDescription:
      "Transaction-level GL export. Required columns: Date, Account, Debit, Credit, JournalRef, Description.",
    filename: "GL_2026Q1.csv",
    rows: 87_432,
    sizeBytes: 14_234_112,
    state: "passed",
    notes: null,
  },
  {
    fileType: "ap",
    fileTypeLabel: "Accounts Payable",
    fileTypeDescription:
      "AP transactions + vendor master. Required columns: Vendor, InvoiceNo, Date, Amount, Status, BankRef.",
    filename: "AP_2026Q1.csv",
    rows: 12_341,
    sizeBytes: 2_345_678,
    state: "passed",
    notes: null,
  },
  {
    fileType: "po",
    fileTypeLabel: "Purchase Orders",
    fileTypeDescription:
      "PO header + lines. Required columns: PONumber, Vendor, Date, Status, ReceiptDate, ApprovedBy.",
    filename: "PO_2026Q1.csv",
    rows: 8_932,
    sizeBytes: 1_023_456,
    state: "passed",
    notes: null,
  },
  {
    fileType: "users",
    fileTypeLabel: "Users & Roles",
    fileTypeDescription:
      "User accounts + role assignments. Required columns: User, Role, Status, LastLogin, Department.",
    filename: "Users.csv",
    rows: 487,
    sizeBytes: 156_789,
    state: "passed",
    notes: null,
  },
  {
    fileType: "workflows",
    fileTypeLabel: "Workflows",
    fileTypeDescription:
      "Workflow definitions + approval chains. Required columns: WorkflowID, Module, ApproverRole, Threshold.",
    filename: "Workflows.csv",
    rows: 142,
    sizeBytes: 78_945,
    state: "passed",
    notes: null,
  },
];
