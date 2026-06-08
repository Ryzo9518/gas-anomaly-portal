import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Short label naming the locked affordance (e.g. "Activity log"). */
  label: string;
  /** Optional sub-label explaining why it is locked. */
  sublabel?: string;
  /** Override layout class (rare — defaults to inline-flex). */
  className?: string;
}

/**
 * Inline locked-affordance chip.
 *
 * Companion to `<LockedState>` (the full-page locked placeholder used by
 * /analytics, /sla, /voucher, etc.). LockedState owns full-page locked
 * surfaces; LockedActionChip owns INLINE locked surfaces where a button
 * or CTA would otherwise sit. Both share the same violet + lock visual
 * language so a "locked" affordance reads identically wherever it
 * appears.
 *
 * Used to replace disabled buttons whose disabled-state was being read
 * by operators as a live affordance (IP-1 disabled-button
 * rationalisation pass). The chip is non-interactive by design — no
 * onClick, no tab-stop, no tooltip — so it cannot be mistaken for a
 * button.
 */
export function LockedActionChip({ label, sublabel, className }: Props) {
  return (
    <span
      role="note"
      aria-label={sublabel ? `${label} — ${sublabel}` : `${label} — locked`}
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md ring-1 ring-inset",
        "bg-violet-50/60 ring-violet-200/70 text-violet-900",
        "select-none",
        className,
      )}
    >
      <Lock className="h-3 w-3 shrink-0 text-violet-700" aria-hidden="true" />
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-violet-700">
        Locked
      </span>
      <span className="text-slate-300" aria-hidden="true">·</span>
      <span className="text-caption font-semibold text-slate-900 truncate">
        {label}
      </span>
      {sublabel && (
        <>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-caption text-slate-600 truncate">
            {sublabel}
          </span>
        </>
      )}
    </span>
  );
}
