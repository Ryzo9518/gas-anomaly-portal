// src/features/audit/report-helpers.ts
// Client-agnostic report math. These used to live in reports.fixture.ts where
// they closed over that file's REPORTS_DESC — which made them single-client.
// They now take the active client's reports as an argument so ReportContext can
// call them with whichever client is selected.
import type {
  AuditReport,
  Engagement,
  CumulativeSummary,
  Severity,
} from "@/features/audit/reports.fixture";

/** The report immediately preceding `id` chronologically, or null at baseline. */
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

  return {
    cyclesCompleted: complete.length,
    totalRecovered,
    totalEstimated,
    totalFindingsResolved,
    totalFindingsRegressed,
    // No reports yet (a client with no audit data loaded) → no health gain to
    // show. Guards against indexing an empty reports array.
    healthGain: latest && earliest ? latest.healthScore - earliest.healthScore : 0,
  };
}

/** Total of all risk counts in a severity record. */
export function totalRisks(r: Record<Severity, number>): number {
  return r.critical + r.high + r.medium + r.low;
}

/** Critical + high risk count. */
export function severeRisks(r: Record<Severity, number>): number {
  return r.critical + r.high;
}
