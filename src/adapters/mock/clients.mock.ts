import type { ClientsPort } from "@/ports/clients.port";
import { clientSummaries, getClientEntry } from "@/features/clients/clients.data";

// Mock clients adapter — backed by the build-time registry. Phase 2 replaces
// this with bff/clients.bff.ts (HTTP) behind the same ClientsPort. The async
// signatures match the future backend so swapping the adapter needs no caller
// changes. ClientProvider reads the registry synchronously for first render;
// this port exists for the Phase 2 seam.

const delay = (ms = 40) => new Promise<void>((r) => setTimeout(r, ms));

export const clientsMock: ClientsPort = {
  async listClients() {
    await delay();
    return clientSummaries();
  },
  async getClient(id) {
    await delay();
    return getClientEntry(id);
  },
};
