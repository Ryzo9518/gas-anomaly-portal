// ============================================================================
// report-helpers.ts — client-agnostic report math.
//
// These were previously duplicated inside each fixture (reports.fixture.ts /
// reports.fixture.clean.ts) and closed over that fixture's module-level
// REPORTS_DESC. With the multi-client layer, the active report set is chosen
// at runtime (per selected client), so the helpers now take the report list as
// an argument. Pure functions, no fixture data imported — safe to use from any
// client's bundle.
// ============================================================================

import type {
  AuditReport,
  Engagement,
  CumulativeSummary,
  Severity,
} from "@/features/audit/reports.fixture";

export function totalRisks(r: Record<Severity, number>): number {
  return r.critical + r.high + r.medium + r.low;
}

export function severeRisks(r: Record<Severity, number>): number {
  return r.critical + r.high;
}

/** The report immediately preceding `id` in a newest-first list, or null. */
export function priorReportOf(
  reportsDesc: AuditReport[],
  id: string,
): AuditReport | null {
  const idx = reportsDesc.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  return reportsDesc[idx + 1] ?? null; // DESC → next index is older
}

/** Cumulative recovery across every COMPLETE engagement. Always live. */
export function computeCumulative(
  reportsDesc: AuditReport[],
  engagementsById: Record<string, Engagement>,
): CumulativeSummary {
  const complete = Object.values(engagementsById).filter(
    (e) => e.status === "complete",
  );

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

  const earliest = reportsDesc[reportsDesc.length - 1];
  const latest = reportsDesc[0];
  const healthGain =
    earliest && latest ? latest.healthScore - earliest.healthScore : 0;

  return {
    cyclesCompleted: complete.length,
    totalRecovered,
    totalEstimated,
    totalFindingsResolved,
    totalFindingsRegressed,
    healthGain,
  };
}
