import * as React from "react";
import { Card } from "@/ui/Card";
import { AlertTriangle } from "lucide-react";

interface Props { message?: string; onRetry?: () => void; }

// State card — uses the canonical <Card> surface with the standard md
// padding, and layers state colour via className.  No custom padding or
// radius; the Card system owns those.
export function ErrorState({ message = "Something went wrong loading this view.", onRetry }: Props) {
  return (
    <Card className="bg-rose-50/50 ring-rose-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-section text-slate-900">Couldn't load this surface</div>
          <p className="mt-0.5 text-body text-slate-600">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center h-8 px-3 rounded-md bg-slate-900 text-white text-body font-medium hover:bg-slate-800 active:bg-slate-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
