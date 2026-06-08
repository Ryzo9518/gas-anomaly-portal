// Adapter selector — views never import mock/ or bff/ directly.
//
// Phase 1 (mock) is the only mode shipped. Phase 2 introduces a bff/
// adapter behind VITE_ADAPTER=bff once the FastAPI backend lands.
// Every port consumed by the view layer is re-exported here so the
// surface stays narrow and discoverable.

import type { AuthPort } from "@/ports/auth.port";
import { authMock } from "./mock/auth.mock";

export type AdapterKind = "mock";
export const CURRENT_ADAPTER: AdapterKind = "mock";

export const auth: AuthPort = authMock;
