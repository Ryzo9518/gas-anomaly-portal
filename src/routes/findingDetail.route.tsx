import * as React from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Lock,
  User as UserIcon,
  Tag,
  Banknote,
  Calendar,
} from "lucide-react";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageStickyHeader } from "@/shell/PageStickyHeader";
import { useReport } from "@/features/audit/ReportContext";
import type {
  Severity,
  Category,
  FindingStatus,
} from "@/features/audit/audit.fixture";

const SEVERITY_CHIP: Record<Severity, { cls: string; label: string }> = {
  critical: { cls: "bg-rose-50 text-rose-700 ring-rose-200", label: "Critical" },
  high: { cls: "bg-amber-50 text-amber-800 ring-amber-200", label: "High" },
  medium: { cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", label: "Medium" },
  low: { cls: "bg-slate-100 text-slate-600 ring-slate-200", label: "Low" },
};

const STATUS_CHIP: Record<FindingStatus, { cls: string; label: string }> = {
  open: { cls: "bg-slate-100 text-slate-700 ring-slate-200", label: "Open" },
  in_progress: { cls: "bg-amber-50 text-amber-800 ring-amber-200", label: "In progress" },
  resolved: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Resolved" },
  accepted_risk: { cls: "bg-violet-50 text-violet-700 ring-violet-200", label: "Risk accepted" },
};

const CATEGORY_LABEL: Record<Category, string> = {
  controls: "Controls",
  data_quality: "Data quality",
  leakage: "Leakage",
  efficiency: "Efficiency",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R ${(value / 1_000).toFixed(0)}K`;
  return `R ${value}`;
}

// ────────────────────────────────────────────────────────────────────────

export function FindingDetailRoute() {
  const { rank } = useParams<{ rank: string }>();
  const navigate = useNavigate();
  const { selectedReport, linkWithReport, isHistorical } = useReport();
  const findings = selectedReport.findings;
  const finding = findings.find((f) => f.rank === Number(rank));

  // Form state for the Ask-Jera form.
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sent, setSent] = React.useState(false);

  if (!finding) return <Navigate to="/findings" replace />;

  const sev = SEVERITY_CHIP[finding.severity];
  const stat = STATUS_CHIP[finding.status];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() && !body.trim()) return;
    // Mock submit — Phase 2 will POST to /api/inquiry and trigger Postmark.
    // For the prototype we just flip to the sent state.
    setSent(true);
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(linkWithReport("/findings"))}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All findings
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] text-slate-500 tracking-wider">
                  FINDING {finding.rank.toString().padStart(2, "0")} OF {findings.length}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset uppercase tracking-wider ${sev.cls}`}
                >
                  {sev.label}
                </span>
              </div>
              <h1 className="text-display text-slate-900">{finding.title}</h1>
            </div>
          </div>
        </div>
      </PageStickyHeader>

      {/* ── Meta grid: impact, owner, status, due ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 text-caption text-slate-500">
            <Banknote className="h-3.5 w-3.5" /> Financial impact
          </div>
          <div className="mt-1.5 font-display text-2xl text-slate-900 tracking-tighter tabular-nums">
            {finding.financialImpact > 0 ? formatCurrency(finding.financialImpact) : "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {finding.financialImpact > 0 ? "Annualised, modelled" : "Non-quantified"}
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 text-caption text-slate-500">
            <Tag className="h-3.5 w-3.5" /> Category
          </div>
          <div className="mt-1.5 font-display text-base text-slate-900 tracking-tight font-semibold">
            {CATEGORY_LABEL[finding.category]}
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 text-caption text-slate-500">
            <UserIcon className="h-3.5 w-3.5" /> Owner
          </div>
          <div className="mt-1.5 font-display text-base text-slate-900 tracking-tight font-semibold">
            {finding.ownerRole}
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 text-caption text-slate-500">
            <Calendar className="h-3.5 w-3.5" /> Status
          </div>
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${stat.cls}`}
            >
              {stat.label}
            </span>
          </div>
        </Card>
      </div>

      {/* ── Recommended fix ───────────────────────────────────────────── */}
      <Card padding="lg">
        <h2 className="text-section text-slate-900">Recommended remediation</h2>
        <p className="text-body text-slate-700 mt-2 leading-relaxed">
          {finding.recommendedFix}
        </p>
      </Card>

      {/* ── Ask Jera form ─────────────────────────────────────────────── */}
      <Card padding="lg">
        <h2 className="text-section text-slate-900">Ask Jera about this finding</h2>

        {isHistorical ? (
          /* Historical / closed cycle — no new inquiries against archived findings. */
          <>
            <p className="text-body text-slate-500 mt-1">
              Inquiries can only be raised against findings from the current audit cycle.
            </p>
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
              <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[13px] text-amber-900 leading-snug">
                This finding is from the <span className="font-semibold">{selectedReport.cycleLabel}</span> — a
                closed cycle. The inquiry form is locked. Contact your Jera consultant directly if you have
                questions about this historical finding.
              </p>
            </div>
          </>
        ) : (
          /* Live cycle — full inquiry form. */
          <>
            <p className="text-body text-slate-500 mt-1">
              Question, push-back, or context we should know? Send it through and a
              Jera consultant will reply by email within one business day.
            </p>
            {sent ? (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900 text-sm">
                    Sent to Jera
                  </div>
                  <div className="text-emerald-700 text-[12px] mt-0.5">
                    We&rsquo;ve logged your message against finding {finding.rank.toString().padStart(2, "0")}.
                    A consultant will reply by email within one business day. You&rsquo;ll
                    see this exchange under Inquiry history once the reply lands.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-3 max-w-xl">
                <div>
                  <label className="block text-caption text-slate-500 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Can we dispute the financial-impact figure?"
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
                  />
                </div>
                <div>
                  <label className="block text-caption text-slate-500 mb-1">Message</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="Add any context, evidence, or push-back you'd like Jera to address."
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!subject.trim() && !body.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send to Jera
                  </Button>
                  <span className="text-[11px] text-slate-400">
                    Replies arrive by email — we&rsquo;ll mirror them in the portal too.
                  </span>
                </div>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
