// src/shell/ClientSwitcher.tsx
// "Which client" control, in the TopBar header (moved here from the sidebar).
// Sits to the LEFT of the report pill so the breadcrumb reads Client › Report ›
// Section, mirroring the data model (Client → Report → Engagement). Still two
// distinct controls — one per concern. Uses the shared Popover (portalled) so
// the menu escapes the header's overflow-hidden, like the report pill. In a
// single-client view (scoped build / client portal) it renders a static label.
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover } from "@/ui/Popover";
import { useClient } from "@/features/clients/ClientContext";

export function ClientSwitcher() {
  const { clients, selectedClient, selectClient } = useClient();

  // Empty roster (fresh deploy / all revoked) → nothing to show.
  if (clients.length === 0) return null;

  // Single client (scoped build / client portal) → static label, no dropdown.
  if (clients.length <= 1) {
    return (
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-slate-700">
        <Building2 className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
        <span className="max-w-[180px] truncate">{selectedClient.info.name}</span>
      </div>
    );
  }

  return (
    <Popover
      align="start"
      width={240}
      className="p-1"
      trigger={
        <button
          type="button"
          aria-label="Switch client"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-slate-700",
            "transition-colors hover:bg-slate-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-1",
          )}
        >
          <Building2 className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
          <span className="max-w-[160px] truncate">{selectedClient.info.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      }
    >
      <div className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Clients
      </div>
      <ul role="listbox" className="max-h-[320px] overflow-y-auto">
        {clients.map((c) => {
          const active = c.id === selectedClient.id;
          return (
            <li key={c.id} role="option" aria-selected={active}>
              <PopoverPrimitive.Close asChild>
                <button
                  type="button"
                  onClick={() => selectClient(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px]",
                    active
                      ? "bg-violet-50 font-medium text-violet-900"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Building2
                    className={cn("h-3.5 w-3.5 shrink-0", active ? "text-violet-500" : "text-slate-400")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              </PopoverPrimitive.Close>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}
