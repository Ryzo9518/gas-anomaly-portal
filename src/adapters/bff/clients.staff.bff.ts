import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import type {
  ClientEntry,
  ClientSummary,
} from "@/features/clients/clients.types";
import type { ClientsPort } from "@/ports/clients.port";
import { assembleEntry } from "./clients.bff";

// STAFF/internal client-data adapter. The signed-in staff user sees ALL clients
// and switches between them in the sidebar — sourced from the SAME backend the
// admin "Clients" screen uses (GET /api/admin/clients), so the switcher and the
// admin list are one roster (this is what reconciles the two previously-
// disconnected staff client lists — see
// docs/specs/2026-06-09-staff-client-list-reconciliation.md).
//
// Admin-scoped: these endpoints require an admin staff session server-side.
// A client with no audit data loaded yet assembles to an entry with zero
// reports — the empty-workspace state, handled by ClientContext/ReportContext.
// TYPE-only imports, so no fixture data is pulled into this build.

interface AdminClientDto {
  id: string;
  name: string;
  health_target: number;
  revoked: boolean;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export const clientsStaffBff: ClientsPort = {
  async listClients(): Promise<ClientSummary[]> {
    const clients = await getJSON<AdminClientDto[]>("/api/admin/clients");
    // Revoked clients are hidden from the audit switcher (they remain visible on
    // the admin screen for management).
    return clients
      .filter((c) => !c.revoked)
      .map((c) => ({ id: c.id, name: c.name }));
  },

  async getClient(id: string): Promise<ClientEntry | null> {
    const clients = await getJSON<AdminClientDto[]>("/api/admin/clients");
    const c = clients.find((x) => x.id === id);
    if (!c || c.revoked) return null;
    const reports = await getJSON<AuditReport[]>(
      `/api/admin/clients/${id}/reports`,
    );
    const engagements = await getJSON<Record<string, Engagement>>(
      `/api/admin/clients/${id}/engagements`,
    );
    return assembleEntry(
      { id: c.id, name: c.name, healthTarget: c.health_target },
      reports,
      engagements,
    );
  },
};
