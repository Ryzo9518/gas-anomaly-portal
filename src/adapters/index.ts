// Adapter selector — views never import mock/ or bff/ directly.
//
// Phase 1 (mock) is the only mode shipped. Phase 2 introduces a bff/
// adapter behind VITE_ADAPTER=bff once the FastAPI backend lands.
// Every port consumed by the view layer is re-exported here so the
// surface stays narrow and discoverable.

import type { AuthPort } from "@/ports/auth.port";
import type { ClientsPort } from "@/ports/clients.port";
import { authMock } from "./mock/auth.mock";
import { authBff } from "./bff/auth.bff";
import { authClientBff } from "./bff/auth.client.bff";
import { clientsMock } from "./mock/clients.mock";
import { clientsBff } from "./bff/clients.bff";
import { clientsStaffBff } from "./bff/clients.staff.bff";

export type AdapterKind = "mock" | "bff";

// AUTH adapter (build-time). "mock" = demo/offline + Gate 3. "bff" = the live
// staff build (Microsoft SSO).
export const CURRENT_ADAPTER: AdapterKind =
  (import.meta.env.VITE_ADAPTER as AdapterKind) === "bff" ? "bff" : "mock";

// CLIENT-DATA adapter (build-time, INDEPENDENT of auth). Three distinct builds:
//   • Offline demo (no env): all-client demo data from the build-time registry.
//   • Staff build (VITE_ADAPTER=bff): ALL admin-created clients from the backend
//     (/api/admin/clients) — the staff switcher + admin screen are one roster.
//   • Client-portal build (VITE_DATA_ADAPTER=bff): the signed-in client's OWN
//     data only. Selecting a bff path tree-shakes clientsMock → the registry →
//     the fixtures OUT of the bundle (R13: no real client data shipped).
export const DATA_ADAPTER: AdapterKind =
  (import.meta.env.VITE_DATA_ADAPTER as AdapterKind) === "bff" ? "bff" : "mock";

// AUTH selection (build-time literals so unused adapters tree-shake):
//   • VITE_AUTH=client  → client-portal build (magic-link), regardless of VITE_ADAPTER
//   • else VITE_ADAPTER=bff → staff Microsoft SSO
//   • else                 → mock (demo/offline)
export const auth: AuthPort =
  (import.meta.env.VITE_AUTH as string) === "client"
    ? authClientBff
    : CURRENT_ADAPTER === "bff"
      ? authBff
      : authMock;

// Use the env literals DIRECTLY in the ternary (not the exported consts). Vite
// folds each import.meta.env.* to a string literal at build time, so unused
// adapters tree-shake — the client-portal and staff builds both drop clientsMock
// → the registry → the fixtures out of the bundle (R13). Routing through an
// exported const defeats the fold and the fixtures leak back in.
//   • VITE_DATA_ADAPTER=bff → client portal (own data only)
//   • else VITE_ADAPTER=bff → staff (all admin-created clients)
//   • else                  → offline demo (registry)
export const clients: ClientsPort =
  (import.meta.env.VITE_DATA_ADAPTER as string) === "bff"
    ? clientsBff
    : (import.meta.env.VITE_ADAPTER as string) === "bff"
      ? clientsStaffBff
      : clientsMock;
