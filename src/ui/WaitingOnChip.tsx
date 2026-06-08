import * as React from "react";
import { cn } from "@/lib/utils";
import type { WaitingOn } from "@/domain/lead";

const CONFIG: Record<WaitingOn, { label: string; cls: string }> = {
  you:    { label: "You",    cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  sage:   { label: "Sage",   cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  client: { label: "Client", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  system: { label: "System", cls: "bg-slate-50 text-slate-600 ring-slate-200" },
};

export function WaitingOnChip({ who }: { who: WaitingOn }) {
  const cfg = CONFIG[who];
  return (
    <span className={cn("inline-flex items-center rounded-md ring-1 ring-inset text-[11px] font-semibold px-1.5 py-0.5", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
