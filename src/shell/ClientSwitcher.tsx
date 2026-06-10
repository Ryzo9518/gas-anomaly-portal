// src/shell/ClientSwitcher.tsx
// Highest-level "which client" control. Distinct from the violet report pill in
// TopBar (LESSON-1: one control per concern). Internal build only — in a scoped
// per-client build there is a single client, shown as a static label.
import * as React from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClient } from "@/features/clients/ClientContext";

export function ClientSwitcher({ collapsed }: { collapsed: boolean }) {
  const { clients, selectedClient, selectClient } = useClient();
  const [open, setOpen] = React.useState(false);

  // Empty roster (fresh deploy / all revoked) → no client to show; hide entirely.
  // The sidebar nav still leads to the Clients screen to create the first one.
  if (clients.length === 0) return null;

  // Single-client (scoped) build → static label, no interactivity.
  if (clients.length <= 1) {
    if (collapsed) return null;
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-slate-300">
        <Building2 className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
        <span className="truncate text-[13px] font-semibold text-white">
          {selectedClient.info.name}
        </span>
      </div>
    );
  }

  if (collapsed) {
    // Collapsed rail: icon only; clicking cycles to the next client.
    const idx = clients.findIndex((c) => c.id === selectedClient.id);
    const next = clients[(idx + 1) % clients.length];
    return (
      <button
        type="button"
        onClick={() => selectClient(next.id)}
        aria-label={`Client: ${selectedClient.info.name}. Switch to ${next.name}`}
        className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-violet-300 ring-1 ring-inset ring-white/10 hover:bg-white/5"
      >
        <Building2 className="h-[17px] w-[17px]" />
      </button>
    );
  }

  return (
    <div className="relative mx-3 mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2",
          "ring-1 ring-inset ring-white/10 hover:bg-white/5 transition-colors",
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
        <span className="flex-1 truncate text-left text-[13px] font-semibold text-white">
          {selectedClient.info.name}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg bg-slate-900 ring-1 ring-white/10 shadow-xl"
        >
          {clients.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === selectedClient.id}>
              <button
                type="button"
                onClick={() => {
                  selectClient(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-2.5 py-2 text-left text-[13px]",
                  c.id === selectedClient.id
                    ? "bg-violet-500/20 text-white"
                    : "text-slate-300 hover:bg-white/5",
                )}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
