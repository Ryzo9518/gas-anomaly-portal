# Design Spec: Multi-Client Runtime Switcher

**Date:** 2026-06-08
**Status:** Approved (design) — pending implementation plan
**Applies to:** GAS Anomaly Portal (`anomaly.gasecosys.co.za`)
**Governs / governed by:** `AGENTS.md` (the law). This feature must uphold all
existing invariants in `docs/claude-handoff/`.

---

## 1. Goal

Let the portal hold **multiple clients at once** and switch between them at
runtime in the browser, instead of baking a single client in at build time.

This week: **Tourvest** (the existing demo data) and one **New Client** (the
`reports.fixture.clean.ts` scaffold, populated by ops), both live in one build,
switchable during a demo. Adding further clients = adding one data entry.

Built so that **per-client logins** and an eventual **self-serve backend** slot
in later behind a single seam, with no view-layer or route rework.

## 2. Non-goals (scope guard — NOT built this week)

- Real per-client authentication / passwords / magic-link login (Phase 2).
- The FastAPI backend or any live API (Phase 2).
- An admin "create a client" UI / self-serve onboarding (Phase 2).
- Any change to the audit/report/finding/engagement data shapes or the 10
  report-scoped invariants.

The seam for the above is **designed** here, not implemented.

## 3. Current state (what exists today)

- One client is selected at **build time** via `VITE_FIXTURE` in
  `src/features/audit/fixture.active.ts`, which re-exports `CLIENT_INFO`,
  `REPORTS`, `REPORTS_DESC`, `LATEST_REPORT_ID`, `SEED_ENGAGEMENTS`, and helpers
  from either `reports.fixture.ts` (demo/Tourvest) or `reports.fixture.clean.ts`
  (new client).
- `ReportContext` (`src/features/audit/ReportContext.tsx`) imports from
  `fixture.active` and is the single source of truth for the selected report,
  driven by the `?report=` URL param.
- Routing uses **`HashRouter`** (`src/app/Providers.tsx`); `ReportProvider` sits
  inside it. URLs are hash-based, e.g. `index.html#/dashboard?report=2026`.
- Auth already uses a clean port/adapter seam: `AuthPort`
  (`src/ports/auth.port.ts`) → `adapters/index.ts` (`export const auth`) →
  `adapters/mock/auth.mock.ts`. **We mirror this exact pattern for clients.**

## 4. Target architecture

### 4.1 Hierarchy and URL scheme

```
Client  ──>  Report  ──>  Engagement
(new)        (exists)     (exists)
```

URL carries both selections (within the hash, per HashRouter):

```
index.html#/dashboard?client=tourvest&report=2026
```

`client` is resolved first and selects the dataset; `report` then selects within
that client, exactly as today. Both are shareable/bookmarkable. Missing params
self-heal (see 4.4).

### 4.2 Client registry (the data)

New module `src/features/clients/clients.data.ts`:

```typescript
export interface ClientInfo { name: string; healthTarget: number; }

export interface ClientEntry {
  id: string;                               // URL slug, e.g. "tourvest"
  info: ClientInfo;
  reports: AuditReport[];                   // newest-first, same shape as today
  seedEngagements: Record<string, Engagement>;
}

// Lightweight shape for the switcher list (no report payload).
export interface ClientSummary { id: string; name: string; }

export const CLIENTS: ClientEntry[] = [ tourvest, newClient ];
export const DEFAULT_CLIENT_ID = "tourvest";
```

- `tourvest` entry sources its data from the existing `reports.fixture.ts`.
- `newClient` entry sources its data from `reports.fixture.clean.ts`.
- The two `reports.fixture*.ts` files keep their data and types; the registry
  imports and bundles them. (We do not rewrite the per-client data; we wrap it.)
- Adding a client this week = add an entry referencing a new
  `reports.fixture.<client>.ts`. Later = the backend returns these.

### 4.3 ClientsPort (the Phase-2 seam)

New `src/ports/clients.port.ts`, mirroring `AuthPort`:

```typescript
export interface ClientsPort {
  listClients(): Promise<ClientSummary[]>;        // id + name (for the switcher)
  getClient(id: string): Promise<ClientEntry | null>;
}
```

- Phase 1 mock: `src/adapters/mock/clients.mock.ts` reads `CLIENTS` from the
  registry.
- Wired through `src/adapters/index.ts` as `export const clients: ClientsPort`.
- Phase 2: a `bff/clients.bff.ts` calls `GET /api/clients` and
  `GET /api/clients/:id`, **scoped to the logged-in identity** — an admin/Jera
  identity receives all clients; a client identity receives only its own and the
  switcher hides. No context or view changes when swapped.

### 4.4 ClientContext (the state)

New `src/features/clients/ClientContext.tsx`, modeled on `ReportContext`:

```typescript
interface ClientContextValue {
  clients: ClientSummary[];          // for the switcher
  selectedClient: ClientEntry;
  selectedClientId: string;
  selectClient: (id: string) => void;   // updates ?client= in the URL
  // convenience pass-throughs for ReportContext to consume:
  reports: AuditReport[];
  seedEngagements: Record<string, Engagement>;
  clientInfo: ClientInfo;
}
```

- Reads `?client=` via `useSearchParams`. If absent or unknown, rewrites the URL
  to `DEFAULT_CLIENT_ID` with `replace: true` (no flash, no history spam) —
  identical self-heal to `ReportContext`'s `?report=` handling.
- Exposes `selectClient(id)` which sets `?client=` (and clears/repoints
  `?report=` to the new client's latest report to avoid a stale report id).

### 4.5 ReportContext change (minimal)

- Stop importing `REPORTS` / `SEED_ENGAGEMENTS` / `CLIENT_INFO` from
  `fixture.active`. Instead read them from `useClient()`.
- Everything else in `ReportContext` is unchanged. Every report-scoped invariant
  continues to hold — it now operates within the selected client.
- `linkWithReport(path)` becomes client-aware: it preserves `?client=` as well
  as `?report=` so internal nav never drops the client.

### 4.6 Provider order

`src/app/Providers.tsx` — `ClientProvider` wraps `ReportProvider`, both inside
`HashRouter` (both need URL access):

```
HashRouter
  └─ ClientProvider        // reads ?client=
       └─ ReportProvider   // reads ?report=, consumes useClient()
            └─ children
```

### 4.7 Client switcher UI

- New control at the **top of the sidebar** (`src/shell/Sidebar.tsx`) — the
  highest-level "which client" context, above navigation.
- Visually distinct from the violet report pill in `TopBar` so the two concerns
  never compete (upholds LESSON-1: one control per concern).
- Lists `clients` from `useClient()`; selecting calls `selectClient(id)`.
- Phase 1: always rendered (internal/mock session = the consultant).
- Phase 2: rendered only when the session identity is admin/Jera; a single-client
  identity does not see it.
- Single-client safety: if `clients.length === 1`, render the client name as a
  static label, not an interactive switcher.

### 4.8 Retiring the build-time fixture toggle

- `fixture.active.ts` is **replaced** by the registry; `VITE_FIXTURE` no longer
  selects a build. Both datasets ship in one build.
- `dev:demo` / `dev:client` npm scripts: either drop them or repurpose to set a
  default `?client=` for convenience. Decision deferred to the plan; default is
  to drop them and rely on `DEFAULT_CLIENT_ID`.
- `.env.demo` / `.env.client` become obsolete for mode selection; remove or
  repurpose in the plan.

## 5. Deployment notes

- Unchanged from `docs/deployment/HETZNER_DEPLOYMENT.md`: one build → `dist/` →
  Jera Hetzner box → nginx static at `anomaly.gasecosys.co.za`. One site serves
  all clients; the active client is a URL param.
- **HashRouter clarification:** because routing is hash-based, the server only
  ever receives `/`, so deep links do not 404 even without the SPA fallback. The
  `try_files $uri $uri/ /index.html;` rule in the runbook is retained as a safe
  best-practice net (and to serve hashed asset paths); it is not load-bearing
  for client-side routes under HashRouter. (Runbook annotated accordingly.)

## 6. Testing & quality gates

All three standing gates must pass (`typecheck`, `build`, manual at `:5199`).
Extend the `QUALITY_GATES.md` regression checklist with:

- [ ] Client switch rehydrates every screen (KPIs, findings, engagement, upload).
- [ ] Data isolation: Tourvest figures never appear under New Client and vice
      versa (cumulative, YoY, findings counts).
- [ ] Deep link `#/dashboard?client=newclient&report=<id>` loads the right client.
- [ ] Missing/unknown `?client=` self-heals to `DEFAULT_CLIENT_ID` with no flash.
- [ ] Within each client, historical freeze + amber banner + cumulative-never-
      freezes still hold.
- [ ] Switching client repoints `?report=` to that client's latest (no stale id).
- [ ] `clients.length === 1` renders a static label, not a dead switcher.

## 7. Open items (outside this build)

- **Hetzner box + DNS:** confirm the existing Jera Hetzner box is the target and
  that `anomaly.gasecosys.co.za` A-record points to it (tracked in the runbook's
  CONFIRM markers).
- **New Client real data:** ops populates `reports.fixture.clean.ts`
  (→ the `newClient` registry entry) with the real client name, health score,
  leakage figures, and findings before that client is shown live.

## 8. File summary

**New**
- `src/features/clients/clients.data.ts` — registry + `ClientEntry` type
- `src/features/clients/ClientContext.tsx` — provider + `useClient()`
- `src/ports/clients.port.ts` — `ClientsPort` interface
- `src/adapters/mock/clients.mock.ts` — registry-backed mock implementation
- `src/shell/ClientSwitcher.tsx` — sidebar switcher control

**Modified**
- `src/features/audit/ReportContext.tsx` — consume `useClient()` not `fixture.active`
- `src/app/Providers.tsx` — add `ClientProvider` inside `HashRouter`
- `src/adapters/index.ts` — add `export const clients`
- `src/shell/Sidebar.tsx` — mount `ClientSwitcher`
- `src/features/audit/reports.fixture.clean.ts` — becomes the `newClient` source

**Removed / superseded**
- `src/features/audit/fixture.active.ts` — replaced by the registry
- `.env.demo`, `.env.client`, `dev:demo`/`dev:client` scripts — per 4.8
