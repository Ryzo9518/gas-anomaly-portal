// Clients port — the seam between view code and the client-data provider.
// Phase 1 runs the mock adapter (reads the build-time registry in
// src/features/clients/clients.data.ts). Phase 2 introduces a bff/ adapter
// wired to `GET /api/clients` / `GET /api/clients/:id`, scoped server-side to
// the authenticated identity (admin → all; client → one). Swapping the adapter
// replaces build-time scoping with server-side scoping — no view changes.

import type { ClientEntry, ClientSummary } from "@/features/clients/clients.data";

export interface ClientsPort {
  listClients(): Promise<ClientSummary[]>;
  getClient(id: string): Promise<ClientEntry | null>;
}
