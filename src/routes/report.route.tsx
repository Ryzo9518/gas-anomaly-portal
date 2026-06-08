import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Download, FileText, Lock, ArrowRight,
} from "lucide-react";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageStickyHeader } from "@/shell/PageStickyHeader";
import { useReport } from "@/features/audit/ReportContext";

const REPORT_URL = "/mock-report/clientA_audit_2026Q1.html";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ReportRoute() {
  const navigate = useNavigate();
  const { clientInfo, selectedReport, engagement, isHistorical, linkWithReport } = useReport();

  const eng = engagement;

  // Determine the engagement CTA for the header button row.
  const engCta = (() => {
    if (isHistorical) {
      return { label: "View engagement", to: "/engagement", primary: false };
    }
    if (!eng || eng.status === "none") {
      return { label: "Build engagement plan", to: "/engagement", primary: true };
    }
    if (eng.status === "draft") {
      return { label: "Continue plan", to: "/engagement", primary: true };
    }
    return { label: "View engagement", to: "/engagement", primary: false };
  })();

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <h1 className="text-display text-slate-900">Audit Report</h1>
            <p className="text-body text-slate-500 mt-0.5">
              {selectedReport.cycleLabel} &middot; {clientInfo.name}
            </p>
          </div>

          {/* All actions live in the header — no banner in the body */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={engCta.primary ? "primary" : "secondary"}
              size="sm"
              onClick={() => navigate(linkWithReport(engCta.to))}
            >
              {engCta.label}
              {engCta.primary && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(REPORT_URL, "_blank")}
            >
              <Download className="h-3.5 w-3.5" />
              Download HTML
            </Button>
          </div>
        </div>
      </PageStickyHeader>

      {/* Report document */}
      {isHistorical ? (
        <Card padding="none" className="overflow-hidden">
          <div className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-[12px] text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-mono">{selectedReport.cycleLabel}</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Archived, generated {formatDate(selectedReport.completedAt)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-slate-50/40">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-[15px] font-semibold text-slate-900">Report document archived</p>
            <p className="mt-2 text-body text-slate-500 max-w-[440px] leading-relaxed">
              The <span className="font-semibold text-slate-700">{selectedReport.cycleLabel}</span> report
              was generated on {formatDate(selectedReport.completedAt)} and is stored in the Jera archive.
              Contact your Jera consultant to request the original document for this cycle.
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-[12px] text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-mono">{selectedReport.cycleLabel}</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Report locked, generated {formatDate(selectedReport.completedAt)}
            </span>
          </div>
          <iframe
            src={REPORT_URL}
            title="Audit report"
            className="block w-full h-[80vh] bg-slate-50"
            sandbox="allow-same-origin"
          />
        </Card>
      )}
    </div>
  );
}
