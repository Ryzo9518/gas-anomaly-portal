import * as React from "react";
import { Lock } from "lucide-react";

interface Props {
  title: string;
  body: string;
  unlocks: string;            // description of what unlocks this
  phase?: "1.5" | "2";
}

// Phase-2 route placeholder. Visible but non-interactive.
export function LockedState({ title, body, unlocks, phase = "2" }: Props) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <div className="inline-flex items-center gap-2 text-overline uppercase text-violet-700 bg-violet-50 ring-1 ring-violet-100 rounded-full px-3 py-1">
          <Lock className="h-3 w-3" /> Phase {phase} · Locked
        </div>
        <h1 className="mt-4 text-display text-slate-900">{title}</h1>
        <p className="mt-3 text-body text-slate-600 leading-relaxed">{body}</p>
        <div className="mt-5 text-support text-slate-500">
          <span className="font-semibold text-slate-700">Unlocks when:</span> {unlocks}
        </div>
        <div className="mt-5 text-caption text-slate-400">
          Scaffolding for this feature is preserved in the repo as a starting point only.
        </div>
      </div>
    </div>
  );
}
