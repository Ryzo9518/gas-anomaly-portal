// Adapter selector — views never import mock/ or bff/ directly.
//
// Phase 1 (mock) is the only mode shipped. Phase 2 introduces a bff/
// adapter behind VITE_ADAPTER=bff once the FastAPI backend lands.
// Every port consumed by the view layer is re-exported here so the
// surface stays narrow and discoverable.

import type { AuthPort } from "@/ports/auth.port";
import type { ClientsPort } from "@/ports/clients.port";
import { authMock } from "./mock/auth.mock";
import { clientsMock } from "./mock/clients.mock";

export type AdapterKind = "mock";
export const CURRENT_ADAPTER: AdapterKind = "mock";

export const auth: AuthPort = authMock;
export const clients: ClientsPort = clientsMock;
