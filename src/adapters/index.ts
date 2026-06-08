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

export type AdapterKind = "mock" | "bff";

// Select the auth adapter at build time. Default is "mock" (demo/offline +
// Gate 3). Set VITE_ADAPTER=bff for the live build that talks to the FastAPI
// backend (staff Microsoft SSO). Client data still comes from the registry.
export const CURRENT_ADAPTER: AdapterKind =
  (import.meta.env.VITE_ADAPTER as AdapterKind) === "bff" ? "bff" : "mock";

export const auth: AuthPort = CURRENT_ADAPTER === "bff" ? authBff : authMock;
export const clients: ClientsPort = clientsMock;
