# Multi-Client Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client layer above the existing report layer so the portal holds multiple clients at once, switches between them in-browser (internal build), and can ship per-client builds that contain only one client's data.

**Architecture:** A URL-driven `ClientContext` (mirroring the proven `ReportContext`) sits above `ReportContext`; both live inside `HashRouter`. A client **registry** assembles client entries from the existing fixtures and uses a build-time `VITE_CLIENT` flag to tree-shake non-selected clients out of scoped builds. Report helpers become client-agnostic. **Auth/login is out of scope** — owned by `docs/specs/2026-06-08-phase-2-auth-design.md`.

**Tech Stack:** React 18, Vite 5, TypeScript 5 (strict), React Router 6 (HashRouter), Zustand. No test runner exists — verification is the project's three gates (`npm run typecheck`, `npm run build`, manual at `PORT=5199 npm run dev`) plus a bundle-isolation grep script.

**Spec:** `docs/specs/2026-06-08-multi-client-runtime-switcher-design.md`
**Law:** `AGENTS.md` — every task ends green on typecheck + build; work on a feature branch; PR at the end (no direct merge to `main`).

---

## Conventions for every task

- **Gate A (typecheck):** `npm run typecheck` → expect `0 errors`.
- **Gate B (build):** `npm run build` → expect it to complete (the >500 kB chunk warning is pre-existing and OK).
- **Gate C (manual):** `PORT=5199 npm run dev`, then verify the stated behaviour in the browser. Hash URLs look like `http://localhost:5199/#/dashboard?client=tourvest&report=2026`.
- Commit message format (per `AGENTS.md`): `[FEATURE] <summary>` with a short body.
- If a dependency native-module error appears, run `npm ci` once (the copied `node_modules` is unreliable; a clean install fixes it).

---

## File Structure

**New files**
- `src/features/audit/report-helpers.ts` — pure, client-agnostic `priorReportOf`, `computeCumulative`, `totalRisks`, `severeRisks`.
- `src/features/clients/clients.data.ts` — `ClientInfo`/`ClientEntry`/`ClientSummary` types, the registry, `VITE_CLIENT` scoping.
- `src/ports/clients.port.ts` — `ClientsPort` interface (Phase-2 seam).
- `src/adapters/mock/clients.mock.ts` — registry-backed `ClientsPort` implementation.
- `src/features/clients/ClientContext.tsx` — `ClientProvider` + `useClient()`.
- `src/shell/ClientSwitcher.tsx` — sidebar client switcher (internal builds only).
- `scripts/verify-client-isolation.sh` — builds a scoped bundle and greps for other clients' data.

**Modified files**
- `src/app/Providers.tsx` — add `ClientProvider` + a `ReportScope` wrapper (keys `ReportProvider` by client).
- `src/features/audit/ReportContext.tsx` — consume `useClient()` + generic helpers instead of `fixture.active`; expose `clientInfo`; carry `?client=` in nav links.
- `src/adapters/index.ts` — export `clients: ClientsPort`.
- `src/shell/TopBar.tsx` — read `clientInfo` from `useReport()` instead of importing `CLIENT_INFO`.
- `src/routes/dashboard.route.tsx` — `clientInfo` from `useReport()`; `totalRisks`/`severeRisks` from `report-helpers`.
- `src/routes/report.route.tsx` — `clientInfo` from `useReport()`.
- `src/shell/Sidebar.tsx` — mount `ClientSwitcher`.
- `src/features/audit/reports.fixture.ts` / `reports.fixture.clean.ts` — drop the now-duplicated `priorReportOf`/`computeCumulative` (helpers moved); keep data + types.
- `src/features/audit/audit.fixture.ts` — update the compat shim's re-exports.
- `package.json` — replace `dev:demo`/`dev:client` with `dev:internal` + scoped build scripts.

**Removed**
- `src/features/audit/fixture.active.ts` — replaced by the registry.
- `.env.demo`, `.env.client` — superseded by `VITE_CLIENT`.

---

## Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
cd "<repo root>"
git checkout main && git pull origin main
git checkout -b feat/multi-client-data-layer
```

- [ ] **Step 2: Confirm a clean baseline**

Run: `npm ci && npm run typecheck && npm run build`
Expected: typecheck `0 errors`, build completes. If not, stop and fix the environment before proceeding.

---

## Task 1: Client-agnostic report helpers

Move the two fixture helpers (which currently close over a module-level `REPORTS_DESC`) into pure functions that take the reports array as a parameter, plus the two pure risk helpers.

**Files:**
- Create: `src/features/audit/report-helpers.ts`

- [ ] **Step 1: Create the helpers module**

```typescript
// src/features/audit/report-helpers.ts
// Client-agnostic report math. These used to live in reports.fixture.ts where
// they closed over that file's REPORTS_DESC — which made them single-client.
// They now take the active client's reports as an argument so ReportContext can
// call them with whichever client is selected.
import type {
  AuditReport,
  Engagement,
  CumulativeSummary,
  Severity,
} from "@/features/audit/reports.fixture";

/** The report immediately preceding `id` chronologically, or null at baseline. */
export function priorReportOf(
  reportsDesc: AuditReport[],
  id: string,
): AuditReport | null {
  const idx = reportsDesc.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  return reportsDesc[idx + 1] ?? null; // DESC → next index is older
}

/** Cumulative recovery across every COMPLETE engagement. Always live. */
export function computeCumulative(
  reportsDesc: AuditReport[],
  engagementsById: Record<string, Engagement>,
): CumulativeSummary {
  const complete = Object.values(engagementsById).filter(
    (e) => e.status === "complete",
  );

  let totalRecovered = 0;
  let totalEstimated = 0;
  let totalFindingsResolved = 0;
  let totalFindingsRegressed = 0;

  for (const e of complete) {
    totalRecovered += e.actualSavings ?? 0;
    totalEstimated += e.estimatedSavings;
    for (const f of e.findings) {
      if (f.status === "resolved") totalFindingsResolved += 1;
      if (f.status === "regressed") totalFindingsRegressed += 1;
    }
  }

  const earliest = reportsDesc[reportsDesc.length - 1];
  const latest = reportsDesc[0];

  return {
    cyclesCompleted: complete.length,
    totalRecovered,
    totalEstimated,
    totalFindingsResolved,
    totalFindingsRegressed,
    healthGain: latest.healthScore - earliest.healthScore,
  };
}

/** Total of all risk counts in a severity record. */
export function totalRisks(r: Record<Severity, number>): number {
  return r.critical + r.high + r.medium + r.low;
}

/** Critical + high risk count. */
export function severeRisks(r: Record<Severity, number>): number {
  return r.critical + r.high;
}
```

> Note: confirm the `totalRisks`/`severeRisks` bodies match the existing ones in `reports.fixture.ts` (lines ~560–567). If the existing bodies differ, copy the existing bodies verbatim instead of the above.

- [ ] **Step 2: Gate A** — `npm run typecheck` → `0 errors`.
- [ ] **Step 3: Gate B** — `npm run build` → completes.
- [ ] **Step 4: Commit**

```bash
git add src/features/audit/report-helpers.ts
git commit -m "[FEATURE] Add client-agnostic report helpers (parameterized by reports)"
```

---

## Task 2: Client registry + build-time scoping

**Files:**
- Create: `src/features/clients/clients.data.ts`

- [ ] **Step 1: Create the registry**

```typescript
// src/features/clients/clients.data.ts
// The client registry. Each entry bundles exactly what ReportContext needs for
// one client. Tourvest = reports.fixture.ts; New Client = reports.fixture.clean.ts.
// Adding a client this week = add a fixture module + one branch below.
//
// BUILD-TIME SCOPING: Vite replaces import.meta.env.VITE_CLIENT with a string
// literal at build time, so the branches not taken are statically dead and the
// unused fixture's data is tree-shaken out of a per-client production build.
// This is the same mechanism the old fixture.active.ts relied on. It is the
// security boundary that keeps one client's data out of another's bundle —
// and it is VERIFIED, not trusted, by scripts/verify-client-isolation.sh (Task 10).
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import * as tourvestData from "@/features/audit/reports.fixture";
import * as newClientData from "@/features/audit/reports.fixture.clean";

export interface ClientInfo {
  name: string;
  healthTarget: number;
}

export interface ClientEntry {
  id: string; // URL slug
  info: ClientInfo;
  reports: AuditReport[]; // as authored (oldest → newest)
  reportsDesc: AuditReport[]; // newest first
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
}

export interface ClientSummary {
  id: string;
  name: string;
}

interface FixtureModule {
  CLIENT_INFO: ClientInfo;
  REPORTS: AuditReport[];
  REPORTS_DESC: AuditReport[];
  LATEST_REPORT_ID: string;
  SEED_ENGAGEMENTS: Record<string, Engagement>;
}

function toEntry(id: string, m: FixtureModule): ClientEntry {
  return {
    id,
    info: m.CLIENT_INFO,
    reports: m.REPORTS,
    reportsDesc: m.REPORTS_DESC,
    latestReportId: m.LATEST_REPORT_ID,
    seedEngagements: m.SEED_ENGAGEMENTS,
  };
}

export const DEFAULT_CLIENT_ID = "tourvest";

const SCOPE = (import.meta.env.VITE_CLIENT as string | undefined) ?? "all";

export const CLIENTS: ClientEntry[] =
  SCOPE === "tourvest"
    ? [toEntry("tourvest", tourvestData)]
    : SCOPE === "newclient"
      ? [toEntry("newclient", newClientData)]
      : [toEntry("tourvest", tourvestData), toEntry("newclient", newClientData)];

export const CLIENT_SUMMARIES: ClientSummary[] = CLIENTS.map((c) => ({
  id: c.id,
  name: c.info.name,
}));

export function getClientEntry(id: string): ClientEntry | null {
  return CLIENTS.find((c) => c.id === id) ?? null;
}
```

- [ ] **Step 2: Gate A** — `npm run typecheck` → `0 errors`.
- [ ] **Step 3: Gate B** — `npm run build` → completes.
- [ ] **Step 4: Commit**

```bash
git add src/features/clients/clients.data.ts
git commit -m "[FEATURE] Add client registry with VITE_CLIENT build-time scoping"
```

---

## Task 3: ClientsPort seam + mock adapter

**Files:**
- Create: `src/ports/clients.port.ts`
- Create: `src/adapters/mock/clients.mock.ts`
- Modify: `src/adapters/index.ts`

- [ ] **Step 1: Create the port**

```typescript
// src/ports/clients.port.ts
// The seam between view code and the client data source. Phase 1 reads the
// build-time registry (mock). Phase 2 swaps in a bff adapter that calls
// GET /api/clients scoped to the authenticated identity (admin → all,
// client → one) — see docs/specs/2026-06-08-phase-2-auth-design.md.
import type { ClientEntry, ClientSummary } from "@/features/clients/clients.data";

export interface ClientsPort {
  listClients(): Promise<ClientSummary[]>;
  getClient(id: string): Promise<ClientEntry | null>;
}
```

- [ ] **Step 2: Create the mock adapter**

```typescript
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
```

- [ ] **Step 3: Wire it into the adapter surface**

In `src/adapters/index.ts`, add the import and export alongside `auth`:

```typescript
import type { AuthPort } from "@/ports/auth.port";
import type { ClientsPort } from "@/ports/clients.port";
import { authMock } from "./mock/auth.mock";
import { clientsMock } from "./mock/clients.mock";

export type AdapterKind = "mock";
export const CURRENT_ADAPTER: AdapterKind = "mock";

export const auth: AuthPort = authMock;
export const clients: ClientsPort = clientsMock;
```

- [ ] **Step 4: Gate A + B** — `npm run typecheck` (`0 errors`) and `npm run build` (completes).
- [ ] **Step 5: Commit**

```bash
git add src/ports/clients.port.ts src/adapters/mock/clients.mock.ts src/adapters/index.ts
git commit -m "[FEATURE] Add ClientsPort seam + registry-backed mock adapter"
```

---

## Task 4: ClientContext (provider + useClient)

**Files:**
- Create: `src/features/clients/ClientContext.tsx`

- [ ] **Step 1: Create the context**

```tsx
// src/features/clients/ClientContext.tsx
// The "which client am I looking at" provider. Mirrors ReportContext:
//   • selection lives in the URL (?client=tourvest) so it is shareable;
//   • a missing/invalid param self-heals from memory (replace:true, no flash);
//   • selecting a client repoints ?report= to that client's latest report.
// In a scoped per-client build there is exactly one client, so the switcher is
// hidden (Task 9) and ?client= is effectively fixed.
import * as React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import {
  CLIENTS,
  CLIENT_SUMMARIES,
  DEFAULT_CLIENT_ID,
  getClientEntry,
  type ClientEntry,
  type ClientInfo,
  type ClientSummary,
} from "@/features/clients/clients.data";

interface ClientContextValue {
  clients: ClientSummary[];
  selectedClient: ClientEntry;
  selectedClientId: string;
  selectClient: (id: string) => void;
  clientInfo: ClientInfo;
  reports: AuditReport[];
  reportsDesc: AuditReport[];
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
}

const ClientContext = React.createContext<ClientContextValue | null>(null);

function isValidClient(id: string | null): id is string {
  return !!id && CLIENTS.some((c) => c.id === id);
}

const FALLBACK_CLIENT_ID = getClientEntry(DEFAULT_CLIENT_ID)?.id ?? CLIENTS[0].id;

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlClientId = searchParams.get("client");

  const [remembered, setRemembered] = React.useState<string>(() =>
    isValidClient(urlClientId) ? urlClientId : FALLBACK_CLIENT_ID,
  );
  const selectedClientId = isValidClient(urlClientId) ? urlClientId : remembered;

  React.useEffect(() => {
    if (isValidClient(urlClientId) && urlClientId !== remembered) {
      setRemembered(urlClientId);
    }
  }, [urlClientId, remembered]);

  // SELF-HEAL: rewrite a missing/invalid ?client= from memory.
  React.useEffect(() => {
    if (!isValidClient(urlClientId)) {
      const next = new URLSearchParams(searchParams);
      next.set("client", selectedClientId);
      setSearchParams(next, { replace: true });
    }
  }, [location.pathname, urlClientId, selectedClientId, searchParams, setSearchParams]);

  const selectedClient = getClientEntry(selectedClientId) ?? CLIENTS[0];

  const selectClient = React.useCallback(
    (id: string) => {
      if (!isValidClient(id)) return;
      const entry = getClientEntry(id)!;
      setRemembered(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("client", id);
          next.set("report", entry.latestReportId); // avoid a stale cross-client report id
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const value: ClientContextValue = {
    clients: CLIENT_SUMMARIES,
    selectedClient,
    selectedClientId,
    selectClient,
    clientInfo: selectedClient.info,
    reports: selectedClient.reports,
    reportsDesc: selectedClient.reportsDesc,
    latestReportId: selectedClient.latestReportId,
    seedEngagements: selectedClient.seedEngagements,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient(): ClientContextValue {
  const ctx = React.useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within <ClientProvider>");
  return ctx;
}
```

- [ ] **Step 2: Gate A** — `npm run typecheck` → `0 errors` (the provider is not mounted yet; this only checks it compiles).
- [ ] **Step 3: Commit**

```bash
git add src/features/clients/ClientContext.tsx
git commit -m "[FEATURE] Add ClientContext (URL-driven client selection, mirrors ReportContext)"
```

---

## Task 5: Mount ClientProvider + key ReportProvider by client

Wrap `ReportProvider` in `ClientProvider`, and remount `ReportProvider` whenever the client changes so its seeded engagement state and remembered report reset cleanly to the new client.

**Files:**
- Modify: `src/app/Providers.tsx`

- [ ] **Step 1: Update Providers**

Replace the body of `src/app/Providers.tsx` with:

```tsx
import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { queryClient } from "@/state/query";
import { ThemeProvider } from "@/shell/theme-provider";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { Toaster } from "@/ui/shadcn/sonner";
import { ClientProvider, useClient } from "@/features/clients/ClientContext";
import { ReportProvider } from "@/features/audit/ReportContext";

// Remount ReportProvider on client change so its seeded engagement state and
// remembered report reset to the newly selected client (no cross-client bleed).
function ReportScope({ children }: { children: React.ReactNode }) {
  const { selectedClientId } = useClient();
  return <ReportProvider key={selectedClientId}>{children}</ReportProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          {/* ClientProvider + ReportProvider both read the URL, so both live
              inside HashRouter. Client resolves first, then report within it. */}
          <HashRouter>
            <ClientProvider>
              <ReportScope>{children}</ReportScope>
            </ClientProvider>
          </HashRouter>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Gate A** — `npm run typecheck`. Expect `0 errors`. (ReportContext still imports `fixture.active`; that's fixed in Task 6. The app may show Tourvest only until then — that's expected mid-refactor.)
- [ ] **Step 3: Commit**

```bash
git add src/app/Providers.tsx
git commit -m "[FEATURE] Mount ClientProvider; key ReportProvider by client"
```

---

## Task 6: ReportContext consumes the selected client

Switch `ReportContext` off `fixture.active` and onto `useClient()` + the generic helpers, expose `clientInfo`, and carry `?client=` in nav links.

**Files:**
- Modify: `src/features/audit/ReportContext.tsx`

- [ ] **Step 1: Replace the fixture imports**

Remove:

```typescript
import {
  REPORTS,
  REPORTS_DESC,
  LATEST_REPORT_ID,
  SEED_ENGAGEMENTS,
  priorReportOf,
  computeCumulative,
} from "@/features/audit/fixture.active";
```

Add:

```typescript
import { useClient } from "@/features/clients/ClientContext";
import { priorReportOf, computeCumulative } from "@/features/audit/report-helpers";
import type { ClientInfo } from "@/features/clients/clients.data";
```

- [ ] **Step 2: Add `clientInfo` to the context value type**

In `interface ReportContextValue`, add:

```typescript
  clientInfo: ClientInfo;   // name + healthTarget of the selected client
```

- [ ] **Step 3: Remove the module-level `isValidReport`**

Delete the top-level function (it references the old module `REPORTS`):

```typescript
function isValidReport(id: string | null): id is string {
  return !!id && REPORTS.some((r) => r.id === id);
}
```

It is re-created as a closure inside the provider in Step 4.

- [ ] **Step 4: Read client data at the top of `ReportProvider`**

Immediately after `const location = useLocation();`, insert:

```typescript
  const {
    reports: REPORTS,
    reportsDesc: REPORTS_DESC,
    latestReportId: LATEST_REPORT_ID,
    seedEngagements: SEED_ENGAGEMENTS,
    selectedClientId,
    clientInfo,
  } = useClient();

  const isValidReport = React.useCallback(
    (id: string | null): id is string => !!id && REPORTS.some((r) => r.id === id),
    [REPORTS],
  );
```

> The local `const` names are deliberately the SAME (`REPORTS`, `REPORTS_DESC`, `LATEST_REPORT_ID`, `SEED_ENGAGEMENTS`) as the old imports, so the rest of the provider body needs no further edits except Steps 5–7.

- [ ] **Step 5: Point the helpers at the client's reports**

Change:

```typescript
  const priorReport = React.useMemo(
    () => priorReportOf(selectedReportId),
    [selectedReportId],
  );
```
to:
```typescript
  const priorReport = React.useMemo(
    () => priorReportOf(REPORTS_DESC, selectedReportId),
    [REPORTS_DESC, selectedReportId],
  );
```

Change:

```typescript
  const cumulative = React.useMemo(
    () => computeCumulative(engagementsById),
    [engagementsById],
  );
```
to:
```typescript
  const cumulative = React.useMemo(
    () => computeCumulative(REPORTS_DESC, engagementsById),
    [REPORTS_DESC, engagementsById],
  );
```

- [ ] **Step 6: Carry `?client=` in the nav strings**

Change:

```typescript
  const reportSearch = `?report=${selectedReportId}`;
  const linkWithReport = React.useCallback(
    (path: string) =>
      `${path}${path.includes("?") ? "&" : "?"}report=${selectedReportId}`,
    [selectedReportId],
  );
```
to:
```typescript
  const reportSearch = `?client=${selectedClientId}&report=${selectedReportId}`;
  const linkWithReport = React.useCallback(
    (path: string) =>
      `${path}${path.includes("?") ? "&" : "?"}client=${selectedClientId}&report=${selectedReportId}`,
    [selectedClientId, selectedReportId],
  );
```

- [ ] **Step 7: Expose `clientInfo` in the value object**

In the `const value: ReportContextValue = { ... }` literal, add `clientInfo,` (e.g. right after `reports: REPORTS_DESC,`).

- [ ] **Step 8: Gate A** — `npm run typecheck` → `0 errors`.
- [ ] **Step 9: Gate B** — `npm run build` → completes.
- [ ] **Step 10: Gate C (manual)** — `PORT=5199 npm run dev`. With no `VITE_CLIENT` set this is the internal (all-clients) build. Verify:
  - Dashboard renders with Tourvest data and the URL self-heals to include `?client=tourvest&report=<id>`.
  - Switching reports still works and the amber historical banner still appears on older cycles.
  - No console errors.

- [ ] **Step 11: Commit**

```bash
git add src/features/audit/ReportContext.tsx
git commit -m "[FEATURE] ReportContext reads the selected client (registry) + generic helpers"
```

---

## Task 7: Repoint CLIENT_INFO consumers to the selected client

`TopBar`, `dashboard.route`, and `report.route` currently import the static Tourvest `CLIENT_INFO`. Point them at the live `clientInfo` from `useReport()`.

**Files:**
- Modify: `src/shell/TopBar.tsx`
- Modify: `src/routes/dashboard.route.tsx`
- Modify: `src/routes/report.route.tsx`

- [ ] **Step 1: TopBar**

Remove `import { CLIENT_INFO } from "@/features/audit/audit.fixture";`. In the component body, where `useReport()` is already destructured (or add it), include `clientInfo`, and replace every `CLIENT_INFO.` with `clientInfo.`.

```typescript
const { /* …existing… */ clientInfo } = useReport();
```

- [ ] **Step 2: dashboard.route**

Change:
```typescript
import { CLIENT_INFO, totalRisks, severeRisks } from "@/features/audit/audit.fixture";
```
to:
```typescript
import { totalRisks, severeRisks } from "@/features/audit/report-helpers";
```
Add `clientInfo` to the existing `useReport()` destructure, and replace every `CLIENT_INFO.` with `clientInfo.` (lines ~113, 136, 254, 312).

- [ ] **Step 3: report.route**

Remove `import { CLIENT_INFO } from "@/features/audit/audit.fixture";`. Add `clientInfo` to the existing `useReport()` destructure and replace `CLIENT_INFO.name` with `clientInfo.name` (line ~49).

- [ ] **Step 4: Gate A + B** — `npm run typecheck` (`0 errors`) and `npm run build`.
- [ ] **Step 5: Gate C (manual)** — `PORT=5199 npm run dev`. Dashboard header, KPI target sublabels, and the report page all show the Tourvest name/target from context. No console errors.
- [ ] **Step 6: Commit**

```bash
git add src/shell/TopBar.tsx src/routes/dashboard.route.tsx src/routes/report.route.tsx
git commit -m "[FEATURE] Read clientInfo from context in TopBar/dashboard/report"
```

---

## Task 8: Delete fixture.active + de-duplicate fixture helpers

**Files:**
- Delete: `src/features/audit/fixture.active.ts`
- Modify: `src/features/audit/reports.fixture.ts` (remove its `priorReportOf` + `computeCumulative`)
- Modify: `src/features/audit/reports.fixture.clean.ts` (remove its `priorReportOf` + `computeCumulative`)
- Modify: `src/features/audit/audit.fixture.ts` (fix re-exports)

- [ ] **Step 1: Confirm nothing still imports `fixture.active`**

Run: `grep -rIn "fixture.active" src`
Expected: no matches (Task 6 removed the only one). If any remain, repoint them to `useClient()`/`report-helpers` before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/features/audit/fixture.active.ts
```

- [ ] **Step 3: Remove the duplicated helpers from both fixtures**

In `src/features/audit/reports.fixture.ts` and `src/features/audit/reports.fixture.clean.ts`, delete the `priorReportOf(...)` and `computeCumulative(...)` function definitions (they now live in `report-helpers.ts`). **Keep** `totalRisks` and `severeRisks` for now only if the shim still re-exports them (next step decides).

- [ ] **Step 4: Fix the compat shim**

Open `src/features/audit/audit.fixture.ts`. It re-exports from `reports.fixture`. Remove any re-export of `priorReportOf`/`computeCumulative` (deleted). If it re-exported `totalRisks`/`severeRisks` and something still imports them from the shim, either keep those two in `reports.fixture.ts` and re-export, or repoint those importers to `report-helpers`. Run:

`grep -rIn "audit.fixture" src` — for each importer, ensure every symbol it pulls still exists on the shim. Adjust the shim's `export { … } from "./reports.fixture"` list accordingly.

- [ ] **Step 5: Gate A + B** — `npm run typecheck` (`0 errors`) and `npm run build`. Fix any dangling import the compiler flags.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "[FEATURE] Remove fixture.active and de-duplicate report helpers"
```

---

## Task 9: Client switcher in the sidebar

A self-contained switcher mounted at the top of the sidebar nav. Renders only when more than one client is present (i.e. the internal build); in a scoped build it shows the single client name as a static label.

**Files:**
- Create: `src/shell/ClientSwitcher.tsx`
- Modify: `src/shell/Sidebar.tsx`

- [ ] **Step 1: Create the switcher**

```tsx
// src/shell/ClientSwitcher.tsx
// Highest-level "which client" control. Distinct from the violet report pill in
// TopBar (LESSON-1: one control per concern). Internal build only — in a scoped
// per-client build there is a single client, shown as a static label.
import * as React from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClient } from "@/features/clients/ClientContext";

export function ClientSwitcher({ collapsed }: { collapsed: boolean }) {
  const { clients, selectedClient, selectClient } = useClient();
  const [open, setOpen] = React.useState(false);

  // Single-client (scoped) build → static label, no interactivity.
  if (clients.length <= 1) {
    if (collapsed) return null;
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-slate-300">
        <Building2 className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
        <span className="truncate text-[13px] font-semibold text-white">
          {selectedClient.info.name}
        </span>
      </div>
    );
  }

  if (collapsed) {
    // Collapsed rail: icon only; clicking cycles to the next client.
    const idx = clients.findIndex((c) => c.id === selectedClient.id);
    const next = clients[(idx + 1) % clients.length];
    return (
      <button
        type="button"
        onClick={() => selectClient(next.id)}
        aria-label={`Client: ${selectedClient.info.name}. Switch to ${next.name}`}
        className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-violet-300 ring-1 ring-inset ring-white/10 hover:bg-white/5"
      >
        <Building2 className="h-[17px] w-[17px]" />
      </button>
    );
  }

  return (
    <div className="relative mx-3 mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2",
          "ring-1 ring-inset ring-white/10 hover:bg-white/5 transition-colors",
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
        <span className="flex-1 truncate text-left text-[13px] font-semibold text-white">
          {selectedClient.info.name}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg bg-slate-900 ring-1 ring-white/10 shadow-xl"
        >
          {clients.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === selectedClient.id}>
              <button
                type="button"
                onClick={() => {
                  selectClient(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-2.5 py-2 text-left text-[13px]",
                  c.id === selectedClient.id
                    ? "bg-violet-500/20 text-white"
                    : "text-slate-300 hover:bg-white/5",
                )}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the sidebar**

In `src/shell/Sidebar.tsx`:
1. Add the import: `import { ClientSwitcher } from "./ClientSwitcher";`
2. Inside `<nav>`, immediately **before** the `Workspace` section header `<div>`, add:

```tsx
        <ClientSwitcher collapsed={collapsed} />
```

`collapsed` is already in scope in `Sidebar()` (`const collapsed = useUIStore((s) => s.sidebarCollapsed);`).

- [ ] **Step 3: Gate A + B** — `npm run typecheck` (`0 errors`) and `npm run build`.
- [ ] **Step 4: Gate C (manual)** — `PORT=5199 npm run dev` (internal build, two clients):
  - The switcher shows at the top of the sidebar with "Tourvest Travel Group".
  - Open it, pick the New Client → every screen rehydrates to that client; the URL becomes `?client=newclient&report=<its latest>`; the report selector and KPIs reflect the new client.
  - Switch back → Tourvest data returns. Collapse the sidebar → the switcher becomes an icon that cycles clients. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/shell/ClientSwitcher.tsx src/shell/Sidebar.tsx
git commit -m "[FEATURE] Add sidebar client switcher (internal builds only)"
```

---

## Task 10: Per-client scoped build + isolation verification (CRITICAL)

This is the security gate: a scoped per-client build must not contain any other client's data.

**Files:**
- Create: `scripts/verify-client-isolation.sh`
- Modify: `package.json` (scoped build scripts)

- [ ] **Step 1: Add build scripts**

In `package.json` `scripts`, add:

```json
    "build:internal": "vite build",
    "build:tourvest": "vite build --outDir dist-tourvest",
    "build:newclient": "vite build --outDir dist-newclient"
```

> The per-client builds set `VITE_CLIENT` via the verification script's env (Step 2), not in the script string, so the same `vite build` honours whichever scope is exported. Alternatively prefix inline, e.g. `VITE_CLIENT=newclient vite build --outDir dist-newclient`. Use the inline form if your shell supports it; the script below sets the env explicitly for portability.

- [ ] **Step 2: Create the isolation verifier**

```bash
#!/usr/bin/env bash
# scripts/verify-client-isolation.sh
# Builds a per-client scoped bundle and asserts NO other client's identifying
# data appears in it. This is the structural guarantee behind per-client logins.
set -euo pipefail

CLIENT="${1:?usage: verify-client-isolation.sh <clientId> <forbidden string> [more...]}"
shift
if [ "$#" -lt 1 ]; then
  echo "Provide at least one forbidden string (another client's name/marker)." >&2
  exit 2
fi

OUT="dist-verify-${CLIENT}"
echo "Building scoped bundle: VITE_CLIENT=${CLIENT} -> ${OUT}"
VITE_CLIENT="${CLIENT}" npx vite build --outDir "${OUT}" >/dev/null

fail=0
for needle in "$@"; do
  if grep -rqF "${needle}" "${OUT}"; then
    echo "LEAK: found forbidden string '${needle}' in ${OUT}" >&2
    fail=1
  else
    echo "OK: '${needle}' absent from ${OUT}"
  fi
done

rm -rf "${OUT}"
if [ "${fail}" -ne 0 ]; then
  echo "ISOLATION FAILED for client '${CLIENT}'." >&2
  exit 1
fi
echo "ISOLATION PASSED for client '${CLIENT}'."
```

Make it executable:

```bash
chmod +x scripts/verify-client-isolation.sh
```

- [ ] **Step 3: Run the isolation check**

Build the `newclient` scope and assert Tourvest's identifiers are absent. Use a distinctive Tourvest string (its client name and a unique fixture figure):

Run: `./scripts/verify-client-isolation.sh newclient "Tourvest Travel Group" "Tourvest"`
Expected: `ISOLATION PASSED for client 'newclient'.`

Also verify the reverse (New Client's name absent from the Tourvest build). Replace `"New Client"` with the real populated name if it has been set:

Run: `./scripts/verify-client-isolation.sh tourvest "New Client"`
Expected: `ISOLATION PASSED for client 'tourvest'.`

- [ ] **Step 4: If isolation FAILS (fallback)**

If a forbidden string is found, the ternary did not tree-shake. Apply the documented fallback: give each client its own Vite entry by building with a per-client `define` that hard-excludes other modules — change `clients.data.ts` to import the non-selected fixture via a `import.meta.env`-guarded dynamic boundary, OR split into per-scope entry files (`clients.data.tourvest.ts` / `clients.data.newclient.ts`) selected by a Vite alias keyed on `VITE_CLIENT`. Re-run Step 3 until it passes. **Do not proceed to PR while isolation fails.**

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-client-isolation.sh package.json
git commit -m "[FEATURE] Add per-client scoped builds + isolation verification gate"
```

---

## Task 11: Retire VITE_FIXTURE; update scripts, env, docs

**Files:**
- Modify: `package.json` (remove `dev:demo`/`dev:client`, add `dev:internal`/`dev:newclient`)
- Delete: `.env.demo`, `.env.client`
- Modify: `docs/claude-handoff/QUALITY_GATES.md` (regression additions)
- Modify: `docs/specs/2026-06-08-multi-client-runtime-switcher-design.md` (status → implemented)

- [ ] **Step 1: Update dev scripts**

In `package.json`, replace:
```json
    "dev:demo": "vite --mode demo",
    "dev:client": "vite --mode client",
```
with:
```json
    "dev:internal": "vite",
    "dev:newclient": "vite",
```
(The new-client dev run is just the app with `?client=newclient` in the URL on the internal build; a scoped dev run can also use `VITE_CLIENT=newclient vite`.)

- [ ] **Step 2: Remove obsolete env files**

```bash
git rm .env.demo .env.client
```

Confirm nothing references `VITE_FIXTURE`: `grep -rIn "VITE_FIXTURE" src docs` → repoint/remove any stragglers (the `fixture.active.ts` comment is already gone).

- [ ] **Step 3: Extend the regression checklist**

Append to `docs/claude-handoff/QUALITY_GATES.md` under "Regression Test Checklist":

```markdown
- [ ] **Client switch (internal build):** switching client rehydrates every screen; figures never bleed between clients
- [ ] **Client isolation (scoped build):** `./scripts/verify-client-isolation.sh newclient "Tourvest Travel Group"` passes
- [ ] **Client deep link:** `#/dashboard?client=newclient&report=<id>` loads the right client
- [ ] **Single-client build:** scoped build shows a static client label, not a switcher
```

- [ ] **Step 4: Mark the spec implemented**

In `docs/specs/2026-06-08-multi-client-runtime-switcher-design.md`, change `**Status:** Approved (design, rev 2)` to `**Status:** Implemented (data layer) — auth per the Phase 2 spec`.

- [ ] **Step 5: Gate A + B** — `npm run typecheck` (`0 errors`) and `npm run build`.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "[FEATURE] Retire VITE_FIXTURE; update dev scripts, env, and regression docs"
```

---

## Task 12: Final verification + PR

- [ ] **Step 1: Full gate sweep**

```bash
npm run typecheck     # 0 errors
npm run build         # completes
./scripts/verify-client-isolation.sh newclient "Tourvest Travel Group" "Tourvest"   # PASSED
PORT=5199 npm run dev # walk the regression checklist below
```

- [ ] **Step 2: Manual regression walk (internal build)**

- Switch client Tourvest ↔ New Client → all screens rehydrate; no figure bleed.
- Within a client: switch reports; historical cycles show the amber banner and freeze; the cumulative KPI stays live.
- Deep link `#/dashboard?client=newclient&report=<id>` loads the right client; refresh keeps it.
- Drop the params (`#/findings`) → self-heals back to a valid `?client=&report=`.
- No console errors at any step.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/multi-client-data-layer
gh pr create --title "[FEATURE] Multi-client data layer (registry + switcher + scoped builds)" \
  --body "Implements docs/specs/2026-06-08-multi-client-runtime-switcher-design.md. Auth is out of scope (owned by the Phase 2 auth spec). All three gates pass; client isolation verified by scripts/verify-client-isolation.sh. For JP's review."
```

- [ ] **Step 4: Do NOT merge directly.** Per `AGENTS.md`, `main` is PR-only; JP reviews and merges.

---

## Spec coverage check

- Hierarchy + URL (`?client=`) → Tasks 4, 6.
- Client registry + build-time scoping → Tasks 2, 10.
- ClientsPort seam → Task 3.
- ClientContext → Task 4.
- ReportContext change + clientInfo + client-aware links → Tasks 6, 7.
- Provider order + client remount → Task 5.
- Client switcher (internal only; static label when single) → Task 9.
- Data isolation verification → Task 10.
- Retire VITE_FIXTURE → Tasks 8, 11.
- Interim gate (Caddy basic-auth) → out of code scope (deployment); not in this plan by design.
