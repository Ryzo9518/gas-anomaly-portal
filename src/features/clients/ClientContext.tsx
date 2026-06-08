import * as React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  CLIENTS,
  DEFAULT_CLIENT_ID,
  IS_INTERNAL_BUILD,
  clientSummaries,
  getClientEntry,
} from "@/features/clients/clients.data";
import type {
  ClientEntry,
  ClientInfo,
  ClientSummary,
} from "@/features/clients/clients.data";
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";

// ============================================================================
// CLIENT CONTEXT — the "which client am I looking at" provider.
//
//   • Mirrors ReportContext one level up: the selected client lives in the URL
//     (?client=tourvest) so it is shareable and survives back/forward.
//   • In a scoped per-client build there is exactly one client, so ?client= is
//     fixed to it and the switcher renders as a static label.
//   • ReportContext consumes this provider for the active report set; it is
//     re-keyed by selectedClientId in Providers so engagement state resets
//     cleanly when the client changes.
//
// Phase 1 reads the registry synchronously (mirrors how ReportContext reads
// fixtures) so screens render without a loading state. The ClientsPort/mock
// adapter exists for the Phase 2 backend seam.
// ============================================================================

interface ClientContextValue {
  clients: ClientSummary[];
  isInternalBuild: boolean;
  selectedClient: ClientEntry;
  selectedClientId: string;
  selectClient: (id: string) => void;

  // Active client's data — consumed by ReportContext.
  reports: AuditReport[];
  reportsDesc: AuditReport[];
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
  clientInfo: ClientInfo;

  // "client=<id>" — for links that must preserve the selected client.
  clientSearch: string;
}

const ClientContext = React.createContext<ClientContextValue | null>(null);

function isValidClient(id: string | null): id is string {
  return !!id && CLIENTS.some((c) => c.id === id);
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const urlClientId = searchParams.get("client");

  const [rememberedClientId, setRememberedClientId] = React.useState<string>(
    () => (isValidClient(urlClientId) ? urlClientId : DEFAULT_CLIENT_ID),
  );

  const selectedClientId = isValidClient(urlClientId)
    ? urlClientId
    : rememberedClientId;

  // Remember a valid URL selection for later naked navigations.
  React.useEffect(() => {
    if (isValidClient(urlClientId) && urlClientId !== rememberedClientId) {
      setRememberedClientId(urlClientId);
    }
  }, [urlClientId, rememberedClientId]);

  // SELF-HEAL: if the path lost ?client=, rewrite it from memory. Functional
  // updater so this merges onto the latest params and never clobbers ReportContext's
  // parallel ?report= self-heal.
  React.useEffect(() => {
    if (!isValidClient(urlClientId)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("client", selectedClientId);
          return next;
        },
        { replace: true },
      );
    }
  }, [location.pathname, urlClientId, selectedClientId, setSearchParams]);

  const selectedClient = getClientEntry(selectedClientId) ?? CLIENTS[0];

  const selectClient = React.useCallback(
    (id: string) => {
      if (!isValidClient(id)) return;
      setRememberedClientId(id);
      const entry = getClientEntry(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("client", id);
          // Repoint ?report= to the new client's latest so a stale report id
          // from the previous client never leaks across.
          if (entry) next.set("report", entry.latestReportId);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const value: ClientContextValue = {
    clients: clientSummaries(),
    isInternalBuild: IS_INTERNAL_BUILD,
    selectedClient,
    selectedClientId: selectedClient.id,
    selectClient,
    reports: selectedClient.reports,
    reportsDesc: selectedClient.reportsDesc,
    latestReportId: selectedClient.latestReportId,
    seedEngagements: selectedClient.seedEngagements,
    clientInfo: selectedClient.info,
    clientSearch: `client=${selectedClient.id}`,
  };

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient(): ClientContextValue {
  const ctx = React.useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within <ClientProvider>");
  return ctx;
}
