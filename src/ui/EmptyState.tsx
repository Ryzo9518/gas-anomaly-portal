import * as React from "react";
import { cn } from "@/lib/utils";
import { CircleDashed } from "lucide-react";

interface Props {
  variant?: "content" | "filter";
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ variant = "content", title, body, ctaLabel, onCta, icon, className }: Props) {
  return (
    <div className={cn("py-14 px-6 flex flex-col items-center text-center", className)}>
      <div className="h-12 w-12 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center text-indigo-700">
        {icon ?? <CircleDashed className="h-5 w-5" />}
      </div>
      <h4 className="mt-3 text-section font-semibold text-slate-900">{title}</h4>
      {body && <p className="mt-1 text-body text-slate-500 max-w-sm">{body}</p>}
      {ctaLabel && (
        <button
          onClick={onCta}
          className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 text-white text-body font-medium hover:bg-slate-800"
        >
          {ctaLabel}
        </button>
      )}
      {variant === "filter" && !ctaLabel && (
        <p className="mt-2 text-caption text-slate-400">Try clearing filters or switching saved view.</p>
      )}
    </div>
  );
}
