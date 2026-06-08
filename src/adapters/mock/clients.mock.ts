// src/adapters/mock/clients.mock.ts
import type { ClientsPort } from "@/ports/clients.port";
import { CLIENT_SUMMARIES, getClientEntry } from "@/features/clients/clients.data";

const delay = (ms = 60) => new Promise<void>((r) => setTimeout(r, ms));

export const clientsMock: ClientsPort = {
  async listClients() {
    await delay();
    return CLIENT_SUMMARIES;
  },
  async getClient(id) {
    await delay();
    return getClientEntry(id);
  },
};
