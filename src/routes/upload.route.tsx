import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Database,
  Users,
  GitMerge,
  ShoppingCart,
  Receipt,
  Loader2,
  ShieldCheck,
  Download,
  Archive,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageStickyHeader } from "@/shell/PageStickyHeader";
import { useReport } from "@/features/audit/ReportContext";
import type { AuditUploadFile } from "@/features/audit/reports.fixture";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} KB`;
  return `${b} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `R ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R ${(v / 1_000).toFixed(0)}K`;
  return `R ${v}`;
}

// ── File type metadata ─────────────────────────────────────────────────────────
// Icon badges match the dashboard StatTile badge exactly:
// linear-gradient(135deg,#8b5cf6,#6366f1) · white icon · 36x36 · rounded-[8px]

const FILE_META: Record<
  AuditUploadFile["fileType"],
  { Icon: React.FC<{ className?: string }>; label: string; requirements: string }
> = {
  gl: {
    Icon: Database as React.FC<{ className?: string }>,
    label: "General Ledger",
    requirements:
      "All journal entries for the period: date, account code, debit/credit amounts, and reference. Must include both posted and provisional entries.",
  },
  ap: {
    Icon: Receipt as React.FC<{ className?: string }>,
    label: "Accounts Payable",
    requirements:
      "All supplier invoices and payment runs. Include cancelled and reversed transactions with the original document reference.",
  },
  po: {
    Icon: ShoppingCart as React.FC<{ className?: string }>,
    label: "Purchase Orders",
    requirements:
      "PO header and line detail for the full period. Include amended and cancelled POs; the audit engine uses version history to detect approval-bypass patterns.",
  },
  users: {
    Icon: Users as React.FC<{ className?: string }>,
    label: "User and Access",
    requirements:
      "All system users, their assigned roles, and last-login timestamps. Include inactive and deprovisioned accounts; segregation-of-duties checks need the full access history.",
  },
  workflows: {
    Icon: GitMerge as React.FC<{ className?: string }>,
    label: "Approval Workflows",
    requirements:
      "Workflow definitions and the full approval audit log for the period. Each approval step must carry the approver ID, timestamp, and outcome.",
  },
};

// Canonical badge — matches dashboard StatTile icon badge exactly.
const BADGE_CLS =
  "[background:linear-gradient(135deg,#8b5cf6,#6366f1)] shadow-[0_4px_10px_-4px_rgba(124,58,237,.35)]";

const FILE_ORDER: AuditUploadFile["fileType"][] = ["gl", "ap", "po", "users", "workflows"];

// ── ArchiveStatusBar ───────────────────────────────────────────────────────────
// Single-purpose: submission status only. KPIs live in OutcomeBand below.

function ArchiveStatusBar({
  uploadCount,
  submittedAt,
  cycleLabel,
}: {
  uploadCount: number;
  submittedAt: string;
  cycleLabel: string;
}) {
  return (
    <div className="relative flex items-center rounded-xl bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(0,0,0,.07),0_0_0_1px_rgba(0,0,0,.05)]">
      {/* Emerald left accent strip */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-600"
      />
      {/* Top-right corner warmth */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-52 w-52 rounded-full blur-xl bg-[rgba(209,250,229,0.35)]"
      />

      <div className="relative flex items-center gap-3 flex-1 pl-6 pr-5 py-3">
        {/* Emerald shield badge */}
        <div className="h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 text-white [background:linear-gradient(135deg,#34d399,#059669)] shadow-[0_4px_10px_-4px_rgba(16,185,129,.5)]">
          <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-slate-900">
              {uploadCount} of {uploadCount} files validated
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 uppercase tracking-wide">
              <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
              Submission locked
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {cycleLabel} &middot; Submitted {formatDate(submittedAt)} &middot; Processed by GAS Anomaly
          </p>
        </div>
      </div>
    </div>
  );
}

// ── FileCard ───────────────────────────────────────────────────────────────────

function FileCard({ file }: { file: AuditUploadFile }) {
  const { Icon, label, requirements } = FILE_META[file.fileType];

  return (
    <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow duration-150">
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <div className={cn("h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 text-white", BADGE_CLS)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-slate-900">{label}</span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Validated
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">{requirements}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 ring-1 ring-slate-100 px-3.5 py-2.5">
          <div className="font-mono text-[12px] text-slate-800 font-semibold truncate">{file.filename}</div>
          <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
            <span className="tabular-nums">{file.rows.toLocaleString()} rows</span>
            <span className="text-slate-300" aria-hidden="true">&middot;</span>
            <span className="tabular-nums">{formatBytes(file.sizeBytes)}</span>
            <span className="text-slate-300" aria-hidden="true">&middot;</span>
            <span>Submitted {formatDate(file.submittedAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── OutcomeBand ────────────────────────────────────────────────────────────────
// Compact single-row strip. Sits between the status bar and the file grid.

function OutcomeBand({
  cycleLabel,
  healthScore,
  findingCount,
  leakageEstimate,
  onViewReport,
}: {
  cycleLabel: string;
  healthScore: number;
  findingCount: number;
  leakageEstimate: number;
  onViewReport: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl px-5 py-3 flex items-center gap-4 flex-wrap [background:linear-gradient(135deg,#ede9fe_0%,rgba(237,233,254,.45)_50%,#fff_100%)] shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(109,40,217,.08),0_0_0_1px_#e9d5ff]">
      {/* Violet left accent */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-[#a78bfa] via-[#7c3aed] to-[#5b21b6]"
      />

      {/* Label + cycle */}
      <div className="relative flex items-center gap-2 min-w-0 flex-1">
        <span className="font-mono text-[8.5px] font-medium text-violet-500 uppercase tracking-[0.12em] shrink-0">
          Audit outcome
        </span>
        <span className="text-slate-300 text-[10px]" aria-hidden="true">&middot;</span>
        <span className="text-[12.5px] font-semibold text-slate-700 truncate">
          These files produced the{" "}
          <span className="text-violet-700">{cycleLabel}</span>.
        </span>
      </div>

      {/* KPI trio — compact */}
      <div className="relative flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-violet-400 shrink-0" aria-hidden="true" />
          <span className="font-display text-[16px] font-extrabold text-slate-900 tabular-nums tracking-[-0.03em] leading-none">
            {healthScore}
          </span>
          <span className="font-mono text-[8.5px] font-medium text-slate-400 uppercase tracking-[0.10em] leading-none">
            Health
          </span>
        </div>
        <div className="w-px h-5 bg-violet-100" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-display text-[16px] font-extrabold text-slate-900 tabular-nums tracking-[-0.03em] leading-none">
            {findingCount}
          </span>
          <span className="font-mono text-[8.5px] font-medium text-slate-400 uppercase tracking-[0.10em] leading-none">
            Findings
          </span>
        </div>
        <div className="w-px h-5 bg-violet-100" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <Banknote className="h-3 w-3 text-violet-400 shrink-0" aria-hidden="true" />
          <span className="font-display text-[16px] font-extrabold text-slate-900 tabular-nums tracking-[-0.03em] leading-none">
            {formatCurrency(leakageEstimate)}
          </span>
          <span className="font-mono text-[8.5px] font-medium text-slate-400 uppercase tracking-[0.10em] leading-none">
            Leakage
          </span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onViewReport}
        className="relative shrink-0"
      >
        View audit report
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── ArchiveView ────────────────────────────────────────────────────────────────
// Uniform 3-col grid — all 5 files are the same component.

function ArchiveView({
  uploads,
  submittedAt,
  healthScore,
  findingCount,
  leakageEstimate,
  cycleLabel,
  onViewReport,
}: {
  uploads: AuditUploadFile[];
  submittedAt: string;
  healthScore: number;
  findingCount: number;
  leakageEstimate: number;
  cycleLabel: string;
  onViewReport: () => void;
}) {
  return (
    <div className="space-y-4">
      <ArchiveStatusBar
        uploadCount={uploads.length}
        submittedAt={submittedAt}
        cycleLabel={cycleLabel}
      />

      {/* Outcome strip — compact, sits directly under the status bar */}
      <OutcomeBand
        cycleLabel={cycleLabel}
        healthScore={healthScore}
        findingCount={findingCount}
        leakageEstimate={leakageEstimate}
        onViewReport={onViewReport}
      />

      {/* 3-col grid — all files uniform */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uploads.map((f) => (
          <FileCard key={f.fileType} file={f} />
        ))}
      </div>
    </div>
  );
}

// ── Intake: CycleLockBanner ────────────────────────────────────────────────────
// Shown at the top of the new-cycle intake view. Explains why the prior cycle
// is closed and when the next annual window opens.
// Design: same horizontal strip pattern as OutcomeBand — violet gradient + left
// accent + BADGE_CLS icon. No amber (orange) — the design system avoids it here.

function CycleLockBanner({
  currentCycleLabel,
  submittedAt,
  nextCycleYear,
}: {
  currentCycleLabel: string;
  submittedAt: string;
  nextCycleYear: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl pl-6 pr-5 py-3 flex items-center gap-3 [background:linear-gradient(135deg,#ede9fe_0%,rgba(237,233,254,.45)_50%,#fff_100%)] shadow-[0_1px_2px_rgba(0,0,0,.05),0_4px_16px_rgba(109,40,217,.08),0_0_0_1px_#e9d5ff]">
      {/* Violet left accent — matches OutcomeBand exactly */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-[#a78bfa] via-[#7c3aed] to-[#5b21b6]"
      />

      {/* Lock badge — same BADGE_CLS as every other icon in the design system */}
      <div className={cn("relative h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 text-white", BADGE_CLS)}>
        <Lock className="h-[18px] w-[18px]" aria-hidden="true" />
      </div>

      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-bold text-slate-900">{currentCycleLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 uppercase tracking-wide">
            <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
            Closed
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500 leading-relaxed">
          Submission closed {formatDate(submittedAt)}. Results remain accessible in the archive.
          The {nextCycleYear} audit window typically opens Q1 {nextCycleYear} (est. March {nextCycleYear}).
        </p>
      </div>
    </div>
  );
}

// ── Intake: AnomalySnapshotCard ────────────────────────────────────────────────
// Premium paid feature — out-of-cycle anomaly detection. Available any time
// without waiting for the annual audit window.

function AnomalySnapshotCard() {
  // Sage X3-specific anomaly categories surfaced by the snapshot run.
  // No "payroll" framing — this product operates on Sage X3 ERP data streams.
  const FEATURES = [
    "All 5 Sage X3 data streams scanned: GL, AP, PO, User Access, and Workflow logs",
    "Flags duplicate journals, split invoices below approval thresholds, and retroactive POs",
    "Detects SOD violations, dormant accounts with active roles, and bypassed approval steps",
    "Full anomaly report and risk summary delivered within 48 hours",
  ];

  return (
    <div className="relative overflow-hidden rounded-xl ring-1 ring-violet-200 [background:linear-gradient(135deg,#faf5ff_0%,#ede9fe_60%,#f5f3ff_100%)]">
      {/* Soft glow — top-right corner */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full blur-2xl bg-violet-200/50"
      />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start gap-3.5">
          {/* Icon badge — matches design system BADGE_CLS exactly */}
          <div className={cn("h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 text-white", BADGE_CLS)}>
            <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-violet-900">Anomaly Snapshot</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9.5px] font-bold bg-violet-600 text-white uppercase tracking-wider">
                Premium
              </span>
            </div>
            <p className="mt-1 text-[12px] text-violet-700 leading-relaxed">
              Run an out-of-cycle anomaly scan against your Sage X3 data any time.
              No waiting for the Q1 annual window.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <ul className="mt-4 space-y-2">
          {FEATURES.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[12px] text-violet-800 leading-relaxed">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        {/* CTA row — standard primary Button, no custom style overrides */}
        <div className="mt-5 flex items-center gap-4 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => {}}>
            Request Snapshot
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11.5px] text-violet-500 font-medium">
            From R 2,500 per run &middot; Billed on request
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Intake: ScriptDownloadCard ─────────────────────────────────────────────────
// Step 1 of 2. Client downloads the export scripts, runs them on their Sage X3
// system, and receives a ZIP package containing all 5 audit files.

function ScriptDownloadCard({ cycleLabel }: { cycleLabel: string }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-5">
        <div className="font-mono text-[8.5px] font-medium text-slate-400 uppercase tracking-[0.12em] mb-3">
          Step 1 of 2
        </div>
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 text-white [background:linear-gradient(135deg,#6366f1,#4f46e5)] shadow-[0_4px_10px_-4px_rgba(99,102,241,.4)]">
            <Download className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-slate-900">Download Export Scripts</p>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
              Run these scripts on your Sage X3 system to extract the required audit files for the{" "}
              <span className="font-semibold text-slate-700">{cycleLabel}</span>. The scripts prepare
              all five files and output a single ZIP package ready for Step 2.
            </p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => {}}>
                <Download className="h-3.5 w-3.5" />
                Download scripts v2.1
              </Button>
              <span className="text-[11px] text-slate-400">
                Sage X3 ERP
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Intake: ZipDropZone ────────────────────────────────────────────────────────
// Step 2 of 2. Single ZIP upload replaces 5 separate file zones.
// The system unpacks and validates each file from the archive.

type ZipDropState = "idle" | "processing" | "done";

function ZipDropZone({
  state,
  zipFilename,
  cycleLabel,
  onFileSelected,
}: {
  state: ZipDropState;
  zipFilename: string;
  cycleLabel: string;
  onFileSelected: (name: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isActive = state === "idle";
  const year = cycleLabel.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear());

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && isActive) onFileSelected(file.name);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file.name);
      e.target.value = "";
    }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-5">
        <div className="font-mono text-[8.5px] font-medium text-slate-400 uppercase tracking-[0.12em] mb-3">
          Step 2 of 2
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="sr-only"
          onChange={handleChange}
          tabIndex={-1}
        />
        <div
          onClick={() => isActive && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            if (isActive && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role={isActive ? "button" : undefined}
          tabIndex={isActive ? 0 : undefined}
          aria-label="Upload audit ZIP package"
          className={cn(
            "rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-12 px-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
            isActive &&
              "cursor-pointer border-slate-200 hover:border-violet-300 hover:bg-violet-50/20",
            state === "processing" && "border-violet-200 bg-violet-50/20 cursor-wait",
            state === "done" && "border-emerald-200 bg-emerald-50/20",
          )}
        >
          {state === "idle" && (
            <>
              <div className="h-12 w-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center mb-4">
                <Archive className="h-6 w-6 text-slate-400" aria-hidden="true" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">Drop your audit package here</p>
              <p className="mt-1.5 text-[12px] text-slate-400 font-mono">
                GAS_Audit_Package_{year}.zip
              </p>
              <p className="mt-3 text-[12px] text-slate-400">
                or{" "}
                <span className="text-violet-600 font-semibold">click to browse</span>
              </p>
              <p className="mt-4 w-full border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                Expects: GL &middot; AP &middot; PO &middot; User &amp; Access &middot; Workflows
              </p>
            </>
          )}

          {state === "processing" && (
            <>
              <div className="h-12 w-12 rounded-2xl bg-violet-50 ring-1 ring-violet-200 flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 text-violet-500 animate-spin" aria-hidden="true" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">Extracting package</p>
              <p className="mt-1.5 text-[12px] text-slate-500 font-mono">{zipFilename}</p>
              <p className="mt-2 text-[12px] text-violet-600 font-medium">Validating contents...</p>
            </>
          )}

          {state === "done" && (
            <>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center mb-4">
                <Archive className="h-6 w-6 text-emerald-500" aria-hidden="true" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">Package extracted</p>
              <p className="mt-1.5 text-[12px] text-slate-500 font-mono">{zipFilename}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                All 5 files found
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Intake: ExtractionTile ─────────────────────────────────────────────────────
// Appears progressively as files are pulled from the ZIP — one at a time.
// The tile transitions extracting -> validating -> passed automatically.

type TileExtractState = "extracting" | "validating" | "passed";

function ExtractionTile({
  fileType,
  state,
}: {
  fileType: AuditUploadFile["fileType"];
  state: TileExtractState;
}) {
  const { Icon, label } = FILE_META[fileType];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex items-center gap-3 transition-all duration-300",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        state === "passed" && "border-emerald-200 bg-emerald-50/30",
        (state === "extracting" || state === "validating") &&
          "border-violet-200 bg-violet-50/20",
      )}
    >
      {state === "passed" ? (
        <div
          className={cn(
            "h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 text-white",
            BADGE_CLS,
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      ) : (
        <div className="h-9 w-9 rounded-[8px] bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
          <Loader2 className="h-[18px] w-[18px] text-violet-500 animate-spin" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-slate-900">{label}</span>
          {state === "passed" && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
              Validated
            </span>
          )}
          {state === "extracting" && (
            <span className="text-[11px] text-violet-500 font-medium">Extracting...</span>
          )}
          {state === "validating" && (
            <span className="text-[11px] text-violet-500 font-medium">Validating...</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Extraction sequence ────────────────────────────────────────────────────────
// Staggered timeline that drives the per-tile state transitions.

const EXTRACT_SEQ: Array<{
  ms: number;
  updates: Partial<Record<AuditUploadFile["fileType"], TileExtractState>>;
}> = [
  { ms: 350,  updates: { gl: "extracting" } },
  { ms: 750,  updates: { gl: "validating",  ap: "extracting" } },
  { ms: 1100, updates: { gl: "passed",      ap: "validating",  po: "extracting" } },
  { ms: 1450, updates: {                    ap: "passed",      po: "validating",  users: "extracting" } },
  { ms: 1800, updates: {                                       po: "passed",      users: "validating",  workflows: "extracting" } },
  { ms: 2150, updates: {                                                          users: "passed",      workflows: "validating" } },
  { ms: 2500, updates: {                                                                                workflows: "passed" } },
];

// ── IntakeView ─────────────────────────────────────────────────────────────────
// 2-step flow: download scripts -> drop ZIP -> tiles appear as extraction runs.
//
// When isNewCycle = true (launched from "Run new audit" on the current archive):
//   - cycleLabel is the NEXT cycle, e.g. "2027 Annual Audit"
//   - A CycleLockBanner explains that the prior cycle is closed
//   - An AnomalySnapshotCard offers the premium out-of-cycle alternative
//
// When isNewCycle = false:
//   - cycleLabel is the current cycle (first-time upload, no prior archive)
//   - No lock banner or anomaly card shown

function IntakeView({
  cycleLabel,
  onSubmit,
  isNewCycle,
  currentCycleLabel,
  submittedAt,
  nextCycleYear,
}: {
  cycleLabel: string;
  onSubmit: () => void;
  isNewCycle?: boolean;
  currentCycleLabel?: string;
  submittedAt?: string;
  nextCycleYear?: number;
}) {
  const [zipState, setZipState] = React.useState<ZipDropState>("idle");
  const [zipFilename, setZipFilename] = React.useState("");
  const [tileStates, setTileStates] = React.useState<
    Partial<Record<AuditUploadFile["fileType"], TileExtractState>>
  >({});

  const visibleTypes = FILE_ORDER.filter((t) => tileStates[t] !== undefined);
  const allPassed = FILE_ORDER.every((t) => tileStates[t] === "passed");

  function handleZipSelected(name: string) {
    setZipFilename(name);
    setZipState("processing");

    // Staggered extraction sequence
    EXTRACT_SEQ.forEach(({ ms, updates }) => {
      setTimeout(() => {
        setTileStates((prev) => ({ ...prev, ...updates }));
      }, ms);
    });

    // Mark ZIP as done once all tiles have resolved
    const lastMs = EXTRACT_SEQ[EXTRACT_SEQ.length - 1].ms;
    setTimeout(() => setZipState("done"), lastMs + 200);
  }

  return (
    <div className="space-y-4">
      {/* Lock context banner — new cycle only */}
      {isNewCycle && currentCycleLabel && submittedAt && nextCycleYear && (
        <CycleLockBanner
          currentCycleLabel={currentCycleLabel}
          submittedAt={submittedAt}
          nextCycleYear={nextCycleYear}
        />
      )}

      {/* Section subheading — new cycle only */}
      {isNewCycle && nextCycleYear && (
        <div className="pt-1">
          <div className="font-mono text-[8.5px] font-medium text-violet-400 uppercase tracking-[0.12em] mb-1.5">
            Full annual audit
          </div>
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
            {nextCycleYear} Annual Audit Setup
          </h2>
        </div>
      )}

      <ScriptDownloadCard cycleLabel={cycleLabel} />

      <ZipDropZone
        state={zipState}
        zipFilename={zipFilename}
        cycleLabel={cycleLabel}
        onFileSelected={handleZipSelected}
      />

      {/* Extraction tiles — appear one-by-one as the ZIP is processed */}
      {visibleTypes.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[8.5px] font-medium text-slate-400 uppercase tracking-[0.12em]">
            Extracting files from package
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visibleTypes.map((type) => (
              <ExtractionTile
                key={type}
                fileType={type}
                state={tileStates[type] as TileExtractState}
              />
            ))}
          </div>
        </div>
      )}

      {allPassed && (
        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onSubmit}>
            Submit for audit
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* OR divider + Anomaly Snapshot — new cycle only */}
      {isNewCycle && (
        <>
          <div className="relative flex items-center gap-3 pt-2 pb-1">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-violet-100" />
            <span className="text-[10.5px] font-semibold text-violet-400 uppercase tracking-[0.14em] shrink-0">
              or run a mid-cycle check
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-200 to-violet-100" />
          </div>
          <AnomalySnapshotCard />
        </>
      )}
    </div>
  );
}

// ── UploadRoute ────────────────────────────────────────────────────────────────

export function UploadRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedReport, selectedReportUploads, isHistorical, linkWithReport } = useReport();

  const uploads = selectedReportUploads;
  // Show intake when ?mode=new is set (regardless of existing uploads) OR when no uploads yet.
  const isNewAudit = searchParams.get("mode") === "new";
  const isArchive = uploads.length > 0 && !isNewAudit;

  // Next cycle — year + label derived from the current report's shortLabel.
  const nextCycleYear = parseInt(selectedReport.shortLabel, 10) + 1;
  const nextCycleLabel = `${nextCycleYear} Annual Audit`;

  // "Run new audit" navigates to the same report's upload page with mode=new.
  const newAuditHref = linkWithReport("/upload") + "&mode=new";
  // "Back to archive" strips the mode=new param.
  const backToArchiveHref = linkWithReport("/upload");

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-220 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <PageStickyHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <h1 className="text-display text-slate-900">
              {isNewAudit ? `${nextCycleYear} Annual Audit` : "Upload Centre"}
            </h1>
            <p className="text-body text-slate-500 mt-0.5">
              {isNewAudit
                ? `New cycle setup · ${selectedReport.cycleLabel} locked ${formatDate(selectedReport.uploadSubmittedAt)}`
                : isArchive
                  ? `${selectedReport.cycleLabel} · ${uploads.length} files · submitted ${formatDate(selectedReport.uploadSubmittedAt)}`
                  : `${selectedReport.cycleLabel} · Download the export scripts, then upload your audit package`
              }
            </p>
          </div>

          {/* Right action — mutually exclusive */}
          {isNewAudit ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(backToArchiveHref)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to {selectedReport.shortLabel} Archive
            </Button>
          ) : isArchive && !isHistorical ? (
            <Button variant="primary" size="sm" onClick={() => navigate(newAuditHref)}>
              Run new audit
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </PageStickyHeader>

      {isArchive ? (
        <ArchiveView
          uploads={uploads}
          submittedAt={selectedReport.uploadSubmittedAt}
          healthScore={selectedReport.healthScore}
          findingCount={selectedReport.findings.length}
          leakageEstimate={selectedReport.leakageEstimate}
          cycleLabel={selectedReport.cycleLabel}
          onViewReport={() => navigate(linkWithReport("/report"))}
        />
      ) : (
        <IntakeView
          cycleLabel={isNewAudit ? nextCycleLabel : selectedReport.cycleLabel}
          onSubmit={() => navigate(linkWithReport("/dashboard"))}
          isNewCycle={isNewAudit}
          currentCycleLabel={isNewAudit ? selectedReport.cycleLabel : undefined}
          submittedAt={isNewAudit ? selectedReport.uploadSubmittedAt : undefined}
          nextCycleYear={isNewAudit ? nextCycleYear : undefined}
        />
      )}
    </div>
  );
}
