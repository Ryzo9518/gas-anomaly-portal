import * as React from "react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/domain/lead";

// Exhaustive, GAS-specific status palette. Never grey-out "Unknown".

const STATUS_CONFIG: Record<LeadStatus, { label: string; cls: string; dot: string }> = {
  captured:     { label: "Captured",     cls: "bg-slate-100 text-slate-700 ring-slate-200",           dot: "bg-slate-400" },
  qualified:    { label: "Qualified",    cls: "bg-indigo-50 text-indigo-700 ring-indigo-200",         dot: "bg-indigo-500" },
  proposalOut:  { label: "Proposal Out", cls: "bg-amber-50 text-amber-800 ring-amber-200",            dot: "bg-amber-500" },
  signed:       { label: "Signed",       cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",      dot: "bg-emerald-600" },
  provisioning: { label: "Provisioning", cls: "bg-violet-50 text-violet-800 ring-violet-200",         dot: "bg-violet-600" },
  kickoffReady: { label: "Kickoff Ready", cls: "bg-slate-100 text-slate-800 ring-slate-300",           dot: "bg-slate-600" },
};

interface Props { status: LeadStatus; size?: "sm" | "md"; }

export function StatusChip({ status, size = "sm" }: Props) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-[5px] ring-1 ring-inset font-semibold",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[10.5px] px-2 py-[3px]",
        cfg.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
