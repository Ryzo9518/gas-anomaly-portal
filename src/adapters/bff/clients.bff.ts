import type { AuditReport } from "@/features/audit/reports.fixture";
import type {
  ClientEntry,
  ClientSummary,
} from "@/features/clients/clients.types";
import type { ClientsPort } from "@/ports/clients.port";

// Client-portal data adapter. Fetches the signed-in client's own data from the
// backend (client-scoped, credentials cookie) and assembles the SAME ClientEntry
// shape the build-time registry produced — see docs/FIXTURE_CONTRACT.md. These
// are TYPE-only imports, so no fixture data is pulled into the client bundle.

interface ClientDto {
  id: string;
  name: string;
  healthTarget: number;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Assemble a ClientEntry from the BFF responses, identically to the registry
 *  (FIXTURE_CONTRACT §1). Exported for the drift test. */
export function assembleEntry(c: ClientDto, reports: AuditReport[]): ClientEntry {
  const reportsDesc = [...reports].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
  return {
    id: c.id,
    info: { name: c.name, healthTarget: c.healthTarget },
    reports,
    reportsDesc,
    latestReportId: reportsDesc[0]?.id ?? "",
    seedEngagements: {},
  };
}

export const clientsBff: ClientsPort = {
  async listClients(): Promise<ClientSummary[]> {
    const c = await getJSON<ClientDto | null>("/api/clients");
    return c ? [{ id: c.id, name: c.name }] : [];
  },
  async getClient(_id: string): Promise<ClientEntry | null> {
    // The API is client-scoped — the session determines the client, so the id
    // argument is advisory. Returns the signed-in client's own entry.
    const c = await getJSON<ClientDto | null>("/api/clients");
    if (!c) return null;
    const reports = await getJSON<AuditReport[]>("/api/reports");
    return assembleEntry(c, reports);
  },
};
