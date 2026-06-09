// The "which client am I looking at" provider. Mirrors ReportContext:
//   • selection lives in the URL (?client=tourvest) so it is shareable;
//   • a missing/invalid param self-heals from memory (replace:true, no flash);
//   • selecting a client repoints via remount (ReportProvider is keyed by id).
//
// Data comes from the `clients` PORT (async), NOT a static fixture import — so a
// client-portal build (VITE_DATA_ADAPTER=bff) tree-shakes the registry/fixtures
// out of the bundle entirely (R13). The mock port reads the build-time registry
// (internal/staff build, all demo clients); the bff port fetches the signed-in
// client's own data from the backend. Children render only once data is loaded,
// so ReportContext + every screen stay synchronous and unchanged.
import * as React from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { clients as clientsPort } from "@/adapters";
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import type {
  ClientEntry,
  ClientInfo,
  ClientSummary,
} from "@/features/clients/clients.types";

interface ClientContextValue {
  clients: ClientSummary[];
  selectedClient: ClientEntry;
  selectedClientId: string;
  selectClient: (id: string) => void;
  clientInfo: ClientInfo;
  reports: AuditReport[];
  reportsDesc: AuditReport[];
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
}

const ClientContext = React.createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlClientId = searchParams.get("client");

  const [summaries, setSummaries] = React.useState<ClientSummary[] | null>(null);
  const [entry, setEntry] = React.useState<ClientEntry | null>(null);
  const [failed, setFailed] = React.useState(false);

  // Load the client list once.
  React.useEffect(() => {
    let live = true;
    clientsPort
      .listClients()
      .then((s) => live && setSummaries(s))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const isValid = (id: string | null): id is string =>
    !!id && !!summaries && summaries.some((c) => c.id === id);

  const selectedClientId: string | null = summaries
    ? isValid(urlClientId)
      ? urlClientId
      : summaries[0]?.id ?? null
    : null;

  // Load the selected client's full entry whenever the selection resolves/changes.
  React.useEffect(() => {
    if (!selectedClientId) return;
    let live = true;
    setEntry(null);
    clientsPort
      .getClient(selectedClientId)
      .then((e) => live && setEntry(e))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [selectedClientId]);

  // SELF-HEAL: once the list is known, rewrite a missing/invalid ?client=.
  React.useEffect(() => {
    if (summaries && selectedClientId && !isValid(urlClientId)) {
      const next = new URLSearchParams(searchParams);
      next.set("client", selectedClientId);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, urlClientId, selectedClientId, summaries]);

  const selectClient = React.useCallback(
    (id: string) => {
      // Set ?client=; ReportProvider (keyed by client) remounts and self-heals
      // ?report= to the new client's latest, so no stale cross-client report id.
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("client", id);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  if (failed) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Unable to load your portal. Please refresh, or request a new link.
      </div>
    );
  }
  if (!summaries || !entry) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  const value: ClientContextValue = {
    clients: summaries,
    selectedClient: entry,
    selectedClientId: entry.id,
    selectClient,
    clientInfo: entry.info,
    reports: entry.reports,
    reportsDesc: entry.reportsDesc,
    latestReportId: entry.latestReportId,
    seedEngagements: entry.seedEngagements,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient(): ClientContextValue {
  const ctx = React.useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within <ClientProvider>");
  return ctx;
}
