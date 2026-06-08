import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Handshake } from "lucide-react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { PageStickyHeader } from "@/shell/PageStickyHeader";
import { useReport } from "@/features/audit/ReportContext";
import type {
  Severity,
  Category,
  FindingStatus,
  EngagementFindingStatus,
} from "@/features/audit/reports.fixture";

// ── Formatting + chip helpers ───────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R ${(value / 1_000).toFixed(0)}K`;
  return `R ${value}`;
}

const SEVERITY_CHIP: Record<Severity, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  high: "bg-amber-50 text-amber-800 ring-amber-200",
  medium: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

// S-5: Severity left-border stripe on rank cell — scan the table by colour.
const SEVERITY_BORDER: Record<Severity, string> = {
  critical: "border-l-[3px] border-l-rose-400",
  high:     "border-l-[3px] border-l-amber-400",
  medium:   "border-l-[3px] border-l-indigo-400",
  low:      "border-l-[3px] border-l-slate-300",
};

const STATUS_CHIP: Record<FindingStatus, string> = {
  open: "bg-slate-100 text-slate-700 ring-slate-200",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  accepted_risk: "bg-violet-50 text-violet-700 ring-violet-200",
};

const STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  accepted_risk: "Risk accepted",
};

const CATEGORY_LABEL: Record<Category, string> = {
  controls: "Controls",
  data_quality: "Data quality",
  leakage: "Leakage",
  efficiency: "Efficiency",
};

// Engagement overlay — the per-row "is this finding in the plan?" badge.
const ENG_FINDING_BADGE: Record<EngagementFindingStatus, { label: string; cls: string }> = {
  included:  { label: "In plan",   cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  skipped:   { label: "Skipped",   cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  resolved:  { label: "Resolved",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  regressed: { label: "Regressed", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

// ── Active-pill gradient — matches KPI card icon badge gradient exactly ──────
const PILL_ACTIVE_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow:
    "0 2px 10px rgba(109,40,217,0.22), 0 1px 0 rgba(255,255,255,0.14) inset",
  color: "#FFFFFF",
};

// ── Filter pills ─────────────────────────────────────────────────────────────

type SeverityFilter = Severity | "all";
type CategoryFilter = Category | "all";
type StatusFilter = FindingStatus | "all";

interface FilterPillProps<T extends string> {
  label: string;
  value: T;
  current: T;
  onClick: (v: T) => void;
}
function FilterPill<T extends string>({ label, value, current, onClick }: FilterPillProps<T>) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      style={active ? PILL_ACTIVE_STYLE : undefined}
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold ring-1 ring-inset transition-colors ${
        active
          ? "ring-transparent"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────

export function FindingsRoute() {
  const navigate = useNavigate();
  const { selectedReport, engagement, canEditEngagement, linkWithReport } = useReport();
  const findings = selectedReport.findings;

  const [sev, setSev] = React.useState<SeverityFilter>("all");
  const [cat, setCat] = React.useState<CategoryFilter>("all");
  const [stat, setStat] = React.useState<StatusFilter>("all");

  // rank → engagement status (drives the overlay column).
  const engByRank = React.useMemo(() => {
    const m = new Map<number, EngagementFindingStatus>();
    engagement?.findings.forEach((f) => m.set(f.findingRank, f.status));
    return m;
  }, [engagement]);
  const showPlanColumn = !!engagement;

  const filtered = React.useMemo(
    () =>
      findings.filter((f) => {
        if (sev !== "all" && f.severity !== sev) return false;
        if (cat !== "all" && f.category !== cat) return false;
        if (stat !== "all" && f.status !== stat) return false;
        return true;
      }),
    [findings, sev, cat, stat],
  );

  const colCount = showPlanColumn ? 8 : 7;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <h1 className="text-display text-slate-900">Findings &amp; Roadmap</h1>
              <p className="text-body text-slate-500 mt-0.5">
                {filtered.length} of {findings.length} findings &middot; {selectedReport.cycleLabel}.
                Click any row to drill in or ask Jera.
              </p>
            </div>
            {canEditEngagement ? (
              <Button variant="primary" size="sm" onClick={() => navigate(linkWithReport("/engagement"))}>
                <Handshake className="h-4 w-4" aria-hidden="true" />
                Build engagement plan
              </Button>
            ) : engagement ? (
              <Button variant="secondary" size="sm" onClick={() => navigate(linkWithReport("/engagement"))}>
                <Handshake className="h-4 w-4" aria-hidden="true" />
                View engagement plan
              </Button>
            ) : null}
          </div>

          {/* Filter rows */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
              <span className="text-caption text-slate-500 mr-2">Severity</span>
              <FilterPill label="All" value="all" current={sev} onClick={setSev} />
              <FilterPill label="Critical" value="critical" current={sev} onClick={setSev} />
              <FilterPill label="High" value="high" current={sev} onClick={setSev} />
              <FilterPill label="Medium" value="medium" current={sev} onClick={setSev} />
              <FilterPill label="Low" value="low" current={sev} onClick={setSev} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption text-slate-500 mr-2 pl-[22px]">Category</span>
              <FilterPill label="All" value="all" current={cat} onClick={setCat} />
              <FilterPill label="Controls" value="controls" current={cat} onClick={setCat} />
              <FilterPill label="Data quality" value="data_quality" current={cat} onClick={setCat} />
              <FilterPill label="Efficiency" value="efficiency" current={cat} onClick={setCat} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption text-slate-500 mr-2 pl-[22px]">Status</span>
              <FilterPill label="All" value="all" current={stat} onClick={setStat} />
              <FilterPill label="Open" value="open" current={stat} onClick={setStat} />
              <FilterPill label="In progress" value="in_progress" current={stat} onClick={setStat} />
              <FilterPill label="Resolved" value="resolved" current={stat} onClick={setStat} />
            </div>
          </div>
        </div>
      </PageStickyHeader>

      {/* ── Findings table ────────────────────────────────────────────── */}
      <Card padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-caption text-slate-500 border-b border-slate-100">
              <th className="py-3 px-[18px] font-medium w-12">#</th>
              <th className="py-3 font-medium">Finding</th>
              <th className="py-3 font-medium w-28">Severity</th>
              <th className="py-3 font-medium w-36">Category</th>
              <th className="py-3 font-medium w-40">Owner</th>
              <th className="py-3 font-medium w-28">Status</th>
              {showPlanColumn && <th className="py-3 font-medium w-28">Plan</th>}
              <th className="py-3 px-[18px] font-medium text-right w-28">Impact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-12 text-center text-slate-500">
                  No findings match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((f) => {
                const engStatus = engByRank.get(f.rank);
                return (
                  <tr
                    key={f.rank}
                    className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => navigate(linkWithReport(`/findings/${f.rank}`))}
                  >
                    <td className={`py-3 px-[18px] font-mono text-xs text-slate-500 tabular-nums ${SEVERITY_BORDER[f.severity]}`}>
                      {f.rank.toString().padStart(2, "0")}
                    </td>
                    <td className="py-3 text-slate-900 font-medium max-w-md pr-4">{f.title}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset uppercase tracking-wider ${SEVERITY_CHIP[f.severity]}`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{CATEGORY_LABEL[f.category]}</td>
                    <td className="py-3 text-slate-600">{f.ownerRole}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${STATUS_CHIP[f.status]}`}
                      >
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                    {showPlanColumn && (
                      <td className="py-3">
                        {engStatus ? (
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${ENG_FINDING_BADGE[engStatus].cls}`}
                          >
                            {ENG_FINDING_BADGE[engStatus].label}
                          </span>
                        ) : (
                          <span className="text-caption text-slate-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-[18px] text-right font-display text-base font-bold tabular-nums text-slate-900 tracking-tight">
                      {f.financialImpact > 0 ? formatCurrency(f.financialImpact) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
