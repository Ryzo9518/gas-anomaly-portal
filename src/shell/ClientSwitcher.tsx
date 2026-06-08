import * as React from "react";
import { Building2, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClient } from "@/features/clients/ClientContext";

// CLIENT SWITCHER — sidebar control, internal (all-clients) builds only.
//
//   • Internal build (clients.length > 1): a real selector to switch the active
//     client in-browser during a demo. Visually slate/neutral — deliberately
//     NOT the violet report pill (LESSON-1: one primary accent per surface).
//   • Scoped per-client build (one client): renders the client name as a static
//     label — never a switcher (there is nothing to switch to).
//   • Collapsed sidebar: hidden to keep the rail clean; expand to switch.

export function ClientSwitcher({ collapsed }: { collapsed: boolean }) {
  const { clients, isInternalBuild, selectedClientId, selectClient } =
    useClient();

  if (collapsed) return null;

  const canSwitch = isInternalBuild && clients.length > 1;
  const current =
    clients.find((c) => c.id === selectedClientId)?.name ?? selectedClientId;

  if (!canSwitch) {
    // Static label (scoped per-client build).
    return (
      <div className="px-3 pt-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2",
            "bg-slate-950/40 ring-1 ring-slate-700/60 text-slate-200",
          )}
        >
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-[13px] font-medium">{current}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3">
      <label className="sr-only" htmlFor="client-switcher">
        Select client
      </label>
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-lg px-3 py-2",
          "bg-slate-950/40 ring-1 ring-slate-700/60 text-slate-200",
          "focus-within:ring-2 focus-within:ring-indigo-500/60",
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
        <select
          id="client-switcher"
          value={selectedClientId}
          onChange={(e) => selectClient(e.target.value)}
          className={cn(
            "w-full appearance-none bg-transparent pr-5 text-[13px] font-medium",
            "text-slate-100 outline-none cursor-pointer",
          )}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
              {c.name}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-500" />
      </div>
    </div>
  );
}
