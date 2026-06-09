import * as React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useClient } from "@/features/clients/ClientContext";
import { priorReportOf, computeCumulative } from "@/features/audit/report-helpers";
import type { ClientInfo } from "@/features/clients/clients.types";
import type {
  AuditReport,
  AuditUploadFile,
  Engagement,
  EngagementFinding,
  CumulativeSummary,
} from "@/features/audit/reports.fixture";

// ============================================================================
// REPORT CONTEXT — the global "which report am I looking at" provider.
//
//   • The selected report lives in the URL  (?report=2026)  so it is
//     shareable, bookmarkable and survives browser back/forward.
//   • Every screen reads `selectedReport` from here and rehydrates.
//   • Engagements are held in session state, seeded from the fixture.
//     submitEngagement() flips a report's plan draft → submitted and the
//     change propagates to EVERY screen at once (findings overlay,
//     dashboard pill, engagement lock).
// ============================================================================

export interface SubmitEngagementInput {
  improvementHoursPerMonth: number;
  supportHoursPerMonth: number;
  months: number;
  estimatedSavings: number;
  findings: EngagementFinding[];
}

interface ReportContextValue {
  clientInfo: ClientInfo;          // name + healthTarget of the selected client
  reports: AuditReport[];          // newest first
  selectedReport: AuditReport;
  selectedReportId: string;
  selectReport: (id: string) => void;

  priorReport: AuditReport | null; // chronological predecessor (null at baseline)
  priorEngagement: Engagement | null; // the prior cycle's plan (for carry-over)
  isBaseline: boolean;             // selected has no prior
  isLatest: boolean;               // selected is the newest report
  isHistorical: boolean;           // selected is NOT the newest report

  engagement: Engagement | null;   // the plan for the selected report
  engagementsById: Record<string, Engagement>;
  canEditEngagement: boolean;      // latest cycle + plan still none/draft → editable
  submitEngagement: (input: SubmitEngagementInput) => void;
  saveDraft: (input: SubmitEngagementInput) => void;

  cumulative: CumulativeSummary;

  // Per-cycle upload files — the set of files that produced this report.
  // Empty array for a cycle that hasn't been submitted yet (shows intake view).
  selectedReportUploads: AuditUploadFile[];

  // Navigation helpers — every internal link must carry the selected report so
  // the whole app stays on ONE cycle as you move between pages. `reportSearch`
  // is the ready-made "?report=2026" string; `linkWithReport` appends it safely.
  reportSearch: string;
  linkWithReport: (path: string) => string;
}

const ReportContext = React.createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Report data for the SELECTED client (Providers remounts this provider on
  // client change, so these are stable for the lifetime of one client view).
  const {
    reports: REPORTS,
    reportsDesc: REPORTS_DESC,
    latestReportId: LATEST_REPORT_ID,
    seedEngagements: SEED_ENGAGEMENTS,
    selectedClientId,
    clientInfo,
  } = useClient();

  const isValidReport = React.useCallback(
    (id: string | null): id is string => !!id && REPORTS.some((r) => r.id === id),
    [REPORTS],
  );

  // Engagements seeded from fixture; mutated in-session on submit/save.
  const [engagementsById, setEngagementsById] = React.useState<
    Record<string, Engagement>
  >(() => ({ ...SEED_ENGAGEMENTS }));

  // ── Selected report — URL-driven, but DURABLE across naked navigations ────
  //
  // The bug this fixes: a <NavLink to="/findings"> (no query string) used to
  // drop ?report=2024, so the context fell back to the latest cycle and every
  // screen snapped back to 2026. Now the selection is remembered in state and
  // a valid ?report= in the URL always wins (shared links / back-forward).
  // When the URL loses the param, the self-heal effect below puts it back —
  // a single, generic mechanism so NO individual link can ever drift.
  const urlReportId = searchParams.get("report");

  const [rememberedReportId, setRememberedReportId] = React.useState<string>(
    () => (isValidReport(urlReportId) ? urlReportId : LATEST_REPORT_ID),
  );

  const selectedReportId = isValidReport(urlReportId)
    ? urlReportId
    : rememberedReportId;

  // Remember a valid URL selection so later naked navigations restore IT.
  React.useEffect(() => {
    if (isValidReport(urlReportId) && urlReportId !== rememberedReportId) {
      setRememberedReportId(urlReportId);
    }
  }, [urlReportId, rememberedReportId]);

  // SELF-HEAL: if the path lost the report param, rewrite it from memory.
  // replace:true → no history spam; the screen already renders selectedReportId
  // so there is no flash back to the latest cycle.
  React.useEffect(() => {
    if (!isValidReport(urlReportId)) {
      const next = new URLSearchParams(searchParams);
      next.set("report", selectedReportId);
      setSearchParams(next, { replace: true });
    }
  }, [location.pathname, urlReportId, selectedReportId, searchParams, setSearchParams]);

  const selectedReport =
    REPORTS.find((r) => r.id === selectedReportId) ?? REPORTS_DESC[0];

  const selectReport = React.useCallback(
    (id: string) => {
      if (!isValidReport(id)) return;
      setRememberedReportId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("report", id); // always explicit → shareable + self-heal-safe
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const isLatest = selectedReportId === LATEST_REPORT_ID;
  const isHistorical = !isLatest;
  const engagement = engagementsById[selectedReportId] ?? null;

  // Editable ONLY on the latest cycle while the plan is still being built
  // (none/draft). Once submitted — or on ANY historical report — it is frozen.
  // Decision (locked): one audit per year, prior cycles immutable, no amendments.
  const canEditEngagement =
    isLatest &&
    (!engagement || engagement.status === "none" || engagement.status === "draft");

  // ── Mutations ────────────────────────────────────────────────────────────
  // Hard freeze guard: a plan can only be written on the LATEST cycle. Any
  // attempt to mutate a historical/locked cycle is a no-op — defence in depth
  // behind the UI, which already hides every edit affordance off the latest.
  const submitEngagement = React.useCallback(
    (input: SubmitEngagementInput) => {
      if (selectedReportId !== LATEST_REPORT_ID) return;
      setEngagementsById((prev) => ({
        ...prev,
        [selectedReportId]: {
          reportId: selectedReportId,
          status: "submitted",
          submittedAt: new Date().toISOString(),
          improvementHoursPerMonth: input.improvementHoursPerMonth,
          supportHoursPerMonth: input.supportHoursPerMonth,
          months: input.months,
          estimatedSavings: input.estimatedSavings,
          findings: input.findings,
        },
      }));
    },
    [selectedReportId],
  );

  const saveDraft = React.useCallback(
    (input: SubmitEngagementInput) => {
      if (selectedReportId !== LATEST_REPORT_ID) return;
      setEngagementsById((prev) => ({
        ...prev,
        [selectedReportId]: {
          ...(prev[selectedReportId] ?? { reportId: selectedReportId }),
          reportId: selectedReportId,
          status: "draft",
          improvementHoursPerMonth: input.improvementHoursPerMonth,
          supportHoursPerMonth: input.supportHoursPerMonth,
          months: input.months,
          estimatedSavings: input.estimatedSavings,
          findings: input.findings,
        },
      }));
    },
    [selectedReportId],
  );

  // ── Derived ──────────────────────────────────────────────────────────────
  const priorReport = React.useMemo(
    () => priorReportOf(REPORTS_DESC, selectedReportId),
    [REPORTS_DESC, selectedReportId],
  );

  const priorEngagement = priorReport
    ? engagementsById[priorReport.id] ?? null
    : null;

  const cumulative = React.useMemo(
    () => computeCumulative(REPORTS_DESC, engagementsById),
    [REPORTS_DESC, engagementsById],
  );

  const reportSearch = `?client=${selectedClientId}&report=${selectedReportId}`;
  const linkWithReport = React.useCallback(
    (path: string) =>
      `${path}${path.includes("?") ? "&" : "?"}client=${selectedClientId}&report=${selectedReportId}`,
    [selectedClientId, selectedReportId],
  );

  const value: ReportContextValue = {
    clientInfo,
    reports: REPORTS_DESC,
    selectedReport,
    selectedReportId,
    selectReport,
    priorReport,
    priorEngagement,
    isBaseline: priorReport === null,
    isLatest,
    isHistorical,
    engagement,
    engagementsById,
    canEditEngagement,
    submitEngagement,
    saveDraft,
    cumulative,
    selectedReportUploads: selectedReport.uploads,
    reportSearch,
    linkWithReport,
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextValue {
  const ctx = React.useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used within <ReportProvider>");
  return ctx;
}
