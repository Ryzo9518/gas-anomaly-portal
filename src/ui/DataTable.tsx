import * as React from "react";
import { cn } from "@/lib/utils";

// Thin wrapper that composes a consistent dense table. Views spread into tbody.
// Not a generic renderer — feature tables remain explicit.

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg ring-1 ring-slate-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-body">{children}</table>
      </div>
    </div>
  );
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead>
      <tr className={cn("text-left text-overline uppercase text-slate-500 bg-slate-50/60 border-b border-slate-200", className)}>
        {children}
      </tr>
    </thead>
  );
}

export function TH({ children, className, align }: { children: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return <th className={cn("px-3 py-2.5 font-semibold", align === "right" && "text-right", className)}>{children}</th>;
}

export function TD({ children, className, align, onClick }: { children: React.ReactNode; className?: string; align?: "left" | "right"; onClick?: () => void }) {
  return <td onClick={onClick} className={cn("px-3 py-2.5 text-slate-900", align === "right" && "text-right", className)}>{children}</td>;
}
