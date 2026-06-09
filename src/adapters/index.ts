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
import { clientsMock } from "./mock/clients.mock";
import { clientsBff } from "./bff/clients.bff";

export type AdapterKind = "mock" | "bff";

// AUTH adapter (build-time). "mock" = demo/offline + Gate 3. "bff" = the live
// staff build (Microsoft SSO).
export const CURRENT_ADAPTER: AdapterKind =
  (import.meta.env.VITE_ADAPTER as AdapterKind) === "bff" ? "bff" : "mock";

// CLIENT-DATA adapter (build-time, INDEPENDENT of auth). Two distinct builds:
//   • Internal/staff build: DATA_ADAPTER=mock → all-client demo data from the
//     build-time registry (the live staff site; Microsoft SSO).
//   • Client-portal build (VITE_DATA_ADAPTER=bff): per-client data fetched from
//     the backend. Selecting bff tree-shakes clientsMock → the registry → the
//     client fixtures OUT of the bundle (R13: no real client data shipped).
export const DATA_ADAPTER: AdapterKind =
  (import.meta.env.VITE_DATA_ADAPTER as AdapterKind) === "bff" ? "bff" : "mock";

export const auth: AuthPort = CURRENT_ADAPTER === "bff" ? authBff : authMock;

// Use the env literal DIRECTLY in the ternary (not the exported DATA_ADAPTER
// const). Vite replaces import.meta.env.VITE_DATA_ADAPTER with a string literal
// at build time, so this folds to a constant and the unused adapter is
// tree-shaken — selecting "bff" drops clientsMock → the registry → the client
// fixtures out of the bundle (R13). Routing through the exported const defeats
// the fold and the fixtures leak back in.
export const clients: ClientsPort =
  (import.meta.env.VITE_DATA_ADAPTER as string) === "bff"
    ? clientsBff
    : clientsMock;
