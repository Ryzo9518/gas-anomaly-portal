// src/features/clients/ClientContext.tsx
// The "which client am I looking at" provider. Mirrors ReportContext:
//   • selection lives in the URL (?client=tourvest) so it is shareable;
//   • a missing/invalid param self-heals from memory (replace:true, no flash);
//   • selecting a client repoints ?report= to that client's latest report.
// In a scoped per-client build there is exactly one client, so the switcher is
// hidden and ?client= is effectively fixed.
import * as React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import {
  CLIENTS,
  CLIENT_SUMMARIES,
  DEFAULT_CLIENT_ID,
  getClientEntry,
  type ClientEntry,
  type ClientInfo,
  type ClientSummary,
} from "@/features/clients/clients.data";

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

function isValidClient(id: string | null): id is string {
  return !!id && CLIENTS.some((c) => c.id === id);
}

const FALLBACK_CLIENT_ID = getClientEntry(DEFAULT_CLIENT_ID)?.id ?? CLIENTS[0].id;

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlClientId = searchParams.get("client");

  const [remembered, setRemembered] = React.useState<string>(() =>
    isValidClient(urlClientId) ? urlClientId : FALLBACK_CLIENT_ID,
  );
  const selectedClientId = isValidClient(urlClientId) ? urlClientId : remembered;

  React.useEffect(() => {
    if (isValidClient(urlClientId) && urlClientId !== remembered) {
      setRemembered(urlClientId);
    }
  }, [urlClientId, remembered]);

  // SELF-HEAL: rewrite a missing/invalid ?client= from memory.
  React.useEffect(() => {
    if (!isValidClient(urlClientId)) {
      const next = new URLSearchParams(searchParams);
      next.set("client", selectedClientId);
      setSearchParams(next, { replace: true });
    }
  }, [location.pathname, urlClientId, selectedClientId, searchParams, setSearchParams]);

  const selectedClient = getClientEntry(selectedClientId) ?? CLIENTS[0];

  const selectClient = React.useCallback(
    (id: string) => {
      if (!isValidClient(id)) return;
      const entry = getClientEntry(id)!;
      setRemembered(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("client", id);
          next.set("report", entry.latestReportId); // avoid a stale cross-client report id
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const value: ClientContextValue = {
    clients: CLIENT_SUMMARIES,
    selectedClient,
    selectedClientId,
    selectClient,
    clientInfo: selectedClient.info,
    reports: selectedClient.reports,
    reportsDesc: selectedClient.reportsDesc,
    latestReportId: selectedClient.latestReportId,
    seedEngagements: selectedClient.seedEngagements,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient(): ClientContextValue {
  const ctx = React.useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within <ClientProvider>");
  return ctx;
}
