// src/ports/clients.port.ts
// The seam between view code and the client data source. Phase 1 reads the
// build-time registry (mock). Phase 2 swaps in a bff adapter that calls
// GET /api/clients scoped to the authenticated identity (admin → all,
// client → one) — see docs/specs/2026-06-08-phase-2-auth-design.md.
import type { ClientEntry, ClientSummary } from "@/features/clients/clients.types";

export interface ClientsPort {
  listClients(): Promise<ClientSummary[]>;
  getClient(id: string): Promise<ClientEntry | null>;
}
