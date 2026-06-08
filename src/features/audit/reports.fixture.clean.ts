// ============================================================================
// CLEAN FIXTURE — first-time client state. Source for the "newclient" entry in
// the client registry (src/features/clients/clients.data.ts).
//
// Active in the internal build, and the sole client in a
// `VITE_CLIENT=newclient` scoped build.
// This mode shows the portal as a brand-new client on their FIRST audit:
//   • ONE report  (the audit that was just run and delivered)
//   • uploads: []  → Upload Centre shows intake mode automatically
//   • SEED_ENGAGEMENTS: {}  → Engagement Builder is open, no prior carry-over
//   • No YoY card (no prior cycle — isBaseline = true)
//   • Cumulative shows zeros (no completed engagements yet)
//
// HOW TO CONFIGURE FOR A REAL CLIENT (before go-live):
//   1. Update CLIENT_INFO: name + healthTarget
//   2. Update the report below: healthScore, leakageEstimate,
//      leakageRecoverable, risks (these come from the real audit output)
//   3. Replace FINDINGS_CURRENT with the actual audit findings
//   4. Leave uploads: []  (intake mode is triggered by the empty array)
//   5. Leave SEED_ENGAGEMENTS = {}  (client builds the first plan live)
// ============================================================================

import type {
  AuditFinding,
  AuditReport,
  Engagement,
  CumulativeSummary,
  Severity,
} from "@/features/audit/reports.fixture";

// ── Client identity ──────────────────────────────────────────────────────────
// UPDATE: replace with real client name before go-live.

export const CLIENT_INFO = {
  name: "New Client",   // ← replace with actual client name
  healthTarget: 80,
};

// ── Findings — replace with the actual audit output ─────────────────────────
// These are placeholder findings based on common first-audit patterns.
// Swap this array for the real findings once the audit runs.

const FINDINGS_CURRENT: AuditFinding[] = [
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

// ── Reports ──────────────────────────────────────────────────────────────────
// One report only — the just-delivered first audit.
// UPDATE: completedAt, healthScore, leakageEstimate, leakageRecoverable,
//         risks, and uploadSubmittedAt with real audit output values.

export const REPORTS: AuditReport[] = [
  {
    id: "2026",
    shortLabel: "2026",
    cycleLabel: "2026 Baseline Audit",
    status: "complete",
    completedAt: "2026-04-12",          // ← replace with real completion date
    healthScore: 74,                     // ← replace with real health score
    leakageEstimate: 480_000,            // ← replace with real leakage estimate (ZAR)
    leakageRecoverable: 320_000,         // ← replace with real recoverable amount
    risks: { critical: 2, high: 4, medium: 3, low: 1 }, // ← replace with real risk counts
    findings: FINDINGS_CURRENT,
    uploadSubmittedAt: "2026-03-28",     // ← replace with real upload date
    uploads: [],                         // ← INTENTIONALLY EMPTY → triggers intake mode on /upload
  },
];

// Newest first (only one entry in clean mode).
export const REPORTS_DESC: AuditReport[] = [...REPORTS].sort(
  (a, b) => b.completedAt.localeCompare(a.completedAt),
);

export const LATEST_REPORT_ID = REPORTS_DESC[0].id; // "2026"

// ── Seed engagements ─────────────────────────────────────────────────────────
// Intentionally empty — the client builds their first plan live on /engagement.

export const SEED_ENGAGEMENTS: Record<string, Engagement> = {};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function totalRisks(r: Record<Severity, number>): number {
  return r.critical + r.high + r.medium + r.low;
}

export function severeRisks(r: Record<Severity, number>): number {
  return r.critical + r.high;
}

/** The report immediately preceding `id`. Returns null — only one cycle. */
export function priorReportOf(id: string): AuditReport | null {
  const idx = REPORTS_DESC.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  return REPORTS_DESC[idx + 1] ?? null; // always null: only one report exists
}

/** Cumulative across completed engagements. In clean mode: all zeros until the
 *  first engagement is submitted and completed. */
export function computeCumulative(
  engagementsById: Record<string, Engagement>,
): CumulativeSummary {
  const complete = Object.values(engagementsById).filter((e) => e.status === "complete");

  let totalRecovered = 0;
  let totalEstimated = 0;
  let totalFindingsResolved = 0;
  let totalFindingsRegressed = 0;

  for (const e of complete) {
    totalRecovered += e.actualSavings ?? 0;
    totalEstimated += e.estimatedSavings;
    for (const f of e.findings) {
      if (f.status === "resolved") totalFindingsResolved += 1;
      if (f.status === "regressed") totalFindingsRegressed += 1;
    }
  }

  // With only one report, earliest === latest → healthGain = 0.
  const earliest = REPORTS_DESC[REPORTS_DESC.length - 1];
  const latest   = REPORTS_DESC[0];

  return {
    cyclesCompleted: complete.length,
    totalRecovered,
    totalEstimated,
    totalFindingsResolved,
    totalFindingsRegressed,
    healthGain: latest.healthScore - earliest.healthScore,
  };
}
